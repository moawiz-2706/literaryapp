-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Per-Subaccount Lulu Credentials
-- Adds a table to store each GHL location's own Lulu.com API credentials.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lulu_credentials (
  id              SERIAL PRIMARY KEY,
  location_id     VARCHAR(255) NOT NULL UNIQUE,
  client_id       TEXT NOT NULL,
  client_secret   TEXT NOT NULL,
  environment     VARCHAR(20) NOT NULL DEFAULT 'sandbox',  -- 'sandbox' or 'production'
  connected_at    BIGINT NOT NULL DEFAULT 0,
  updated_at      BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lulu_credentials_location_id ON lulu_credentials(location_id);

-- Table for per-location Lulu OAuth token cache
CREATE TABLE IF NOT EXISTS lulu_tokens_location (
  id            SERIAL PRIMARY KEY,
  location_id   VARCHAR(255) NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lulu_tokens_location_location_id ON lulu_tokens_location(location_id);
