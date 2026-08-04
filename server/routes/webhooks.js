'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');

// ── Lulu Status Webhook ───────────────────────────────────────────────────────
// Lulu fires PRINT_JOB_STATUS_CHANGED events here.
// URL registered per-install: /webhooks/lulu?locationId={locationId}
//
// HMAC signature: Lulu uses the header "Lulu-HMAC-SHA256" (NOT x-lulu-signature).
// The signature is SHA-256 HMAC using the API client secret as the key, computed
// over the raw request body.

router.post('/lulu', async (req, res) => {
  const locationId = req.query.locationId;

  // Lulu HMAC header is "Lulu-HMAC-SHA256"
  const signature = req.headers['lulu-hmac-sha256'] || '';

  // Verify HMAC signature
  if (process.env.LULU_WEBHOOK_SECRET) {
    const expectedSig = crypto
      .createHmac('sha256', process.env.LULU_WEBHOOK_SECRET)
      .update(req.rawBody || '')
      .digest('hex');
    const receivedSig = signature.replace('sha256=', '');
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(receivedSig.padEnd(64, '0').slice(0, 64), 'hex'))) {
      console.warn('[Webhook/Lulu] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  res.status(200).json({ received: true });

  // Process asynchronously so Lulu gets a fast 200 response
  setImmediate(() => processLuluWebhook(req.body, locationId));
});

async function processLuluWebhook(payload, locationId) {
  try {
    await db.logWebhook('lulu', payload.topic || payload.event, payload);

    const topic = payload.topic || payload.event || '';
    if (topic !== 'PRINT_JOB_STATUS_CHANGED') return;

    // The print job ID can be at payload.data.id or payload.data.print_job_id
    const luluJobId = String(payload.data?.id || payload.data?.print_job_id || payload.print_job_id || '');
    const newStatus = payload.data?.status?.name || payload.status || '';
    const externalId = payload.data?.external_id || payload.external_id || null;

    // Extract tracking URLs from the SHIPPED status payload.
    // Lulu nests tracking under: data.status.line_item_statuses[].messages.tracking_urls
    // and data.status.line_item_statuses[].messages.tracking_id
    let trackingUrl = null;
    if (payload.data?.status?.line_item_statuses) {
      for (const item of payload.data.status.line_item_statuses) {
        if (item.messages?.tracking_urls && item.messages.tracking_urls.length > 0) {
          trackingUrl = item.messages.tracking_urls[0];
          break;
        }
        if (item.messages?.tracking_url) {
          trackingUrl = item.messages.tracking_url;
          break;
        }
      }
    }
    // Fallback to flat tracking_url if nested structure not found
    if (!trackingUrl) {
      trackingUrl = payload.data?.tracking_url || payload.data?.tracking?.url || null;
    }

    if (!luluJobId) {
      console.warn('[Webhook/Lulu] No print job ID in payload');
      return;
    }

    const job = await db.getPrintJobByLuluId(luluJobId);
    if (!job) {
      console.warn(`[Webhook/Lulu] No local job found for Lulu ID: ${luluJobId}`);
      return;
    }

    const resolvedLocationId = locationId || job.location_id;
    const localStatus = lulu.mapLuluStatusToLocal(newStatus);
    const updates = { status: localStatus };
    if (trackingUrl) updates.trackingUrl = trackingUrl;

    // Update GHL contact custom fields
    const contactId = job.contact_id;
    if (contactId && resolvedLocationId) {
      const fieldUpdates = { fulfillmentStatus: localStatus };
      if (trackingUrl) fieldUpdates.orderTrackingNumber = trackingUrl;
      await ghl.writeOrderCustomFields(resolvedLocationId, contactId, fieldUpdates)
        .catch(err => console.warn('[Webhook/Lulu] Contact field update error:', err.message));
    }

    // Handle SHIPPED: add tag, update tracking
    if (newStatus === 'SHIPPED') {
      if (contactId && resolvedLocationId) {
        await ghl.addTagsToContact(resolvedLocationId, contactId, ['Book Buyer']).catch(() => {});
      }
    }

    // Handle ERROR / REJECTED
    if (newStatus === 'ERROR' || newStatus === 'REJECTED') {
      if (contactId && resolvedLocationId) {
        await ghl.addTagsToContact(resolvedLocationId, contactId, ['Lulu Fulfillment Issue']).catch(() => {});
      }
    }

    // Move GHL opportunity to the correct pipeline stage
    const stageId = lulu.getGhlStageForLuluStatus(newStatus);
    if (stageId && job.ghl_opportunity_id && resolvedLocationId) {
      await ghl.updateOpportunityStage(resolvedLocationId, job.ghl_opportunity_id, stageId)
        .catch(err => console.warn('[Webhook/Lulu] Opportunity stage update error:', err.message));
    }

    await db.updatePrintJob(job.id, updates);
    console.log(`[Webhook/Lulu] Job ${job.id} updated to status: ${localStatus}`);

  } catch (err) {
    console.error('[Webhook/Lulu] Unhandled error:', err.message);
  }
}

// ── Stripe Webhook ────────────────────────────────────────────────────────────
// Handles Stripe Connect account.updated events to mark onboarding complete.

router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripeService = require('../services/stripeService');
    event = stripeService.constructStripeEvent(req.rawBody || req.body, sig);
  } catch (err) {
    console.warn('[Webhook/Stripe] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  res.status(200).json({ received: true });

  if (event.type === 'account.updated') {
    const account = event.data.object;
    const locationId = account.metadata?.ghl_location_id;
    if (locationId && account.details_submitted && account.charges_enabled) {
      await db.upsertStripeAccount(locationId, account.id, true);
      console.log(`[Webhook/Stripe] Onboarding complete for location: ${locationId}`);
    }
  }
});

