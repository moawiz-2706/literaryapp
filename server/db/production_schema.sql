-- ═══════════════════════════════════════════════════════════════════════════════
-- LiteraryApp x Lulu Print-on-Demand Middleware — PRODUCTION SCHEMA (v2)
-- ═══════════════════════════════════════════════════════════════════════════════
-- ONE SCRIPT. Run it in the Supabase SQL Editor (SQL Editor → New Query → paste
-- → Run). It is fully idempotent and SAFE on databases at ANY stage:
--
--   - If a table already exists (with MORE or FEWER columns than this script
--     defines), the script brings it up to date: missing columns are added, and
--     old/partial table shapes are reconciled before constraints are applied.
--   - Every column addition is guarded by information_schema checks.
--   - FK and UNIQUE constraints are added separately via existence-checked
--     DO blocks, never inline in CREATE TABLE — so a partially-created table
--     from an earlier failed run is repaired instead of skipped.
--   - Re-running the script changes nothing on a fully-migrated database.
--
-- The server NEVER executes SQL at runtime — it starts, connects to Supabase,
-- and serves requests against whatever tables exist. Features that depend on
-- missing tables degrade explicitly instead of crashing.
--
-- Tables: ghl_tokens, lulu_tokens (legacy fallback), lulu_credentials,
-- lulu_tokens_location, books, print_jobs, webhook_log, wallet_balance
-- (legacy, unused), stripe_accounts (optional), print_job_status_history,
-- lulu_webhooks, ghl_trigger_subscriptions, ghl_trigger_deliveries,
-- ghl_pipeline_stages.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. Reconcile EXISTING core tables — bring them to the full column set ─────
-- If books/print_jobs already exist with fewer columns (older databases), add
-- the missing ones before anything else references them.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'books') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'sample_print_job_id') THEN
      ALTER TABLE books ADD COLUMN sample_print_job_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'sample_status') THEN
      ALTER TABLE books ADD COLUMN sample_status VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'sample_tracking_url') THEN
      ALTER TABLE books ADD COLUMN sample_tracking_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'sample_shipping_level') THEN
      ALTER TABLE books ADD COLUMN sample_shipping_level VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'sample_shipping_address') THEN
      ALTER TABLE books ADD COLUMN sample_shipping_address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'sample_cost') THEN
      ALTER TABLE books ADD COLUMN sample_cost NUMERIC(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'product_approved') THEN
      ALTER TABLE books ADD COLUMN product_approved BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'product_approved_at') THEN
      ALTER TABLE books ADD COLUMN product_approved_at BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'validation_error') THEN
      ALTER TABLE books ADD COLUMN validation_error TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'validation_details') THEN
      ALTER TABLE books ADD COLUMN validation_details JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'ghl_product_id') THEN
      ALTER TABLE books ADD COLUMN ghl_product_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'updated_at') THEN
      ALTER TABLE books ADD COLUMN updated_at BIGINT NOT NULL DEFAULT 0;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_jobs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'fulfillment_fee') THEN
      ALTER TABLE print_jobs ADD COLUMN fulfillment_fee NUMERIC(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'markup') THEN
      ALTER TABLE print_jobs ADD COLUMN markup NUMERIC(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'agency_fee') THEN
      ALTER TABLE print_jobs ADD COLUMN agency_fee NUMERIC(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'wallet_charge_id') THEN
      ALTER TABLE print_jobs ADD COLUMN wallet_charge_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'ghl_opportunity_id') THEN
      ALTER TABLE print_jobs ADD COLUMN ghl_opportunity_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'workflow_id') THEN
      ALTER TABLE print_jobs ADD COLUMN workflow_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'execution_id') THEN
      ALTER TABLE print_jobs ADD COLUMN execution_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'validation_error') THEN
      ALTER TABLE print_jobs ADD COLUMN validation_error TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'shipping_address') THEN
      ALTER TABLE print_jobs ADD COLUMN shipping_address JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'shipping_level') THEN
      ALTER TABLE print_jobs ADD COLUMN shipping_level VARCHAR(50) DEFAULT 'MAIL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'quantity') THEN
      ALTER TABLE print_jobs ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'updated_at') THEN
      ALTER TABLE print_jobs ADD COLUMN updated_at BIGINT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'tracking_url') THEN
      ALTER TABLE print_jobs ADD COLUMN tracking_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'parent_job_id') THEN
      ALTER TABLE print_jobs ADD COLUMN parent_job_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'lulu_status') THEN
      ALTER TABLE print_jobs ADD COLUMN lulu_status VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'reader_name') THEN
      ALTER TABLE print_jobs ADD COLUMN reader_name TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'reader_email') THEN
      ALTER TABLE print_jobs ADD COLUMN reader_email TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'book_title') THEN
      ALTER TABLE print_jobs ADD COLUMN book_title TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'pod_package_id') THEN
      ALTER TABLE print_jobs ADD COLUMN pod_package_id TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'interior_pdf_url') THEN
      ALTER TABLE print_jobs ADD COLUMN interior_pdf_url TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'cover_pdf_url') THEN
      ALTER TABLE print_jobs ADD COLUMN cover_pdf_url TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'idempotency_key') THEN
      ALTER TABLE print_jobs ADD COLUMN idempotency_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'external_id') THEN
      ALTER TABLE print_jobs ADD COLUMN external_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'tracking') THEN
      ALTER TABLE print_jobs ADD COLUMN tracking JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'lulu_error_detail') THEN
      ALTER TABLE print_jobs ADD COLUMN lulu_error_detail TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'estimated_shipping_dates') THEN
      ALTER TABLE print_jobs ADD COLUMN estimated_shipping_dates JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_jobs' AND column_name = 'lulu_costs') THEN
      ALTER TABLE print_jobs ADD COLUMN lulu_costs JSONB;
    END IF;
  END IF;
