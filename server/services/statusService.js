'use strict';
/**
 * statusService.js
 *
 * The authoritative owner of Lulu <-> local status semantics (migration 004).
 *
 * Responsibilities:
 *   1. Full 11-status Lulu lifecycle mapping (CREATED, UNPAID, PAYMENT_IN_PROGRESS,
 *      PRODUCTION_DELAYED, PRODUCTION_READY, IN_PRODUCTION, SHIPPED, DELIVERED,
 *      REJECTED, ERROR, CANCELED). The old maps knew only 6 of 11.
 *   2. recordTransition(): the ONLY place status changes get persisted. Writes a
 *      history row (the Timeline's data source) and updates print_jobs.status
 *      exactly once per call, with state checks to avoid duplicate rows.
 *   3. Resolve the per-location CRM stage for a status, falling back to the
 *      legacy env vars only for locations with no config.
 */

const statusDb = require('../db/statusDb');

// ── Complete status lifecycle (from Lulu's official documentation) ───────────────
// CREATED -> UNPAID | REJECTED | CANCELED | PRODUCTION_READY
// UNPAID -> PAYMENT_IN_PROGRESS | CANCELED | PRODUCTION_DELAYED
// PAYMENT_IN_PROGRESS -> UNPAID | PRODUCTION_DELAYED
// PRODUCTION_DELAYED -> PRODUCTION_READY | CANCELED
// PRODUCTION_READY -> IN_PRODUCTION | PRODUCTION_DELAYED
// IN_PRODUCTION -> SHIPPED | ERROR
// SHIPPED -> DELIVERED (USPS/FedEx/UPS)

const LULU_STATUSES = [
  'CREATED', 'UNPAID', 'PAYMENT_IN_PROGRESS', 'PRODUCTION_DELAYED',
  'PRODUCTION_READY', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED',
  'REJECTED', 'ERROR', 'CANCELED',
];

const LOCAL_STATUS_MAP = {
  CREATED:               'Sent to Print',
  UNPAID:                'Awaiting Payment',
  PAYMENT_IN_PROGRESS:   'Payment Processing',
  PRODUCTION_DELAYED:    'Production Delayed',
  PRODUCTION_READY:      'Production Ready',
  IN_PRODUCTION:         'In Production',
  SHIPPED:               'Shipped',
  DELIVERED:             'Delivered',
  REJECTED:              'Fulfillment Error',
  ERROR:                 'Fulfillment Error',
  CANCELED:              'Cancelled',
};

const LEGACY_STATUS_MAP = {
  CREATED:               'Sent to Print',
  IN_PRODUCTION:         'In Production',
  SHIPPED:               'Shipped',
  DELIVERED:             'Delivered',
  ERROR:                 'Fulfillment Error',
  REJECTED:              'Fulfillment Error',
  CANCELED:              'Cancelled',
  // kept so old rows still parse
  'Awaiting Payment':     'Awaiting Payment',
  'Payment Processing':   'Payment Processing',
  'Production Delayed':   'Production Delayed',
  'Production Ready':     'Production Ready',
};

