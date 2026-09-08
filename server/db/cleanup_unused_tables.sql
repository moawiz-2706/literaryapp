-- LiteraryApp database cleanup
--
-- Run in the Supabase SQL Editor only after reviewing the row counts below.
-- This script intentionally does NOT remove credential, token, order, book,
-- webhook, status-history, trigger, or migration-ledger tables.
--
-- Confirmed by runtime-code audit:
--   wallet_balance  = legacy/unused; Lulu handles payment directly.
--   stripe_accounts = optional Stripe scaffolding; the current Stripe webhook
--                     is guarded because the Stripe service and DB upsert method
--                     are not wired in the current application.
--   lulu_webhooks_legacy and ghl_pipeline_stages_legacy = empty migration
--                     archive tables in the audited project; they are safe to
--                     remove only when the guarded row-count checks pass.
--
-- Not removed here:
--   lulu_tokens             = legacy global fallback functions still exist.
--   lulu_tokens_location    = ACTIVE per-location token cache.
--   lulu_credentials        = ACTIVE per-location client credentials.
--   lulu_webhooks_legacy    = migration archive; preserve rows until explicitly
--                             reviewed.
--   ghl_pipeline_stages_legacy = migration archive; preserve rows until reviewed.
--   schema_migrations       = migration ledger.

DO $$
DECLARE
  wallet_rows BIGINT := 0;
  stripe_rows BIGINT := 0;
  lulu_webhook_archive_rows BIGINT := 0;
  pipeline_archive_rows BIGINT := 0;
BEGIN
  IF to_regclass('public.wallet_balance') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.wallet_balance' INTO wallet_rows;
    IF wallet_rows > 0 THEN
      RAISE EXCEPTION 'Refusing to drop wallet_balance: it contains % row(s). Export/review them first.', wallet_rows;
    END IF;
    DROP TABLE public.wallet_balance;
    RAISE NOTICE 'Dropped empty public.wallet_balance';
  ELSE
    RAISE NOTICE 'public.wallet_balance does not exist';
  END IF;

  IF to_regclass('public.stripe_accounts') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.stripe_accounts' INTO stripe_rows;
    IF stripe_rows > 0 THEN
      RAISE EXCEPTION 'Refusing to drop stripe_accounts: it contains % row(s). Export/review them first.', stripe_rows;
    END IF;
    DROP TABLE public.stripe_accounts;
    RAISE NOTICE 'Dropped empty public.stripe_accounts';
  ELSE
    RAISE NOTICE 'public.stripe_accounts does not exist';
  END IF;

  IF to_regclass('public.lulu_webhooks_legacy') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.lulu_webhooks_legacy' INTO lulu_webhook_archive_rows;
    IF lulu_webhook_archive_rows > 0 THEN
      RAISE EXCEPTION 'Refusing to drop lulu_webhooks_legacy: it contains % row(s).', lulu_webhook_archive_rows;
    END IF;
    DROP TABLE public.lulu_webhooks_legacy;
    RAISE NOTICE 'Dropped empty public.lulu_webhooks_legacy';
  END IF;

  IF to_regclass('public.ghl_pipeline_stages_legacy') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.ghl_pipeline_stages_legacy' INTO pipeline_archive_rows;
    IF pipeline_archive_rows > 0 THEN
      RAISE EXCEPTION 'Refusing to drop ghl_pipeline_stages_legacy: it contains % row(s).', pipeline_archive_rows;
    END IF;
    DROP TABLE public.ghl_pipeline_stages_legacy;
    RAISE NOTICE 'Dropped empty public.ghl_pipeline_stages_legacy';
  END IF;
END $$;
