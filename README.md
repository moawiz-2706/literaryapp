# LiteraryApp x Lulu Print-on-Demand Middleware

A GoHighLevel Marketplace App that integrates Lulu.com print-on-demand fulfillment for independent authors.

This integration uses a **Single Master Lulu Account** architecture. All print jobs from all sub-accounts are routed through one central agency Lulu account. The app automatically charges the sub-account wallet a **$10.00 service fee** per order via the GHL Marketplace Wallet Charge API before submitting the print job to Lulu.

---

## Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | React + Vite on Vercel | Three iFrame pages embedded in GHL via Custom Menu Links |
| Backend | Node.js + Express on Render | OAuth, Lulu API, GHL API, Wallet Charge API, webhooks |
| Database | SQLite on Render persistent disk | Token storage, books, print jobs, webhook logs |
| Storage | Supabase Storage | PDF file hosting with public URLs for Lulu |
| Print | Lulu.com API | Print job creation and fulfillment via master account |

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
   - `LULU_CLIENT_ID` and `LULU_CLIENT_SECRET`: From developers.lulu.com
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
   - `locations.readonly`
   - `payments/orders.readonly`
   - `charges.write` (Required for the $10 wallet charge)
5. Copy the Client ID and Client Secret into Render environment variables.
6. Set Distribution to Sub-account, installer to Both.

---

### Step 5: Register the Custom Workflow Action

Instead of using a generic webhook, this app uses a native GHL Custom Workflow Action.

See `GHL_CUSTOM_ACTION_GUIDE.md` for the exact step-by-step configuration required in the GHL Developer Portal.

---

### Step 6: Register the Lulu Webhook

After the first sub-account installs the app, the middleware automatically registers the Lulu webhook. To register it manually:

```
POST https://your-app.onrender.com/webhooks/lulu/register
Body: { "locationId": "your_location_id" }
```

The webhook URL registered with Lulu will be:
`https://your-app.onrender.com/webhooks/lulu?locationId={locationId}`

---

### Step 7: Import the GHL Snapshot

1. In GHL Agency View, go to Snapshots.
2. Import the LiteraryApp Lulu snapshot.
3. After import, copy the Pipeline ID and all Stage IDs.
4. Paste them into Render environment variables.
5. Copy the Custom Field IDs for `lulu_print_job_id`, `tracking_number`, and `fulfillment_status`.
6. Paste them into Render as `GHL_FIELD_LULU_PRINT_JOB_ID`, `GHL_FIELD_TRACKING_NUMBER`, `GHL_FIELD_FULFILLMENT_STATUS`.

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
2. Middleware stores tokens, injects three Custom Menu Links into the sub-account.
3. Author opens "Set Up On-Demand Printing" from GHL navigation.
4. Author uploads a book (title, format, PDFs). Middleware uploads PDFs to Supabase.
5. Middleware submits PDFs to Lulu for validation using the master agency account. Polls until complete.
6. On success, middleware creates a GHL Product with Lulu metadata embedded in the description.
7. Author attaches the product to an Order Form. A reader purchases.
8. GHL "New Book Order" workflow fires the Custom Workflow Action.
9. Middleware receives the action webhook, calculates the print cost, and charges the sub-account wallet $10.00.
10. If the charge succeeds, middleware submits the print job to Lulu.
11. Middleware returns the Job IDs to GHL so the workflow can continue.
12. Lulu fires `PRINT_JOB_STATUS_CHANGED` webhooks to `/webhooks/lulu?locationId={id}`.
13. Middleware updates GHL Contact custom fields, moves the Opportunity pipeline stage, and adds tags.
