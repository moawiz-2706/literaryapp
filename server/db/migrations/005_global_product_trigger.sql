-- Persist the GHL Global Product ID that corresponds to each book/order.
-- This allows Marketplace trigger filters to match a stable product ID rather
-- than relying on the display title.
ALTER TABLE IF EXISTS print_jobs
  ADD COLUMN IF NOT EXISTS ghl_product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_print_jobs_ghl_product_id
  ON print_jobs(ghl_product_id);
