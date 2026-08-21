# LiteraryApp Production Audit Report — v2.1

## Executive Summary

A complete end-to-end audit was performed on the LiteraryApp codebase. The primary issue ("Unexpected token '<', '<!DOCTYPE'...") was caused by frontend fetch calls using relative URLs that, in production on Vercel, hit the SPA origin instead of the Render backend. This was resolved by rewriting all pages to use the shared `api.js` axios client, which prepends `VITE_API_BASE_URL` and validates response content-types.

All pages, routes, services, and integrations were audited. Every file passes syntax validation and the frontend builds cleanly with zero errors.

---

## Root Cause: "Failed to load orders" / "Unexpected token '<'"

| Cause | Explanation |
|:---|:---|
| **Relative fetch URLs** | Pages used `fetch('/print-jobs?...')` which in production goes to the Vercel origin, not Render |
| **Vercel SPA rewrite** | `vercel.json` rewrites unknown paths to `/index.html`, returning HTML instead of JSON |
| **No base URL prefix** | The `api.js` axios client supports `VITE_API_BASE_URL` but pages bypassed it with raw `fetch` |

### Fix Applied

1. **All 4 pages rewritten** to use named exports from `api.js` instead of raw `fetch`
2. **Content-type validation interceptor** added to `api.js` — catches HTML responses and provides a clear error message
3. **`vercel.json`** updated with self-rewrite entries for all API paths (defense in depth)

---

## Bugs Fixed

| # | Issue | Location | Fix |
|:---|:---|:---|:---|
| 1 | "Failed to load orders" error | `OrdersPage.jsx` — 6 raw `fetch` calls | Replaced with `api.js` named exports |
| 2 | Dashboard shows no data | `RoyaltyDashboardPage.jsx` — raw `fetch('/analytics?...')` | Replaced with `fetchAnalytics()` from `api.js` |
| 3 | Analytics page broken | `AnalyticsPage.jsx` — raw `fetch`, wrong cost key (`totalShippingCost` vs `totalShipping`) | Rewritten with `api.js` + correct keys |
| 4 | Settings health check broken | `SettingsPage.jsx` — `/api/dashboard/health` and `/api/dashboard/analytics` | Replaced with `fetchHealth()` and `fetchAnalytics()` |
| 5 | GHL inbound webhook silent failure | `webhooks.js` — `printJobsRouter.handle` doesn't exist | Rewrote `/ghl` endpoint with full order creation logic |
| 6 | LuluIntegrationPage crash | `LuluIntegrationPage.jsx` — invalid color tokens (`colors.text`, `colors.border`) | Mapped to valid tokens |
| 7 | Empty contact info on orders | `workflowAction.js` — legacy `/print` endpoint doesn't fetch contact | Main `/create-print-job` endpoint fetches contact via GHL |
| 8 | `handleViewOrder` was a no-op | `OrdersPage.jsx` — click handler did nothing | Calls `openDetail()` which fetches `/print-jobs/:id` |
| 9 | Missing reorder `shippingAddress` | `OrdersPage.jsx` — reorder body incomplete | Includes full shipping address in reorder body |
| 10 | Settings health endpoint unreachable | `SettingsPage.jsx` — `/api/dashboard/health` | Fixed to `/health?locationId=...` via `fetchHealth()` |

---

## API Response Shape Verification

All frontend pages now read keys that match the backend response shapes:

### Analytics Response (`GET /analytics?locationId=...`)

```json
{
  "summary": {
    "totalBooks": 5, "readyBooks": 3, "totalOrders": 42,
    "totalRevenue": "1250.00", "totalProfit": "380.00",
    "totalPrintCost": "520.00", "totalShipping": "180.00",
    "totalFulfillment": "31.50", "avgOrderValue": "29.76",
    "profitMargin": "30.4", "currency": "USD"
  },
  "statusCounts": { "pending": 5, "submitted": 8, "shipped": 12, "delivered": 10, "failed": 2 },
  "activeOrders": 13, "completedOrders": 22, "errorOrders": 2,
  "bookStats": [...],
  "recentOrders": [...],
  "activity": [...],
  "chart": { "labels": ["2025-01-01", ...], "orders": [0, 1, ...], "revenue": [0, 29.99, ...] },
  "fulfillmentMetrics": { "ordersWithTracking": 25, "trackingRate": "59.5", "totalTracked": 25, "totalUntracked": 17 }
}
```

