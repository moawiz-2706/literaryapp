'use strict';
/**
 * printJobs.js
 *
 * Handles print job creation triggered by the GHL "New Book Order" workflow
 * outbound webhook. Uses a single master Lulu account (credentials in env vars).
 * Charges the sub-account wallet a $10 service fee per order via the GHL
 * Marketplace Wallet Charge API before submitting the print job to Lulu.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const wallet = require('../services/walletService');

// ── Create Print Job (called by GHL Workflow Outbound Webhook) ────────────────
// GHL fires this when a reader completes checkout on an author's order form.
// The product description contains the embedded Lulu metadata.

router.post('/create', async (req, res) => {
  const payload = req.body;
  const locationId = payload.locationId || payload.location_id || payload.customData?.locationId;

  if (!locationId) {
    return res.status(400).json({ error: 'locationId is required in the webhook payload' });
  }

  await db.logWebhook('ghl_order', payload.event || 'order_submitted', payload);

  try {
    // 1. Extract reader and order data from the GHL order webhook payload
    const contact = payload.contact || {};
    const lineItems = payload.line_items || payload.lineItems || [];
    const firstItem = lineItems[0] || {};

    const readerName = contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Reader';
    const readerEmail = contact.email || '';
    const contactId = contact.id || contact.contactId || '';

    // 2. Parse Lulu metadata from the GHL product description
    const productDescription = firstItem.product?.description || firstItem.description || '';
    const metaMatch = productDescription.match(/<!--LULU_META:([\s\S]+?):LULU_META-->/);
    if (!metaMatch) {
      return res.status(400).json({
        error: 'Product does not contain Lulu metadata. Ensure the book was set up through the Book Setup Portal.'
      });
    }
    let luluMeta;
    try {
      luluMeta = JSON.parse(metaMatch[1]);
    } catch (e) {
      return res.status(400).json({ error: 'Could not parse Lulu metadata from product description.' });
    }

    const { pod_package_id, interior_pdf_url, cover_pdf_url, page_count, print_cost, book_id } = luluMeta;
    const bookTitle = firstItem.product?.name || firstItem.name || 'Book';
    const quantity = parseInt(firstItem.qty || firstItem.quantity || 1);
    const retailPrice = parseFloat(firstItem.price || firstItem.amount || 0);

    // 3. Parse shipping address from the GHL payload
    const shippingAddr = payload.shipping_address || payload.shippingAddress || contact.address || {};
    const shippingAddress = {
      name: readerName,
      street1: shippingAddr.address1 || shippingAddr.street1 || shippingAddr.line1 || '',
      street2: shippingAddr.address2 || shippingAddr.street2 || '',
      city: shippingAddr.city || '',
      state_code: shippingAddr.state || shippingAddr.state_code || '',
      country_code: shippingAddr.country || shippingAddr.country_code || 'US',
      postcode: shippingAddr.postal_code || shippingAddr.postcode || shippingAddr.zip || '',
      phone: contact.phone || ''
    };

    // 4. Calculate Lulu print cost for this order
    let printCost = parseFloat(print_cost) || 0;
    let shippingCost = 0;
    try {
      const costData = await lulu.calculatePrintCost(pod_package_id, page_count || 100, 'MAIL', shippingAddress);
      printCost = costData.printCost;
      shippingCost = costData.shippingCost;
    } catch (costErr) {
      console.warn('[PrintJobs] Cost calculation warning:', costErr.message);
    }

    // 5. Retrieve the agency company ID for the wallet charge
    let companyId = '';
    try {
      const tokenRow = await ghl.getTokensForLocation(locationId);
      companyId = tokenRow?.company_id || '';
    } catch (_) {}

    const serviceFee = parseFloat(process.env.AGENCY_SERVICE_FEE_PER_ORDER || '10.00');
    const jobId = uuidv4();

    await db.createPrintJob({
      id: jobId,
      locationId,
      contactId,
      bookId: book_id || null,
      status: 'Pending',
      retailPrice,
      printCost,
      shippingCost,
      agencyFee: serviceFee,
      readerName,
      readerEmail,
      bookTitle,
      podPackageId: pod_package_id,
      interiorPdfUrl: interior_pdf_url,
      coverPdfUrl: cover_pdf_url,
      shippingAddress,
      shippingLevel: 'MAIL',
      quantity
    });

    // 6. Charge the sub-account wallet the $10 service fee BEFORE submitting to Lulu.
    //    If the charge fails (wallet empty, billing not configured), we abort and
    //    do not create the print job, protecting the agency from absorbing the cost.
    let walletChargeId = null;
    try {
      const chargeResult = await wallet.chargeOrderServiceFee(
        locationId,
        companyId,
        jobId,
        bookTitle
      );
      walletChargeId = chargeResult.chargeId;
      await db.updatePrintJob(jobId, { walletChargeId, status: 'Charged' });
      console.log(`[PrintJobs] Wallet charge successful: ${walletChargeId} for locationId=${locationId}`);
    } catch (chargeErr) {
      console.error('[PrintJobs] Wallet charge failed:', chargeErr.message);
      await db.updatePrintJob(jobId, { status: 'Charge Failed' });

      if (contactId) {
        await ghl.writeOrderCustomFields(locationId, contactId, {
          fulfillmentStatus: 'Billing Error - Contact Support'
        }).catch(() => {});
      }

      return res.status(402).json({
        error: 'Service fee could not be charged to this sub-account. Ensure the sub-account wallet is funded and the app billing is configured.',
        detail: chargeErr.message,
        jobId
      });
    }

    // 7. Create GHL Opportunity in the Book Orders pipeline
    let opportunityId = null;
    try {
      const opp = await ghl.createOpportunity(locationId, {
        name: `${bookTitle} - ${readerName}`,
        pipelineId: process.env.GHL_PIPELINE_ID,
        stageId: process.env.GHL_STAGE_ORDER_RECEIVED,
        contactId,
        monetaryValue: retailPrice
      });
      opportunityId = opp?.id;
      await db.updatePrintJob(jobId, { ghlOpportunityId: opportunityId });
    } catch (oppErr) {
      console.warn('[PrintJobs] Opportunity creation warning:', oppErr.message);
    }

    // 8. Tag the contact as Book Buyer
    if (contactId) {
      await ghl.addTagsToContact(locationId, contactId, ['Book Buyer']).catch(() => {});
    }

    // 9. Submit the print job to Lulu using the master agency account
    let luluPrintJobId = null;
    try {
      const luluJob = await lulu.createPrintJob({
        externalId: jobId,
        contactId,
        readerEmail,
        bookTitle,
        coverPdfUrl: cover_pdf_url,
        interiorPdfUrl: interior_pdf_url,
        podPackageId: pod_package_id,
        quantity,
        shippingAddress,
        shippingLevel: 'MAIL'
      });
      luluPrintJobId = String(luluJob.id);
      await db.updatePrintJob(jobId, { luluPrintJobId, status: 'Sent to Print' });

      // Move opportunity to Sent to Print stage
      if (opportunityId && process.env.GHL_STAGE_SENT_TO_PRINT) {
        await ghl.updateOpportunityStage(locationId, opportunityId, process.env.GHL_STAGE_SENT_TO_PRINT).catch(() => {});
      }

      // Write Lulu Print Job ID and status to GHL contact custom fields
      if (contactId) {
        await ghl.writeOrderCustomFields(locationId, contactId, {
          luluPrintJobId,
          fulfillmentStatus: 'Sent to Print'
        }).catch(() => {});
        await ghl.addTagsToContact(locationId, contactId, ['Sent to Print']).catch(() => {});
      }

    } catch (luluErr) {
      console.error('[PrintJobs] Lulu print job creation failed:', luluErr.response?.data || luluErr.message);
      await db.updatePrintJob(jobId, { status: 'Error' });

      if (contactId) {
        await ghl.writeOrderCustomFields(locationId, contactId, {
          fulfillmentStatus: 'Fulfillment Error'
        }).catch(() => {});
        await ghl.addTagsToContact(locationId, contactId, ['Lulu Fulfillment Issue']).catch(() => {});
      }
      if (opportunityId && process.env.GHL_STAGE_FULFILLMENT_ISSUE) {
        await ghl.updateOpportunityStage(locationId, opportunityId, process.env.GHL_STAGE_FULFILLMENT_ISSUE).catch(() => {});
      }

      return res.status(202).json({
        jobId,
        walletChargeId,
        status: 'Error',
        error: 'Service fee was charged but Lulu returned an error. Check the fulfillment dashboard.',
        luluError: luluErr.response?.data?.detail || luluErr.message
      });
    }

    res.status(201).json({
      jobId,
      luluPrintJobId,
      walletChargeId,
      serviceFeeCharged: serviceFee,
      status: 'Sent to Print',
      message: `Print job created and submitted to Lulu. A $${serviceFee.toFixed(2)} service fee was charged to the sub-account.`
    });

  } catch (err) {
    console.error('[PrintJobs] Unhandled error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get Print Job Status ──────────────────────────────────────────────────────
router.get('/:jobId', async (req, res) => {
  try {
    const job = await db.getPrintJobById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Print job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List Print Jobs for a Location ────────────────────────────────────────────
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
