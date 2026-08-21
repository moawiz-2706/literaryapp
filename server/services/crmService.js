'use strict';
/**
 * crmService.js
 *
 * CRM (GoHighLevel) synchronization for order lifecycle events.
 *
 * Why a dedicated service: the legacy code only ever wrote contact tags and
 * custom fields on order creation, and never moved the opportunity through the
 * pipeline. Stage IDs were hard-coded in global env vars even though this is a
 * marketplace app installed into many sub-accounts — every location now has its
 * own pipeline/stage config (ghl_pipeline_stages, populated from
 * POST /pipelines/:locationId).
 *
 * Sync happens from exactly three places:
 *   1. orderService.placeOrder  → CREATED stage
 *   2. webhook handler          → every status change (fast path)
 *   3. printJobs sync/reconcile → every status change (slow path)
 *
 * Failures are logged and never thrown: CRM state is always catch-up-able
 * (Sync CRM action in the dashboard), but a dead CRM call must never stall an
 * order or a webhook response.
 */

const ghl = require('./ghlService');
const statusDb = require('../db/statusDb');
const statusService = require('./statusService');

// ── Sync after a status transition ───────────────────────────────────────────────

/**
 * Ensure the GHL opportunity for a job sits in the correct pipeline stage for
 * the job's current Lulu status, then refresh the fulfillment custom fields.
 *
 * @param {object} params
 * @param {string} params.locationId
 * @param {string} params.jobId
 * @param {string|null} params.luluStatus
 * @param {string|null} params.contactId   contact to move; falls back to job
 * @param {object} [params.job]             print_jobs row (snake_case)
 * @returns {object} { synced: boolean, pipelineId, stageId, stageName, source }
 */
async function syncOrderAfterTransition({ locationId, jobId, luluStatus, contactId, job }) {
  const syncRow = {
    jobId,
    luluStatus,
    localStatus: statusService.mapLuluStatusToLocal(luluStatus),
    synced: false,
    pipelineId: null,
    stageId: null,
    stageName: null,
    source: 'none',
  };

  // 1. Resolve the stage from per-location config (env as fallback)
  const stage = await statusService.resolveGhlStage(locationId, luluStatus);
  syncRow.pipelineId = stage.pipelineId;
  syncRow.stageId = stage.stageId;
  syncRow.stageName = stage.stageName;
  syncRow.source = stage.source;

  const ghlContactId = contactId || (job ? job.contact_id : null);

  if (!stage.pipelineId || !stage.stageId) {
    // Nothing configured — do not move the opportunity to a wrong stage.
    return syncRow;
  }

  // 2. Move the opportunity (create one first if none exists)
  let opportunityId = job ? job.ghl_opportunity_id : null;
  if (ghlContactId && !opportunityId) {
    try {
      const opp = await ghl.createOpportunity(locationId, ghlContactId, job?.book_title || 'Book Order');
      opportunityId = opp?.id || null;
    } catch (err) {
      console.warn(`[CRM] Could not create opportunity for job ${jobId}: ${err.message}`);
      return syncRow;
    }
  }

  if (opportunityId) {
    try {
      // ghl.updateOpportunityStage(locationId, opportunityId, stageId): the GHL
      // API only accepts stageId in the payload; pipelineId is carried on the
      // opportunity itself, so only the stageId is set here.
      await ghl.updateOpportunityStage(locationId, opportunityId, stage.stageId);
      syncRow.synced = true;
    } catch (err) {
      console.warn(`[CRM] Stage update failed for opportunity ${opportunityId}: ${err.message}`);
      return syncRow;
    }
  }

  // 3. Refresh fulfillment custom fields on the contact
  if (ghlContactId && job) {
    try {
      await ghl.writeOrderCustomFields(locationId, ghlContactId, {
        fulfillmentStatus: syncRow.localStatus,
        luluPrintJobId: job.lulu_print_job_id || jobId,
        orderTotalCost: (
          parseFloat(job.print_cost || 0) +
          parseFloat(job.shipping_cost || 0) +
          parseFloat(job.fulfillment_fee || 0) +
          parseFloat(job.agency_fee || 0)
        ).toFixed(2),
      });
    } catch (err) {
      console.warn(`[CRM] Custom field write failed for job ${jobId}: ${err.message}`);
    }
  }

  return syncRow;
}

// ── Per-location pipeline configuration ──────────────────────────────────────────

/**
 * Save the full pipeline→stage mapping for a location after the merchant maps
 * their GHL stages in the dashboard. This replaces the global GHL_STAGE_* env
 * vars entirely once populated.
 *
 * Body: { pipelineId, pipelineName, stages: [{ localStatus, stageId, stageName }] }
 */
async function configurePipelineStages(locationId, { pipelineId, pipelineName, stages }) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error('stages must be a non-empty array of { localStatus, stageId, stageName }');
  }
  // Validate localStatus values against the real lifecycle map
  const valid = new Set(Object.values(statusService.LOCAL_STATUS_MAP));
  for (const s of stages) {
    if (!s.localStatus || !s.stageId) {
      throw new Error(`Each stage mapping needs localStatus and stageId (got: ${JSON.stringify(s)})`);
    }
    if (!valid.has(s.localStatus)) {
      throw new Error(`Unknown local status "${s.localStatus}". Valid: ${[...valid].join(', ')}`);
    }
  }

  // Full replace: delete old mappings then write the new set in one transaction-ish pass
  await statusDb.deletePipelineStages(locationId);
  for (const s of stages) {
    await statusDb.setPipelineStage(locationId, s.localStatus, {
      pipelineId,
      pipelineName,
      stageId: s.stageId,
      stageName: s.stageName || null,
    });
  }
  return { locationId, pipelineId, pipelineName, configured: stages.length };
}

module.exports = {
  syncOrderAfterTransition,
  configurePipelineStages,
};