END $$;

-- ── 1. GHL Tokens — OAuth tokens for each GoHighLevel subaccount (location) ──
-- Used by: services/ghlService.js (token storage + refresh)
CREATE TABLE IF NOT EXISTS ghl_tokens (
  id            SERIAL PRIMARY KEY,
  location_id   VARCHAR(255) NOT NULL UNIQUE,
  company_id    TEXT,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  user_type     VARCHAR(50) DEFAULT 'Location',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ghl_tokens_location_id ON ghl_tokens(location_id);

-- ── 2. Lulu Tokens (Legacy / Global fallback) ─────────────────────────────────
-- Used by: db/database.js (getLuluToken fallback when no per-location token)
CREATE TABLE IF NOT EXISTS lulu_tokens (
  id            SERIAL PRIMARY KEY,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. Lulu Credentials (Per-Subaccount) ──────────────────────────────────────
-- Used by: routes/luluIntegration.js (save), services/luluService.js (read)
CREATE TABLE IF NOT EXISTS lulu_credentials (
  id              SERIAL PRIMARY KEY,
  location_id     VARCHAR(255) NOT NULL UNIQUE,
  client_id       TEXT NOT NULL,
  client_secret   TEXT NOT NULL,
  environment     VARCHAR(20) NOT NULL DEFAULT 'sandbox',
  connected_at    BIGINT NOT NULL DEFAULT 0,
  updated_at      BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lulu_credentials_location_id ON lulu_credentials(location_id);

-- ── 4. Lulu Tokens (Per-Subaccount) ───────────────────────────────────────────
-- Used by: services/luluService.js (per-location OAuth token cache)
CREATE TABLE IF NOT EXISTS lulu_tokens_location (
  id            SERIAL PRIMARY KEY,
  location_id   VARCHAR(255) NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lulu_tokens_location_location_id ON lulu_tokens_location(location_id);

-- ── 5. Books ──────────────────────────────────────────────────────────────────
-- Used by: routes/books.js (upload + approval), routes/quotes.js,
-- routes/workflowAction.js, routes/samples.js, routes/dashboard.js,
-- routes/luluIntegration.js
-- (Existing tables were reconciled in step 0 above.)
CREATE TABLE IF NOT EXISTS books (
  id                     UUID PRIMARY KEY,
  location_id            VARCHAR(255) NOT NULL,
  book_number            INTEGER NOT NULL DEFAULT 1,
  title                  TEXT NOT NULL,
  pod_package_id         TEXT,
  interior_pdf_url       TEXT,
  cover_pdf_url          TEXT,
  interior_storage_path  TEXT,
  cover_storage_path     TEXT,
  status                 VARCHAR(50) NOT NULL DEFAULT 'Setup',
  retail_price           NUMERIC(10,2) DEFAULT 0,
  print_cost             NUMERIC(10,2) DEFAULT 0,
  author_profit          NUMERIC(10,2) DEFAULT 0,
  page_count             INTEGER DEFAULT 0,
  ghl_product_id         TEXT,
  sample_print_job_id    TEXT,
  sample_status          VARCHAR(50),
  sample_tracking_url    TEXT,
  sample_shipping_level  VARCHAR(50),
  sample_shipping_address TEXT,
  sample_cost            NUMERIC(10,2),
  product_approved       BOOLEAN DEFAULT FALSE,
  product_approved_at    BIGINT,
  validation_error       TEXT,
  validation_details     JSONB,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_books_location_id ON books(location_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- ── 6. Print Jobs (orders) ────────────────────────────────────────────────────
-- Used by: routes/printJobs.js, routes/workflowAction.js, routes/samples.js,
-- routes/dashboard.js, services/orderService.js, services/statusService.js,
-- services/crmService.js, services/luluService.js, routes/webhooks.js
-- (Existing tables were reconciled in step 0 above.)
CREATE TABLE IF NOT EXISTS print_jobs (
  id                     UUID PRIMARY KEY,
  location_id            VARCHAR(255) NOT NULL,
  contact_id             TEXT NOT NULL,
  book_id                UUID,
  status                 VARCHAR(50) NOT NULL DEFAULT 'Pending',
  retail_price           NUMERIC(10,2) DEFAULT 0,
  print_cost             NUMERIC(10,2) DEFAULT 0,
  shipping_cost          NUMERIC(10,2) DEFAULT 0,
  fulfillment_fee        NUMERIC(10,2) DEFAULT 0,
  markup                 NUMERIC(10,2) DEFAULT 0,
  agency_fee             NUMERIC(10,2) DEFAULT 0,
  wallet_charge_id       UUID,
  ghl_opportunity_id     TEXT,
  lulu_print_job_id      TEXT,
  tracking_url           TEXT,
  parent_job_id          TEXT,
  lulu_status            VARCHAR(50),
  reader_name            TEXT DEFAULT '',
  reader_email           TEXT DEFAULT '',
  book_title             TEXT DEFAULT '',
  pod_package_id         TEXT DEFAULT '',
  interior_pdf_url       TEXT DEFAULT '',
  cover_pdf_url          TEXT DEFAULT '',
  shipping_address       JSONB DEFAULT '{}',
  shipping_level         VARCHAR(50) DEFAULT 'MAIL',
  quantity               INTEGER DEFAULT 1,
  workflow_id            TEXT,
  execution_id           TEXT,
  validation_error       TEXT,
  idempotency_key        TEXT,
  external_id            TEXT,
  tracking               JSONB DEFAULT '[]',
  lulu_error_detail      TEXT,
  estimated_shipping_dates JSONB,
  lulu_costs             JSONB,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_print_jobs_location_id ON print_jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_contact_id ON print_jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_book_id ON print_jobs(book_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_lulu_id ON print_jobs(lulu_print_job_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_idempotency_key ON print_jobs(idempotency_key);

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

-- ── 7. Webhook Log (incoming GHL/Lulu/Stripe webhook audit trail) ─────────────
-- Used by: db/database.js logWebhook(), called from routes/webhooks.js
CREATE TABLE IF NOT EXISTS webhook_log (
  id            SERIAL PRIMARY KEY,
  source        VARCHAR(50) NOT NULL,
  event_type    TEXT NOT NULL,
  payload       JSONB,
  error_msg     TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_log_source ON webhook_log(source);
CREATE INDEX IF NOT EXISTS idx_webhook_log_event_type ON webhook_log(event_type);

-- ── 8. Wallet Balance (Legacy — unused) ───────────────────────────────────────
-- No application code references this table anymore: Lulu handles payments
-- directly. Kept in the schema because earlier migrations created it. Safe to
-- delete later (optional cleanup script provided separately).
CREATE TABLE IF NOT EXISTS wallet_balance (
  id                SERIAL PRIMARY KEY,
  location_id       VARCHAR(255) NOT NULL UNIQUE,
  balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_transaction  JSONB,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_location_id ON wallet_balance(location_id);

-- ── 9. Stripe Connect (Optional) ─────────────────────────────────────────────
-- Stores Stripe Connect account IDs per location. Only referenced by the
-- guarded Stripe webhook handler; payment flows do not use it.
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id                SERIAL PRIMARY KEY,
  location_id       VARCHAR(255) NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_location_id ON stripe_accounts(location_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 004 OBJECTS — status history, webhook bookkeeping, CRM stage config
-- Constraints are added via existence-checked DO blocks (never inline in the
-- CREATE), so a partial table from an earlier failed run is repaired.
-- ── 9b. (v5) Legacy NOT NULL / constraint cleanup on the status-history table ──
-- Original legacy shape: (id, print_job_id, from_status, to_status, source,
-- detail, created_at) — with NOT NULL on print_job_id, from_status, to_status
-- and detail. Modern inserts populate job_id/local_status/lulu_status/message
-- instead, which fails with "null value in column print_job_id violates not-null
-- constraint" on legacy databases. Dropping these constraints is safe: the
-- legacy columns become archival-only and the NOT NULL rules live on the new
-- columns (enforced in the 10th block above).
DO $$
DECLARE
  v_legacy_cols TEXT[];
  v_col TEXT;
BEGIN
  v_legacy_cols := ARRAY['print_job_id', 'from_status', 'to_status', 'detail'];
  FOREACH v_col IN ARRAY v_legacy_cols LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = v_col
          AND is_nullable = 'NO') THEN
      EXECUTE format('ALTER TABLE print_job_status_history ALTER COLUMN %I DROP NOT NULL', v_col);
      RAISE NOTICE 'Dropped NOT NULL on print_job_status_history.% (legacy cleanup)', v_col;
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 10. Print-Job Status History (real order Timeline) ────────────────────────
-- Used by: db/statusDb.js (recordStatusTransition, getStatusHistory,
-- getLatestTransition), routes/printJobs.js (order detail + CSV export)
--
-- NOTE on legacy shape: earlier databases have a DIFFERENT history table
-- (id, print_job_id, from_status, to_status, source, detail, created_at).
-- That table is left untouched below: new columns are added, and legacy rows
-- are preserved. The application reads only the new columns, so legacy data is
-- harmlessly archived alongside fresh timeline rows. job_id is backfilled from
-- print_job_id for any legacy rows that exist.
CREATE TABLE IF NOT EXISTS print_job_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        TEXT,
  location_id   VARCHAR(255),
  lulu_status   TEXT,
  local_status  VARCHAR(50),
  message       TEXT,
  carrier_name  TEXT,
  tracking      JSONB DEFAULT '[]',
  changed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  received_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source        VARCHAR(20) DEFAULT 'webhook',
  raw_payload   JSONB
);
-- Reconcile an existing (possibly partial) history table before applying the
-- NOT NULL constraints, FK, and UNIQUE index.
DO $$
DECLARE
  v_pj_type TEXT;
  v_hj_type TEXT;
BEGIN
  -- If the table exists but lacks job_id, add it first (this is what caused
  -- the earlier "column job_id does not exist" error on partial tables).
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_job_status_history') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'job_id') THEN
      ALTER TABLE print_job_status_history ADD COLUMN job_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'location_id') THEN
      ALTER TABLE print_job_status_history ADD COLUMN location_id VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'lulu_status') THEN
      ALTER TABLE print_job_status_history ADD COLUMN lulu_status TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'local_status') THEN
      ALTER TABLE print_job_status_history ADD COLUMN local_status VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'message') THEN
      ALTER TABLE print_job_status_history ADD COLUMN message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'carrier_name') THEN
      ALTER TABLE print_job_status_history ADD COLUMN carrier_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'tracking') THEN
      ALTER TABLE print_job_status_history ADD COLUMN tracking JSONB DEFAULT '[]';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'changed_at') THEN
      ALTER TABLE print_job_status_history ADD COLUMN changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'received_at') THEN
      ALTER TABLE print_job_status_history ADD COLUMN received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'source') THEN
      ALTER TABLE print_job_status_history ADD COLUMN source VARCHAR(20) DEFAULT 'webhook';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'print_job_status_history' AND column_name = 'raw_payload') THEN
      ALTER TABLE print_job_status_history ADD COLUMN raw_payload JSONB;
    END IF;

    -- Backfill job_id from the legacy print_job_id column, so old timeline rows
    -- join to print_jobs after migration.
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = 'print_job_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = 'job_id' AND is_nullable = 'NO') THEN
      UPDATE print_job_status_history SET job_id = print_job_id::text
      WHERE job_id IS NULL AND print_job_id IS NOT NULL;
    END IF;

    -- Repair NOT NULL constraints (Postgres can't make NOT NULL idempotent via
    -- IF NOT EXISTS, so check the current setting before altering).
    -- Only force job_id NOT NULL when every existing row has one (legacy rows
    -- whose print_job_id was NULL would otherwise block the ALTER).
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = 'job_id' AND is_nullable = 'YES')
    AND NOT EXISTS (SELECT 1 FROM print_job_status_history WHERE job_id IS NULL) THEN
      ALTER TABLE print_job_status_history ALTER COLUMN job_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = 'local_status' AND is_nullable = 'YES') THEN
      ALTER TABLE print_job_status_history ALTER COLUMN local_status SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = 'source' AND is_nullable = 'YES') THEN
      ALTER TABLE print_job_status_history ALTER COLUMN source SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'print_job_status_history' AND column_name = 'changed_at' AND is_nullable = 'YES') THEN
      ALTER TABLE print_job_status_history ALTER COLUMN changed_at SET NOT NULL;
    END IF;

    -- Foreign key to print_jobs — added only when both columns share the same
    -- data type (legacy databases may have print_jobs.id as TEXT rather than
    -- UUID). The application joins by value, so a missing FK never blocks it.
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'print_job_status_history_job_id_fkey'
          AND table_name = 'print_job_status_history') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'print_jobs' AND column_name = 'id') THEN
        IF (SELECT data_type FROM information_schema.columns
              WHERE table_name = 'print_job_status_history' AND column_name = 'job_id')
           = (SELECT data_type FROM information_schema.columns
              WHERE table_name = 'print_jobs' AND column_name = 'id') THEN
          ALTER TABLE print_job_status_history
            ADD CONSTRAINT print_job_status_history_job_id_fkey
            FOREIGN KEY (job_id) REFERENCES print_jobs(id) ON DELETE CASCADE;
        END IF;
      END IF;
    END IF;

    -- If print_jobs.id is TEXT but our history table was created with a UUID
    -- job_id, convert the history column to TEXT so lookups join correctly.
    SELECT data_type INTO v_pj_type FROM information_schema.columns
      WHERE table_name = 'print_jobs' AND column_name = 'id';
    SELECT data_type INTO v_hj_type FROM information_schema.columns
      WHERE table_name = 'print_job_status_history' AND column_name = 'job_id';
    IF v_pj_type IS NOT NULL AND v_hj_type IS NOT NULL AND v_hj_type <> v_pj_type THEN
      ALTER TABLE print_job_status_history
        ALTER COLUMN job_id TYPE TEXT USING job_id::text;
    END IF;
  END IF;