### Health Response (`GET /health?locationId=...`)

```json
{
  "status": "ok",
  "timestamp": "2025-08-05T12:00:00.000Z",
  "checks": {
    "database": { "status": "ok", "message": "Supabase connected" },
    "ghl": { "status": "ok", "message": "Connected" },
    "lulu": { "status": "ok", "message": "Lulu connected (sandbox)" }
  },
  "version": "2.0.0",
  "environment": "production",
  "luluMode": "sandbox"
}
```

### Print Jobs List (`GET /print-jobs?locationId=...`)

```json
{
  "jobs": [...camelCase rows...],
  "pagination": { "page": 1, "pageSize": 50, "total": 42 }
}
```

### Print Job Detail (`GET /print-jobs/:jobId?locationId=...`)

```json
{
  "order": { ...camelCase row... },
  "tracking": { "status": "Shipped", "trackingUrl": "...", "trackingNumber": "..." },
  "costs": { "printCost": 4.50, "shippingCost": 5.25, "fulfillmentFee": 0.75, "markup": 9.50, "retailPrice": 20.00 }
}
```

---

## Files Changed

| File | Lines | Changes |
|:---|:---|:---|
| `client/src/api.js` | 132 | Complete rewrite — added named exports, content-type interceptor, all API functions |
| `client/src/pages/RoyaltyDashboardPage.jsx` | 337 | Removed AppLayout, replaced raw fetch with `api.js`, added error handling |
| `client/src/pages/OrdersPage.jsx` | 627 | Removed AppLayout, replaced raw fetch with `api.js`, fixed `handleViewOrder` |
| `client/src/pages/AnalyticsPage.jsx` | 302 | Removed AppLayout, replaced raw fetch with `api.js`, fixed cost key names |
| `client/src/pages/SettingsPage.jsx` | 484 | Removed AppLayout, replaced raw fetch with `api.js`, fixed health/audit endpoints |
| `client/src/pages/LuluIntegrationPage.jsx` | 325 | Fixed invalid color references |
| `client/vite.config.js` | 26 | Added proxy entries for all backend routes |
| `client/vercel.json` | 19 | Added self-rewrite entries for API paths |
| `server/routes/webhooks.js` | 280+ | Rewrote GHL inbound webhook with full order creation flow |

---

## Deployment Configuration

### Required Environment Variables (Frontend — Vercel)

```
VITE_API_BASE_URL=https://your-app.onrender.com
```

### Required Environment Variables (Backend — Render)

```
NODE_ENV=production
PORT=10000
APP_BASE_URL=https://your-app.onrender.com
FRONTEND_BASE_URL=https://your-frontend.vercel.app
GHL_CLIENT_ID=...
GHL_CLIENT_SECRET=...
GHL_API_BASE=https://services.leadconnectorhq.com
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=book-pdfs
LULU_SANDBOX=true (for testing)
LULU_WEBHOOK_SECRET=...
```

---

## Verification Results

- **Frontend build:** Clean — 101 modules, 110.14 KB gzipped, 0 errors
- **Backend syntax:** All 20 files pass `node -c` validation
- **No `/api/` prefix:** 0 occurrences across all pages
- **No AppLayout in pages:** 0 references in all page components
- **No raw fetch in pages:** 0 occurrences — all pages use `api.js`
- **No sidebar:** Pages render directly with `ToastProvider` only

---

## Known Limitations

1. **`VITE_API_BASE_URL` is required** — Without it, the frontend will fail in production. The content-type interceptor catches this and shows a clear error.
2. **Lulu webhook HMAC** — If `LULU_WEBHOOK_SECRET` is not set, webhook verification is skipped (dev mode behavior).
3. **GHL custom workflow action** — Must be registered once in the GHL Developer Portal. The `registerCustomAction()` call in `oauth.js` is a best-effort fallback.
4. **Real-time dashboard refresh** — Currently manual (refresh button). WebSocket support would enable true real-time updates.
