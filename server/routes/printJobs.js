'use strict';
/**
 * printJobs.js
 *
 * Order management routes: submit, list, detail, sync, reorder, costs.
 * All responses return camelCase data normalized from the database.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');

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
  if (n.shippingAddress && typeof n.shippingAddress === 'string') {
    try { n.shippingAddress = JSON.parse(n.shippingAddress); } catch { /* keep as string */ }
  }
  return n;
}

// ── POST /print-jobs/submit ───────────────────────────────────────────────────

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

  const jobId = uuidv4();

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    if (book.status !== 'Ready') return res.status(400).json({ error: 'Book is not ready for printing' });

    const costData = await lulu.calculatePrintCost(book.pod_package_id, book.page_count || 100, shippingLevel, shippingAddress, quantity, locationId);

    const printCost = costData.unitPrintCost;
    const shippingCost = costData.shippingCost;
    const fulfillmentFee = costData.fulfillmentFee || 0.75;
    const markup = Math.max(0, (retailPrice || 0) - printCost - shippingCost - fulfillmentFee);

    // Fetch contact info from GHL if available
    let readerName = '';
    let readerEmail = '';
    try {
      const contact = await ghl.getContact(locationId, contactId);
      if (contact) {
        readerName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '';
        readerEmail = contact.email || '';
      }
    } catch {
      // GHL contact fetch failed — use empty values
    }

    await db.createPrintJob({
      id: jobId, locationId, contactId, bookId, status: 'Pending',
      retailPrice: retailPrice || 0, printCost, shippingCost, markup,
      agencyFee: 0, walletChargeId: null,
      readerName, readerEmail, bookTitle: book.title,
      podPackageId: book.pod_package_id, interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url, shippingAddress, shippingLevel, quantity,
    });

    const luluResult = await lulu.createPrintJob({
      locationId, bookId, bookTitle: book.title, podPackageId: book.pod_package_id,
      interiorPdfUrl: book.interior_pdf_url, coverPdfUrl: book.cover_pdf_url,
      shippingAddress, shippingLevel, quantity, contactId, readerEmail: readerEmail || 'orders@literaryapp.com',
    });

    await db.updatePrintJob(jobId, { status: 'Submitted', luluPrintJobId: luluResult.id });

    res.status(201).json({
      jobId, status: 'Submitted', luluPrintJobId: luluResult.id,
      costBreakdown: { printCost, shippingCost, fulfillmentFee, markup, totalCharge: printCost + shippingCost + fulfillmentFee + markup },
    });
  } catch (err) {
    console.error('[PrintJobs] Submit error:', err.message);
    if (err.response) console.error('[PrintJobs] Lulu error:', JSON.stringify(err.response.data, null, 2));
    try { await db.updatePrintJob(jobId, { status: 'Failed' }); } catch { /* ignore */ }
    res.status(500).json({ error: err.message });
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

function normalizeRows(rows) {
  return (rows || []).map(normalizeRow);
}

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
    let trackingUrls = [];

    if (job.lulu_print_job_id) {
      try {
        luluDetail = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
        luluStatus = luluDetail.status || null;
        luluCosts = luluDetail.costs || null;
        trackingUrls = lulu.extractTrackingUrls(luluDetail);
        if (trackingUrls.length > 0 && trackingUrls[0] !== job.tracking_url) {
          await db.updatePrintJob(jobId, { trackingUrl: trackingUrls[0] });
        }
      } catch (err) {
        console.warn('[Orders] Lulu detail fetch failed:', err.message);
      }
    }

    // Fetch GHL contact info if available
    let contactInfo = null;
    if (job.contact_id) {
      try {
        contactInfo = await ghl.getContact(locationId, job.contact_id);
      } catch { /* GHL contact fetch failed — return what we have */ }
    }

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

    res.json({ order: normalized });
  } catch (err) {
    console.error('[Orders] Detail error:', err.message);
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

    let luluStatus = null, trackingUrls = [];
    if (job.lulu_print_job_id) {
      try {
        const luluData = await lulu.getPrintJobDetail(job.lulu_print_job_id, locationId);
        luluStatus = luluData.status || null;
        trackingUrls = lulu.extractTrackingUrls(luluData);
        const updates = { updatedAt: Math.floor(Date.now() / 1000) };
        if (luluData.status) {
          updates.luluStatus = luluData.status.name || null;
          updates.status = lulu.mapLuluStatusToLocal(luluData.status.name);
        }
        if (trackingUrls.length > 0) updates.trackingUrl = trackingUrls[0];
        await db.updatePrintJob(jobId, updates);
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
    const trackingUrls = lulu.extractTrackingUrls(luluDetail);

    const updates = { updatedAt: Math.floor(Date.now() / 1000) };
    if (luluDetail.status?.name) {
      updates.luluStatus = luluDetail.status.name;
      updates.status = lulu.mapLuluStatusToLocal(luluDetail.status.name);
    }
    if (trackingUrls.length > 0) updates.trackingUrl = trackingUrls[0];
    if (luluDetail.costs?.shipping_cost?.total_cost_incl_tax) updates.shippingCost = parseFloat(luluDetail.costs.shipping_cost.total_cost_incl_tax);
    if (luluDetail.costs?.fulfillment_cost?.total_cost_incl_tax) updates.fulfillmentFee = parseFloat(luluDetail.costs.fulfillment_cost.total_cost_incl_tax);

    await db.updatePrintJob(jobId, updates);

    res.json({
      synced: true, jobId: job.id,
      luluStatus: luluDetail.status?.name || null,
      localStatus: luluDetail.status?.name ? lulu.mapLuluStatusToLocal(luluDetail.status.name) : null,
      trackingUrls,
      costs: luluDetail.costs ? {
        totalCostInclTax: luluDetail.costs.total_cost_incl_tax ? parseFloat(luluDetail.costs.total_cost_incl_tax) : null,
        shippingCost: luluDetail.costs.shipping_cost?.total_cost_incl_tax ? parseFloat(luluDetail.costs.shipping_cost.total_cost_incl_tax) : null,
        fulfillmentFee: luluDetail.costs.fulfillment_cost?.total_cost_incl_tax ? parseFloat(luluDetail.costs.fulfillment_cost.total_cost_incl_tax) : null,
      } : null,
      estimatedShippingDates: luluDetail.estimated_shipping_dates || null,
    });
  } catch (err) {
    console.error('[Orders] Sync error:', err.message);
    res.status(500).json({ error: `Sync failed: ${err.message}` });
  }
});