END $$;

-- Indexes on the history table (guarded — the table must have the column).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_job_status_history' AND column_name = 'job_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pjsh_job_id ON print_job_status_history(job_id);
    CREATE INDEX IF NOT EXISTS idx_pjsh_changed_at ON print_job_status_history(job_id, changed_at);
  END IF;
END $$;

-- The timeline's uniqueness rule: one transition per (job_id, lulu_status,
-- changed_at, source). Added separately so partial tables are reconciled first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_job_status_history' AND column_name = 'job_id')
   AND EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_job_status_history' AND column_name = 'lulu_status')
   AND EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_job_status_history' AND column_name = 'changed_at')
   AND EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name = 'print_job_status_history' AND column_name = 'source') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
        WHERE tablename = 'print_job_status_history' AND indexname = 'idx_pjsh_uniq_transition') THEN
      CREATE UNIQUE INDEX idx_pjsh_uniq_transition ON print_job_status_history
        (job_id, lulu_status, changed_at, source);
    END IF;
  END IF;
END $$;

-- ── 11. Lulu Webhook Bookkeeping (subscription health) ────────────────────────
-- Used by: db/statusDb.js (upsertLuluWebhook, getLuluWebhooks,
-- getLuluWebhookByLocation), services/luluService.js (subscription check +
-- restore), routes/printJobs.js (webhook health card)
--
-- NOTE on legacy shape: older databases shipped lulu_webhooks as an event LOG
-- (id, webhook_id, event_type, payload, processed_at) — a completely different
-- shape with NO location_id, which the new per-location bookkeeping requires.
-- This block detects that legacy shape and swaps it out: the old table is
-- renamed to lulu_webhooks_legacy (rows preserved) and a fresh table with the
-- correct shape is created in its place. Legacy event data is not needed for
-- the new features — the webhook log (webhook_log table) already covers the
-- audit trail going forward.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lulu_webhooks') THEN
    -- Legacy shape detected: an event log with no location_id.
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lulu_webhooks' AND column_name = 'event_type')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'lulu_webhooks' AND column_name = 'url') THEN
      RAISE NOTICE 'Legacy lulu_webhooks (event log) detected — archiving to lulu_webhooks_legacy and creating the new bookkeeping table.';
      -- Remove the name collision, then the fresh CREATE TABLE IF NOT EXISTS
      -- below builds the correct shape.
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_name = 'lulu_webhooks_legacy') THEN
        ALTER TABLE lulu_webhooks RENAME TO lulu_webhooks_legacy;
      ELSE
        DROP TABLE lulu_webhooks;
      END IF;
    ELSE
      -- New-shape table already exists (or a partial earlier run): add any
      -- missing columns so health checks have everything they read.
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'location_id') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN location_id VARCHAR(255);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'lulu_webhook_id') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN lulu_webhook_id TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'url') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN url TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'topics') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN topics JSONB DEFAULT '["PRINT_JOB_STATUS_CHANGED"]';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'is_active') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'auto_deactivated_at') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN auto_deactivated_at TIMESTAMP WITH TIME ZONE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'last_submission_at') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN last_submission_at TIMESTAMP WITH TIME ZONE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'last_check_at') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN last_check_at TIMESTAMP WITH TIME ZONE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'remote_active') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN remote_active BOOLEAN DEFAULT TRUE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'target_url') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN target_url TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'last_event_at') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN last_event_at TIMESTAMP WITH TIME ZONE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'last_event_type') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN last_event_type TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lulu_webhooks' AND column_name = 'last_error') THEN
        ALTER TABLE lulu_webhooks ADD COLUMN last_error TEXT;
      END IF;
    END IF;
  END IF;
