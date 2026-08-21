'use strict';
/**
 * printJobs.js
 *
 * Order management routes: submit, list, detail, sync, reorder, costs,
 * CSV export, bulk reconcile, status history, and webhook health.
 *
 * IMPORTANT ROUTE ORDER: Express matches top-to-bottom, and
 * `/:jobId` would swallow `/export-csv`, `/history`, `/reorder`,
 * `/sync-all` ... so the literal paths are registered FIRST.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const statusDb = require('../db/statusDb');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const statusService = require('../services/statusService');
const { reorderOrder } = require('../services/orderService');
const crmService = require('../services/crmService');

// ── Helper: Normalize snake_case DB rows to camelCase ─────────────────────────

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeRow(row) {
  if (!row) return null;
  const n = {};
  for (const [k, v] of Object.entries(row)) {
    n[toCamel(k)] = v;
  }
  // Parse JSON fields
  for (const field of ['shippingAddress', 'luluCosts', 'estimatedShippingDates', 'trackingUrls']) {
    if (typeof n[field] === 'string') {
      try { n[field] = JSON.parse(n[field]); } catch { /* keep as string */ }
    }
  }
  return n;
}

function normalizeRows(rows) {
  return (rows || []).map(normalizeRow);
}

// ── POST /print-jobs/submit ───────────────────────────────────────────────────
// Direct-API order submission — delegates to the canonical idempotent placeOrder.

router.post('/submit', async (req, res) => {
  const { locationId, contactId, bookId, retailPrice, quantity = 1, shippingAddress, shippingLevel = 'MAIL' } = req.body;

  if (!locationId || !contactId || !bookId) return res.status(400).json({ error: 'locationId, contactId, and bookId are required' });
  if (!shippingAddress || !shippingAddress.street1 || !shippingAddress.city || !shippingAddress.country_code) {
    return res.status(400).json({ error: 'Valid shippingAddress with street1, city, and country_code is required' });
  }
  if (!shippingAddress.postcode || shippingAddress.postcode.trim() === '') {
    return res.status(400).json({ error: 'Shipping address is missing postcode (ZIP code).' });
  }
  if (!shippingAddress.phone_number || shippingAddress.phone_number.trim() === '') {
    return res.status(400).json({ error: 'Shipping address is missing phone number.' });
  }

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    if (book.status !== 'Ready') return res.status(400).json({ error: 'Book is not ready for printing' });

    // Fetch contact info from GHL to fill reader name/email when missing
    let readerName = '';
    let readerEmail = '';
    try {
      const contact = await ghl.getContact(locationId, contactId);
      // ghl.getContact returns { contact: { ... } } — read inside .contact
      if (contact?.contact) {
        readerName = `${contact.contact.firstName || ''} ${contact.contact.lastName || ''}`.trim() || '';
        readerEmail = contact.contact.email || '';
      } else if (contact) {
        // Some callers return the contact directly
        readerName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '';
        readerEmail = contact.email || '';
      }
    } catch {
      // GHL contact fetch failed — use empty values
    }
    if (!readerEmail && shippingAddress?.email) readerEmail = shippingAddress.email;
    if (!readerName) readerName = shippingAddress?.name || '';
    if (!readerEmail) {
      return res.status(400).json({ error: 'Could not resolve a contact email for the order. '
        + 'Lulu sends shipping notifications to it, so an email is required.' });
    }

    const { placeOrder } = require('../services/orderService');
    const orderResult = await placeOrder({
      locationId, book, quantity, shippingLevel, shippingAddress,
      readerEmail, readerName, retailPrice: retailPrice || 0, contactId,
      source: 'api',
    });

    // CRM sync after placing (non-critical — never block the order)
    try {
      await crmService.syncOrderAfterTransition({
        locationId, jobId: orderResult.jobId, luluStatus: 'CREATED',
        contactId, job: orderResult.job,
      });
    } catch (crmErr) {
      console.warn('[PrintJobs] CRM sync after order failed (non-critical):', crmErr.message);
    }

    res.status(orderResult.idempotent ? 200 : 201).json({
      jobId: orderResult.jobId, status: 'Sent to Print',
      idempotent: orderResult.idempotent, luluPrintJobId: orderResult.luluPrintJobId,
      costBreakdown: orderResult.costs ? {
        ...orderResult.costs,
        totalCharge: (orderResult.costs.totalCost || 0) + (orderResult.job?.markup || 0),
      } : null,
    });
  } catch (err) {
    console.error('[PrintJobs] Submit error:', err.message);
    if (err.response) console.error('[PrintJobs] Lulu error:', JSON.stringify(err.response.data, null, 2));
    res.status(err.response ? 502 : 400).json({ error: err.message });
  }
});

