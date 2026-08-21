# LiteraryApp x Lulu Print-on-Demand Middleware

A GoHighLevel Marketplace App that integrates Lulu.com print-on-demand fulfillment for independent authors.

This integration uses a **Per-Subaccount Lulu Account** architecture. Each GHL sub-account connects its own Lulu.com developer account, ensuring complete isolation between locations. The app automatically charges the sub-account wallet a **$10.00 service fee** per order via the GHL Marketplace Wallet Charge API before submitting the print job to Lulu.

---

## Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | React + Vite on Vercel | Three iFrame pages embedded in GHL via Custom Menu Links |
| Backend | Node.js + Express on Render | OAuth, Lulu API, GHL API, Wallet Charge API, webhooks |
| Database | Supabase Postgres | Token storage, books, print jobs, status history, webhook logs |
| Status Tracking | `status_history` table + `app_status` lifecycle | Eleven-state print lifecycle, real audit trail per order |
| Storage | Supabase Storage | PDF file hosting with public URLs for Lulu |
| Print | Lulu.com API | Print job creation and fulfillment via per-subaccount credentials |

---

## Deployment Guide

### Prerequisites

- GitHub account with this repo pushed
- Render account (render.com)
- Vercel account (vercel.com)
- Supabase account (supabase.com)
- Lulu developer account (developers.lulu.com)
- GHL Developer Portal access

---

### Step 1: Supabase Storage

1. Go to supabase.com and create a new project.
2. In the left sidebar, click Storage.
3. Click New Bucket. Name it `book-pdfs`. Enable Public bucket.
4. Go to Project Settings > API.
5. Copy the Project URL and the `service_role` key (not the `anon` key).

---

### Step 2: Deploy the Backend to Render

1. Go to render.com and click New > Web Service.
2. Connect your GitHub account and select this repository.
3. Render will detect `render.yaml` automatically. Click Apply.
4. In the Environment section, fill in all variables marked `sync: false`:
   - `APP_BASE_URL`: Leave blank for now (fill after deploy)
   - `FRONTEND_BASE_URL`: Leave blank for now (fill after Vercel deploy)
   - `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET`: From GHL Developer Portal
   - `LULU_CLIENT_ID` and `LULU_CLIENT_SECRET`: Optional global fallback credentials. Each sub-account will configure its own credentials via the Lulu Integration settings page.
   - `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`: From Step 1
5. Click Deploy.
6. Once deployed, copy your `.onrender.com` URL.
7. Go back to Environment and set `APP_BASE_URL` to your Render URL.

---

### Step 3: Deploy the Frontend to Vercel

1. Go to vercel.com and click Add New > Project.
2. Import your GitHub repository.
3. Set the Root Directory to `client`.
4. Under Environment Variables, add:
   - `VITE_API_BASE_URL`: Your Render URL from Step 2 (e.g. `https://your-app.onrender.com`)
5. Click Deploy.
6. Once deployed, copy your `.vercel.app` URL.
7. Go back to Render and set `FRONTEND_BASE_URL` to your Vercel URL.
8. Trigger a Render redeploy so the CORS update takes effect.

---

### Step 4: Configure the GHL Marketplace App

1. Go to marketplace.gohighlevel.com > Developer Portal.
2. Create a new app or open your existing app.
3. Set the Redirect URI to: `https://your-app.onrender.com/oauth/callback`
4. Set the following scopes:
   - `contacts.readonly`, `contacts.write`
   - `opportunities.readonly`, `opportunities.write`
   - `products.readonly`, `products.write`
   - `custom-values.readonly`, `custom-values.write`
   - `custom-menus.write`
   - `workflows.readonly`
   - `locations.readonly`
   - `payments/orders.readonly`
   - `charges.write` (Required for the $10 wallet charge)
5. Copy the Client ID and Client Secret into Render environment variables.
6. Set Distribution to Sub-account, installer to Both.

---

### Step 5: Register the Custom Workflow Action

The existing action remains available and is independent of the new SHIPPED trigger. The action places a Lulu print job; the trigger described below fires later when Lulu reports shipment and tracking information.

Instead of using a generic webhook, this app uses a native GHL Custom Workflow Action.

See `GHL_CUSTOM_ACTION_GUIDE.md` for the exact step-by-step configuration required in the GHL Developer Portal.

---

### Step 6: Register the Marketplace Workflow Trigger

Create the `Lulu Print Job Shipped` trigger in the GHL Developer Portal using the instructions in `GHL_PRINT_TRIGGER_SETUP_GUIDE.md`. Set its Subscription URL to:

