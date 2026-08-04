-- ─────────────────────────────────────────────────────────────────────────────
-- LiteraryApp — Complete Schema Migration
-- Run this in your Supabase SQL Editor.
-- All statements use IF NOT EXISTS so it's safe to run multiple times.
-- This adds ALL columns that the codebase expects.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════════
-- PRINT_JOBS TABLE — Add all missing columns
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS fulfillment_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS markup NUMERIC(10,2) DEFAULT 0;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS agency_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS wallet_charge_id UUID;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS workflow_id TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS execution_id TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS validation_error TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS shipping_level VARCHAR(50) DEFAULT 'MAIL';
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT 0;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS parent_job_id TEXT;
ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS lulu_status VARCHAR(50);

-- Create indexes (safe — IF NOT EXISTS equivalent via DO block)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_print_jobs_location_id ON print_jobs(location_id);
  CREATE INDEX IF NOT EXISTS idx_print_jobs_contact_id ON print_jobs(contact_id);
  CREATE INDEX IF NOT EXISTS idx_print_jobs_book_id ON print_jobs(book_id);
  CREATE INDEX IF NOT EXISTS idx_print_jobs_lulu_id ON print_jobs(lulu_print_job_id);
  CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- BOOKS TABLE — Add all missing columns for sample tracking
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_print_job_id TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_status VARCHAR(50);
ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_tracking_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_shipping_level VARCHAR(50);
ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_shipping_address TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_cost NUMERIC(10,2);
ALTER TABLE books ADD COLUMN IF NOT EXISTS product_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE books ADD COLUMN IF NOT EXISTS product_approved_at BIGINT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS validation_error TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS validation_details JSONB;
ALTER TABLE books ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT 0;

-- Create indexes
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_books_location_id ON books(location_id);
  CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NEW TABLES — Create if they don't exist
-- ═══════════════════════════════════════════════════════════════════════════════

-- Lulu Credentials (Per-Subaccount)
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

-- Lulu Tokens (Per-Subaccount)
CREATE TABLE IF NOT EXISTS lulu_tokens_location (
  id            SERIAL PRIMARY KEY,
  location_id   VARCHAR(255) NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lulu_tokens_location_location_id ON lulu_tokens_location(location_id);

-- Webhook Log
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

-- Wallet Balance (Legacy — not used for orders anymore)
CREATE TABLE IF NOT EXISTS wallet_balance (
  id                SERIAL PRIMARY KEY,
  location_id       VARCHAR(255) NOT NULL UNIQUE,
  balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_transaction  JSONB,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_location_id ON wallet_balance(location_id);

-- Stripe Accounts (Optional)
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id                SERIAL PRIMARY KEY,
  location_id       VARCHAR(255) NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_location_id ON stripe_accounts(location_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE — All tables and columns are now in sync with the codebase.
-- ═══════════════════════════════════════════════════════════════════════════════
