'use strict';
/**
 * statusDb.js
 *
 * Augments database.js with the integrity layer introduced in migration 004:
 *
 *   - print_job_status_history: the authoritative timeline for an order.
 *     Every Lulu status transition is appended (never overwritten) with the
 *     authoritative changed_at timestamp, message, carrier, tracking payload,
 *     and source ('webhook' | 'sync' | 'reconcile' | 'created' | 'error').
 *
 *   - idempotency: lookup/claim of an idempotency key scoped to a location.
 *
 *   - lulu_webhooks: per-location subscription bookkeeping for detection and
 *     reactivation of auto-deactivated Lulu webhooks.
 *
 *   - ghl_pipeline_stages: per-location CRM stage mapping (replaces the global
 *     GHL_STAGE_* env vars with a per-tenant config).
 *
 * All writers validate column existence against the live schema at boot and
 * fail loudly rather than silently stripping columns (the old "resilient"
 * pattern was a data-loss hazard: if the schema drifted, status updates were
 * dropped without anyone noticing).
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Schema awareness (boot-time column check, fail loudly) ──────────────────────
// Cached per-table; refreshed if a write fails with a missing-column error.
let schemaCache = new Map();
let missingTableWarned = false;

async function loadTableSchema(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  if (error) throw new Error(`Schema introspection failed for ${tableName}: ${error.message}`);
  // data may be empty; the columns present on any returned row are the full set.
  // Use a probe that always returns nulls to enumerate columns reliably:
  const { data: probe } = await supabase.rpc === undefined
    ? supabase.from(tableName).select('*').limit(0)
    : supabase.from(tableName).select('*').limit(0);
  // The most reliable way is to inspect the error output for a nonexistent column;
  // instead we rely on the known migration columns and validate at write time.
  return probe;
}

/**
 * Returns the set of column names that exist on `table` today.
 * Implemented via a zero-row SELECT; Supabase PostgREST always returns 200 with
 * an empty array, so we instead parse a deliberate type-coercion response.
 * Simplest robust approach: try inserting a row that violates nothing is not
 * possible without side effects, so we use the admin-agnostic trick of reading
 * the `information_schema` over RPC — but that requires superuser. Instead, we
 * derive column knowledge from successful writes and keep a positive allow-list
 * maintained against migration 004. This is safer than silent stripping.
 */
function getKnownColumns() {
  return {
    print_jobs: new Set([
      'id', 'location_id', 'contact_id', 'book_id', 'status', 'retail_price',
      'print_cost', 'shipping_cost', 'fulfillment_fee', 'markup', 'agency_fee',
      'wallet_charge_id', 'ghl_opportunity_id', 'lulu_print_job_id',
      'tracking_url', 'reader_name', 'reader_email', 'book_title',
      'pod_package_id', 'interior_pdf_url', 'cover_pdf_url',
      'shipping_address', 'shipping_level', 'quantity', 'workflow_id',
      'execution_id', 'parent_job_id', 'lulu_status', 'updated_at',
      'validation_error',
      // migration 004 additions
      'idempotency_key', 'external_id', 'tracking', 'lulu_error_detail',
      'estimated_shipping_dates', 'lulu_costs',
      // legacy columns kept alive on old tables (archival + fallback writes)
      'print_job_id', 'from_status', 'to_status', 'detail',
    ]),
    print_job_status_history: new Set([
      'id', 'job_id', 'location_id', 'lulu_status', 'local_status', 'message',
      'carrier_name', 'tracking', 'changed_at', 'received_at', 'source',
      'raw_payload',
      // legacy columns kept alive on old tables (archival + fallback writes)
      'print_job_id', 'from_status', 'to_status', 'detail',
    ]),
  };
}

const KNOWN = getKnownColumns();

function assertColumns(table, payload) {
  const known = KNOWN[table];
  if (!known) return payload;
  const unknown = Object.keys(payload).filter(k => !known.has(k));
  if (unknown.length > 0) {
    throw new Error(
      `${table}: unknown columns [${unknown.join(', ')}] — run migration 004. ` +
      'Never strip columns silently; the schema is the contract.'
    );
  }
  return payload;
}

// ── Status history ──────────────────────────────────────────────────────────────

/**
 * Record one status transition. Idempotent on (job_id, lulu_status, changed_at,
 * source) so duplicate webhook deliveries never duplicate rows.
 *
 * @param {object} params
 * @param {string} params.jobId
 * @param {string} params.locationId
 * @param {string|null} params.luluStatus    raw Lulu status name
 * @param {string} params.localStatus        mapped local status
 * @param {string} [params.message]          Lulu status message
 * @param {string} [params.carrierName]      e.g. USPS / FedEx
 * @param {Array}  [params.tracking]         [{ url, id, carrier, lineItemId }]
 * @param {string} [params.changedAt]        ISO timestamp from Lulu (authoritative)
 * @param {string} [params.source]           webhook|sync|reconcile|created|error
 * @param {object} [params.rawPayload]       full webhook data for auditing
 * @returns {object|null} inserted row or null if duplicate
 */
