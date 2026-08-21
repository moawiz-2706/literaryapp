# Lulu.com Sandbox Testing Guide

This guide provides step-by-step instructions for testing your application's integration with the Lulu.com API in a sandbox environment. It covers authentication, book creation, and order submission.

## Prerequisites

Before you begin testing, ensure you have the following:

1. **A Lulu Sandbox Account**: Create an account at [developers.sandbox.lulu.com](https://developers.sandbox.lulu.com/). This is separate from your production account.
2. **API Credentials**: Navigate to the "Applications" section in your Lulu Sandbox dashboard and create a new developer application to generate your `client_id` and `client_secret`.
3. **Deployed Application**: Your frontend and backend applications must be deployed and accessible.

## Configuration

### 1. Set Environment Variables

Ensure your backend environment variables are configured correctly for the sandbox environment:

```env
LULU_SANDBOX=true
APP_BASE_URL=https://your-backend-url.onrender.com
FRONTEND_BASE_URL=https://your-frontend-url.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-key
LULU_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Configure Per-Subaccount Credentials

Since the application now uses per-subaccount credentials, you must configure your Lulu credentials for the specific GoHighLevel (GHL) subaccount you are testing with:

1. Log in to your GHL subaccount.
2. Navigate to the **Lulu Integration** page (added in the recent update).
3. Enter the `client_id` and `client_secret` from your Lulu Sandbox developer application.
4. Select **Sandbox** as the environment.
5. Click **Save Credentials**. The system will validate the credentials and register the webhook for status updates.

## Testing Workflows

### 1. Book Setup and Validation

The first step is to validate a book's interior and cover files.

1. Navigate to the **Book Setup** page in your GHL subaccount.
2. Enter the book title and page count.
3. Upload a valid PDF for the interior file.
4. Upload a valid PDF for the cover file.
5. Select a valid POD Package ID (e.g., `0600X0900.BW.STD.PB.060UW444.MXX`).
6. Click **Validate Files**.
7. Once validation is complete, click **Save Book**.

### 2. Quote Calculation

Verify that shipping costs are calculated correctly using Lulu's live API.

1. Navigate to the **Quote Calculator** page.
2. Select the book you just validated.
3. Enter a destination address (e.g., a US address like Austin, TX).
4. Select a shipping level (e.g., `MAIL`, `PRIORITY_MAIL`, `GROUND`).
5. Verify that the calculated shipping cost matches Lulu's rates (no flat rates or hidden fees).

### 3. Sample Order Submission

Test the order submission process by ordering a sample copy.

1. Return to the **Book Setup** page and locate the saved book.
2. Click **Order Sample Copy**.
3. Enter the shipping address and select a shipping level.
4. Ensure your wallet has sufficient funds for the print cost, shipping cost, and fulfillment fee.
5. Click **Submit Order**.
6. Verify that a success message is displayed with a print job ID.

### 4. Order Status and Webhooks

Test that order statuses update correctly via webhooks.

1. Navigate to the **Royalty Dashboard** or the **Book Setup** page to check the sample order status.
2. The status should initially be `Pending` or `Submitted`.
3. In the Lulu Sandbox dashboard, you can manually trigger status changes or wait for the automated sandbox processing.
4. When the status changes to `SHIPPED`, the webhook should update the order status in your application and add a tracking URL.
5. Verify that the tracking URL is displayed correctly in the UI.

## Troubleshooting

### Authentication Errors

If you encounter `401 Unauthorized` errors:
- Ensure the `LULU_SANDBOX` environment variable is set to `true`.
- Verify that the `client_id` and `client_secret` are correct for the sandbox environment.
- Check the server logs for token refresh errors.

### Webhook Signature Errors

If webhooks are failing with `401 Invalid signature`:
- Ensure the webhook secret used in your application matches the secret configured in your Lulu Sandbox dashboard.
- Verify that the server is reading the `Lulu-HMAC-SHA256` header correctly.

### Order Creation Failures

If print job creation fails:
- Ensure the `pod_package_id`, `interiorPdfUrl`, and `coverPdfUrl` are correctly passed to the Lulu API.
- Check the server logs for detailed error messages returned by the Lulu API.
- Verify that the shipping address includes all required fields (street1, city, country_code, postcode).
