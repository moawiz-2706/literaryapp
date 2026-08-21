'use strict';
/**
 * workflowAction.js
 *
 * GHL Custom Workflow Action: "Create Lulu Print Job"
 *
 * The user configures 9 input fields in the GHL workflow builder:
 *   1. Select Product (Book) — GHL Internal Reference → Products
 *   2. Quantity — numerical
 *   3. Shipping Speed — select (constants)
 *   4. Recipient First Name — maps to {{contact.firstName}}
 *   5. Recipient Last Name — maps to {{contact.lastName}}
 *   6. Recipient Email — maps to {{contact.email}}
 *   7. Recipient Phone — maps to {{contact.phone}}
 *   8. Street Address — maps to {{contact.address1}}
 *   9. City — maps to {{contact.city}}
 *   10. State Code — maps to {{contact.state}}
 *   11. Postal Code — maps to {{contact.postalCode}}
 *   12. Country Code — maps to {{contact.country}}
 *
 * The user maps GHL contact variables directly to each field.
 * The backend receives all shipping data in the request body,
 * normalizes it, and submits the order to Lulu.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const lulu = require('../services/luluService');
const ghl = require('../services/ghlService');
const { placeOrder } = require('../services/orderService');
const statusService = require('../services/statusService');

// ── Shipping level constants ─────────────────────────────────────────────────

const VALID_SHIPPING_LEVELS = ['MAIL', 'PRIORITY_MAIL', 'GROUND', 'GROUND_HD', 'GROUND_BUS', 'EXPEDITED', 'EXPRESS'];

// ── Helper: Extract locationId from the GHL payload ──────────────────────────

function extractLocationId(body) {
  if (body?.extras?.locationId) return String(body.extras.locationId).trim();
  if (body?.extras?.location_id) return String(body.extras.location_id).trim();
  if (body?.data?.locationId) return String(body.data.locationId).trim();
  if (body?.data?.location_id) return String(body.data.location_id).trim();
  if (body?.locationId) return String(body.locationId).trim();
  if (body?.location_id) return String(body.location_id).trim();
  if (body?.meta?.locationId) return String(body.meta.locationId).trim();
  return null;
}

function extractContactId(body) {
  if (body?.extras?.contactId) return String(body.extras.contactId).trim();
  if (body?.extras?.contact_id) return String(body.extras.contact_id).trim();
  if (body?.data?.contactId) return String(body.data.contactId).trim();
  if (body?.contactId) return String(body.contactId).trim();
  return null;
}

function extractWorkflowId(body) {
  if (body?.extras?.workflowId) return String(body.extras.workflowId).trim();
  if (body?.extras?.workflow_id) return String(body.extras.workflow_id).trim();
  if (body?.data?.workflowId) return String(body.data.workflowId).trim();
  if (body?.workflowId) return String(body.workflowId).trim();
  return null;
}

// ── Helper: Find book by GHL product name ────────────────────────────────────

async function findBookByProductName(locationId, productName) {
  if (!productName) return null;

  const allBooks = await db.getBooksByLocation(locationId);

  // Strategy 1: Exact match
  let match = allBooks.find(b => b.title === productName);
  if (match) return match;

  // Strategy 2: Case-insensitive match
  const lowerName = productName.toLowerCase().trim();
  match = allBooks.find(b => b.title && b.title.toLowerCase().trim() === lowerName);
  if (match) return match;

  // Strategy 3: Partial match
  match = allBooks.find(b => {
    const titleLower = (b.title || '').toLowerCase().trim();
    return titleLower && (lowerName.includes(titleLower) || titleLower.includes(lowerName));
  });
  if (match) return match;

  // Strategy 4: Match by ghl_product_id (GHL's "Select Product" field sends
  // the 24-hex GHL product id, e.g. 6a72431f1d52072776bfc022)
  if (/^[0-9a-f]{24}$/i.test(productName) || productName.startsWith('prod_')) {
    match = allBooks.find(b => b.ghl_product_id === productName);
    if (match) return match;
  }

  // Strategy 5: Match by ghl_product_id from LULU_META in description
  const metaMatch = productName.match(/<!--LULU_META:\{"book_id":"([^"]+)"\}:LULU_META-->/);
  if (metaMatch) {
    const bookId = metaMatch[1];
    return allBooks.find(b => b.id === bookId) || null;
  }

  console.warn(`[WorkflowAction] Could not find book matching product name: "${productName}"`);
  console.warn(`[WorkflowAction] Available books for location ${locationId}:`, allBooks.map(b => `"${b.title}"`).join(', '));
  return null;
}

// ── Helper: Build shipping address from input variables ──────────────────────

/**
 * Build the shipping address from the input variables sent by GHL.
 * These variables are mapped to GHL contact variables by the user.
 */
