# LiteraryApp v2.0 — Changelog

## Overview

This release transforms the LiteraryApp from a basic internal tool into a **production-ready, professional SaaS application** with comprehensive Lulu Print API integration, advanced analytics, order management, and a polished modern UI/UX.

---

## Critical Bug Fixes

### Data Normalization (Backend)
- **Fixed camelCase/snake_case mismatch**: The `GET /print-jobs` list endpoint was returning raw snake_case database rows, while the frontend expected camelCase fields. Added a `normalizeRows()` helper that converts all responses to camelCase consistently.
- **Fixed Lulu detail modal**: The detail endpoint now properly extracts `luluDetail.status`, `luluDetail.costs`, tracking URLs, and estimated shipping dates from the Lulu API response (previously read `detailResp.data` instead of `detailResp.data.order`).

### GHL Service (Backend)
- **Fixed missing exports**: Added `getValidToken`, `updateOpportunityStage`, `getOpportunity`, `writeOrderCustomFields`, and `addTagsToContact` to `ghlService.js` exports.
- **Fixed `getValidToken` signature**: Now accepts an optional `locationId` parameter to fetch the correct token for the current sub-account.
- **Fixed inbound webhook**: Routes to `/create` which now exists in `printJobs.js`.

### Webhook Processing
- **Fixed missing function calls**: Webhook handlers now correctly call `ghl.updateOpportunityStage` and `ghl.addTagsToContact` which were previously undefined.
- **Added error handling**: Webhook processing now gracefully handles GHL API failures without crashing.

### Contact Information
- **Fixed empty contact data**: Orders now fetch the reader's name and email from GHL contacts during submission.
- **Fixed `order_type` field**: Webhooks now correctly read `printJob.job_type` (or `printJob.print_job_type`) from the Lulu response.

---

## New Backend Endpoints

### CSV Export
- **`GET /api/print-jobs/export-csv`**: Exports all orders for a location as a CSV file with UTF-8 BOM for Excel compatibility. Includes order ID, book title, customer name/email, status, costs, shipping address, tracking URL, and timestamps.

### Dashboard Analytics
- **`GET /api/dashboard/analytics`**: Returns comprehensive analytics data including revenue summary, status distribution, chart data (daily orders/revenue for 30 days), book performance rankings, activity timeline, and fulfillment metrics.
- **`GET /api/dashboard/health`**: Returns system health status for database, GHL token validity/expiry, and Lulu credential connectivity.

---

## New Frontend Pages

### Analytics Page (`/analytics`)
- **Revenue tab**: Revenue chart (30-day bar chart), cost breakdown (print, shipping, fulfillment, profit), top 5 books by revenue.
- **Orders tab**: Order volume chart, status distribution with progress bars showing percentage of orders in each state.
- **Fulfillment tab**: Tracking rate, completed/failed counts, average processing times.
- **Period selector**: Filter data by 7, 30, or 90 days.
- **Summary cards**: Total revenue, total orders, average order value, profit margin.

### Settings Page (`/settings`)
- **General tab**: Application info, version, location ID, quick links to Lulu documentation.
- **Lulu API tab**: Full credential management (save, test, remove), environment selector (sandbox/production), masked secret display, connection status badge.
- **System Health tab**: Real-time health checks for database, GHL token, and Lulu API with visual status badges and overall health score progress bar.
- **Audit Log tab**: Activity timeline grouped by date, showing order creation and status update events.

---

## Redesigned Pages

### Dashboard (`/royalty-dashboard`)
- **4 stat cards**: Total books, total orders, total revenue, fulfillment rate.
- **Tabbed interface**: Overview, Books, Orders, Activity.
- **Recent activity timeline**: Chronological list of order events with icons and timestamps.
- **Top books widget**: Ranked by revenue with progress bars.
- **Recent orders table**: Clickable rows that open the detail modal.
- **Real-time sync**: Refresh button to reload data, auto-refresh every 30 seconds.
- **Loading skeletons**: Professional shimmer animations during data load.

