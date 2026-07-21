'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const lulu = require('../services/luluService');
const wallet = require('../services/walletService');
const flatShipping = require('../services/flatShipping');

// ── POST /workflow-action/print ───────────────────────────────────────────────
// Handles the second order path: a GoHighLevel workflow action triggers printing.
// Calculates flat shipping, charges the wallet, and submits to Lulu.
//
// Request body:
// {
//   locationId, contactId, bookId,
//   retailPrice, quantity,
//   shippingAddress: { street1, city, state_code, country_code, postcode, phone_number },
//   shippingLevel,
//   workflowId, executionId
// }
router.post('/print', async (req, res) => {
  const {
    locationId, contactId, bookId,
    retailPrice, quantity = 1,
    shippingAddress,
    shippingLevel = 'MAIL',
    workflowId, executionId,
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

    // 2. Calculate printing cost from Lulu
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

    // 4. Calculate markup
    const markup = Math.max(0, (retailPrice || 0) - printCost - customerShippingCost - fulfillmentFee);

    // 5. Charge the wallet
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

    // 6. Create print job record
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
      workflowId,
      executionId,
    });

    // 7. Submit to Lulu
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
    console.error('[WorkflowAction] Print error:', err.message);

    if (err.message?.includes('wallet') || err.message?.includes('insufficient')) {
      return res.status(402).json({ error: 'Insufficient wallet balance. Please add funds before submitting orders.' });
    }

    try {
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
    } catch (_) {}

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;