function buildShippingAddressFromData(data) {
  const name = `${(data.first_name || '').trim()} ${(data.last_name || '').trim()}`.trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const street1 = (data.street1 || data.street || data.address1 || '').trim();
  const street2 = (data.street2 || data.address2 || '').trim() || undefined;
  const city = (data.city || '').trim();
  const country_code = (data.country_code || data.country || 'US').trim().toUpperCase();
  const state_code = resolveStateCode((data.state_code || data.state || '').trim(), country_code);
  const postcode = (data.postal_code || data.postcode || data.postalCode || data.zip || data.zip_code || data.zipCode || '').trim();

  return {
    name: name || 'Customer',
    email,
    street1,
    street2,
    city,
    state_code,
    country_code: country_code || 'US',
    postcode,
    phone_number: phone || '0000000000',
  };
}

// ── Helper: State / province name → 2-letter code ───────────────────────────
// GHL contact variables can contain the full state name (e.g. "Alabama") or the
// 2-letter code (e.g. "AL"). Lulu requires the 2-letter code, so convert both
// forms to the canonical code here. Covers US + common English-speaking
// countries; for other countries the value passes through untouched.

// State/province name → 2-letter code resolver (shared across ALL order entry
// points — GHL workflow, quote calculator, sample orders, direct orders).
// Handles the full state name ("Alabama" → "AL"), the 2-letter code ("AL" →
// "AL"), and common typographical variants ("Alamaba" → "AL") via a US-only
// fuzzy match. Country-aware disambiguation keeps shared codes correct:
// "NT" = Canada's Northwest Territories for CA, Australia's Northern Territory
// for AU; "WA" = US state Washington for US, Western Australia for AU.
const { resolveStateCode } = require('../db/stateResolver');

// ── Helper: Normalize shipping address for Lulu ──────────────────────────────

function normalizeAddress(addr) {
  if (!addr) return addr;
  return {
    name:         (addr.name || '').trim(),
    email:        (addr.email || '').trim(),
    street1:      (addr.street1 || addr.street || addr.address1 || '').trim(),
    street2:      (addr.street2 || addr.address2 || '').trim() || undefined,
    city:         (addr.city || '').trim(),
    state_code:   (addr.state_code || addr.state || addr.stateCode || '').trim(),
    country_code: (addr.country_code || addr.country || addr.countryCode || 'US').trim().toUpperCase(),
    postcode:     (addr.postcode || addr.postalCode || addr.zip || addr.zipCode || '').trim(),
    phone_number: (addr.phone_number || addr.phoneNumber || addr.phone || '').trim(),
  };
}

// ── Helper: Validate shipping address ────────────────────────────────────────

function validateAddress(addr) {
  const errors = [];

  if (!addr.name || addr.name === 'Customer') {
    errors.push('Recipient first name and last name are required. Map them to {{contact.firstName}} and {{contact.lastName}}.');
  }
  if (!addr.email) {
    errors.push('Recipient email is required. Map it to {{contact.email}}.');
  }
  if (!addr.street1) {
    errors.push('Street address is required. Map it to {{contact.address1}}.');
  }
  if (!addr.city) {
    errors.push('City is required. Map it to {{contact.city}}.');
  }
  if (!addr.state_code) {
    errors.push('State/Province code is required. Map it to {{contact.state}}.');
  }
  if (!addr.country_code || addr.country_code.length !== 2) {
    errors.push('Country code is required (2-letter code like US, CA, GB). Map it to {{contact.country}}.');
  }
  if (!addr.postcode) {
    errors.push('Postal/ZIP code is required. Lulu requires this for shipping. Map it to {{contact.postalCode}}.');
  }
  if (!addr.phone_number || addr.phone_number === '0000000000') {
    errors.push('Phone number is required. Map it to {{contact.phone}}.');
  }

  return errors;
}

