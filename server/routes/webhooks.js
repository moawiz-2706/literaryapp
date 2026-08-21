'use strict';
/**
 * webhooks.js
 *
 * Inbound event handling for three sources:
 *   1. POST /webhooks/lulu  — Lulu PRINT_JOB_STATUS_CHANGED events.
 *      Verified per-location with the location's OWN client_secret (not a
 *      global secret): each marketplace sub-account signed up its own
 *      OAuth app, so the HMAC key lives in lulu_credentials.
 *   2. POST /webhooks/stripe — Stripe Connect account.updated events.
 *      Guarded: if the stripe service or schema is not present, events are
 *      logged and a 200 still returns — the previous implementation crashed
 *      with "constructStripeEvent of undefined".
 *   3. POST /webhooks/ghl — GHL workflow "New Book Order" outbound webhook.
 *      Delegates to the canonical orderService.placeOrder.
 *
 * All event processing happens AFTER the 200 response (Lulu expects <5s).
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const statusDb = require('../db/statusDb');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const statusService = require('../services/statusService');
const crmService = require('../services/crmService');
const { placeOrder } = require('../services/orderService');

// ── Lulu Status Webhook ───────────────────────────────────────────────────────
// URL registered per-install: /webhooks/lulu?locationId={locationId}
//
// HMAC: Lulu signs the raw body with SHA-256 HMAC using the API CLIENT SECRET
// and sends it as the `Lulu-HMAC-SHA256` header. The old code verified against
// a global LULU_WEBHOOK_SECRET, which is wrong in a per-sub-account marketplace:
// only the location's own client_secret can verify its events.

router.post('/lulu', async (req, res) => {
  const locationId = req.query.locationId;

  // Lulu HMAC header: "Lulu-HMAC-SHA256"
  const signatureHeader = req.headers['lulu-hmac-sha256'] || '';
  const receivedSig = signatureHeader.replace(/^sha256=/i, '').trim();

  // 1. Signature verification (per-location secret)
  if (!receivedSig) {
    await db.logWebhook('lulu', 'REJECTED', { query: req.query, headers: req.headers }, 'Missing Lulu-HMAC-SHA256 header');
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  let validSignature = false;
  let secretSource = null;
  try {
    const creds = await db.getLuluCredentials(locationId);
    if (creds?.client_secret) {
      const expectedSig = crypto
        .createHmac('sha256', creds.client_secret)
        .update(req.rawBody || '')
        .digest('hex');
      const receivedBuf = Buffer.from(receivedSig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (receivedBuf.length === expectedBuf.length) {
        validSignature = crypto.timingSafeEqual(receivedBuf, expectedBuf);
      }
      secretSource = 'location_credentials';
    }
    // Fallback: global secret for legacy deployments
    if (!validSignature && process.env.LULU_WEBHOOK_SECRET) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.LULU_WEBHOOK_SECRET)
        .update(req.rawBody || '')
        .digest('hex');
      const receivedBuf = Buffer.from(receivedSig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (receivedBuf.length === expectedBuf.length) {
        validSignature = crypto.timingSafeEqual(receivedBuf, expectedBuf);
        secretSource = 'global_env';
      }
    }
  } catch (err) {
    console.warn('[Webhook/Lulu] Signature check failed before comparison:', err.message);
  }

  if (!validSignature) {
    await db.logWebhook('lulu', 'REJECTED', { query: req.query }, `Invalid signature (source tried: ${secretSource})`);
    console.warn('[Webhook/Lulu] Invalid signature for locationId', locationId);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Body already parsed by the rawBody middleware in index.js
  const payload = req.body || {};

  // 2. Always 200 FIRST — Lulu expects a fast acknowledgment; processing follows.
  res.status(200).json({ received: true });
  setImmediate(() => processLuluWebhook(payload, locationId));
});

async function processLuluWebhook(payload, locationId) {
  try {
    await db.logWebhook('lulu', payload.topic || payload.event || payload.type || 'unknown', payload);

    const topic = payload.topic || payload.event || payload.type || '';
    if (topic !== 'PRINT_JOB_STATUS_CHANGED') return;

    // The print job ID lives at payload.data.id (spec) with legacy flat shapes.
    const luluJobId = String(payload.data?.id || payload.data?.print_job_id || payload.print_job_id || '');
    const newStatus = payload.data?.status?.name || payload.status || '';

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
    const tracking = lulu.extractTracking(payload.data || {});
    const trackingUrls = tracking.map(t => t.url).filter(Boolean);

    // Persist the transition (history row + denormalized print_jobs update).
    // Deduped by (job_id, lulu_status, changed_at, source), so duplicate
    // Lulu deliveries are harmless.
    const result = await statusService.recordTransition({
      jobId: job.id,
      locationId: resolvedLocationId,
      luluStatus: newStatus,
      message: payload.data?.status?.message || null,
      tracking,
      changedAt: payload.data?.status?.changed || undefined,
      source: 'webhook',
      rawPayload: payload,
    });

    if (!result.changed) return;

    console.log(`[Webhook/Lulu] Job ${job.id} transitioned to ${newStatus} (${statusService.mapLuluStatusToLocal(newStatus)})`);

    // CRM: move the opportunity stage + refresh custom fields (non-critical).
    try {
      if (job.contact_id) {
        await crmService.syncOrderAfterTransition({
          locationId: resolvedLocationId,
          jobId: job.id,
          luluStatus: newStatus,
          contactId: job.contact_id,
          job,
        });
      }
      // Behavioral tags kept for automation compatibility
      if (job.contact_id) {
        if (newStatus === 'SHIPPED') {
          await ghl.addTagsToContact(resolvedLocationId, job.contact_id, ['Book Buyer']).catch(() => {});
        }
        if (newStatus === 'ERROR' || newStatus === 'REJECTED') {
          await ghl.addTagsToContact(resolvedLocationId, job.contact_id, ['Lulu Fulfillment Issue']).catch(() => {});
        }
      }
    } catch (crmErr) {
      console.warn('[Webhook/Lulu] CRM sync failed (non-critical):', crmErr.message);
    }

    // Track last webhook event for the health report
    await statusDb.upsertLuluWebhook(resolvedLocationId, {
      last_event_at: new Date().toISOString(),
      last_event_type: newStatus,
      remote_active: true,
      last_error: null,
    }).catch(err => console.warn('[Webhook/Lulu] Webhook bookkeeping failed:', err.message));

  } catch (err) {
    console.error('[Webhook/Lulu] Unhandled error:', err.message);
    await db.logWebhook('lulu', payload?.topic || 'PRINT_JOB_STATUS_CHANGED', payload, err.message).catch(() => {});
    if (locationId) {
      await statusDb.upsertLuluWebhook(locationId, {
        last_error: String(err.message).slice(0, 500),
        updated_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }
}

// ── Stripe Webhook ────────────────────────────────────────────────────────────
// Handles Stripe Connect account.updated events to mark onboarding complete.
// Guarded: crashes if the stripe service is not wired (it is not in
// package.json today) — we verify the module exists first.

router.post('/stripe', async (req, res) => {
  let stripeService;
  try {
    stripeService = require('../services/stripeService');
  } catch (_) {
    await db.logWebhook('stripe', 'account.updated', req.body || {}, 'stripeService not available').catch(() => {});
    return res.status(200).json({ received: true, note: 'Stripe integration not enabled' });
  }
  // Extra guard: `stripe` is not in package.json and db.upsertStripeAccount is
  // not in the db layer — verify the function actually exists before use.
  if (typeof stripeService.constructStripeEvent !== 'function' ||
      typeof db.upsertStripeAccount !== 'function') {
    return res.status(200).json({ received: true, note: 'Stripe integration not fully wired' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeService.constructStripeEvent(req.rawBody || req.body, sig);
  } catch (err) {
    console.warn('[Webhook/Stripe] Signature verification failed:', err.message);
    await db.logWebhook('stripe', 'REJECTED', req.body || {}, err.message).catch(() => {});
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  res.status(200).json({ received: true });

  if (event?.type === 'account.updated') {
    try {
      const account = event.data.object;
      const locationId = account.metadata?.ghl_location_id;
      if (locationId && account.details_submitted && account.charges_enabled) {
        await db.upsertStripeAccount(locationId, account.id, true);
        console.log(`[Webhook/Stripe] Onboarding complete for location: ${locationId}`);
      }
    } catch (err) {
      console.error('[Webhook/Stripe] Event processing failed:', err.message);
    }
  }
});

// ── GHL Inbound Webhook (Order Submitted) ─────────────────────────────────────
// Target URL for the GHL "New Book Order" workflow outbound webhook.
// Delegates to the canonical idempotent orderService.placeOrder so a replayed
// workflow execution can never create a second Lulu order.

router.post('/ghl', async (req, res) => {
  const payload = req.body;
  await db.logWebhook('ghl', payload.event || 'inbound', payload);

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
    const executionId = payload.executionId || payload.execution_id;

    // Validate required fields
    if (!locationId) return res.status(400).json({ error: 'locationId is required' });
    if (!contactId) return res.status(400).json({ error: 'contactId is required' });
    if (!bookId) return res.status(400).json({ error: 'bookId or productId is required' });
    if (!shippingAddress) return res.status(400).json({ error: 'shippingAddress is required' });
    if (!shippingAddress.street1 || !shippingAddress.city || !shippingAddress.country_code) {
      return res.status(400).json({ error: 'shippingAddress must include street1, city, and country_code' });
    }
    if (!shippingAddress.postcode || shippingAddress.postcode.trim() === '') {
      return res.status(400).json({ error: 'shippingAddress is missing postcode' });
    }
    if (!shippingAddress.phone_number || shippingAddress.phone_number.trim() === '') {
      return res.status(400).json({ error: 'shippingAddress is missing phone_number' });
    }
    if (!shippingAddress.email) {
      return res.status(400).json({ error: 'shippingAddress is missing email — Lulu sends shipping notifications to it' });
    }

    // Fetch the book
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Book does not belong to this location' });
    if (book.status !== 'Ready') {
      return res.status(400).json({ error: `Book status is "${book.status}", must be "Ready" to order` });
    }

    const orderResult = await placeOrder({
      locationId, book, quantity, shippingLevel, shippingAddress,
      readerEmail: shippingAddress.email,
      readerName: shippingAddress.name || '',
      retailPrice, contactId, workflowId, executionId,
      source: 'workflow',
    });

    // Create the GHL opportunity if this was not a replay
    if (!orderResult.idempotent) {
      try {
        const opp = await ghl.createOpportunity(locationId, contactId, book.title);
        if (opp?.id) await db.updatePrintJob(orderResult.jobId, { ghlOpportunityId: opp.id });
      } catch (oppErr) {
        console.warn('[Webhook/GHL] Opportunity creation failed (non-critical):', oppErr.message);
      }
      try {
        await ghl.addTagsToContact(locationId, contactId, ['Lulu Order', `Order: ${book.title}`]);
      } catch (tagErr) {
        console.warn('[Webhook/GHL] Tagging failed (non-critical):', tagErr.message);
      }
    }

    res.status(orderResult.idempotent ? 200 : 201).json({
      jobId: orderResult.jobId,
      status: 'Sent to Print',
      idempotent: orderResult.idempotent,
      luluPrintJobId: orderResult.luluPrintJobId,
      bookTitle: book.title,
      message: orderResult.idempotent
        ? 'Duplicate workflow execution detected — existing order returned.'
        : 'Order created and submitted to Lulu successfully.',
    });

  } catch (err) {
    console.error('[Webhook/GHL] Order creation error:', err.message);
    if (err.response) {
      console.error('[Webhook/GHL] Lulu error details:', JSON.stringify(err.response.data, null, 2));
    }
    // NOTE: the old code wrote status=Failed to a random uuidv4() — that created
    // phantom rows. Order failure is now recorded only by placeOrder itself.
    await db.logWebhook('ghl', 'inbound_failed', payload, err.message).catch(() => {});
    res.status(err.response ? 502 : 400).json({ error: err.message, message: 'Order creation failed.' });
  }
});

module.exports = router;
