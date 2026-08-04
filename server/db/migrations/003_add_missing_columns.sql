-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Add missing columns to existing print_jobs table
-- Run this in Supabase SQL Editor to add any columns that are missing.
-- SAFE TO RUN: Uses IF NOT EXISTS pattern via DO blocks.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add fulfillment_fee column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'fulfillment_fee'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN fulfillment_fee NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added column fulfillment_fee to print_jobs';
  ELSE
    RAISE NOTICE 'Column fulfillment_fee already exists';
  END IF;
END $$;

-- Add agency_fee column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'agency_fee'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN agency_fee NUMERIC(10,2) DEFAULT 0;
    RAISE NOTICE 'Added column agency_fee to print_jobs';
  ELSE
    RAISE NOTICE 'Column agency_fee already exists';
  END IF;
END $$;

-- Add workflow_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'workflow_id'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN workflow_id TEXT;
    RAISE NOTICE 'Added column workflow_id to print_jobs';
  ELSE
    RAISE NOTICE 'Column workflow_id already exists';
  END IF;
END $$;

-- Add execution_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'execution_id'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN execution_id TEXT;
    RAISE NOTICE 'Added column execution_id to print_jobs';
  ELSE
    RAISE NOTICE 'Column execution_id already exists';
  END IF;
END $$;

-- Add shipping_address as JSONB if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN shipping_address JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column shipping_address to print_jobs';
  ELSE
    RAISE NOTICE 'Column shipping_address already exists';
  END IF;
END $$;

-- Add shipping_level column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'shipping_level'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN shipping_level VARCHAR(50) DEFAULT 'MAIL';
    RAISE NOTICE 'Added column shipping_level to print_jobs';
  ELSE
    RAISE NOTICE 'Column shipping_level already exists';
  END IF;
END $$;

-- Add quantity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN quantity INTEGER DEFAULT 1;
    RAISE NOTICE 'Added column quantity to print_jobs';
  ELSE
    RAISE NOTICE 'Column quantity already exists';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'print_jobs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE print_jobs ADD COLUMN updated_at BIGINT DEFAULT 0;
    RAISE NOTICE 'Added column updated_at to print_jobs';
  ELSE
    RAISE NOTICE 'Column updated_at already exists';
  END IF;
END $$;

-- ── Also ensure lulu_credentials table exists ────────────────────────────────

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

CREATE TABLE IF NOT EXISTS lulu_tokens_location (
  id            SERIAL PRIMARY KEY,
  location_id   VARCHAR(255) NOT NULL UNIQUE,
  access_token  TEXT NOT NULL,
  expires_at    BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lulu_tokens_location_location_id ON lulu_tokens_location(location_id);