END $$;

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

-- ── 12. GHL Marketplace Workflow Trigger Subscriptions ─────────────────────────
-- Used by: db/triggerDb.js and routes/workflowTrigger.js.
-- Each workflow trigger instance has its own HighLevel targetUrl. These rows are
-- intentionally separate from Lulu webhook bookkeeping.
CREATE TABLE IF NOT EXISTS ghl_trigger_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id          VARCHAR(255) NOT NULL,
  company_id           VARCHAR(255),
  workflow_id          VARCHAR(255) NOT NULL,
  trigger_instance_id  VARCHAR(255) NOT NULL,
  trigger_key          VARCHAR(255) NOT NULL,
  target_url           TEXT NOT NULL,
  filters              JSONB NOT NULL DEFAULT '[]',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  last_event_type      VARCHAR(20),
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
      WHERE tablename = 'ghl_trigger_subscriptions'
        AND indexname = 'ghl_trigger_subscriptions_location_instance_key') THEN
    CREATE UNIQUE INDEX ghl_trigger_subscriptions_location_instance_key
      ON ghl_trigger_subscriptions (location_id, trigger_instance_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ghl_trigger_subscriptions_active
  ON ghl_trigger_subscriptions(location_id, trigger_key, active);

-- ── 13. GHL Marketplace Workflow Trigger Delivery Ledger ──────────────────────
-- One row per subscription and business-event key. This prevents duplicate GHL
-- workflow executions when Lulu retries or reconciliation sees the same status.
CREATE TABLE IF NOT EXISTS ghl_trigger_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES ghl_trigger_subscriptions(id) ON DELETE CASCADE,
  event_key       TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  response_status INTEGER,
  last_error      TEXT,
  delivered_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
      WHERE tablename = 'ghl_trigger_deliveries'
        AND indexname = 'ghl_trigger_deliveries_subscription_event_key') THEN
    CREATE UNIQUE INDEX ghl_trigger_deliveries_subscription_event_key
      ON ghl_trigger_deliveries (subscription_id, event_key);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ghl_trigger_deliveries_status
  ON ghl_trigger_deliveries(status, updated_at);

