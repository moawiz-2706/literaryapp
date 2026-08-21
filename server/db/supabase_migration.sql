-- ─────────────────────────────────────────────────────────────────────────────
-- LiteraryApp x Lulu Print-on-Demand Middleware — Complete Supabase Schema
-- Run this in your Supabase SQL Editor to create all required tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. GHL Tokens ─────────────────────────────────────────────────────────────
-- Stores OAuth tokens for each GHL subaccount (location).

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

-- ── 2. Lulu Tokens (Legacy — Global) ──────────────────────────────────────────
-- Legacy table for the original single-account architecture.
-- Still used as fallback when a location has no per-subaccount credentials.

CREATE TABLE IF NOT EXISTS lulu_tokens (
  id            SERIAL PRIMARY KEY,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. Lulu Credentials (Per-Subaccount) ──────────────────────────────────────
-- Each GHL location stores its own Lulu.com API credentials.

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

-- ── 4. Lulu Tokens (Per-Subaccount) ──────────────────────────────────────────
-- Stores OAuth tokens scoped by location so each subaccount has its own cache.

CREATE TABLE IF NOT EXISTS lulu_tokens_location (
  id            SERIAL PRIMARY KEY,
  location_id   VARCHAR(255) NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lulu_tokens_location_location_id ON lulu_tokens_location(location_id);

-- ── 5. Books ──────────────────────────────────────────────────────────────────
-- Stores uploaded books with their POD package ID, PDF URLs, and status.

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
  -- Sample order tracking
  sample_print_job_id    TEXT,
  sample_status          VARCHAR(50),
  sample_tracking_url    TEXT,
  sample_shipping_level  VARCHAR(50),
  sample_shipping_address TEXT,
  -- Product approval
  product_approved       BOOLEAN DEFAULT FALSE,
  product_approved_at    BIGINT,
  -- Validation error tracking
  validation_error       TEXT,
  validation_details     JSONB,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_books_location_id ON books(location_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- ── 6. Print Jobs ─────────────────────────────────────────────────────────────
-- Stores all print job orders (samples, workflow actions, direct orders).

CREATE TABLE IF NOT EXISTS print_jobs (
  id                   UUID PRIMARY KEY,
  location_id          VARCHAR(255) NOT NULL,
  contact_id           TEXT NOT NULL,
  book_id              UUID,
  status               VARCHAR(50) NOT NULL DEFAULT 'Pending',
  retail_price         NUMERIC(10,2) DEFAULT 0,
  print_cost           NUMERIC(10,2) DEFAULT 0,
  shipping_cost        NUMERIC(10,2) DEFAULT 0,
  fulfillment_fee      NUMERIC(10,2) DEFAULT 0,
  markup               NUMERIC(10,2) DEFAULT 0,
  agency_fee           NUMERIC(10,2) DEFAULT 0,
  wallet_charge_id     UUID,
  ghl_opportunity_id   TEXT,
  lulu_print_job_id    TEXT,
  tracking_url         TEXT,
  reader_name          TEXT DEFAULT '',
  reader_email         TEXT DEFAULT '',
  book_title           TEXT DEFAULT '',
  pod_package_id       TEXT DEFAULT '',
  interior_pdf_url     TEXT DEFAULT '',
  cover_pdf_url        TEXT DEFAULT '',
  shipping_address     JSONB DEFAULT '{}',
  shipping_level       VARCHAR(50) DEFAULT 'MAIL',
  quantity             INTEGER DEFAULT 1,
  workflow_id          TEXT,
  execution_id         TEXT,
  validation_error     TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_location_id ON print_jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_contact_id ON print_jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_book_id ON print_jobs(book_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_lulu_id ON print_jobs(lulu_print_job_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);

-- ── 7. Webhook Log ────────────────────────────────────────────────────────────
-- Stores all incoming webhook payloads for debugging and audit.

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

-- ── 8. Wallet Balance (Optional — Legacy) ─────────────────────────────────────
-- Legacy table for the wallet system. No longer used for order payment
-- (Lulu handles payment directly), but kept for backward compatibility
-- and potential future use (e.g., refund tracking).

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
-- Stores Stripe Connect account IDs for each GHL location.
-- Used if you want to accept payments via Stripe instead of/in addition to Lulu.

CREATE TABLE IF NOT EXISTS stripe_accounts (
  id                SERIAL PRIMARY KEY,
  location_id       VARCHAR(255) NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_accounts_location_id ON stripe_accounts(location_id);
