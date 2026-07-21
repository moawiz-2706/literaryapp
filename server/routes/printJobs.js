'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const wallet = require('../services/walletService');
const flatShipping = require('../services/flatShipping');

// ── POST /print-jobs/submit ───────────────────────────────────────────────────
// Submit a new print job order. Calculates flat shipping, charges the
// author's wallet for the full cost (printing + shipping + internal fee + markup),
// then submits to Lulu.
//
// Request body:
// {
//   locationId, contactId, bookId,
//   retailPrice, quantity,
//   shippingAddress: { street1, city, state_code, country_code, postcode, phone_number },
//   shippingLevel: 'MAIL' | 'PRIORITY_MAIL' | 'GROUND_HD' | 'GROUND_BUS' | 'GROUND' | 'EXPEDITED' | 'EXPRESS'
// }
router.post('/submit', async (req, res) => {
  const {
    locationId, contactId, bookId,
    retailPrice, quantity = 1,
    shippingAddress,
    shippingLevel = 'MAIL',
  } = req.body;

  if (!locationId || !contactId || !bookId) {
    return res.status(400).json({ error: 'locationId, contactId, and bookId are required' });
  }
  if (!shippingAddress || !shippingAddress.street1 || !shippingAddress.city || !shippingAddress.country_code) {
    return res.status(400).json({ error: 'Valid shippingAddress with street1, city, and country_code is required' });
  }

  const jobId = uuidv4();

  try {
    // 1. Fetch the book details
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    if (book.status !== 'Ready') return res.status(400).json({ error: 'Book is not ready for printing' });

    // 2. Calculate printing cost from Lulu (printing only, shipping ignored)
    const costData = await lulu.calculatePrintCost(
      book.pod_package_id,
      book.page_count || 100,
      shippingLevel,
      shippingAddress,
      quantity
    );

    const printCost = costData.unitPrintCost;
    const fulfillmentFee = costData.fulfillmentFee || 0.75;

    // 3. Calculate flat shipping cost
    const countryCode = shippingAddress.country_code || 'US';
    const shippingBreakdown = flatShipping.getShippingBreakdown(countryCode);
    const customerShippingCost = shippingBreakdown.customerShipping;
    const internalShippingCost = shippingBreakdown.internalShipping;

    // 4. Calculate markup (author profit margin)
    const markup = Math.max(0, (retailPrice || 0) - printCost - customerShippingCost - fulfillmentFee);

    // 5. Charge the author's wallet for the FULL cost
    const totalCharge = printCost + internalShippingCost + fulfillmentFee + markup;
    const chargeResult = await wallet.chargeOrderFullCost({
      locationId,
      contactId,
      bookTitle: book.title,
      retailPrice: retailPrice || 0,
      printCost,
      shippingCost: customerShippingCost,
      internalShippingCost,
      markup,
      agencyFee: 0,
      fulfillmentFee,
      totalCharge,
    });

    // 6. Create the print job record
    await db.createPrintJob({
      id: jobId,
      locationId,
      contactId,
      bookId,
      status: 'Pending',
      retailPrice: retailPrice || 0,
      printCost,
      shippingCost: customerShippingCost,
      internalShippingCost,
      markup,
      agencyFee: 0,
      walletChargeId: chargeResult.chargeId,
      readerName: '',
      readerEmail: '',
      bookTitle: book.title,
      podPackageId: book.pod_package_id,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity,
    });

    // 7. Submit to Lulu for printing
    const luluResult = await lulu.createPrintJob({
      bookId,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity,
    });

    await db.updatePrintJob(jobId, {
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
    });

    res.status(201).json({
      jobId,
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
      chargeId: chargeResult.chargeId,
      costBreakdown: {
        printCost,
        customerShippingCost,
        internalShippingCost,
        fulfillmentFee,
        markup,
        totalCharge,
      },
    });

  } catch (err) {
    console.error('[PrintJobs] Submit error:', err.message);

    // If wallet charge failed, roll back
    if (err.message?.includes('wallet') || err.message?.includes('insufficient')) {
      return res.status(402).json({ error: 'Insufficient wallet balance. Please add funds before submitting orders.' });
    }

    // Try to mark the job as failed
    try {
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
    } catch (_) {}

    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs/:jobId/status ─────────────────────────────────────────────
// Poll the status of a print job
router.get('/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await db.getPrintJob(jobId);
    if (!job) return res.status(404).json({ error: 'Print job not found' });

    // If job has a Lulu ID, poll Lulu for latest status
    let luluStatus = null;
    if (job.lulu_print_job_id) {
      try {
        luluStatus = await lulu.getPrintJobStatus(job.lulu_print_job_id);
      } catch (_) {}
    }

    res.json({
      jobId: job.id,
      status: job.status,
      luluPrintJobId: job.lulu_print_job_id,
      luluStatus: luluStatus?.status || null,
      trackingUrl: job.tracking_url,
      createdAt: job.created_at,
      costBreakdown: {
        retailPrice: job.retail_price,
        printCost: job.print_cost,
        shippingCost: job.shipping_cost,
        internalShippingCost: job.internal_shipping_cost,
        markup: job.markup,
        agencyFee: job.agency_fee,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /print-jobs (list by location) ───────────────────────────────────────
router.get('/', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });
  try {
    const jobs = await db.getPrintJobsByLocation(locationId);
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;