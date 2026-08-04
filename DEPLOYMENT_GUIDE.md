# LiteraryApp — Deployment & Migration Guide

## Overview

This release includes:
- **Orders Page** — Full order tracking, status sync, reorder, and cost breakdowns
- **GHL Product Pricing Fix** — Prices now correctly set in cents via `/products/:id/price`
- **Database Resilience** — All inserts gracefully handle missing columns
- **Per-Subaccount Lulu** — Each GHL location uses its own Lulu credentials

---

## Step 1: Run the SQL Migration

Open your **Supabase SQL Editor** and paste the contents of `server/db/migrations/003_complete_migration.sql`. This will:

- Add `fulfillment_fee`, `markup`, `validation_error`, `sample_cost` to `print_jobs`
- Add `parent_job_id`, `lulu_status` to `print_jobs`
- Create `lulu_credentials` table (per-subaccount credentials)
- Create `lulu_tokens_location` table (per-subaccount token cache)

All `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — safe to run even if some columns exist.

---

## Step 2: Push to GitHub

```bash
cd literaryapp
git push origin main
```

Render (server) and Vercel (client) will auto-deploy.

---

## Step 3: Configure Environment Variables

In **Render** (server), ensure these are set:

| Variable | Value | Notes |
|:---|:---|:---|
| `LULU_SANDBOX` | `true` | Set to `false` for production |
| `LULU_WEBHOOK_SECRET` | Your webhook secret | Used to verify Lulu webhooks |
| `LULU_CLIENT_ID` | _(optional)_ | Fallback global credential |
| `LULU_CLIENT_SECRET` | _(optional)_ | Fallback global credential |

In **Vercel** (client), ensure:

| Variable | Value | Notes |
|:---|:---|:---|
| `VITE_API_BASE_URL` | `https://literaryapp.onrender.com` | Your Render server URL |

---

## Step 4: Configure Per-Subaccount Lulu Credentials

1. Sub-account owner opens the app in GHL
2. Clicks **"Lulu Integration"** in the sidebar
3. Follows the setup instructions to connect their Lulu sandbox account
4. Saves Client ID + Client Secret

---

## Step 5: Test the Full Flow

1. **Book Setup** — Upload a PDF, validate it, mark as Ready
2. **Approve** — Creates a GHL product with the correct retail price
3. **Sample Order** — Fill shipping form (US state dropdown required), place order
4. **Orders Page** — View the order in the Orders tab, click to see details
5. **Sync** — Click "Sync Status" to pull latest Lulu status
6. **Reorder** — Click "Reorder" to duplicate the order

---

## New Pages

| Page | URL | Purpose |
|:---|:---|:---|
| Orders | `/orders?locationId={id}` | View all orders, track status, reorder |
| Lulu Integration | `/lulu-integration?locationId={id}` | Connect per-subaccount Lulu credentials |

Both are injected into the GHL sidebar menu automatically.

---

## Troubleshooting

| Issue | Solution |
|:---|:---|
| `Could not find 'X' column` | Run the SQL migration in Supabase |
| GHL product 404 | The code now uses `Version: 2021-07-28` header which is correct |
| Lulu 400 state code | Frontend now uses US state dropdown; backend validates |
| Lulu 402 payment required | This is the wallet system — removed from all order paths |
| No tracking URL | Go to Lulu sandbox dashboard → Pay the order manually → Status updates via webhook |
| Product price missing | Check Render logs for `[GHL] Price created` — if it shows an error, share the log |