```
https://your-app.onrender.com/workflow-trigger/subscription
```

Configure the header `X-LiteraryApp-Trigger-Secret` with the same value as `GHL_TRIGGER_SUBSCRIPTION_SECRET` in Render. The trigger sends contact and tracking variables into the workflow so native GHL email/SMS actions can use them.

### Step 7: Register the Lulu Webhook

After the first sub-account installs the app, the middleware automatically registers the Lulu webhook. To register it manually:

```
POST https://your-app.onrender.com/webhooks/lulu/register
Body: { "locationId": "your_location_id" }
```

The webhook URL registered with Lulu will be:
`https://your-app.onrender.com/webhooks/lulu?locationId={locationId}`

---

### Step 8: Import the GHL Snapshot

1. In GHL Agency View, go to Snapshots.
2. Import the LiteraryApp Lulu snapshot.
3. After import, copy the Pipeline ID and all Stage IDs.
4. Paste them into Render environment variables.
5. Copy the Custom Field IDs for `lulu_print_job_id`, `tracking_number`, and `fulfillment_status`.
6. Paste them into Render as `GHL_FIELD_LULU_PRINT_JOB_ID`, `GHL_FIELD_TRACKING_NUMBER`, `GHL_FIELD_FULFILLMENT_STATUS`.

---

## Environment Variables (Server)

| Variable | Required | Notes |
| :--- | :--- | :--- |
| `APP_BASE_URL` | Yes | Render URL, e.g. `https://your-app.onrender.com` |
| `FRONTEND_BASE_URL` | Yes | Vercel URL, used for GHL menu links and OAuth redirect |
| `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET` | Yes | From GHL Developer Portal |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Yes | From Supabase Project Settings > API |
| `SUPABASE_BUCKET` | Yes | `book-pdfs` (public) |
| `LULU_CLIENT_ID`, `LULU_CLIENT_SECRET` | No | Global fallback credentials; each sub-account configures its own via Lulu Integration settings |
| `LULU_SANDBOX` | No | `true` / `false` — sandbox only, never affects production orders |
| `LITERARYAPP_API_SECRET` | Yes (new) | Secret shared with the frontend (`VITE_API_SECRET`) to authorize merchant-only operations: CSV export, reconciliation, and webhook health |
| `GHL_TRIGGER_SUBSCRIPTION_SECRET` | Yes for Marketplace Trigger | Secret configured in the GHL Trigger Subscription URL headers and Render; authenticates CREATED/UPDATED/DELETED trigger subscription callbacks |
| `GHL_PIPELINE_ID`, `GHL_STAGE_*` | Deprecated | Kept as global fallbacks only. The supported path is **per-location pipeline configuration** via the CRM Pipelines page |
| `SKIP_DB_MIGRATIONS` | No | Ignored (kept for backward compatibility with older docs); the server no longer executes any SQL at boot |

### Database Migrations (Manual Only — the server never executes SQL)

**The server starts and serves requests without executing any SQL.** There is no automatic migration at boot, and no `exec-sql` edge function is required — the deploy flow on Render is simply: push code, build, start. The complete, authoritative schema for the entire application lives in one consolidated, fully idempotent script:

> **`server/db/production_schema.sql`** — run it once, in the Supabase SQL Editor (SQL Editor → New Query → paste → Run). Every statement is `CREATE ... IF NOT EXISTS` or existence-checked, so re-running it on an existing database changes nothing.

The script creates the twelve tables the codebase uses: `ghl_tokens`, `lulu_tokens` (legacy fallback), `lulu_credentials`, `lulu_tokens_location`, `books`, `print_jobs` (with the idempotency key and full tracking/cost JSONB columns), `webhook_log`, `wallet_balance` (legacy, unused), `stripe_accounts` (optional), `print_job_status_history`, `lulu_webhooks`, and `ghl_pipeline_stages`. Each block is commented with the modules that read or write it, so you can see exactly which tables each feature depends on.

### Order Lifecycle and Status History

Every order now follows an eleven-state lifecycle (`ORDER_RECEIVED`, `PAYMENT_IN_PROGRESS`, `UNPAID`, `SENT_TO_PRINT`, `IN_PRODUCTION`, `QUALITY_CHECK`, `PRODUCTION_READY`, `SHIPPED`, `DELIVERED`, `ERROR`, `CANCELLED`) mapped from Lulu's official status list. Transitions are stored as rows in `print_job_status_history` with the source (`webhook`, `poll`, `manual`), a human message, tracking URLs, and the raw Lulu payload — so the Timeline on the Orders page is real, not fabricated. The `/print-jobs/reconcile/:locationId` endpoint (merchant-only) refetches every order's state from Lulu and backfills anything that drifted.

