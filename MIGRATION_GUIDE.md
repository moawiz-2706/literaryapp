# Migration Guide: Single Account to Per-Subaccount Lulu Integration

## Overview

This document describes the migration from a **single shared Lulu.com account** to a **per-subaccount Lulu.com integration**. All changes are backward-compatible — existing installations will continue to work using the global fallback credentials until sub-account owners configure their own credentials.

---

## What Changed

### Architecture Before (v1)

All print jobs from all GHL sub-accounts were routed through a single agency Lulu.com account. API credentials were stored as environment variables (`LULU_CLIENT_ID`, `LULU_CLIENT_SECRET`) and shared globally.

### Architecture After (v2)

Each GHL sub-account (location) can now connect its own Lulu.com developer account. Credentials are stored per-location in the database (`lulu_credentials` table). Token caching is also per-location (`lulu_tokens_location` table).

---

## Database Changes

### New Tables

Two new tables have been added. Run the migration SQL in `server/db/migrations/002_lulu_credentials.sql` against your Supabase database:

1. **`lulu_credentials`** — Stores per-location Lulu API credentials
2. **`lulu_tokens_location`** — Stores per-location OAuth token cache

```sql
-- Run this migration:
-- server/db/migrations/002_lulu_credentials.sql
```

### Schema Summary

| Table | Key Columns | Purpose |
|:---|:---|:---|
| `lulu_credentials` | `location_id` (unique), `client_id`, `client_secret`, `environment` | Per-location Lulu credentials |
| `lulu_tokens_location` | `location_id` (unique), `access_token`, `expires_at` | Per-location token cache |

---

## Backend Changes

### Modified Files

| File | Change |
|:---|:---|
| `server/services/luluService.js` | **Rewritten** — All functions now accept `locationId` as the last parameter. Resolves credentials per-location. Falls back to global env vars for backward compatibility. |
| `server/db/database.js` | Added `upsertLuluCredentials`, `getLuluCredentials`, `deleteLuluCredentials`, `storeLuluTokenForLocation`, `getLatestLuluTokenForLocation` |
| `server/routes/luluIntegration.js` | **New** — REST endpoints for credential management |
| `server/routes/books.js` | Updated all Lulu calls to pass `locationId` |
| `server/routes/printJobs.js` | Updated all Lulu calls to pass `locationId` |
| `server/routes/samples.js` | Updated all Lulu calls to pass `locationId` |
| `server/routes/workflowAction.js` | Updated all Lulu calls to pass `locationId` |
| `server/routes/preview.js` | Updated to accept `locationId` in request body |
| `server/routes/webhooks.js` | Updated webhook registration to pass `locationId` |
| `server/routes/oauth.js` | Updated webhook registration to pass `locationId` |
| `server/index.js` | Registered new `/lulu-integration` route |
| `server/.env.example` | Updated with migration notes |

### Function Signature Changes

All Lulu service functions that make API calls now accept `locationId` as the last parameter:

```javascript
// Before
await lulu.validateInteriorFile(pdfUrl, podPackageId);
await lulu.calculatePrintCost(podPackageId, pageCount, shippingLevel, address, quantity);
await lulu.createPrintJob({ bookId, interiorPdfUrl, coverPdfUrl, shippingAddress, shippingLevel, quantity });

// After (backward compatible — locationId defaults to null for fallback)
await lulu.validateInteriorFile(pdfUrl, podPackageId, locationId);
await lulu.calculatePrintCost(podPackageId, pageCount, shippingLevel, address, quantity, locationId);
await lulu.createPrintJob({ locationId, bookId, interiorPdfUrl, coverPdfUrl, shippingAddress, shippingLevel, quantity });
```

### Backward Compatibility

When `locationId` is `null` or not provided:
- The service falls back to `LULU_CLIENT_ID` / `LULU_CLIENT_SECRET` from environment variables
- The global `LULU_SANDBOX` flag determines the API base URL
- This ensures existing installations continue to work without any changes

---

## Frontend Changes

### New Page

A new **Lulu Integration** settings page has been added at `/lulu-integration?locationId={id}`.

This page:
- Explains why a Lulu.com account is required
- Provides step-by-step setup instructions with links to Lulu documentation
- Allows users to enter, test, and save their Lulu credentials
- Shows connection status
- Allows credential removal

### Menu Integration

The "Lulu Integration" menu link is automatically injected into each GHL sub-account during OAuth installation, alongside the existing Book Setup, Quote Calculator, and Royalty Dashboard links.

### Modified Files

| File | Change |
|:---|:---|
| `client/src/pages/LuluIntegrationPage.jsx` | **New** — Settings page |
| `client/src/main.jsx` | Added route for `/lulu-integration` |
| `client/src/api.js` | Added credential management API functions |
| `server/services/ghlService.js` | Added "Lulu Integration" to injected menu links |

---

## Deployment Steps

### 1. Run the Database Migration

Execute the migration SQL in `server/db/migrations/002_lulu_credentials.sql` against your Supabase project:

```sql
-- In Supabase SQL Editor:
-- Copy and paste the contents of 002_lulu_credentials.sql
```

### 2. Deploy the Updated Code

Push the changes to your repository. Render and Vercel will auto-deploy.

### 3. Notify Sub-Account Owners

Each sub-account owner should:
1. Open the "Lulu Integration" page from the GHL sidebar menu
2. Follow the setup instructions to create a Lulu developer account
3. Enter their Client ID, Client Secret, and select an environment
4. Click "Test Connection" to verify, then "Save Credentials"

### 4. Keep Global Credentials (Optional)

The `LULU_CLIENT_ID` and `LULU_CLIENT_SECRET` environment variables can remain configured as a fallback. They will only be used when a location has not yet configured its own credentials.

---

## Security Considerations

- Client secrets are stored in the database but are never returned to the frontend
- The settings page only shows the first 8 characters of the Client ID
- All credential operations are scoped to `locationId` — one location cannot access another's credentials
- The test endpoint validates credentials before saving, preventing invalid configurations
- The "Remove Credentials" action requires user confirmation

---

## Rollback Plan

If you need to revert to the single-account architecture:

1. The `LULU_CLIENT_ID` and `LULU_CLIENT_SECRET` environment variables are still supported
2. Simply stop saving per-location credentials
3. The service will automatically fall back to global credentials
4. No data loss occurs — existing books and print jobs are unaffected