// ── POST /workflow-action/create-print-job ───────────────────────────────────

router.post('/create-print-job', async (req, res) => {
  let jobId = uuidv4();

  try {
    console.log('[WorkflowAction/create-print-job] Raw payload:', JSON.stringify(req.body, null, 2));
    console.log('[WorkflowAction/create-print-job] Query params:', JSON.stringify(req.query));

    // The GHL Marketplace action envelope puts the mapped input fields inside
    // req.body.data (contact variables) and identifiers inside req.body.extras.
    // Both shapes are supported: flat body OR the wrapped envelope.
    const isWrapped = req.body?.data && typeof req.body.data === 'object' && !Array.isArray(req.body.data);
    const data = isWrapped ? req.body.data : req.body; // mapped input fields
    const extras = (isWrapped ? req.body.extras : req.body.extras) || {};

    // ── Extract IDs ─────────────────────────────────────────────────────
    // Priority: query param > extras > body > data
    let locationId = (req.query.locationId || '').trim();
    if (!locationId) locationId = extractLocationId(req.body);
    if (!locationId) locationId = (req.query.location_id || '').trim();
    
    const contactId = (req.query.contactId || '').trim() || extractContactId(req.body);
    const workflowId = (req.query.workflowId || '').trim() || extractWorkflowId(req.body);
    const executionId = (req.query.executionId || '').trim() || extras?.executionId || data?.executionId || '';

    console.log('[WorkflowAction/create-print-job] locationId:', locationId || 'NOT FOUND');
    console.log('[WorkflowAction/create-print-job] contactId:', contactId || 'none');
    console.log('[WorkflowAction/create-print-job] workflowId:', workflowId || 'none');
    console.log('[WorkflowAction/create-print-job] Body keys:', Object.keys(data));

    if (!locationId) {
      console.error('[WorkflowAction/create-print-job] No locationId found in query, body, or extras');
      return res.status(400).json({
        error: 'locationId is missing from the request',
        status: 'Failed',
        message: 'This action must be run for an account that has installed the Literary App. Ensure the app is installed and the Location ID is available.',
        debug: {
          queryKeys: Object.keys(req.query),
          bodyKeys: Object.keys(req.body),
          hint: 'The platform sends locationId as a query parameter (?locationId=...). The workflow builder should populate this automatically.',
        }
      });
    }

    console.log('[WorkflowAction/create-print-job] locationId:', locationId);
    console.log('[WorkflowAction/create-print-job] contactId:', contactId || 'none');
    console.log('[WorkflowAction/create-print-job] workflowId:', workflowId || 'none');

    // ── Validate required fields ────────────────────────────────────────
    const productName = data.product_name || data.product || data.product_id;
    const quantity = parseInt(data?.quantity) || 1;
    const shippingLevel = data?.shipping_level || 'MAIL';

    if (!productName) {
      return res.status(400).json({
        error: 'product_name is required',
        status: 'Failed',
        message: 'Please select a product from the dropdown.'
      });
    }

    if (!VALID_SHIPPING_LEVELS.includes(shippingLevel)) {
      return res.status(400).json({
        error: 'Invalid shipping level',
        status: 'Failed',
        message: `Invalid shipping level "${shippingLevel}". Must be one of: ${VALID_SHIPPING_LEVELS.join(', ')}.`
      });
    }

    if (quantity < 1 || quantity > 1000) {
      return res.status(400).json({
        error: 'Invalid quantity',
        status: 'Failed',
        message: 'Quantity must be between 1 and 1000.'
      });
    }

    console.log('[WorkflowAction/create-print-job] product_name:', productName);
    console.log('[WorkflowAction/create-print-job] quantity:', quantity, 'shipping_level:', shippingLevel);

    // ── Find the book by product name ───────────────────────────────────
    // GHL's "Select Product" field sends the GHL product *id* (24-hex like
    // 6a72431f1d52072776bfc022), NOT the product name. findBookByProductName
    // therefore matches ghl_product_id as the primary strategy before
    // falling back to title matching.
    const book = await findBookByProductName(locationId, productName);
    if (!book) {
      return res.status(404).json({
        error: 'Book not found',
        status: 'Failed',
        message: `No book matches the product "${productName}". Make sure the book is approved and has a GHL product created.`,
        debug: {
          productName,
          locationId,
          hint: 'Books are linked to GHL products when they are approved (ghl_product_id). Please approve the book first in the Lulu Integration page, or re-map the "Select Product" field to {{products.product_id}} in the workflow builder.'
        }
      });
    }

    // Validate book status
    const readyStatuses = ['Ready', 'ready', 'Approved', 'approved', 'Active', 'active', 'Published', 'published', 'Live', 'live'];
    if (!readyStatuses.includes(book.status)) {
      return res.status(400).json({
        error: 'Book not ready',
        status: 'Failed',
        message: `The book "${book.title}" has status "${book.status}" and is not ready for printing.`
      });
    }

    if (!book.pod_package_id) {
      return res.status(400).json({
        error: 'Missing POD package ID',
        status: 'Failed',
        message: `The book "${book.title}" does not have a Lulu POD package ID. Please re-validate the book in the Lulu Integration page.`
      });
    }

    console.log('[WorkflowAction/create-print-job] Book found:', book.title, '| ID:', book.id);

    // ── Check Lulu credentials ──────────────────────────────────────────
    const creds = await db.getLuluCredentials(locationId);
    if (!creds) {
      return res.status(400).json({
        error: 'Lulu not configured',
        status: 'Failed',
        message: 'This sub-account has not connected a Lulu.com account. Please go to Settings → Lulu Integration and add your credentials.'
      });
    }

    // ── Build shipping address from input variables ─────────────────────
    // The user maps GHL contact variables to these fields in the workflow builder.
    // e.g., first_name → {{contact.firstName}}, street1 → {{contact.address1}}, etc.
    let shippingAddress = buildShippingAddressFromData(data);

    // Fill the literal string "undefined" (a GHL unmapped-variable artefact)
    // with an empty value so it can be enriched from the contact record.
    if (shippingAddress.street1 === 'undefined') shippingAddress.street1 = '';
    if (shippingAddress.name === 'undefined undefined') shippingAddress.name = '';

    // Try to enhance with actual contact data if contactId is available
    // This serves as a safety net — if any mapped variable is empty, we try the contact API
    if (contactId) {
      try {
        const contactResp = await ghl.getContact(locationId, contactId);
        const contactData = contactResp?.contact || null;
        if (contactData) {
          console.log('[WorkflowAction/create-print-job] Contact fetched for enhancement:', contactData?.firstName, contactData?.lastName);
          // Fill in any empty fields from the actual contact data
          if (!shippingAddress.name && (contactData.firstName || contactData.lastName)) {
            shippingAddress.name = `${(contactData.firstName || '').trim()} ${(contactData.lastName || '').trim()}`.trim();
          }
          if (!shippingAddress.email && contactData.email) shippingAddress.email = contactData.email;
          if ((!shippingAddress.phone_number || shippingAddress.phone_number === '0000000000') && contactData.phone) {
            shippingAddress.phone_number = contactData.phone;
          }
          if (!shippingAddress.street1 && contactData.address1) shippingAddress.street1 = contactData.address1;
          if (!shippingAddress.city && contactData.city) shippingAddress.city = contactData.city;
          if (!shippingAddress.state_code && contactData.state) shippingAddress.state_code = resolveStateCode(contactData.state, shippingAddress.country_code);
          if (!shippingAddress.country_code && contactData.country) shippingAddress.country_code = contactData.country.toUpperCase();
          if (!shippingAddress.postcode && contactData.postalCode) shippingAddress.postcode = contactData.postalCode;
        }
      } catch (fetchErr) {
        console.warn('[WorkflowAction/create-print-job] Failed to fetch contact for enhancement:', fetchErr.message);
      }
    }

    // Normalize: state may arrive as a full name ("Alabama") or a code ("AL") —
    // convert full names to codes before validation and Lulu submission.
    shippingAddress.state_code = resolveStateCode(shippingAddress.state_code, shippingAddress.country_code);
    shippingAddress = normalizeAddress(shippingAddress);
    const addressErrors = validateAddress(shippingAddress);

    if (addressErrors.length > 0) {
      return res.status(400).json({
        error: 'Incomplete shipping information',
        status: 'Failed',
        message: 'The shipping information is incomplete. Please map the following fields in your workflow:\n' +
                 addressErrors.map(e => '  - ' + e).join('\n'),
        missingFields: addressErrors,
        hint: 'Map each field to the corresponding GHL contact variable. For example: first_name → {{contact.firstName}}, street1 → {{contact.address1}}',
      });
    }

    console.log('[WorkflowAction/create-print-job] Shipping to:', shippingAddress.name, 'at', shippingAddress.street1, shippingAddress.city, shippingAddress.state_code, shippingAddress.country_code);

    const readerEmail = shippingAddress.email || 'orders@literaryapp.com';
    const readerName = shippingAddress.name;
    const retailPrice = parseFloat(book.retail_price || 0);

    // ── Place the order through the canonical order service ────────────
    // One idempotent entry point: duplicate GHL executions can never create
    // two Lulu jobs for the same intended order.
    let orderResult;
    try {
      orderResult = await placeOrder({
        locationId,
        book,
        quantity,
        shippingLevel,
        shippingAddress,
        readerEmail,
        readerName,
        retailPrice,
        contactId: contactId || undefined,
        workflowId,
        executionId,
        source: 'workflow',
      });
    } catch (orderErr) {
      console.error('[WorkflowAction/create-print-job] Order failed:', orderErr.message);
      const status = orderErr.response ? 502 : 400;
      return res.status(status).json({
        error: orderErr.response ? 'Lulu API error' : 'Order validation failed',
        status: 'Failed',
        message: `Failed to submit order to Lulu: ${orderErr.message}`,
        luluDetails: orderErr.response?.data || null,
        validationErrors: orderErr.validationErrors || undefined,
      });
    }

    const luluResult = orderResult.luluJob;
    jobId = orderResult.jobId;
    const costBreakdown = orderResult.costs;

    console.log('[WorkflowAction/create-print-job] orderResult:', JSON.stringify({
      jobId,
      luluPrintJobId: luluResult?.id,
      idempotent: orderResult.idempotent,
      costs: costBreakdown,
    }));

    // ── Create GHL opportunity ──────────────────────────────────────────
    if (!orderResult.idempotent) {
      try {
        const opp = await ghl.createOpportunity(locationId, contactId, book.title);
        if (opp?.id) {
          await db.updatePrintJob(jobId, { ghlOpportunityId: opp.id });
          console.log('[WorkflowAction/create-print-job] Opportunity created:', opp.id);
        }
      } catch (oppErr) {
        console.warn('[WorkflowAction/create-print-job] Opportunity creation failed (non-critical):', oppErr.message);
      }
    }

    // ── Tag the contact ─────────────────────────────────────────────────
    try {
      if (contactId) {
        await ghl.addTagsToContact(locationId, contactId, ['Lulu Order', `Order: ${book.title}`]);
        console.log('[WorkflowAction/create-print-job] Contact tagged: Lulu Order, Order: ' + book.title);
      }
    } catch (tagErr) {
      console.warn('[WorkflowAction/create-print-job] Tagging failed (non-critical):', tagErr.message);
    }

    // ── Update GHL contact custom fields ────────────────────────────────
    try {
      if (contactId) {
        await ghl.writeOrderCustomFields(locationId, contactId, {
          fulfillmentStatus: 'Submitted',
          luluPrintJobId: luluResult.id,
          orderTotalCost: parseFloat((costBreakdown?.totalCost || 0).toFixed(2)),
        });
        console.log('[WorkflowAction/create-print-job] Contact custom fields updated');
      }
    } catch (fieldErr) {
      console.warn('[WorkflowAction/create-print-job] Custom field update failed (non-critical):', fieldErr.message);
    }

    // ── Return output variables ─────────────────────────────────────────
    console.log('[WorkflowAction/create-print-job] SUCCESS — jobId:', jobId, ', luluId:', luluResult?.id);

    return res.status(orderResult.idempotent ? 200 : 201).json({
      jobId,
      luluPrintJobId: orderResult.luluPrintJobId,
      idempotent: orderResult.idempotent,
      status: orderResult.idempotent ? (orderResult.job?.status || 'Sent to Print') : 'Sent to Print',
      totalCost: costBreakdown ? parseFloat(costBreakdown.totalCost.toFixed(2)) : 0,
      printCost: costBreakdown ? parseFloat(costBreakdown.printCost.toFixed(2)) : 0,
      shippingCost: costBreakdown ? parseFloat(costBreakdown.shippingCost.toFixed(2)) : 0,
      fulfillmentFee: costBreakdown ? parseFloat((costBreakdown.fulfillmentFee || 0).toFixed(2)) : 0,
      markup: parseFloat((retailPrice - (costBreakdown?.printCost || 0) - (costBreakdown?.shippingCost || 0) - (costBreakdown?.fulfillmentFee || 0)).toFixed(2)),
      retailPrice,
      warnings: costBreakdown?.warnings || [],
      suggestedAddress: costBreakdown?.suggestedAddress || null,
      estimatedShippingDates: costBreakdown?.estimatedShippingDates || null,
      readerName,
      readerEmail,
      shippingStreet: shippingAddress.street1,
      shippingCity: shippingAddress.city,
      shippingState: shippingAddress.state_code,
      shippingCountry: shippingAddress.country_code,
      shippingPostalCode: shippingAddress.postcode,
      message: orderResult.idempotent
        ? `This order already exists (luluId ${orderResult.luluPrintJobId}). No duplicate was created.`
        : `Print job created successfully. Order submitted to Lulu for "${book.title}".`,
    });

  } catch (err) {
    console.error('[WorkflowAction/create-print-job] Fatal error:', err.message);
    if (err.response) {
      console.error('[WorkflowAction/create-print-job] API error details:', JSON.stringify(err.response.data, null, 2));
    }

    try {
      if (jobId) await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
    } catch (_) {}

    return res.status(500).json({
      jobId,
      error: err.message,
      status: 'Failed',
      message: `Order failed: ${err.message}`,
    });
  }
});