// Categories for UI badges / CRM pipeline stages
function statusCategory(luluStatus) {
  switch (luluStatus) {
    case 'CREATED':
    case 'UNPAID':
    case 'PAYMENT_IN_PROGRESS':
    case 'PRODUCTION_READY':
    case 'IN_PRODUCTION':
      return 'in_progress';
    case 'PRODUCTION_DELAYED':
      return 'delayed';
    case 'SHIPPED':
      return 'shipped';
    case 'DELIVERED':
      return 'delivered';
    case 'REJECTED':
    case 'ERROR':
      return 'error';
    case 'CANCELED':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

function isTerminal(luluStatus) {
  return ['DELIVERED', 'REJECTED', 'ERROR', 'CANCELED'].includes(luluStatus);
}

function isUnpaid(luluStatus) {
  return ['UNPAID', 'PAYMENT_IN_PROGRESS'].includes(luluStatus);
}

function mapLuluStatusToLocal(luluStatus) {
  if (!luluStatus) return 'Pending';
  return LOCAL_STATUS_MAP[luluStatus] || luluStatus;
}

// ── Transition recording (single writer) ─────────────────────────────────────────

/**
 * Record a status transition for a job. Dedupes by (job_id, lulu_status,
 * changed_at, source) so repeated webhook deliveries are harmless. Updates
 * print_jobs.status + lulu_status exactly once.
 *
 * @returns {object} { changed: boolean, row, tracking }
 */
async function recordTransition({
  jobId,
  locationId,
  luluStatus,
  message,
  carrierName,
  tracking = [],
  changedAt,
  source = 'webhook',
  rawPayload,
}) {
  const localStatus = mapLuluStatusToLocal(luluStatus);

  const row = await statusDb.recordStatusTransition({
    jobId,
    locationId,
    luluStatus,
    localStatus,
    message,
    carrierName,
    tracking,
    changedAt,
    source,
    rawPayload,
  });

  if (!row) {
    return { changed: false, row: null, tracking };
  }

  // Update the denormalized print_jobs row ONCE (history is the truth).
  const db = require('../db/database');
  await db.updatePrintJob(jobId, {
    status: localStatus,
    luluStatus,
    trackingUrl: tracking.length > 0 ? tracking[0].url : undefined,
    tracking,
  });

  // Emit the Marketplace trigger asynchronously after the transition is accepted.
  // Keeping this outside the status write means a GHL outage cannot block Lulu
  // processing, CRM stage sync, or reconciliation.
  if (luluStatus === 'SHIPPED') {
    const triggerService = require('./ghlTriggerService');
    setImmediate(() => {
      triggerService.emitPrintJobShipped({
        jobId,
        locationId,
        tracking,
        changedAt: row?.changed_at || changedAt,
      }).catch(err => {
        console.warn(`[GHL Trigger] SHIPPED emission failed for job ${jobId}:`, err.message);
      });
    });
  }

  return { changed: true, row, tracking };
}

// ── Per-location CRM stage resolution ─────────────────────────────────────────────

/**
 * Resolve the GHL stage_id for a local status for the given location.
 * Priority: (1) per-location ghl_pipeline_stages config, (2) legacy env var
 * map (kept for existing deployments with no config yet), (3) null.
 */
async function resolveGhlStage(locationId, luluStatus) {
  const localStatus = mapLuluStatusToLocal(luluStatus);

  // 1. Per-location config
  const stages = await statusDb.getPipelineStages(locationId);
  const configured = (stages || []).find(s => s.local_status === localStatus);
  if (configured && configured.stage_id && configured.pipeline_id) {
    return {
      pipelineId: configured.pipeline_id,
      stageId: configured.stage_id,
      stageName: configured.stage_name || null,
      source: 'location_config',
    };
  }

  // 2. Legacy env-var map (only the old 7 statuses knew stage IDs)
  const legacy = {
    'CREATED':               process.env.GHL_STAGE_SENT_TO_PRINT,
    'IN_PRODUCTION':         process.env.GHL_STAGE_IN_PRODUCTION,
    'SHIPPED':               process.env.GHL_STAGE_SHIPPED,
    'DELIVERED':             process.env.GHL_STAGE_DELIVERED,
    'REJECTED':              process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'ERROR':                 process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'CANCELED':              process.env.GHL_STAGE_REFUNDED_CANCELLED,
  };
  const legacyStage = legacy[luluStatus];
  if (legacyStage && process.env.GHL_PIPELINE_ID) {
    return {
      pipelineId: process.env.GHL_PIPELINE_ID,
      stageId: legacyStage,
      stageName: null,
      source: 'env',
    };
  }

  // 3. New statuses that were previously unmapped: explicit null so callers
  //    know to leave the CRM untouched rather than moving to a wrong stage.
  return { pipelineId: null, stageId: null, stageName: null, source: 'none' };
}

module.exports = {
  LULU_STATUSES,
  LOCAL_STATUS_MAP,
  LEGACY_STATUS_MAP,
  statusCategory,
  isTerminal,
  isUnpaid,
  mapLuluStatusToLocal,
  recordTransition,
  resolveGhlStage,
};

// ── Poll/reconcile-based sync (single entry point for printJobs routes) ────────────

/**
 * Sync a job from a freshly-fetched Lulu detail: extract tracking, persist the
 * transition (if new), and return what changed.
 *
 * @param {object} params
 * @param {string} params.jobId
 * @param {string} params.locationId
 * @param {object|null} params.luluStatus  { name, message, changed } from Lulu
 * @param {Array}  [params.trackingUrls]   plain string URLs (legacy shape)
 * @param {Array}  [params.costs]          lulu cost object — shipping/fulfillment costs
 * @param {string} [params.source]         sync|reconcile|detail-poll
 * @returns {object} { jobId, transitioned, luluStatus, localStatus, trackingUrls }
 */
async function syncJobStatus({ jobId, locationId, luluStatus, trackingUrls = [], tracking: providedTracking = [], costs, source = 'sync' }) {
  const tracking = providedTracking.length > 0 ? buildTracking(providedTracking) : buildTracking(trackingUrls);
  const name = luluStatus?.name || null;
  const message = luluStatus?.message || null;
  const changedAt = luluStatus?.changed || undefined;

  const result = {
    jobId,
    luluStatus: name,
    localStatus: mapLuluStatusToLocal(name),
    trackingUrls: tracking.map(t => t.url).filter(Boolean),
    transitioned: false,
  };

  if (!name) return result;

  const db = require('../db/database');
  const updates = { luluStatus: name };
  if (tracking.length > 0 && tracking[0].url) updates.trackingUrl = tracking[0].url;
  if (tracking.length > 0) updates.tracking = tracking;

  const shippingTotal = costs?.shipping_cost?.total_cost_incl_tax;
  const fulfillmentTotal = costs?.fulfillment_cost?.total_cost_incl_tax;
  if (shippingTotal) updates.shippingCost = parseFloat(shippingTotal);
  if (fulfillmentTotal) updates.fulfillmentFee = parseFloat(fulfillmentTotal);

  await db.updatePrintJob(jobId, updates);

  const { changed } = await recordTransition({
    jobId,
    locationId,
    luluStatus: name,
    message,
    tracking,
    changedAt,
    source,
  });
  result.transitioned = changed;

  return result;
}

/** Convert plain tracking URL strings (or objects) into the canonical shape. */
function buildTracking(trackingUrls) {
  return (trackingUrls || []).map(t =>
    typeof t === 'string' ? { url: t, id: null, carrier: null, lineItemId: null } : t
  );
}

module.exports.syncJobStatus = syncJobStatus;