// ── POST /print-jobs/:jobId/reorder ─────────────────────────────────────────

router.post('/:jobId/reorder', async (req, res) => {
  const { jobId } = req.params;
  const { locationId, shippingAddress, shippingLevel } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const job = await db.getPrintJobById(jobId);
    if (!job) return res.status(404).json({ error: 'Order not found' });
    if (job.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });

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

    const newJob = await lulu.reorderPrintJob(job.lulu_print_job_id, locationId);
    const reorderJobId = uuidv4();

    await db.createPrintJob({
      id: reorderJobId, locationId, contactId: job.contact_id, bookId: job.book_id,
      status: 'Pending', retailPrice: job.retail_price, printCost: job.print_cost,
      shippingCost: job.shipping_cost, markup: job.markup, agencyFee: 0, walletChargeId: null,
      readerName: job.reader_name || '', readerEmail: job.reader_email || '',
      bookTitle: job.book_title, podPackageId: job.pod_package_id,
      interiorPdfUrl: job.interior_pdf_url, coverPdfUrl: job.cover_pdf_url,
      shippingAddress: address, shippingLevel: shippingLevel || job.shipping_level || 'MAIL',
      quantity: job.quantity || 1, parentJobId: job.id,
    });

    await db.updatePrintJob(reorderJobId, { status: 'Submitted', luluPrintJobId: newJob.id });

    res.status(201).json({ originalJobId: job.id, newJobId: reorderJobId, luluPrintJobId: newJob.id, status: 'Submitted' });
  } catch (err) {
    console.error('[Orders] Reorder error:', err.message);
    res.status(500).json({ error: `Reorder failed: ${err.message}` });
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

// ── GET /print-jobs/export-csv ─────────────────────────────────────────────────

router.get('/export-csv', async (req, res) => {
  const { locationId, page = 1, pageSize = 1000 } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    let jobs = await db.getPrintJobsByLocation(locationId);
    const start = (page - 1) * pageSize;
    const paginated = jobs.slice(start, start + Number(pageSize));

    const headers = [
      'Order ID', 'Book Title', 'Customer Name', 'Customer Email', 'Status',
      'Lulu Job ID', 'Retail Price', 'Print Cost', 'Shipping Cost', 'Markup',
      'Fulfillment Fee', 'Quantity', 'Shipping Address', 'Tracking URL',
      'Order Type', 'Created At',
    ];

    const rows = paginated.map(j => {
      let shippingStr = '';
      try {
        const addr = typeof j.shipping_address === 'string' ? JSON.parse(j.shipping_address) : j.shipping_address;
        if (addr) shippingStr = `${addr.street1 || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.postcode || ''}, ${addr.country_code || ''}`;
      } catch { shippingStr = j.shipping_address || ''; }

      return [
        j.id || '',
        (j.book_title || '').replace(/"/g, '""'),
        (j.reader_name || '').replace(/"/g, '""'),
        j.reader_email || '',
        j.status || '',
        j.lulu_print_job_id || '',
        j.retail_price || 0,
        j.print_cost || 0,
        j.shipping_cost || 0,
        j.markup || 0,
        j.agency_fee || 0,
        j.quantity || 1,
        shippingStr.replace(/"/g, '""'),
        j.tracking_url || '',
        j.order_type || 'direct',
        j.created_at ? new Date(j.created_at * 1000).toISOString() : '',
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

// ── POST /print-jobs/sync-all ────────────────────────────────────────────────

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
        const trackingUrls = lulu.extractTrackingUrls(luluDetail);
        const updates = { updatedAt: Math.floor(Date.now() / 1000) };
        if (luluDetail.status?.name) { updates.luluStatus = luluDetail.status.name; updates.status = lulu.mapLuluStatusToLocal(luluDetail.status.name); }
        if (trackingUrls.length > 0) updates.trackingUrl = trackingUrls[0];
        if (luluDetail.costs?.shipping_cost?.total_cost_incl_tax) updates.shippingCost = parseFloat(luluDetail.costs.shipping_cost.total_cost_incl_tax);
        if (luluDetail.costs?.fulfillment_cost?.total_cost_incl_tax) updates.fulfillmentFee = parseFloat(luluDetail.costs.fulfillment_cost.total_cost_incl_tax);
        await db.updatePrintJob(job.id, updates);
        synced++;
        results.push({ jobId: job.id, synced: true, luluStatus: updates.luluStatus });
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

module.exports = router;