### Orders Page (`/orders`)
- **Summary stats bar**: Total orders, revenue, active, completed counts.
- **Advanced search**: Full-text search across book title, customer name, email, order ID, and shipping address.
- **Status filter**: Dropdown to filter by order status (Pending, Submitted, Sent to Print, In Production, Shipped, Delivered, Error, Cancelled).
- **Sorting**: Sort by date, status, price, or book title (ascending/descending).
- **Pagination**: 20 orders per page with previous/next navigation.
- **Order detail modal**: Tabbed interface with Details, Tracking, Customer, Timeline, and Costs tabs.
- **Order timeline**: Visual step-by-step progress from creation to delivery.
- **Customer profile**: Contact info, shipping address, GHL opportunity ID.
- **Cost breakdown**: Local costs vs. Lulu actual costs with tax details.
- **Sync/Reorder**: Per-order sync and reorder buttons with loading states.
- **Bulk actions**: Sync All and Export CSV buttons.

### App Layout
- **Persistent sidebar**: Dark-themed sidebar with icon+label navigation, active state highlighting.
- **Mobile responsive**: Hamburger menu triggers slide-out sidebar with overlay on screens < 1024px. Desktop always shows sidebar.
- **Sticky top bar**: Location ID badge, navigation toggle.
- **7 nav items**: Dashboard, Orders, Analytics, Book Setup, Quote Calculator, Lulu Integration, Settings.

---

## UI/UX Improvements

### Component Library
- **Toast notifications**: Context-based toast system with success/error/warning/info variants, auto-dismiss, and manual close.
- **Loading skeletons**: Shimmer animation for cards, tables, and individual elements.
- **Empty states**: Illustrative empty states with icons, descriptions, and optional action buttons.
- **Status badges**: Color-coded badges with dot indicators for all order statuses.
- **Progress bars**: Animated bars for health scores, fulfillment rates, and status distributions.
- **Data tables**: Responsive tables with hover effects, click-to-open, sortable headers.
- **Modals**: Overlay modals with backdrop click-to-close, size variants (sm/md/lg/xl).
- **Alerts**: Color-coded alert banners with titles, dismissible option.
- **Tabs**: Underlined tab navigation with active state styling.

### Responsive Design
- **Mobile-first**: All pages adapt to mobile viewports with reduced padding and stacked layouts.
- **Grid layouts**: CSS Grid with `auto-fit` for responsive card arrangements.
- **Horizontal scroll**: Tables scroll horizontally on narrow screens.
- **Flexible buttons**: Action buttons wrap on small screens.

### Loading States
- **Skeleton screens**: Shimmer placeholders during data fetch on all pages.
- **Button loading**: Spinner inside buttons during async operations.
- **Page-level loading**: Full-page spinner for initial data load.
- **Optimistic UI**: Buttons disable during operations to prevent double-submits.

---

## Integration Improvements

### Lulu Print API
- **Full order lifecycle tracking**: Status mapping from Lulu statuses to local statuses.
- **Tracking URL extraction**: Parses tracking URLs from Lulu print job details.
- **Cost breakdown**: Fetches and displays actual Lulu costs including tax, shipping, and fulfillment fees.
- **Estimated shipping dates**: Displays dispatch and arrival date windows from Lulu.
- **Reorder support**: Creates reorders with inherited shipping address and quantity.

### GoHighLevel Integration
- **Contact enrichment**: Fetches customer name and email from GHL during order creation.
- **Opportunity sync**: Updates GHL opportunity stages based on order status changes.
- **Tag management**: Adds order-related tags to GHL contacts.

---

## Performance Optimizations

- **useCallback**: Memoized data fetch functions to prevent unnecessary re-renders.
- **Pagination**: Server-side pagination for orders (20 per page default).
- **Lazy data loading**: Tabs load data only when activated.
- **Efficient sorting/filtering**: Applied before pagination to reduce client-side processing.

