# Audit Notes

## Key Bugs Fixed
1. ghlService.js: Added missing exports (writeOrderCustomFields, addTagsToContact, getContact). Fixed updateOpportunityStage/getOpportunity to accept locationId parameter.
2. printJobs.js: Added camelCase normalization for all list/detail responses. Added contact info fetch from GHL on order submit. Added search/filter/sort params.
3. dashboard.js: Added comprehensive /analytics endpoint with status breakdowns, chart data, activity timeline, fulfillment metrics, per-book stats.

## Lulu API Endpoints Available
- POST /print-jobs/ — Create print job
- GET /print-jobs/ — List print jobs
- GET /print-jobs/{id}/ — Get single job
- GET /print-jobs/{id}/status/ — Get status
- GET /print-jobs/{id}/costs/ — Get costs
- POST /print-jobs/{id}/reprint/ — Reprint/reorder
- POST /print-job-cost-calculations/ — Cost calculation
- POST /validate-interior/ — Validate interior PDF
- POST /validate-cover/ — Validate cover PDF
- POST /cover-dimensions/ — Calculate cover dimensions
- POST /shipping-options/ — Get shipping options
- POST /webhooks/ — Register webhooks

## Remaining Work
- Rebuild RoyaltyDashboardPage.jsx (full analytics dashboard)
- Rebuild OrdersPage.jsx (search, filter, sort, customer profiles, order timeline)
- Add SettingsPage.jsx (Lulu/GHL config, health checks)
- Add AppLayout.jsx (sidebar navigation, responsive)
- Add export route (CSV)
- Polish UI components (loading skeletons, toasts, empty states)
- Add audit log route