// ── GHL Inbound Webhook (Order Submitted) ─────────────────────────────────────
// This is the target URL for the GHL "New Book Order" workflow outbound webhook.
// It receives order data from GHL automations and creates a print job.
//
// Expected payload shape from GHL workflow:
// {
//   "locationId": "...",
//   "contactId": "...",
//   "bookId": "...",
//   "retailPrice": 19.99,
//   "quantity": 1,
//   "shippingAddress": {
//     "name": "John Doe",
//     "street1": "123 Main St",
//     "street2": "",
//     "city": "New York",
//     "state_code": "NY",
//     "country_code": "US",
//     "postcode": "10001",
//     "phone_number": "5551234567"
//   },
//   "shippingLevel": "MAIL"
// }

router.post('/ghl', async (req, res) => {
  const payload = req.body;
  await db.logWebhook('ghl', payload.event || 'inbound', payload);

  const jobId = uuidv4();

  try {
    // Extract fields from payload (support both flat and nested shapes)
    const locationId = payload.locationId || payload.location_id;
    const contactId = payload.contactId || payload.contact_id;
    const bookId = payload.bookId || payload.book_id || payload.productId;
    const retailPrice = parseFloat(payload.retailPrice || payload.price || 0);
    const quantity = parseInt(payload.quantity) || 1;
    const shippingLevel = payload.shippingLevel || payload.shipping_level || 'MAIL';
    const shippingAddress = payload.shippingAddress || payload.shipping_address;
    const workflowId = payload.workflowId || payload.workflow_id;

    // Validate required fields
    if (!locationId) {
      return res.status(400).json({ error: 'locationId is required' });
    }
    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }
    if (!bookId) {
      return res.status(400).json({ error: 'bookId or productId is required' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: 'shippingAddress is required' });
    }

    // Validate shipping address fields
    if (!shippingAddress.street1 || !shippingAddress.city || !shippingAddress.country_code) {
      return res.status(400).json({ error: 'shippingAddress must include street1, city, and country_code' });
    }
    if (!shippingAddress.postcode || shippingAddress.postcode.trim() === '') {
      return res.status(400).json({ error: 'shippingAddress is missing postcode' });
    }
    if (!shippingAddress.phone_number || shippingAddress.phone_number.trim() === '') {
      shippingAddress.phone_number = '0000000000';
    }

    // Fetch the book
    const book = await db.getBook(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (book.location_id !== locationId) {
      return res.status(403).json({ error: 'Book does not belong to this location' });
    }
    if (book.status !== 'Ready') {
      return res.status(400).json({ error: `Book status is "${book.status}", must be "Ready" to order` });
    }

    // Calculate cost
    const costData = await lulu.calculatePrintCost(
      book.pod_package_id,
      book.page_count || 100,
      shippingLevel,
      shippingAddress,
      quantity,
      locationId
    );

    const printCost = costData.unitPrintCost;
    const shippingCost = costData.shippingCost;
    const fulfillmentFee = costData.fulfillmentFee || 0.75;
    const markup = Math.max(0, retailPrice - printCost - shippingCost - fulfillmentFee);

    // Create print job record
    await db.createPrintJob({
      id: jobId,
      locationId,
      contactId,
      bookId,
      status: 'Pending',
      retailPrice,
      printCost,
      shippingCost,
      markup,
      agencyFee: 0,
      walletChargeId: null,
      readerName: shippingAddress.name || '',
      readerEmail: shippingAddress.email || '',
      bookTitle: book.title,
      podPackageId: book.pod_package_id,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity,
      workflowId,
    });

    // Submit to Lulu
    const luluResult = await lulu.createPrintJob({
      locationId,
      bookId,
      bookTitle: book.title,
      podPackageId: book.pod_package_id,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity,
      contactId,
      readerEmail: shippingAddress.email || 'orders@literaryapp.com',
    });

    // Update with Lulu ID
    await db.updatePrintJob(jobId, {
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
    });

    // Create GHL opportunity
    try {
      const opp = await ghl.createOpportunity(locationId, contactId, book.title);
      if (opp?.id) {
        await db.updatePrintJob(jobId, { ghlOpportunityId: opp.id });
      }
    } catch (oppErr) {
      console.warn('[Webhook/GHL] Opportunity creation failed (non-critical):', oppErr.message);
    }

    // Tag the contact
    try {
      await ghl.addTagsToContact(locationId, contactId, ['Lulu Order', `Order: ${book.title}`]);
    } catch (tagErr) {
      console.warn('[Webhook/GHL] Tagging failed (non-critical):', tagErr.message);
    }

    res.status(201).json({
      jobId,
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
      bookTitle: book.title,
      message: 'Order created and submitted to Lulu successfully.',
    });

  } catch (err) {
    console.error('[Webhook/GHL] Order creation error:', err.message);
    if (err.response) {
      console.error('[Webhook/GHL] Lulu error details:', JSON.stringify(err.response.data, null, 2));
    }

    // Mark job as failed if it was created
    try {
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
    } catch (_) {}

    res.status(500).json({ error: err.message, message: 'Order creation failed.' });
  }
});

module.exports = router;