// ── GET /print-jobs/export-csv — MUST be registered before GET /:jobId ───────

router.get('/export-csv', async (req, res) => {
  const { locationId, page = 1, pageSize = 1000 } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    let jobs = await db.getPrintJobsByLocation(locationId);
    const start = (page - 1) * pageSize;
    const paginated = jobs.slice(start, start + Number(pageSize));

    const headers = [
      'Order ID', 'Book Title', 'Customer Name', 'Customer Email', 'Status',
      'Lulu Status', 'Lulu Job ID', 'Retail Price', 'Print Cost', 'Shipping Cost', 'Markup',
      'Fulfillment Fee', 'Quantity', 'Shipping Address', 'Tracking URL',
      'Order Type', 'Created At',
    ];

    const rows = paginated.map(j => {
      let shippingStr = '';
      try {
        const addr = typeof j.shipping_address === 'string' ? JSON.parse(j.shipping_address) : j.shipping_address;
        if (addr) shippingStr = `${addr.street1 || ''}, ${addr.city || ''}, ${addr.state_code || addr.state || ''} ${addr.postcode || addr.zip || ''}, ${addr.country_code || ''}`;
      } catch { shippingStr = j.shipping_address || ''; }

      return [
        j.id || '',
        (j.book_title || '').replace(/"/g, '""'),
        (j.reader_name || '').replace(/"/g, '""'),
        j.reader_email || '',
        j.status || '',
        j.lulu_status || '',
        j.lulu_print_job_id || '',
        j.retail_price || 0,
        j.print_cost || 0,
        j.shipping_cost || 0,
        j.markup || 0,
        j.agency_fee || 0,
        j.quantity || 1,
        shippingStr.replace(/"/g, '""'),
        j.tracking_url || '',
        j.order_type || (j.parent_job_id ? 'reorder' : 'direct'),
        j.created_at ? new Date(j.created_at).toISOString() : '',
      ].map(v => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${locationId}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (err) {
    console.error('[Orders] CSV export error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /print-jobs/sync-all — bulk status reconciliation ────────────────────

router.post('/sync-all', async (req, res) => {
  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const jobs = await db.getPrintJobsByLocation(locationId);
    const luluJobs = jobs.filter(j => j.lulu_print_job_id);
    let synced = 0, failed = 0;
    const results = [];

    for (const job of luluJobs) {
      try {
        const luluDetail = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
        const tracking = lulu.extractTracking(luluDetail);
        const trackingUrls = tracking.map(item => item.url).filter(Boolean);
        const luluStatusName = luluDetail.status?.name || null;

        await statusService.syncJobStatus({
          jobId: job.id,
          locationId,
          luluStatus: luluDetail.status,
          trackingUrls,
          tracking,
          costs: luluDetail.costs,
          source: 'manual-sync',
        });

        synced++;
        results.push({ jobId: job.id, synced: true, luluStatus: luluStatusName });

        // Push CRM stage after each manual sync (non-critical)
        try {
          if (job.contact_id) {
            await crmService.syncOrderAfterTransition({
              locationId, jobId: job.id, luluStatus: luluStatusName,
              contactId: job.contact_id, job,
            });
          }
        } catch (_) { /* non-critical */ }
      } catch (err) {
        failed++;
        results.push({ jobId: job.id, synced: false, error: err.message });
      }
    }

    res.json({ total: luluJobs.length, synced, failed, results, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[Orders] Sync all error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs/reconcile/:locationId — server-side reconcile loop ────────
// Walks every live Lulu job for the location, reconciles status/tracking/costs,
// records history entries for any transitions, and syncs CRM stages.
// Safe to run on a schedule (e.g. every 15 min) via a cron endpoint guard.

router.get('/reconcile/:locationId', async (req, res) => {
  const { locationId } = req.params;
  if (!process.env.LITERARYAPP_API_SECRET || req.query.secret !== process.env.LITERARYAPP_API_SECRET) {
    return res.status(403).json({ error: 'API secret required (?secret=...) to run reconcile' });
  }

  try {
    const jobs = await db.getPrintJobsByLocation(locationId);
    const luluJobs = jobs.filter(j => j.lulu_print_job_id);
    let reconciled = 0, failed = 0;
    const transitions = [];

    for (const job of luluJobs) {
      try {
        const luluDetail = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
        const tracking = lulu.extractTracking(luluDetail);
        const trackingUrls = tracking.map(item => item.url).filter(Boolean);

        const transition = await statusService.syncJobStatus({
          jobId: job.id,
          locationId,
          luluStatus: luluDetail.status,
          trackingUrls,
          tracking,
          costs: luluDetail.costs,
          source: 'reconcile',
        });

        if (transition?.transitioned) transitions.push({ jobId: job.id, ...transition });
        reconciled++;

        try {
          if (job.contact_id && luluDetail.status?.name) {
            await crmService.syncOrderAfterTransition({
              locationId, jobId: job.id, luluStatus: luluDetail.status.name,
              contactId: job.contact_id, job,
            });
          }
        } catch (_) { /* non-critical */ }
      } catch (err) {
        failed++;
        console.warn(`[Reconcile] job ${job.id} failed: ${err.message}`);
      }
    }

    res.json({
      total: luluJobs.length,
      reconciled,
      failed,
      transitions,
      reconciledAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Reconcile] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs/webhook-health/:locationId ────────────────────────────────
// Reports whether Lulu's webhook subscription exists and is active, and
// optionally reactivates it. Uses per-location credentials.

router.get('/webhook-health/:locationId', async (req, res) => {
  const { locationId } = req.params;
  if (!process.env.LITERARYAPP_API_SECRET || req.query.secret !== process.env.LITERARYAPP_API_SECRET) {
    return res.status(403).json({ error: 'API secret required (?secret=...)' });
  }

  try {
    const report = await statusDb.getWebhookHealth(locationId);
    res.json({ locationId, ...report });
  } catch (err) {
    console.error('[WebhookHealth] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook-health/:locationId/reactivate', async (req, res) => {
  const { locationId } = req.params;
  if (!process.env.LITERARYAPP_API_SECRET || req.body.secret !== process.env.LITERARYAPP_API_SECRET) {
    return res.status(403).json({ error: 'API secret required (body: { secret })' });
  }

  try {
    const report = await lulu.restoreWebhookSubscription(locationId);
    res.json({ locationId, result: report });
  } catch (err) {
    console.error('[WebhookHealth] Reactivate error:', err.message);
    res.status(502).json({ error: `Failed to reactivate webhook subscription: ${err.message}` });
  }
});

// ── GET /print-jobs/:jobId — Single order detail ────────────────────────────

router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });
    if (job.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });

    let luluDetail = null, luluStatus = null, luluCosts = null;
    let tracking = [], trackingUrls = [];

    if (job.lulu_print_job_id) {
      try {
        luluDetail = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
        luluStatus = luluDetail.status || null;
        luluCosts = luluDetail.costs || null;
        tracking = lulu.extractTracking(luluDetail);
        trackingUrls = tracking.map(item => item.url).filter(Boolean);
        await statusService.syncJobStatus({
          jobId, locationId, luluStatus: luluStatus,
          trackingUrls, tracking, costs: luluCosts, source: 'detail-poll',
        });
      } catch (err) {
        console.warn('[Orders] Lulu detail fetch failed:', err.message);
      }
    }

    // Fetch GHL contact info if available
    let contactInfo = null;
    if (job.contact_id) {
      try {
        contactInfo = await ghl.getContact(locationId, job.contact_id);
        if (contactInfo?.contact) contactInfo = contactInfo.contact; // normalize shape
      } catch { /* GHL contact fetch failed — return what we have */ }
    }

    // Real status history (stored rows — not fabricated)
    let statusHistory = [];
    try {
      statusHistory = await statusDb.getStatusHistory(jobId);
    } catch { /* history table missing — show only current status */ }

    const normalized = normalizeRow(job);
    normalized.luluStatus = luluStatus;
    normalized.trackingUrls = trackingUrls;
    normalized.estimatedShippingDates = luluDetail?.estimated_shipping_dates || null;
    normalized.shippingAddressFromLulu = luluDetail?.shipping_address ? lulu.extractShippingAddress(luluDetail) : null;
    normalized.luluCosts = luluCosts ? {
      currency: luluCosts.currency,
      totalCostInclTax: luluCosts.total_cost_incl_tax ? parseFloat(luluCosts.total_cost_incl_tax) : null,
      totalCostExclTax: luluCosts.total_cost_excl_tax ? parseFloat(luluCosts.total_cost_excl_tax) : null,
      totalTax: luluCosts.total_tax ? parseFloat(luluCosts.total_tax) : null,
      shippingCost: luluCosts.shipping_cost?.total_cost_incl_tax ? parseFloat(luluCosts.shipping_cost.total_cost_incl_tax) : null,
      fulfillmentFee: luluCosts.fulfillment_cost?.total_cost_incl_tax ? parseFloat(luluCosts.fulfillment_cost.total_cost_incl_tax) : null,
      lineItems: (luluCosts.line_item_costs || []).map(li => ({ quantity: li.quantity, totalCostInclTax: li.total_cost_incl_tax ? parseFloat(li.total_cost_incl_tax) : null })),
    } : null;
    normalized.contactInfo = contactInfo;
    normalized.statusHistory = statusHistory.map(normalizeRow);

    res.json({ order: normalized });
  } catch (err) {
    console.error('[Orders] Detail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs/:jobId/history ───────────────────────────────────────────

router.get('/:jobId/history', async (req, res) => {
  const { jobId } = req.params;
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });
    if (job.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });

    const history = await statusDb.getStatusHistory(jobId);
    res.json({ jobId, history: normalizeRows(history) });
  } catch (err) {
    console.error('[Orders] History error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs/:jobId/status ────────────────────────────────────────────

router.get('/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });

    let luluStatus = null, tracking = [], trackingUrls = [];
    if (job.lulu_print_job_id) {
      try {
        const luluData = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
        luluStatus = luluData.status || null;
        tracking = lulu.extractTracking(luluData);
        trackingUrls = tracking.map(item => item.url).filter(Boolean);
        await statusService.syncJobStatus({
          jobId, locationId, luluStatus, trackingUrls, tracking,
          costs: luluData.costs, source: 'manual-sync',
        });
      } catch (err) {
        console.warn('[Orders] Status poll failed:', err.message);
      }
    }

    res.json({
      jobId: job.id, localStatus: job.status,
      luluStatus: luluStatus?.name || null,
      luluMessage: luluStatus?.message || null,
      luluChanged: luluStatus?.changed || null,
      trackingUrl: job.tracking_url || (trackingUrls.length > 0 ? trackingUrls[0] : null),
      trackingUrls, syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /print-jobs/:jobId/sync ─────────────────────────────────────────────

router.post('/:jobId/sync', async (req, res) => {
  const { jobId } = req.params;
  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });
    if (job.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    if (!job.lulu_print_job_id) return res.json({ synced: false, reason: 'No Lulu print job ID associated' });

    const luluDetail = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
    const tracking = lulu.extractTracking(luluDetail);
    const trackingUrls = tracking.map(item => item.url).filter(Boolean);

    const result = await statusService.syncJobStatus({
      jobId, locationId, luluStatus: luluDetail.status,
      trackingUrls, tracking, costs: luluDetail.costs, source: 'manual-sync',
    });

    // Push the CRM stage after manual sync
    try {
      if (job.contact_id && luluDetail.status?.name) {
        await crmService.syncOrderAfterTransition({
          locationId, jobId, luluStatus: luluDetail.status.name,
          contactId: job.contact_id, job,
        });
      }
    } catch (crmErr) {
      console.warn('[Orders] CRM sync after manual sync failed (non-critical):', crmErr.message);
    }

    res.json({
      ...result,
      jobId: job.id,
      estimatedShippingDates: luluDetail.estimated_shipping_dates || null,
    });
  } catch (err) {
    console.error('[Orders] Sync error:', err.message);
    res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

// ── POST /print-jobs/:jobId/reorder ──────────────────────────────────────────
// Real reorders: a NEW print job reusing the original line item's printable_id.
// The old /print-jobs/{id}/reprint endpoint never existed in the Lulu API.

router.post('/:jobId/reorder', async (req, res) => {
  const { jobId } = req.params;
  const { locationId, shippingAddress, shippingLevel, quantity } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });
    if (job.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    if (!job.lulu_print_job_id) {
      return res.status(400).json({ error: 'Order was never submitted to Lulu — cannot reorder.' });
    }

    const address = shippingAddress || job.shipping_address;
    if (!address || !address.street1 || !address.city || !address.country_code) {
      return res.status(400).json({ error: 'Valid shipping address required for reorder' });
    }
    if (!address.postcode || address.postcode.trim() === '') {
      return res.status(400).json({ error: 'Shipping address is missing postcode.' });
    }
    if (!address.phone_number || address.phone_number.trim() === '') {
      return res.status(400).json({ error: 'Shipping address is missing phone number.' });
    }

    const orderResult = await reorderOrder({
      locationId,
      luluPrintJobId: job.lulu_print_job_id,
      parentJobId: job.id,
      quantity: quantity || job.quantity || 1,
      shippingLevel: shippingLevel || job.shipping_level || 'MAIL',
      shippingAddress: address,
      contactId: job.contact_id,
      bookId: job.book_id,
    });

    res.status(orderResult.idempotent ? 200 : 201).json({
      originalJobId: job.id,
      newJobId: orderResult.jobId,
      luluPrintJobId: orderResult.luluPrintJobId,
      idempotent: orderResult.idempotent,
      status: 'Sent to Print',
    });
  } catch (err) {
    console.error('[Orders] Reorder error:', err.message);
    const detail = err.response ? JSON.stringify(err.response.data || {}).substring(0, 500) : err.message;
    res.status(err.response ? 502 : 400).json({ error: `Reorder failed: ${err.message}`, detail });
  }
});

// ── GET /print-jobs/ — List all orders (normalized) ──────────────────────────

router.get('/', async (req, res) => {
  const { locationId, page = 1, pageSize = 20, status, search, orderBy = 'created_at', orderDir = 'desc' } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    let jobs = await db.getPrintJobsByLocation(locationId);

    // Apply status filter
    if (status) {
      const statusLower = status.toLowerCase();
      jobs = jobs.filter(j => {
        const s = (j.status || '').toLowerCase();
        const ls = (j.lulu_status || '').toLowerCase();
        return s.includes(statusLower) || ls.includes(statusLower);
      });
    }

    // Apply search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      jobs = jobs.filter(j => {
        const fields = [
          j.book_title || '', j.reader_name || '', j.reader_email || '',
          j.lulu_print_job_id || '', j.id || '', j.status || '',
          j.contact_id || '', j.shipping_address || ''
        ];
        return fields.some(f => String(f).toLowerCase().includes(q));
      });
    }

    // Sort
    const field = orderDir === 'desc' ? orderBy.replace('-', '') : orderBy;
    const dir = orderDir === 'desc' || orderBy.startsWith('-') ? -1 : 1;
    jobs.sort((a, b) => {
      const av = a[field] || 0, bv = b[field] || 0;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const total = jobs.length;
    const start = (page - 1) * pageSize;
    const paginated = jobs.slice(start, start + Number(pageSize));
    const orders = normalizeRows(paginated);

    res.json({ orders, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    console.error('[Orders] List error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs/:jobId/costs ────────────────────────────────────────────

router.get('/:jobId/costs', async (req, res) => {
  const { jobId } = req.params;
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });

    if (!job.lulu_print_job_id) {
      return res.json({
        jobId: job.id,
        localCosts: { printCost: job.print_cost, shippingCost: job.shipping_cost, markup: job.markup, agencyFee: job.agency_fee, total: (job.print_cost || 0) + (job.shipping_cost || 0) + (job.markup || 0) + (job.agency_fee || 0) },
        luluCosts: null,
      });
    }

    const luluCosts = await lulu.getPrintJobCosts(job.lulu_print_job_id, locationId);
    res.json({
      jobId: job.id,
      localCosts: { printCost: job.print_cost, shippingCost: job.shipping_cost, markup: job.markup, agencyFee: job.agency_fee, total: (job.print_cost || 0) + (job.shipping_cost || 0) + (job.markup || 0) + (job.agency_fee || 0) },
      luluCosts: luluCosts ? {
        currency: luluCosts.currency,
        totalCostExclTax: luluCosts.total_cost_excl_tax ? parseFloat(luluCosts.total_cost_excl_tax) : null,
        totalCostInclTax: luluCosts.total_cost_incl_tax ? parseFloat(luluCosts.total_cost_incl_tax) : null,
        totalTax: luluCosts.total_tax ? parseFloat(luluCosts.total_tax) : null,
        shippingCost: luluCosts.shipping_cost ? { taxRate: luluCosts.shipping_cost.tax_rate, totalExclTax: luluCosts.shipping_cost.total_cost_excl_tax ? parseFloat(luluCosts.shipping_cost.total_cost_excl_tax) : null, totalInclTax: luluCosts.shipping_cost.total_cost_incl_tax ? parseFloat(luluCosts.shipping_cost.total_cost_incl_tax) : null, totalTax: luluCosts.shipping_cost.total_tax ? parseFloat(luluCosts.shipping_cost.total_tax) : null } : null,
        fulfillmentCost: luluCosts.fulfillment_cost ? { totalExclTax: luluCosts.fulfillment_cost.total_cost_excl_tax ? parseFloat(luluCosts.fulfillment_cost.total_cost_excl_tax) : null, totalInclTax: luluCosts.fulfillment_cost.total_cost_incl_tax ? parseFloat(luluCosts.fulfillment_cost.total_cost_incl_tax) : null, totalTax: luluCosts.fulfillment_cost.total_tax ? parseFloat(luluCosts.fulfillment_cost.total_tax) : null } : null,
        lineItemCosts: (luluCosts.line_item_costs || []).map(li => ({ externalId: li.line_item_external_id, quantity: li.quantity, taxRate: li.tax_rate, totalExclDiscounts: li.total_cost_excl_discounts ? parseFloat(li.total_cost_excl_discounts) : null, totalExclTax: li.total_cost_excl_tax ? parseFloat(li.total_cost_excl_tax) : null, totalInclTax: li.total_cost_incl_tax ? parseFloat(li.total_cost_incl_tax) : null, totalTax: li.total_tax ? parseFloat(li.total_tax) : null, discounts: li.discounts || [] })),
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
