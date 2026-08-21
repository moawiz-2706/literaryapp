'use strict';
/**
 * samples.js
 *
 * Routes for ordering sample copies and approving products.
 *
 * Flow:
 *   1. Book is "Ready" (validated + GHL product created)
 *   2. User clicks "Order Sample Copy" → POST /samples/order
 *   3. System creates a print job for 1 copy and submits to Lulu
 *      (Payment handled by Lulu — no wallet deduction)
 *   4. Book status updates to "Sample Ordered" with tracking
 *   5. When sample arrives, user clicks "Approve & Publish" → POST /samples/approve
 *   6. Product is activated in GHL subaccount
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const sampleDb = require('../db/sampleDb');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const { placeOrder } = require('../services/orderService');
const statusService = require('../services/statusService');


// ── POST /samples/order ──────────────────────────────────────────────────────
// Order a sample copy of a validated book. Payment handled by Lulu directly.

router.post('/order', async (req, res) => {
  const { locationId, bookId, shippingAddress, shippingLevel = 'MAIL' } = req.body;

  if (!locationId || !bookId) {
    return res.status(400).json({ error: 'locationId and bookId are required' });
  }
  // Validate required shipping address fields (Lulu requires: street1, city, country_code, postcode, phone_number)
  if (!shippingAddress || !shippingAddress.street1 || !shippingAddress.city || !shippingAddress.country_code) {
    return res.status(400).json({ error: 'Valid shippingAddress with street1, city, and country_code is required' });
  }
  if (!shippingAddress.postcode || shippingAddress.postcode.trim() === '') {
    return res.status(400).json({ error: 'Shipping address is missing postcode (ZIP code). Lulu requires this field for all orders.' });
  }
  if (!shippingAddress.phone_number || shippingAddress.phone_number.trim() === '') {
    return res.status(400).json({ error: 'Shipping address is missing phone number. Lulu requires this field for all orders.' });
  }

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

    // Sample orders must actually reach a person — Lulu sends the shipment
    // notification to readerEmail. The legacy path passed an empty string, which
    // could stall the job at UNPAID; require a real contact email now.
    const sampleEmail = shippingAddress.email;
    if (!sampleEmail) {
      return res.status(400).json({
        error: 'Sample orders require a contact email on the shipping address '
          + '— Lulu sends the shipping notification to it and will not accept an order without one.'
      });
    }

    // 2. Place the order through the canonical order service (idempotent).
    const orderResult = await placeOrder({
      locationId,
      book,
      quantity: 1,
      shippingLevel,
      shippingAddress,
      readerEmail: sampleEmail,
      readerName: shippingAddress.name || 'Sample Copy',
      retailPrice: 0,
      contactId: 'sample',
      source: 'sample',
    });

    // 3. Update the book with sample info (only write columns that exist)
    try {
      await sampleDb.updateBookSampleInfo(bookId, {
        samplePrintJobId: orderResult.luluPrintJobId,
        sampleStatus: 'ordered',
        sampleCost: orderResult.costs ? orderResult.costs.totalCost : 0,
      });
    } catch (sampleErr) {
      // If sample tracking columns don't exist, log and continue
      if (sampleErr.message.includes('sample_cost') || sampleErr.message.includes('sample_print_job_id')) {
        console.warn('[Samples] sample tracking columns missing on books table — update SQL migration. Error:', sampleErr.message);
      } else {
        console.warn('[Samples] Could not update book sample info:', sampleErr.message);
      }
    }

    res.status(orderResult.idempotent ? 200 : 201).json({
      jobId: orderResult.jobId,
      luluPrintJobId: orderResult.luluPrintJobId,
      printJobId: orderResult.luluPrintJobId,     // alias for frontend compatibility
      idempotent: orderResult.idempotent,
      sampleStatus: 'ordered',
      costBreakdown: orderResult.costs
        ? { ...orderResult.costs, totalSampleCost: orderResult.costs.totalCost }
        : null,
      warnings: orderResult.costs?.warnings || [],
      estimatedShippingDates: orderResult.costs?.estimatedShippingDates || null,
      message: orderResult.idempotent
        ? `Sample order already exists for this book and address (luluId ${orderResult.luluPrintJobId}).`
        : `Sample copy ordered for "${book.title}". You'll receive a tracking number once it ships.`
    });

  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    console.error('[Samples] Order error:', errorMsg);
    if (err.response) {
      console.error('[Samples] Lulu error details:', JSON.stringify(err.response.data, null, 2));
    }
    const detail = err.response
      ? JSON.stringify(err.response.data || {}).substring(0, 500)
      : errorMsg;
    res.status(err.response ? 502 : 400).json({ error: errorMsg, detail });
  }
});

// ── POST /samples/approve ────────────────────────────────────────────────────
// Approve the sample and activate the product in the subaccount.

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

    // 2. The book should be Ready (validated + GHL product created during validation)
    if (book.status !== 'Ready') {
      return res.status(400).json({
        error: `Book must be in "Ready" status to approve. Current status: ${book.status}. Please re-validate the book first.`
      });
    }

    // 3. Check if GHL product exists — if not, try to create it now
    let ghlProductId = book.ghl_product_id;
    if (!ghlProductId) {
      console.log(`[Samples] GHL product ID missing for book "${book.title}", attempting to create it now...`);
      try {
        const productResult = await ghl.createProduct(locationId, {
          bookId,
          title: book.title,
          podPackageId: book.pod_package_id,
          interiorPdfUrl: book.interior_pdf_url,
          coverPdfUrl: book.cover_pdf_url,
          pageCount: book.page_count,
          printCost: book.print_cost || 0,
          retailPrice: book.retail_price || 0,
          description: `Print-on-demand: ${book.title}`
        });
        // createProduct returns { productId, priceId, product, price }
        ghlProductId = productResult?.productId || null;
        if (ghlProductId) {
          // Save the product ID back to the database
          await db.updateBook(bookId, { ghlProductId });
          console.log(`[Samples] GHL product created during approval: ${ghlProductId} (priceId: ${productResult.priceId})`);
        }
      } catch (prodErr) {
        console.warn('[Samples] Failed to create GHL product during approval:', prodErr.message);
        if (prodErr.response) {
          console.warn('[Samples] GHL error details:', JSON.stringify(prodErr.response.data || {}, null, 2));
        }
        // Continue anyway — approval is just a local flag
      }
    }

    // 4. Mark product as approved
    try {
      await sampleDb.approveProduct(bookId, locationId);
    } catch (approveErr) {
      // If product_approved column doesn't exist, log and continue
      console.warn('[Samples] Could not set product_approved on books table:', approveErr.message);
    }

    console.log(`[Samples] Product approved: "${book.title}" (ghlProductId: ${ghlProductId || 'none'})`);

    res.json({
      success: true,
      bookId,
      ghlProductId,
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
      trackingUrl: book.sample_tracking_url || null,  // alias for frontend compatibility
      productApproved: book.product_approved || false,
      ghlProductId: book.ghl_product_id || null,
    };

    // If sample has been ordered, poll Lulu for latest status
    if (book.sample_print_job_id) {
      try {
        const luluStatus = await lulu.getPrintJobStatus(book.sample_print_job_id, book.location_id);
        // Lulu returns status as an object: { name, message, changed, line_item_statuses }
        sampleData.luluStatus = luluStatus.status?.name || luluStatus.status || null;

        // Extract tracking URLs from the documented nested structure:
        // status.line_item_statuses[].messages.tracking_urls
        let trackingUrl = null;
        if (luluStatus.status?.line_item_statuses) {
          for (const item of luluStatus.status.line_item_statuses) {
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
        // Fallback
        if (!trackingUrl) {
          trackingUrl = luluStatus.tracking_url || luluStatus.tracking?.url || null;
        }

        sampleData.luluTracking = trackingUrl;

        // Update trackingUrl alias if we got a new tracking URL
        if (trackingUrl) {
          sampleData.trackingUrl = trackingUrl;
          sampleData.sampleTrackingUrl = trackingUrl;
        }

        // Sync status back to DB if changed
        const statusName = sampleData.luluStatus || '';
        const newStatus = statusName === 'SHIPPED' ? 'shipped'
          : statusName === 'DELIVERED' ? 'delivered'
          : 'ordered';

        if (newStatus !== book.sample_status) {
          const updateData = { sampleStatus: newStatus };
          if (sampleData.trackingUrl) {
            updateData.sampleTrackingUrl = sampleData.trackingUrl;
          }
          try {
            await sampleDb.updateBookSampleInfo(bookId, updateData);
            sampleData.sampleStatus = newStatus;
          } catch (syncErr) {
            console.warn('[Samples] Could not sync sample status to DB:', syncErr.message);
          }
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
