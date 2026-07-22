'use strict';
/**
 * samples.js
 *
 * Routes for ordering sample copies and approving products.
 *
 * Flow:
 *   1. Book is "Ready" (validated + GHL product created)
 *   2. User clicks "Order Sample Copy" → POST /samples/order
 *   3. System creates a print job for 1 copy, charges wallet, submits to Lulu
 *   4. Book status updates to "Sample Ordered" with tracking
 *   5. When sample arrives, user clicks "Approve & Publish" → POST /samples/approve
 *   6. Product is activated in GHL subaccount
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const sampleDb = require('../db/sampleDb');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const wallet = require('../services/walletService');
const flatShipping = require('../services/flatShipping');

// ── POST /samples/order ──────────────────────────────────────────────────────
// Order a sample copy of a validated book. Charges the wallet and submits to Lulu.
//
// Request body:
// {
//   locationId, bookId,
//   shippingAddress: { street1, street2?, city, state_code, country_code, postcode, phone_number },
//   shippingLevel?: 'MAIL' | 'PRIORITY_MAIL' | ...
// }

router.post('/order', async (req, res) => {
  const { locationId, bookId, shippingAddress, shippingLevel = 'MAIL' } = req.body;

  if (!locationId || !bookId) {
    return res.status(400).json({ error: 'locationId and bookId are required' });
  }
  if (!shippingAddress || !shippingAddress.street1 || !shippingAddress.city || !shippingAddress.country_code) {
    return res.status(400).json({ error: 'Valid shippingAddress with street1, city, and country_code is required' });
  }

  const jobId = uuidv4();

  try {
    // 1. Fetch the book
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    if (book.status !== 'Ready') {
      return res.status(400).json({
        error: `Book must be in "Ready" status to order a sample. Current status: ${book.status}`
      });
    }

    // 2. Calculate print cost (sample is always 1 copy)
    const costData = await lulu.calculatePrintCost(
      book.pod_package_id,
      book.page_count || 100,
      shippingLevel,
      shippingAddress,
      1  // Always 1 sample copy
    );

    const printCost = costData.unitPrintCost;
    const fulfillmentFee = costData.fulfillmentFee || 0.75;

    // 3. Calculate flat shipping
    const countryCode = shippingAddress.country_code || 'US';
    const shippingBreakdown = flatShipping.getShippingBreakdown(countryCode);
    const customerShippingCost = shippingBreakdown.customerShipping;
    const internalShippingCost = shippingBreakdown.internalShipping;

    // 4. For samples, no retail markup — just cost + shipping
    const totalSampleCost = printCost + internalShippingCost + fulfillmentFee;

    // 5. Charge the wallet
    let chargeResult;
    try {
      chargeResult = await wallet.chargeOrderFullCost({
        locationId,
        contactId: '',  // Samples don't have a reader contact
        bookTitle: book.title,
        retailPrice: 0,
        printCost,
        shippingCost: customerShippingCost,
        internalShippingCost,
        markup: 0,
        agencyFee: 0,
        fulfillmentFee,
        totalCharge: totalSampleCost,
      });
    } catch (walletErr) {
      return res.status(402).json({ error: 'Insufficient wallet balance. Please add funds before ordering a sample.' });
    }

    // 6. Create a print job record (sample type)
    await db.createPrintJob({
      id: jobId,
      locationId,
      contactId: '',
      bookId,
      status: 'Pending',
      retailPrice: 0,
      printCost,
      shippingCost: customerShippingCost,
      internalShippingCost,
      markup: 0,
      agencyFee: 0,
      walletChargeId: chargeResult.chargeId,
      readerName: 'Sample Copy',
      readerEmail: '',
      bookTitle: book.title,
      podPackageId: book.pod_package_id,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity: 1,
    });

    // 7. Submit to Lulu
    const luluResult = await lulu.createPrintJob({
      bookId,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity: 1,
    });

    // 8. Update the print job with Lulu ID
    await db.updatePrintJob(jobId, {
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
    });

    // 9. Update the book with sample info
    await sampleDb.updateBookSampleInfo(bookId, {
      samplePrintJobId: luluResult.id,
      sampleStatus: 'ordered',
      sampleCost: totalSampleCost
    });

    res.status(201).json({
      jobId,
      luluPrintJobId: luluResult.id,
      sampleStatus: 'ordered',
      costBreakdown: {
        printCost,
        customerShippingCost,
        fulfillmentFee,
        totalSampleCost,
      },
      message: `Sample copy ordered for "${book.title}". You'll receive a tracking number once it ships.`
    });

  } catch (err) {
    console.error('[Samples] Order error:', err.message);
    try {
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// ── POST /samples/approve ────────────────────────────────────────────────────
// Approve the sample and activate the product in the subaccount.
//
// Request body:
// {
//   locationId, bookId
// }

router.post('/approve', async (req, res) => {
  const { locationId, bookId } = req.body;

  if (!locationId || !bookId) {
    return res.status(400).json({ error: 'locationId and bookId are required' });
  }

  try {
    // 1. Fetch the book
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });

    // 2. The book should be Ready (GHL product already created during validation)
    if (book.status !== 'Ready') {
      return res.status(400).json({
        error: `Book must be in "Ready" status. Current status: ${book.status}`
      });
    }

    // 3. Check if GHL product exists
    if (!book.ghl_product_id) {
      return res.status(400).json({ error: 'GHL product was not created during validation. Please re-validate the book.' });
    }

    // 4. Mark product as approved
    await sampleDb.approveProduct(bookId, locationId);

    // 5. Optionally write approval status to GHL custom fields
    // (This is a no-op if there's no contact — the product is already in the catalog)
    console.log(`[Samples] Product approved: "${book.title}" (${book.ghl_product_id})`);

    res.json({
      success: true,
      bookId,
      ghlProductId: book.ghl_product_id,
      productTitle: book.title,
      message: `Product "${book.title}" has been approved and is now active in your catalog.`
    });

  } catch (err) {
    console.error('[Samples] Approve error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /samples/:bookId/status ───────────────────────────────────────────────
// Get the current sample order status for a book

router.get('/:bookId/status', async (req, res) => {
  const { bookId } = req.params;

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const sampleData = {
      bookId,
      bookTitle: book.title,
      sampleStatus: book.sample_status || 'pending',
      samplePrintJobId: book.sample_print_job_id || null,
      sampleCost: book.sample_cost || 0,
      sampleTrackingUrl: book.sample_tracking_url || null,
      productApproved: book.product_approved || false,
      ghlProductId: book.ghl_product_id || null,
    };

    // If sample has been ordered, poll Lulu for latest status
    if (book.sample_print_job_id) {
      try {
        const luluStatus = await lulu.getPrintJobStatus(book.sample_print_job_id);
        sampleData.luluStatus = luluStatus.status;
        sampleData.luluTracking = luluStatus.tracking_url || luluStatus.tracking?.url || null;

        // Sync status back to DB if changed
        const newStatus = luluStatus.status === 'SHIPPED' ? 'shipped'
          : luluStatus.status === 'DELIVERED' ? 'delivered'
          : 'ordered';

        if (newStatus !== book.sample_status) {
          await sampleDb.updateBookSampleInfo(bookId, {
            sampleStatus: newStatus,
            ...(luluStatus.tracking_url && { sampleTrackingUrl: luluStatus.tracking_url })
          });
          sampleData.sampleStatus = newStatus;
        }
      } catch (luluErr) {
        // Lulu API might be down — just return what we have
        console.warn('[Samples] Could not poll Lulu:', luluErr.message);
      }
    }

    res.json(sampleData);

  } catch (err) {
    console.error('[Samples] Status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
