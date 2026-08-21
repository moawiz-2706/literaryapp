# Audit V3 - Complete Application Audit

## Root Cause of "Unexpected token '<', '<!DOCTYPE'..."

The frontend makes `fetch('/analytics?locationId=...')` and `fetch('/print-jobs?...')` calls.
In production, Vercel serves the SPA. If `VITE_API_BASE_URL` is not set, fetch calls go to the Vercel origin.
Vercel's `vercel.json` had a catch-all rewrite `/(.*) -> /index.html`, so API requests got HTML.

## Fixes Applied

1. **vercel.json** — Added explicit passthrough routes for all API paths BEFORE the catch-all
2. **api.js** — Added response interceptor that detects HTML responses and gives clear error message
3. **api.js** — Always uses VITE_API_BASE_URL as baseURL
4. **api.js** — Added exportOrdersCSV helper

## Remaining Fetch Calls to Audit

All fetch calls in frontend:
- OrdersPage: fetch('/print-jobs?...'), fetch('/print-jobs/:id/sync'), fetch('/print-jobs/sync-all'), fetch('/print-jobs/:id/reorder'), fetch('/print-jobs/export-csv?...'), fetch('/print-jobs/:id?locationId=...')
- RoyaltyDashboardPage: fetch('/analytics?locationId=...')
- AnalyticsPage: fetch('/analytics?locationId=...')
- SettingsPage: fetch('/health?locationId=...'), fetch('/analytics?locationId=...')

ALL of these need to use the API_BASE prefix when VITE_API_BASE_URL is set.
Currently they use raw fetch() which ignores the baseURL.
Need to convert them to use the axios api instance OR prepend API_BASE manually.

## Database Tables (current)
- ghl_tokens (required - GHL auth)
- lulu_tokens (LEGACY - remove)
- lulu_credentials (required - per-subaccount Lulu)
- lulu_tokens_location (LEGACY - remove)
- books (required)
- print_jobs (required)
- webhook_log (optional - useful for debugging)
- wallet_balance (LEGACY - remove)
- stripe_accounts (LEGACY - remove)

## Database Tables (clean - required only)
- ghl_tokens
- lulu_credentials
- books
- print_jobs
- webhook_log (optional but useful)