// ── POST /workflow-action/dynamic-fields (backward compat) ───────────────────

router.post('/dynamic-fields', (req, res) => {
  console.log('[WorkflowAction/dynamic-fields] Called but not needed — using GHL form fields directly');
  res.json({ inputs: [] });
});

// ── Legacy endpoint (backward compatibility) ─────────────────────────────────

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
  if (!shippingAddress.postcode || shippingAddress.postcode.trim() === '') {
    return res.status(400).json({ error: 'Shipping address is missing postcode (ZIP code). Lulu requires this field.' });
  }
  if (!shippingAddress.phone_number || shippingAddress.phone_number.trim() === '') {
    return res.status(400).json({ error: 'Shipping address is missing phone number. Lulu requires this field.' });
  }
  if (!shippingAddress.email) {
    return res.status(400).json({ error: 'Shipping address is missing email. Lulu sends shipping notifications to it.' });
  }

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    const readyStatuses = ['Ready', 'ready', 'Approved', 'approved', 'Active', 'active', 'Published', 'published', 'Live', 'live'];
    if (!readyStatuses.includes(book.status)) return res.status(400).json({ error: 'Book is not ready for printing' });

    const orderResult = await placeOrder({
      locationId,
      book,
      quantity,
      shippingLevel,
      shippingAddress,
      readerEmail: shippingAddress.email,
      readerName: shippingAddress.name,
      retailPrice: retailPrice || 0,
      contactId,
      workflowId,
      executionId,
      source: 'api',
    });

    res.status(orderResult.idempotent ? 200 : 201).json({
      jobId: orderResult.jobId,
      status: 'Sent to Print',
      idempotent: orderResult.idempotent,
      luluPrintJobId: orderResult.luluPrintJobId,
      costBreakdown: orderResult.costs
        ? {
            ...orderResult.costs,
            totalCharge: (orderResult.costs.totalCost + orderResult.costs.markup) || 0,
            note: 'Payment handled by Lulu.com — no wallet deduction',
          }
        : null,
    });

  } catch (err) {
    console.error('[WorkflowAction] Print error:', err.message);
    if (err.response) {
      console.error('[WorkflowAction] Lulu error details:', JSON.stringify(err.response.data, null, 2));
    }
    res.status(err.response ? 502 : 400).json({ error: err.message });
  }
});

module.exports = router;
