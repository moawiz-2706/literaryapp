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

  // Strategy 4: Match by ghl_product_id from LULU_META in description
  const metaMatch = productName.match(/<!--LULU_META:\{"book_id":"([^"]+)"\}:LULU_META-->/);
  if (metaMatch) {
    const bookId = metaMatch[1];
    return allBooks.find(b => b.id === bookId) || null;
  }

  // Strategy 5: Match by ghl_product_id field
  if (productName.startsWith('prod_') || /^\w{20,}$/.test(productName)) {
    match = allBooks.find(b => b.ghl_product_id === productName);
    if (match) return match;
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
  const state_code = (data.state_code || data.state || '').trim().toUpperCase();
  const country_code = (data.country_code || data.country || 'US').trim().toUpperCase();
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

// ── Helper: Normalize shipping address for Lulu ──────────────────────────────

function normalizeAddress(addr) {
  if (!addr) return addr;
  return {
    name:         (addr.name || '').trim(),
    email:        (addr.email || '').trim(),
    street1:      (addr.street1 || addr.street || addr.address1 || '').trim(),
    street2:      (addr.street2 || addr.address2 || '').trim() || undefined,
    city:         (addr.city || '').trim(),
    state_code:   (addr.state_code || addr.state || addr.stateCode || '').trim().toUpperCase(),
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
  const jobId = uuidv4();

  try {
    console.log('[WorkflowAction/create-print-job] Raw payload:', JSON.stringify(req.body, null, 2));
    console.log('[WorkflowAction/create-print-job] Query params:', JSON.stringify(req.query));

    // GHL sends fields directly on req.body (NOT wrapped in data or extras)
    // GHL sends locationId as a query parameter: ?locationId=...
    const data = req.body; // fields are flat on the body
    const extras = req.body.extras || {};

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
        message: 'This action must be run inside a GHL sub-account. Ensure the app is installed and the Location ID is available.',
        debug: {
          queryKeys: Object.keys(req.query),
          bodyKeys: Object.keys(req.body),
          hint: 'GHL sends locationId as a query parameter (?locationId=...). The test mode in the Developer Portal should populate this automatically.',
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
    const book = await findBookByProductName(locationId, productName);
    if (!book) {
      return res.status(404).json({
        error: 'Book not found',
        status: 'Failed',
        message: `No book matches the product "${productName}". Make sure the book is approved and has a GHL product created.`,
        debug: {
          productName,
          locationId,
          hint: 'Books are linked to GHL products when they are approved. Please approve the book first in the Lulu Integration page.'
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

    // Try to enhance with actual contact data if contactId is available
    // This serves as a safety net — if any mapped variable is empty, we try the contact API
    if (contactId) {
      try {
        const contactResp = await ghl.getContact(locationId, contactId);
        const contactData = contactResp?.contact || null;
        if (contactData) {
          console.log('[WorkflowAction/create-print-job] Contact fetched for enhancement:', contactData?.firstName, contactData?.lastName);
          // Fill in any empty fields from the actual contact data
          if (!shippingAddress.email && contactData.email) shippingAddress.email = contactData.email;
          if (!shippingAddress.phone_number && contactData.phone) shippingAddress.phone_number = contactData.phone;
          if (!shippingAddress.street1 && contactData.address1) shippingAddress.street1 = contactData.address1;
          if (!shippingAddress.city && contactData.city) shippingAddress.city = contactData.city;
          if (!shippingAddress.state_code && contactData.state) shippingAddress.state_code = contactData.state.toUpperCase();
          if (!shippingAddress.country_code && contactData.country) shippingAddress.country_code = contactData.country.toUpperCase();
          if (!shippingAddress.postcode && contactData.postalCode) shippingAddress.postcode = contactData.postalCode;
        }
      } catch (fetchErr) {
        console.warn('[WorkflowAction/create-print-job] Failed to fetch contact for enhancement:', fetchErr.message);
      }
    }

    // Normalize and validate
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

    // ── Calculate cost ──────────────────────────────────────────────────
    let costData;
    try {
      costData = await lulu.calculatePrintCost(
        book.pod_package_id,
        book.page_count || 100,
        shippingLevel,
        shippingAddress,
        quantity,
        locationId
      );
    } catch (costErr) {
      console.error('[WorkflowAction/create-print-job] Cost calculation failed:', costErr.message);
      return res.status(500).json({
        error: 'Cost calculation failed',
        status: 'Failed',
        message: `Unable to calculate print cost: ${costErr.message}. The book may have an invalid POD package ID.`
      });
    }

    const printCost = costData.unitPrintCost;
    const shippingCost = costData.shippingCost;
    const fulfillmentFee = costData.fulfillmentFee || 0.75;
    const retailPrice = parseFloat(book.retail_price || 0);
    const markup = Math.max(0, retailPrice - printCost - shippingCost - fulfillmentFee);
    const totalCost = printCost + shippingCost + fulfillmentFee;

    console.log('[WorkflowAction/create-print-job] Costs: print=$' + printCost + ', shipping=$' + shippingCost + ', markup=$' + markup + ', total=$' + totalCost);

    // ── Create print job record ─────────────────────────────────────────
    await db.createPrintJob({
      id: jobId,
      locationId,
      contactId: contactId || '',
      bookId: book.id,
      status: 'Pending',
      retailPrice,
      printCost,
      shippingCost,
      markup,
      agencyFee: 0,
      walletChargeId: null,
      readerName,
      readerEmail,
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

    // ── Submit to Lulu ──────────────────────────────────────────────────
    let luluResult;
    try {
      luluResult = await lulu.createPrintJob({
        locationId,
        bookId: book.id,
        bookTitle: book.title,
        podPackageId: book.pod_package_id,
        interiorPdfUrl: book.interior_pdf_url,
        coverPdfUrl: book.cover_pdf_url,
        shippingAddress,
        shippingLevel,
        quantity,
        contactId,
        readerEmail: readerEmail || 'orders@literaryapp.com',
      });
    } catch (luluErr) {
      console.error('[WorkflowAction/create-print-job] Lulu API error:', luluErr.message);
      const luluDetail = luluErr.response?.data ? JSON.stringify(luluErr.response.data) : 'No response data';
      console.error('[WorkflowAction/create-print-job] Lulu error details:', luluDetail);
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: `Lulu API: ${luluErr.message}` });
      return res.status(502).json({
        error: 'Lulu API error',
        status: 'Failed',
        message: `Failed to submit order to Lulu: ${luluErr.message}`,
        luluDetails: luluErr.response?.data || null,
      });
    }

    // ── Update record with Lulu ID ──────────────────────────────────────
    await db.updatePrintJob(jobId, {
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
    });

    // ── Create GHL opportunity ──────────────────────────────────────────
    try {
      const opp = await ghl.createOpportunity(locationId, contactId, book.title);
      if (opp?.id) {
        await db.updatePrintJob(jobId, { ghlOpportunityId: opp.id });
        console.log('[WorkflowAction/create-print-job] Opportunity created:', opp.id);
      }
    } catch (oppErr) {
      console.warn('[WorkflowAction/create-print-job] Opportunity creation failed (non-critical):', oppErr.message);
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
          orderTotalCost: totalCost.toFixed(2),
        });
        console.log('[WorkflowAction/create-print-job] Contact custom fields updated');
      }
    } catch (fieldErr) {
      console.warn('[WorkflowAction/create-print-job] Custom field update failed (non-critical):', fieldErr.message);
    }

    // ── Return output variables ─────────────────────────────────────────
    console.log('[WorkflowAction/create-print-job] SUCCESS — jobId:', jobId, ', luluId:', luluResult.id);

    return res.status(201).json({
      jobId,
      luluPrintJobId: luluResult.id,
      status: 'Submitted',
      totalCost: parseFloat(totalCost.toFixed(2)),
      printCost: parseFloat(printCost.toFixed(2)),
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      markup: parseFloat(markup.toFixed(2)),
      retailPrice: retailPrice,
      readerName,
      readerEmail,
      shippingStreet: shippingAddress.street1,
      shippingCity: shippingAddress.city,
      shippingState: shippingAddress.state_code,
      shippingCountry: shippingAddress.country_code,
      shippingPostalCode: shippingAddress.postcode,
      message: `Print job created successfully. Order submitted to Lulu for "${book.title}".`,
    });

  } catch (err) {
    console.error('[WorkflowAction/create-print-job] Fatal error:', err.message);
    if (err.response) {
      console.error('[WorkflowAction/create-print-job] API error details:', JSON.stringify(err.response.data, null, 2));
    }

    try {
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
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

  const jobId = uuidv4();

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });
    const readyStatuses = ['Ready', 'ready', 'Approved', 'approved', 'Active', 'active', 'Published', 'published', 'Live', 'live'];
    if (!readyStatuses.includes(book.status)) return res.status(400).json({ error: 'Book is not ready for printing' });

    const costData = await lulu.calculatePrintCost(
      book.pod_package_id,
      book.page_count || 100,
      shippingLevel,
      shippingAddress,
      quantity,
      locationId
    );

    const printCost = costData.unitPrintCost;
    const shippingCost = costData.shippingCost;
    const fulfillmentFee = costData.fulfillmentFee || 0.75;
    const markup = Math.max(0, (retailPrice || 0) - printCost - shippingCost - fulfillmentFee);
    const totalCharge = printCost + shippingCost + fulfillmentFee + markup;

    await db.createPrintJob({
      id: jobId,
      locationId,
      contactId,
      bookId,
      status: 'Pending',
      retailPrice: retailPrice || 0,
      printCost,
      shippingCost,
      markup,
      agencyFee: 0,
      walletChargeId: null,
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

    const luluResult = await lulu.createPrintJob({
      locationId,
      bookId,
      bookTitle: book.title,
      podPackageId: book.pod_package_id,
      interiorPdfUrl: book.interior_pdf_url,
      coverPdfUrl: book.cover_pdf_url,
      shippingAddress,
      shippingLevel,
      quantity,
      contactId,
      readerEmail: '',
    });

    await db.updatePrintJob(jobId, {
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
    });

    res.status(201).json({
      jobId,
      status: 'Submitted',
      luluPrintJobId: luluResult.id,
      costBreakdown: {
        printCost,
        shippingCost,
        fulfillmentFee,
        markup,
        totalCharge,
        note: 'Payment handled by Lulu.com — no wallet deduction',
      },
    });

  } catch (err) {
    console.error('[WorkflowAction] Print error:', err.message);
    if (err.response) {
      console.error('[WorkflowAction] Lulu error details:', JSON.stringify(err.response.data, null, 2));
    }

    try {
      await db.updatePrintJob(jobId, { status: 'Failed', validationError: err.message });
    } catch (_) {}

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