### Webhook Security

Lulu status webhooks are verified per-location with **that location's own `client_secret`** (`Lulu-HMAC-SHA256` header, SHA-256 HMAC over the raw body), with the legacy `LULU_WEBHOOK_SECRET` kept as a fallback. Orders can only be created through the single canonical `placeOrder` path, which is idempotent on `(contactId, bookId, quantity, shippingLevel, shippingAddress)` — duplicate GHL workflow executions cannot create duplicate Lulu print jobs.

### CRM Pipeline Configuration

The **CRM Pipelines** page (linked from Settings) replaces hard-coded global pipeline/stage IDs: each location maps the app's lifecycle statuses to stages of its own GHL pipeline, fetched live from GHL. Stage moves happen automatically on every Lulu status transition.

---

## Per-Subaccount Lulu Integration

Each GHL sub-account owner configures their own Lulu.com credentials via the **Lulu Integration** settings page:

1. The owner opens "Lulu Integration" from the GHL sidebar menu.
2. They create a Lulu.com account and register as a developer at developers.lulu.com.
3. They create a developer application to obtain a Client ID and Client Secret.
4. They enter these credentials into the settings page and select Sandbox or Production.
5. They click "Test Connection" to verify, then "Save Credentials".

Credentials are stored per-location in the `lulu_credentials` table. All Lulu API calls (authentication, validation, pricing, print jobs, shipping) use the credentials associated with the active sub-account.

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for details on the architecture change and migration steps.

---

## Local Development

```bash
# Terminal 1: Start the backend
cd server
cp .env.example .env
# Fill in .env values
npm install
node index.js

# Terminal 2: Start the frontend
cd client
npm install
npm run dev
# Open http://localhost:5173/book-setup?locationId=test123
```

---

## Data Flow

1. Author installs the app from GHL Marketplace. OAuth callback fires.
2. Middleware stores tokens, injects eight Custom Menu Links (Book Setup, Quote Calculator, Royalty Dashboard, Lulu Integration, Orders, Analytics, Settings, CRM Pipelines) into the sub-account.
3. Author opens "Set Up On-Demand Printing" from GHL navigation.
4. Author uploads a book (title, format, PDFs). Middleware uploads PDFs to Supabase.
5. Author connects their Lulu.com account via the Lulu Integration settings page. The middleware registers the Lulu status webhook for that location.
6. Middleware submits PDFs to Lulu for validation using the sub-account's Lulu credentials. Polls until complete.
7. On success, middleware creates a GHL Product with Lulu metadata embedded in the description.
8. Author attaches the product to an Order Form. A reader purchases.
9. GHL "New Book Order" workflow fires the Custom Workflow Action (idempotent — replays return the existing order).
10. Middleware receives the action, **validates the shipping address against a real address requirement** (no more fabricated placeholders), and calculates the print cost using Lulu's `shipping_level` field with whole-shipment shipping math.
11. Middleware submits the print job to Lulu with `external_id` carrying our internal order id, and creates the GHL Opportunity.
12. Middleware returns the Job IDs to GHL so the workflow can continue.
13. Lulu fires `PRINT_JOB_STATUS_CHANGED` webhooks to `/webhooks/lulu?locationId={id}`, HMAC-verified with the location's own `client_secret`.
14. Middleware records each transition in `status_history`, updates GHL Contact custom fields, moves the Opportunity through the per-location pipeline mapping, and adds tags.
15. The merchant can view real progress on the Orders page Timeline, export CSV, run reconciliation (`GET /print-jobs/reconcile/:locationId?secret=`), and check webhook health (`GET /print-jobs/webhook-health/:locationId?secret=`).

---

## Local Development

```bash
# Terminal 1: Start the backend
cd server
cp .env.example .env
# Fill in .env values (at minimum APP_BASE_URL, FRONTEND_BASE_URL, GHL_*, SUPABASE_*, LITERARYAPP_API_SECRET)
npm install
node index.js   # no SQL execution at boot — works with or without a live database
# Smoke test the server without a live database:
node smoketest.js

# Terminal 2: Start the frontend
cd client
npm install
npm run dev
# Open http://localhost:5173/book-setup?locationId=test123
# Set VITE_API_SECRET in client/.env to match the server's LITERARYAPP_API_SECRET
```
