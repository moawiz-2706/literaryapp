'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');

// ── Lulu Status Webhook ───────────────────────────────────────────────────────
// Lulu fires PRINT_JOB_STATUS_CHANGED events here.
// URL registered per-install: /webhooks/lulu?locationId={locationId}
// HMAC-SHA256 signature verified using LULU_WEBHOOK_SECRET

router.post('/lulu', async (req, res) => {
  const locationId = req.query.locationId;
  const signature = req.headers['x-lulu-signature'] || req.headers['x-hub-signature-256'] || '';

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

    const luluJobId = String(payload.data?.id || payload.print_job_id || '');
    const newStatus = payload.data?.status?.name || payload.status || '';
    const trackingUrl = payload.data?.tracking_url || payload.tracking_url || null;
    const externalId = payload.data?.external_id || payload.external_id || null;

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
// It routes to the print job creation logic.

router.post('/ghl', async (req, res) => {
  const payload = req.body;
  await db.logWebhook('ghl', payload.event || 'inbound', payload);

  // Delegate to print job creation
  try {
    const printJobsRouter = require('./printJobs');
    req.url = '/create';
    req.body = payload;
    return printJobsRouter.handle ? printJobsRouter.handle(req, res) : res.status(202).json({ received: true });
  } catch (err) {
    console.error('[Webhook/GHL] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
