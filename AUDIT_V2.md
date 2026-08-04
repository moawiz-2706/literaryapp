# Full Audit Findings — LiteraryApp v2

## Critical Issues (Root Causes)

### 1. ALL fetch calls use wrong URL prefix `/api/`
Every page that uses `fetch()` calls `/api/print-jobs/...`, `/api/dashboard/analytics`, `/api/dashboard/health`.
The backend is mounted at root paths: `/print-jobs`, `/analytics`, `/health`, `/royalties`.
There is NO `/api` prefix on the backend.
The Vite proxy also does NOT include `/api` or `/dashboard` mappings.

**Files affected:**
- OrdersPage.jsx: 5 fetch calls (list, sync, sync-all, reorder, export-csv, detail)
- RoyaltyDashboardPage.jsx: 1 fetch call (analytics)
- AnalyticsPage.jsx: 1 fetch call (analytics)
- SettingsPage.jsx: 2 fetch calls (health, audit log)

**Fix:** Change all `fetch('/api/...')` to `fetch('/...')` matching actual backend routes.
Also add `/analytics` and `/dashboard` proxy entries to vite.config.js for dev.

### 2. AppLayout sidebar wraps ALL pages (user explicitly said NO sidebar)
All 4 pages import and wrap content in `<AppLayout>`:
- RoyaltyDashboardPage.jsx
- OrdersPage.jsx
- AnalyticsPage.jsx
- SettingsPage.jsx

**Fix:** Remove AppLayout import and wrapping from all pages.

### 3. handleViewOrder is a no-op stub (orders can't open detail)
OrdersPage.jsx line 629-631: `handleViewOrder` does nothing.
`onRowClick={handleViewOrder}` passes the order but nothing happens.

**Fix:** Wire `handleViewOrder` to `openDetail(order)`.

### 4. AnalyticsPage cost breakdown uses wrong key names
Backend returns: `summary.totalShipping`, `summary.totalFulfillment`
Frontend reads: `summary.totalShippingCost`, `summary.totalFulfillmentFees`

**Fix:** Align frontend keys with backend response.

### 5. OrdersPage reordering sends wrong body
Reorder body sends `{ locationId, quantity, shippingLevel }` but backend reorder route expects:
`{ locationId, shippingAddress, shippingLevel }` — missing shippingAddress.

**Fix:** Pass shippingAddress in the reorder body.

## Medium Issues

### 6. RoyaltyDashboardPage analytics call doesn't pass period
Dashboard calls `/api/dashboard/analytics?locationId=...` (no period param).
AnalyticsPage calls with `&period=...` but backend `/analytics` ignores period param anyway.

### 7. Vite proxy missing /analytics and /dashboard
Need to add these to vite.config.js proxy for dev environment.