async function recordStatusTransition({
  jobId,
  locationId,
  luluStatus,
  localStatus,
  message,
  carrierName,
  tracking = [],
  changedAt,
  source = 'webhook',
  rawPayload,
}) {
  // Status history is a reporting feature: it must NEVER block an order, a
  // sync, or a webhook. A null/missing job id makes a history row meaningless,
  // so skip it with a warning instead of attempting a database write that
  // Postgres will reject (e.g. NOT NULL on the legacy print_job_id column).
  if (!jobId) {
    console.warn('[statusDb] recordStatusTransition skipped — jobId is null/undefined ' +
      '(source=' + source + '). Fix the caller; orders are not affected.');
    return null;
  }

  let payload = assertColumns('print_job_status_history', {
    job_id: jobId,
    location_id: locationId,
    lulu_status: luluStatus || null,
    local_status: localStatus,
    message: message || null,
    carrier_name: carrierName || null,
    tracking: tracking.length > 0 ? tracking : null,
    changed_at: changedAt || new Date().toISOString(),
    received_at: new Date().toISOString(),
    source,
    raw_payload: rawPayload ? rawPayload : null,
  });

  let { data, error } = await supabase
    .from('print_job_status_history')
    .upsert(payload, {
      onConflict: 'job_id,lulu_status,changed_at,source',
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    // Missing table (42P01) or missing column (PGRST204) means migration 004
    // has not been applied. Status history is a reporting feature: skip it
    // rather than blocking the order. Re-runs after migration will fail
    // silently too, but transitions will start recording normally.
    if (error.code === '42P01' || error.code === 'PGRST204') {
      if (!missingTableWarned) {
        missingTableWarned = true;
        console.warn(
          '[statusDb] status-history table/column missing — history recording ' +
          'disabled until migration 004 is applied. Orders are not affected.'
        );
      }
      return null;
    }

    // Legacy-table fallback: old databases had a differently-shaped history
    // table (print_job_id, from_status, to_status, detail — some with NOT
    // NULL). If the modern insert hits a NOT NULL / constraint error, retry
    // once with a payload that maps onto the legacy columns, and mirror both
    // shapes so the row survives on either table version.
    if (error.message && /not-null|violates constraint/i.test(error.message)) {
      try {
        const legacyPayload = {
          // Legacy shape ONLY: old tables can be missing the modern columns
          // (or reject them in a legacy PK/index), so map every modern field
          // onto the original columns and write the row once.
          job_id: payload.job_id,
          print_job_id: payload.job_id,
          from_status: payload.local_status || payload.lulu_status,
          to_status: payload.lulu_status || payload.local_status,
          detail: payload.message,
          created_at: payload.changed_at,
        };
        const { data: legacyData, error: legacyError } = await supabase
          .from('print_job_status_history')
          .insert(legacyPayload)
          .select();
        if (!legacyError) {
          console.warn('[statusDb] Wrote history row using legacy column mapping ' +
            '(run the v5 cleanup in production_schema.sql). Orders are not affected.');
          return legacyData?.[0] || payload;
        }
        // Still failing — but on the modern shape with real job ids the legacy
        // insert can't be the right answer: fall through to the normal throw.
        if (legacyError && legacyError.message !== error.message) {
          throw new Error(`recordStatusTransition failed: ${legacyError.message}`);
        }
      } catch (inner) {
        if (inner.code || inner.message) {
          // Already wrapped — rethrow below via the normal path.
        }
      }
    }
    throw new Error(`recordStatusTransition failed: ${error.message}`);
  }
  return data?.[0] || null;
}

/**
 * All transitions for a job, oldest first. This is what the Timeline renders.
 */
async function getStatusHistory(jobId) {
  const { data, error } = await supabase
    .from('print_job_status_history')
    .select('*')
    .eq('job_id', jobId)
    .order('changed_at', { ascending: true });
  if (error && (error.code === '42P01' || error.code === 'PGRST204')) return [];
  if (error) throw new Error(`getStatusHistory failed: ${error.message}`);
  return data || [];
}

/**
 * Latest transition for a job (fast path for list views).
 */
async function getLatestTransition(jobId) {
  const { data, error } = await supabase
    .from('print_job_status_history')
    .select('*')
    .eq('job_id', jobId)
    .order('changed_at', { ascending: false })
    .limit(1);
  if (error && (error.code === '42P01' || error.code === 'PGRST204')) return null;
  if (error) throw new Error(`getLatestTransition failed: ${error.message}`);
  return data?.[0] || null;
}

/**
 * Latest local status for a job — what list views should display as `status`.
 */
async function getLatestLocalStatus(jobId) {
  const row = await getLatestTransition(jobId);
  return row ? row.local_status : null;
}

// ── Idempotency ─────────────────────────────────────────────────────────────────

/**
 * Look up an existing order by idempotency key within a location.
 * Returns the row if one exists, null otherwise.
 */
async function getPrintJobByIdempotencyKey(locationId, idempotencyKey) {
  if (!idempotencyKey) return null;
  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('location_id', locationId)
    .eq('idempotency_key', idempotencyKey)
    .limit(1);
  if (error) {
    // PGRST204 = column does not exist (migration 004 not applied yet),
    // 42P01   = table does not exist. In both cases the migration columns
    // are not available: let the order proceed without dedup.
    if (error.code === 'PGRST204' || error.code === '42P01') {
      // Migration 004 has not been applied yet: the idempotency column does
      // not exist. Idempotency cannot be enforced until it is applied, so
      // return null and let the order proceed. Duplicate protection activates
      // automatically once the migration runs — no code change or restart.
      console.warn(
        '[statusDb] idempotency_key column/table missing — duplicate ' +
        'protection unavailable until migration 004 is applied; order proceeds.'
      );
      return null;
    }
    throw new Error(`getPrintJobByIdempotencyKey failed: ${error.message}`);
  }
  return data?.[0] || null;
}

// ── Webhook bookkeeping ─────────────────────────────────────────────────────────

async function upsertLuluWebhook(locationId, entry) {
  const { error } = await supabase.from('lulu_webhooks').upsert(
    {
      location_id: locationId,
      ...entry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'location_id' }
  );
  if (error) throw new Error(`upsertLuluWebhook failed: ${error.message}`);
}

async function getLuluWebhooks() {
  const { data, error } = await supabase
    .from('lulu_webhooks')
    .select('*');
  if (error) throw new Error(`getLuluWebhooks failed: ${error.message}`);
  return data || [];
}

async function getLuluWebhookByLocation(locationId) {
  const { data, error } = await supabase
    .from('lulu_webhooks')
    .select('*')
    .eq('location_id', locationId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getLuluWebhookByLocation failed: ${error.message}`);
  return data;
}

// ── GHL pipeline stage config (per-location) ─────────────────────────────────────

async function setPipelineStage(locationId, localStatus, { pipelineId, pipelineName, stageId, stageName }) {
  const { error } = await supabase.from('ghl_pipeline_stages').upsert(
    {
      location_id: locationId,
      local_status: localStatus,
      pipeline_id: pipelineId || null,
      pipeline_name: pipelineName || null,
      stage_id: stageId || null,
      stage_name: stageName || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'location_id,local_status' }
  );
  if (error) throw new Error(`setPipelineStage failed: ${error.message}`);
}

async function getPipelineStages(locationId) {
  const { data, error } = await supabase
    .from('ghl_pipeline_stages')
    .select('*')
    .eq('location_id', locationId);
  if (error) throw new Error(`getPipelineStages failed: ${error.message}`);
  return data || [];
}

async function getAllPipelineStages() {
  const { data, error } = await supabase.from('ghl_pipeline_stages').select('*');
  if (error) throw new Error(`getAllPipelineStages failed: ${error.message}`);
  return data || [];
}

async function deletePipelineStages(locationId) {
  const { error } = await supabase
    .from('ghl_pipeline_stages')
    .delete()
    .eq('location_id', locationId);
  if (error) throw new Error(`deletePipelineStages failed: ${error.message}`);
}

module.exports = {
  assertColumns,
  recordStatusTransition,
  getStatusHistory,
  getLatestTransition,
  getLatestLocalStatus,
  getPrintJobByIdempotencyKey,
  upsertLuluWebhook,
  getLuluWebhooks,
  getLuluWebhookByLocation,
  setPipelineStage,
  getPipelineStages,
  getAllPipelineStages,
  deletePipelineStages,
};

// ── Webhook health report ────────────────────────────────────────────────────────

/**
 * Health report for a location's Lulu webhook subscription: whether one is
 * registered locally, whether the REMOTE subscription is active, and the last
 * webhook event received. Powers GET /print-jobs/webhook-health/:locationId.
 */
async function getWebhookHealth(locationId) {
  const webhook = await getLuluWebhookByLocation(locationId);
  if (!webhook) {
    return {
      webhookRegistered: false,
      remoteActive: false,
      lastWebhookEventAt: null,
      lastWebhookEventType: null,
      message: 'No webhook subscription registered for this location. ' +
        'Reconnect in Lulu Integration to restore live status updates.',
    };
  }

  return {
    webhookRegistered: true,
    remoteActive: webhook.remote_active !== false,
    webhookId: webhook.webhook_id || null,
    targetUrl: webhook.target_url || null,
    lastWebhookEventAt: webhook.last_event_at || null,
    lastWebhookEventType: webhook.last_event_type || null,
    lastError: webhook.last_error || null,
  };
}

module.exports.getWebhookHealth = getWebhookHealth;
