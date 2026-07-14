'use strict';
/**
 * workflowAction.js
 *
 * Handles the GHL Marketplace Custom Workflow Action.
 * This route is registered as the "Action Execution URL" in the GHL Developer
 * Portal under Modules > Workflow > Create Action.
 *
 * When a GHL workflow runs the "Create Lulu Print Job" action, GHL sends a
 * POST request to this endpoint with the contact, location, and any fields
 * configured in the action form.
 *
 * GHL Payload Structure:
 * {
 *   "data": {
 *     "shipping_level": "MAIL",       // from action form field
 *     "quantity": "1",                // from action form field
 *     "product_id": "abc123"          // from action form field (hidden, mapped from trigger)
 *   },
 *   "extras": {
 *     "locationId": "xyz",
 *     "contactId": "abc",
 *     "workflowId": "def",
 *     "executionId": "exec_123"       // used for pause/resume if enabled
 *   },
 *   "meta": {
 *     "key": "create_lulu_print_job",
 *     "version": "1.0"
 *   }
 * }
 *
 * Response for synchronous execution:
 * HTTP 200 with JSON output object. GHL maps the output keys to workflow variables.
 *
 * Response for pause execution (if Pause Execution is enabled in the action):
 * HTTP 200 immediately, then call the GHL resume webhook when Lulu ships.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const wallet = require('../services/walletService');

// ── Custom Action: Create Lulu Print Job ──────────────────────────────────────
// Registered in GHL Developer Portal as the Action Execution URL.
// URL: POST /workflow-action/create-print-job

router.post('/create-print-job', async (req, res) => {
  const { data = {}, extras = {}, meta = {} } = req.body;

  const locationId = extras.locationId;
  const contactId = extras.contactId;
  const workflowId = extras.workflowId;
  const executionId = extras.executionId;

  if (!locationId) {
    return res.status(400).json({
      success: false,
      error: 'locationId is missing from the workflow action payload extras.'
    });
  }

  console.log(`[WorkflowAction] Received create-print-job for locationId=${locationId}, contactId=${contactId}, workflowId=${workflowId}`);

  try {
    // 1. Read the product ID from the action form data.
    //    This is a hidden field mapped from the workflow trigger (e.g. order product ID).
    const productId = data.product_id || data.productId || '';
    const shippingLevel = data.shipping_level || 'MAIL';
    const quantity = parseInt(data.quantity || '1', 10);

    // 2. Fetch the GHL product to retrieve the embedded Lulu metadata
    let luluMeta = null;
    let bookTitle = 'Book';
    let retailPrice = 0;

    if (productId) {
      try {
        const token = await ghl.getValidToken(locationId);
        const axios = require('axios');
        const productResp = await axios.get(
          `${process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com'}/products/${productId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Version: '2021-07-28'
            }
          }
        );
        const product = productResp.data?.product || productResp.data;
        bookTitle = product?.name || 'Book';
        retailPrice = product?.variants?.[0]?.price || 0;
        const desc = product?.description || '';
        const metaMatch = desc.match(/<!--LULU_META:([\s\S]+?):LULU_META-->/);
        if (metaMatch) {
          luluMeta = JSON.parse(metaMatch[1]);
        }
      } catch (productErr) {
        console.warn('[WorkflowAction] Could not fetch product:', productErr.message);
      }
    }

    // 3. If no product ID or metadata, try to read from action data fields directly
    if (!luluMeta) {
      const podPackageId = data.pod_package_id || data.podPackageId;
      const interiorPdfUrl = data.interior_pdf_url || data.interiorPdfUrl;
      const coverPdfUrl = data.cover_pdf_url || data.coverPdfUrl;

      if (podPackageId && interiorPdfUrl && coverPdfUrl) {
        luluMeta = {
          pod_package_id: podPackageId,
          interior_pdf_url: interiorPdfUrl,
          cover_pdf_url: coverPdfUrl,
          page_count: parseInt(data.page_count || '100', 10),
          print_cost: parseFloat(data.print_cost || '0'),
          book_id: data.book_id || null
        };
        bookTitle = data.book_title || bookTitle;
      }
    }

    if (!luluMeta) {
      return res.status(400).json({
        success: false,
        error: 'Could not find Lulu print metadata. Provide a product_id or set pod_package_id, interior_pdf_url, and cover_pdf_url fields in the action.'
      });
    }

    const { pod_package_id, interior_pdf_url, cover_pdf_url, page_count, print_cost, book_id } = luluMeta;

    // 4. Fetch contact details for the shipping address
    let readerName = 'Reader';
    let readerEmail = '';
    let shippingAddress = {};

    try {
      const token = await ghl.getValidToken(locationId);
      const axios = require('axios');
      const contactResp = await axios.get(
        `${process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com'}/contacts/${contactId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Version: '2021-07-28'
          }
        }
      );
      const contact = contactResp.data?.contact || {};
      readerName = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Reader';
      readerEmail = contact.email || '';
      const addr = contact.address1 ? contact : {};
      shippingAddress = {
        name: readerName,
        street1: addr.address1 || data.shipping_street1 || '',
        street2: addr.address2 || data.shipping_street2 || '',
        city: addr.city || data.shipping_city || '',
        state_code: addr.state || data.shipping_state || '',
        country_code: addr.country || data.shipping_country || 'US',
        postcode: addr.postalCode || data.shipping_postcode || '',
        phone: contact.phone || ''
      };
    } catch (contactErr) {
      console.warn('[WorkflowAction] Could not fetch contact:', contactErr.message);
      // Use any address fields passed directly in the action data
      shippingAddress = {
        name: readerName,
        street1: data.shipping_street1 || '',
        street2: data.shipping_street2 || '',
        city: data.shipping_city || '',
        state_code: data.shipping_state || '',
        country_code: data.shipping_country || 'US',
        postcode: data.shipping_postcode || '',
        phone: ''
      };
    }

    // 5. Calculate print cost
    let printCost = parseFloat(print_cost) || 0;
    let shippingCost = 0;
    try {
      const costData = await lulu.calculatePrintCost(pod_package_id, page_count || 100, shippingLevel, shippingAddress);
      printCost = costData.printCost;
      shippingCost = costData.shippingCost;
    } catch (costErr) {
      console.warn('[WorkflowAction] Cost calculation warning:', costErr.message);
    }

    // 6. Get company ID for the wallet charge
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
      shippingLevel,
      quantity,
      workflowId,
      executionId
    });

    // 7. Charge the $10 service fee to the sub-account wallet
    let walletChargeId = null;
    try {
      const chargeResult = await wallet.chargeOrderServiceFee(locationId, companyId, jobId, bookTitle);
      walletChargeId = chargeResult.chargeId;
      await db.updatePrintJob(jobId, { walletChargeId, status: 'Charged' });
    } catch (chargeErr) {
      console.error('[WorkflowAction] Wallet charge failed:', chargeErr.message);
      await db.updatePrintJob(jobId, { status: 'Charge Failed' });
      return res.status(200).json({
        success: false,
        jobId,
        error: 'Service fee charge failed. Ensure the sub-account wallet is funded.',
        detail: chargeErr.message
      });
    }

    // 8. Create GHL Opportunity
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
      console.warn('[WorkflowAction] Opportunity creation warning:', oppErr.message);
    }

    // 9. Tag contact as Book Buyer
    if (contactId) {
      await ghl.addTagsToContact(locationId, contactId, ['Book Buyer']).catch(() => {});
    }

    // 10. Submit print job to Lulu using the master agency account
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
        shippingLevel
      });
      luluPrintJobId = String(luluJob.id);
      await db.updatePrintJob(jobId, { luluPrintJobId, status: 'Sent to Print' });

      if (opportunityId && process.env.GHL_STAGE_SENT_TO_PRINT) {
        await ghl.updateOpportunityStage(locationId, opportunityId, process.env.GHL_STAGE_SENT_TO_PRINT).catch(() => {});
      }
      if (contactId) {
        await ghl.writeOrderCustomFields(locationId, contactId, {
          luluPrintJobId,
          fulfillmentStatus: 'Sent to Print'
        }).catch(() => {});
        await ghl.addTagsToContact(locationId, contactId, ['Sent to Print']).catch(() => {});
      }

    } catch (luluErr) {
      console.error('[WorkflowAction] Lulu error:', luluErr.response?.data || luluErr.message);
      await db.updatePrintJob(jobId, { status: 'Error' });
      if (contactId) {
        await ghl.writeOrderCustomFields(locationId, contactId, { fulfillmentStatus: 'Fulfillment Error' }).catch(() => {});
        await ghl.addTagsToContact(locationId, contactId, ['Lulu Fulfillment Issue']).catch(() => {});
      }
      if (opportunityId && process.env.GHL_STAGE_FULFILLMENT_ISSUE) {
        await ghl.updateOpportunityStage(locationId, opportunityId, process.env.GHL_STAGE_FULFILLMENT_ISSUE).catch(() => {});
      }

      // Return success=false so GHL can route to a failure branch in the workflow
      return res.status(200).json({
        success: false,
        jobId,
        walletChargeId,
        error: 'Print job could not be submitted to Lulu.',
        luluError: luluErr.response?.data?.detail || luluErr.message
      });
    }

    // 11. Return output data to GHL workflow.
    //     These keys become available as variables in subsequent workflow steps.
    return res.status(200).json({
      success: true,
      jobId,
      luluPrintJobId,
      walletChargeId,
      serviceFeeCharged: serviceFee,
      bookTitle,
      readerName,
      readerEmail,
      status: 'Sent to Print',
      message: `Print job submitted to Lulu. Service fee of $${serviceFee.toFixed(2)} charged.`
    });

  } catch (err) {
    console.error('[WorkflowAction] Unhandled error:', err.message);
    return res.status(200).json({
      success: false,
      error: err.message
    });
  }
});

// ── Dynamic Fields Endpoint ───────────────────────────────────────────────────
// GHL calls this when a field with "Alters Dynamic Field" is changed in the
// workflow action config UI. Returns the list of books available for the location.

router.post('/dynamic-fields', async (req, res) => {
  const { extras = {} } = req.body;
  const locationId = extras.locationId;

  if (!locationId) {
    return res.status(200).json({ inputs: [] });
  }

  try {
    const books = await db.getBooksByLocation(locationId);
    const bookOptions = books
      .filter(b => b.status === 'Ready')
      .map(b => ({
        label: b.title,
        value: b.id
      }));

    return res.status(200).json({
      inputs: [
        {
          section: 'Book Selection',
          fields: [
            {
              field: 'book_id',
              title: 'Select Book',
              fieldType: 'select',
              required: true,
              options: bookOptions
            }
          ]
        },
        {
          section: 'Shipping',
          fields: [
            {
              field: 'shipping_level',
              title: 'Shipping Speed',
              fieldType: 'select',
              required: true,
              options: [
                { label: 'Standard Mail', value: 'MAIL' },
                { label: 'Priority Mail', value: 'PRIORITY_MAIL' },
                { label: 'Ground', value: 'GROUND' },
                { label: 'Expedited', value: 'EXPEDITED' }
              ]
            },
            {
              field: 'quantity',
              title: 'Quantity',
              fieldType: 'numerical',
              required: true
            }
          ]
        }
      ]
    });
  } catch (err) {
    console.error('[WorkflowAction] Dynamic fields error:', err.message);
    return res.status(200).json({ inputs: [] });
  }
});

module.exports = router;