---

## Security

- **Token validation**: GHL token expiry checked before API calls.
- **Credential masking**: Client secrets masked in UI (only first 8 characters shown).
- **Environment separation**: Distinct sandbox/production credential storage.
- **Input validation**: Server-side validation on all order submission and reorder endpoints.

---

## API Response Shapes

### `GET /api/print-jobs` (List)
```json
{
  "orders": [{
    "id": "uuid",
    "bookTitle": "string",
    "status": "string",
    "readerName": "string",
    "readerEmail": "string",
    "retailPrice": number,
    "quantity": number,
    "createdAt": number,
    "luluPrintJobId": "string",
    "shippingAddress": { "street1": "...", "city": "...", ... },
    "trackingUrl": "string"
  }],
  "total": number,
  "page": number,
  "pageSize": number
}
```

### `GET /api/print-jobs/:jobId` (Detail)
```json
{
  "order": {
    "id": "uuid",
    "bookTitle": "string",
    "status": "string",
    "luluStatus": { "name": "string", "message": "string" },
    "trackingUrls": ["string"],
    "estimatedShippingDates": { "dispatch_min": "string", "arrival_max": "string" },
    "luluCosts": { "totalCostInclTax": number, "shippingCost": number, ... },
    "contactInfo": { "firstName": "string", "email": "string", ... }
  }
}
```

### `GET /api/dashboard/analytics`
```json
{
  "summary": {
    "totalBooks": number, "readyBooks": number, "totalOrders": number,
    "totalRevenue": "string", "totalProfit": "string",
    "avgOrderValue": "string", "profitMargin": "string"
  },
  "statusCounts": { "pending": number, "shipped": number, ... },
  "activeOrders": number, "completedOrders": number, "errorOrders": number,
  "bookStats": [{ "title": "string", "totalRevenue": number, "totalOrders": number }],
  "recentOrders": [...],
  "activity": [{ "id": "string", "type": "string", "title": "string", "timestamp": number }],
  "chart": { "labels": ["string"], "orders": [number], "revenue": [number] },
  "fulfillmentMetrics": { "ordersWithTracking": number, "trackingRate": "string" }
}
```

---

## Known Limitations

1. **Lulu API rate limits**: The sync-all endpoint processes orders sequentially. For large order volumes, this may take several minutes. Consider implementing batch processing in the future.
2. **Webhook delivery**: Lulu webhooks are best-effort. If a webhook fails, the sync button provides manual recovery.
3. **GHL token expiry**: Tokens must be refreshed periodically. The health check alerts when tokens are expired.
4. **CSV export**: Currently exports up to 1000 orders per request. For larger datasets, pagination in the export is recommended.
5. **Real-time updates**: Dashboard auto-refreshes every 30 seconds. For true real-time updates, WebSocket integration would be needed (future enhancement).
6. **Chart rendering**: Uses simple CSS bar charts instead of a charting library for zero additional dependencies. Consider adding Recharts or Chart.js for richer visualizations.

---

## Deployment Checklist

1. Run migration: `002_lulu_credentials.sql` against your Supabase database
2. Deploy server: Push to GitHub → Render auto-deploys
3. Deploy client: Push to GitHub → Vercel auto-deploys
4. Configure `.env`: Ensure `LULU_WEBHOOK_SECRET` is set; `LULU_CLIENT_ID` and `LULU_CLIENT_SECRET` are optional (backward compatibility only)
5. For existing subaccounts: Subaccount owners open "Lulu Integration" from the GHL sidebar to configure their credentials
6. For new installs: The OAuth flow will inject the "Lulu Integration" menu link automatically

---

## Previous Versions

### v1.x — Lulu Integration & Shipping Overhaul
- Per-subaccount Lulu.com credential management
- Flat shipping replaced with Lulu live shipping rates
- Bug fixes for sample ordering and approval (Lulu API compliance)
- Added `LuluIntegrationPage`, `luluIntegration.js` route, database migrations
