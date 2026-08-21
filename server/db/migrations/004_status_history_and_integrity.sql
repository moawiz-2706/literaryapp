-- ─────────────────────────────────────────────────────────────────────────────
-- LiteraryApp — Migration 004: Honest status history, idempotency, webhook
-- bookkeeping, and full tracking payloads.
--
-- Run this ONCE in the Supabase SQL Editor. Every statement is idempotent
-- (CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN is wrapped in existence
-- checks where needed, indexes skip duplicates) so re-running it is safe.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Print-Job Status History ────────────────────────────────────────────────
-- The single source of truth for the order Timeline. Every Lulu status
-- transition is recorded with its authoritative timestamp, message, and source.
-- Source values: 'webhook' (PRINT_JOB_STATUS_CHANGED event), 'sync' (manual or
-- scheduled sync), 'reconcile' (scheduled poll of Lulu's list endpoint),
-- 'created' (order placement), 'error' (reconciliation detected a problem).
CREATE TABLE IF NOT EXISTS print_job_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  location_id   VARCHAR(255) NOT NULL,
  lulu_status   TEXT,
  local_status  VARCHAR(50) NOT NULL,
  message       TEXT,
  carrier_name  TEXT,
  tracking      JSONB DEFAULT '[]',
  changed_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  received_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source        VARCHAR(20) NOT NULL DEFAULT 'webhook',
  raw_payload   JSONB,
  UNIQUE (job_id, lulu_status, changed_at, source)
);
CREATE INDEX IF NOT EXISTS idx_pjsh_job_id ON print_job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_pjsh_changed_at ON print_job_status_history(job_id, changed_at);

-- ── 2. Lulu Webhook Bookkeeping ────────────────────────────────────────────────
-- Records each webhook subscription per location so the system can detect an
-- auto-deactivated subscription (Lulu disables after 5 consecutive failures),
-- reactivate it via PATCH /webhooks/{id}/, and avoid duplicate subscriptions
-- (Lulu enforces unique URLs).
CREATE TABLE IF NOT EXISTS lulu_webhooks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id          VARCHAR(255) NOT NULL UNIQUE,
  lulu_webhook_id      TEXT,
  url                  TEXT NOT NULL,
  topics               JSONB DEFAULT '["PRINT_JOB_STATUS_CHANGED"]',
  is_active            BOOLEAN DEFAULT TRUE,
  auto_deactivated_at  TIMESTAMP WITH TIME ZONE,
  last_submission_at   TIMESTAMP WITH TIME ZONE,
  last_check_at        TIMESTAMP WITH TIME ZONE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lulu_webhooks_location_id ON lulu_webhooks(location_id);

-- ── 3. print_jobs: tracking payload, idempotency key, external_id ──────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'idempotency_key') THEN
    ALTER TABLE print_jobs ADD COLUMN idempotency_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'external_id') THEN
    ALTER TABLE print_jobs ADD COLUMN external_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'tracking') THEN
    ALTER TABLE print_jobs ADD COLUMN tracking JSONB DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'lulu_error_detail') THEN
    ALTER TABLE print_jobs ADD COLUMN lulu_error_detail TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'estimated_shipping_dates') THEN
    ALTER TABLE print_jobs ADD COLUMN estimated_shipping_dates JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'lulu_costs') THEN
    ALTER TABLE print_jobs ADD COLUMN lulu_costs JSONB;
  END IF;
END $$;

-- Idempotency: one pending-or-created order per key per location.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
      WHERE tablename = 'print_jobs' AND indexname = 'idx_print_jobs_idempotency') THEN
    CREATE UNIQUE INDEX idx_print_jobs_idempotency ON print_jobs
      (location_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_print_jobs_idempotency_key ON print_jobs(idempotency_key);

-- ── 4. GHL pipeline stage mapping (per-location CRM config) ─────────────────────
-- Replaces the global env-var stage IDs. Each location maps a local status
-- (Sent to Print, In Production, Shipped, Delivered, Fulfillment Error,
-- Cancelled, Payment Pending, Production Delayed) to a stage in its own
-- pipeline. Empty/null stage_id disables CRM stage updates for that status.
CREATE TABLE IF NOT EXISTS ghl_pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     VARCHAR(255) NOT NULL,
  pipeline_id     TEXT,
  pipeline_name   TEXT,
  local_status    VARCHAR(50) NOT NULL,
  stage_id        TEXT,
  stage_name      TEXT,
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (location_id, local_status)
);
CREATE INDEX IF NOT EXISTS idx_ghl_pipeline_stages_location_id ON ghl_pipeline_stages(location_id);

-- ── 5. Schema migrations ledger ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum    TEXT
);
INSERT INTO schema_migrations (name, checksum) VALUES
  ('004_status_history_and_integrity', NULL)
ON CONFLICT (name) DO NOTHING;