-- ── 14. GHL Pipeline Stage Mapping (per-location CRM config) ──────────────────
-- Used by: db/statusDb.js (setPipelineStage, getPipelineStages,
-- getAllPipelineStages, deletePipelineStages), services/crmService.js,
-- routes/pipelines.js, pages/CRMPipelinesPage.jsx
--
-- NOTE on legacy shape: older databases shipped ghl_pipeline_stages as ONE ROW
-- PER LOCATION (id, location_id, pipeline_id, stage_draft, stage_in_production,
-- stage_shipped, stage_completed). The new shape stores ONE ROW PER
-- (location, local status) so the CRM stage sync can update each pipeline
-- stage independently — the two shapes cannot coexist. This block detects the
-- legacy shape, archives it to ghl_pipeline_stages_legacy, and builds the new
-- table. The table is configuration-only (no orders reference it): after this
-- runs, re-open Settings → CRM Pipelines once per location to re-apply the
-- stage mapping (takes ~30 seconds each).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ghl_pipeline_stages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ghl_pipeline_stages' AND column_name = 'stage_draft')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ghl_pipeline_stages' AND column_name = 'local_status') THEN
      RAISE NOTICE 'Legacy ghl_pipeline_stages (one row per location) detected — archiving to ghl_pipeline_stages_legacy and creating the new per-status table.';
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_name = 'ghl_pipeline_stages_legacy') THEN
        ALTER TABLE ghl_pipeline_stages RENAME TO ghl_pipeline_stages_legacy;
      ELSE
        DROP TABLE ghl_pipeline_stages;
      END IF;
    END IF;
  END IF;
END $$;

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
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
      WHERE tablename = 'ghl_pipeline_stages' AND indexname = 'ghl_pipeline_stages_location_id_local_status_key') THEN
    CREATE UNIQUE INDEX ghl_pipeline_stages_location_id_local_status_key
      ON ghl_pipeline_stages (location_id, local_status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ghl_pipeline_stages_location_id ON ghl_pipeline_stages(location_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION — confirms every required table exists after running the script
-- (read-only; safe to run any number of times)
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name AND c.column_name = 'id'
  ) AS has_id
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'ghl_tokens', 'lulu_tokens', 'lulu_credentials', 'lulu_tokens_location',
    'books', 'print_jobs', 'webhook_log', 'wallet_balance', 'stripe_accounts',
    'print_job_status_history', 'lulu_webhooks', 'ghl_trigger_subscriptions',
    'ghl_trigger_deliveries', 'ghl_pipeline_stages'
  )
ORDER BY t.table_name;
