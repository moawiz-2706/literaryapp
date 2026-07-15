'use strict';
const express = require('express');
const router = express.Router();
const lulu = require('../services/luluService');

// ── POD Package Component Definitions ────────────────────────────────────────
// Based on the Lulu Product Specification Sheet (dotted format: Trim.Ink.Quality.Bind.Paper.Finish)
// New dotted format is live as of March 31 2026; legacy 27-char format deprecated Feb 1 2027.

const TRIM_SIZES = [
  { code: '0425X0687', label: '4.25" x 6.875" (Pocketbook)', bookType: 'Pocketbook' },
  { code: '0500X0800', label: '5" x 8" (Novella)',            bookType: 'Novella' },
  { code: '0550X0850', label: '5.5" x 8.5" (Digest)',         bookType: 'Digest' },
  { code: '0583X0827', label: '5.83" x 8.27" (A5)',           bookType: 'A5' },
  { code: '0600X0900', label: '6" x 9" (US Trade)',           bookType: 'US Trade' },
  { code: '0614X0921', label: '6.14" x 9.21" (Royal)',        bookType: 'Royal' },
  { code: '0663X1025', label: '6.63" x 10.25" (Comic)',       bookType: 'Comic' },
  { code: '0700X1000', label: '7" x 10" (Executive)',         bookType: 'Executive' },
  { code: '0744X0968', label: '7.44" x 9.68" (Crown Quarto)', bookType: 'Crown Quarto' },
  { code: '0750X0750', label: '7.5" x 7.5" (Small Square)',   bookType: 'Small Square' },
  { code: '0827X1169', label: '8.27" x 11.69" (A4)',          bookType: 'A4' },
  { code: '0850X0850', label: '8.5" x 8.5" (Square)',         bookType: 'Square' },
  { code: '0850X1100', label: '8.5" x 11" (US Letter)',       bookType: 'US Letter' },
  { code: '0900X0700', label: '9" x 7" (Landscape)',          bookType: 'Landscape' },
  { code: '1100X0850', label: '11" x 8.5" (US Letter Landscape)', bookType: 'US Letter Landscape' },
  { code: '1169X0827', label: '11.69" x 8.27" (A4 Landscape)', bookType: 'A4 Landscape' }
];

const INK_TYPES = [
  { code: 'BW', label: 'Black & White' },
  { code: 'FC', label: 'Full Color' }
];

const PRINT_QUALITIES = [
  { code: 'STD', label: 'Standard' },
  { code: 'PRE', label: 'Premium' }
];

const BINDING_TYPES = [
  { code: 'PB',  label: 'Perfect Bound (Paperback)' },
  { code: 'CW',  label: 'Case Wrap (Hardcover)' },
  { code: 'LW',  label: 'Linen Wrap (Hardcover)' },
  { code: 'CO',  label: 'Coil Bound' },
  { code: 'WO',  label: 'Wire-O Bound' },
  { code: 'SS',  label: 'Saddle Stitch (Stapled)' }
];

const PAPER_TYPES = [
  { code: '060UW444', label: '60# Uncoated White (Standard)' },
  { code: '060UC444', label: '60# Uncoated Cream (Warm Tone)' },
  { code: '080CW444', label: '80# Coated White (Premium Color)' }
];

const COVER_FINISHES = [
  { code: 'G',   label: 'Gloss' },
  { code: 'M',   label: 'Matte' }
];

// Linen colors (only relevant for Linen Wrap binding; use 'X' for none)
const LINEN_COLORS = [
  { code: 'X', label: 'None (N/A)' },
  { code: 'R', label: 'Red' },
  { code: 'N', label: 'Navy' },
  { code: 'B', label: 'Black' },
  { code: 'G', label: 'Gray' },
  { code: 'T', label: 'Tan' },
  { code: 'F', label: 'Forest' }
];

// Foil colors (only relevant for Linen Wrap binding; use 'X' for none)
const FOIL_COLORS = [
  { code: 'X', label: 'None (N/A)' },
  { code: 'G', label: 'Gold' },
  { code: 'B', label: 'Black' },
  { code: 'W', label: 'White' }
];

const SHIPPING_OPTIONS = [
  { id: 'MAIL',          label: 'Mail (7–14 business days)',         description: 'Slowest; tracking may not be available' },
  { id: 'PRIORITY_MAIL', label: 'Priority Mail (5–10 business days)', description: 'Priority postal service' },
  { id: 'GROUND',        label: 'Ground (5–7 business days)',         description: 'Courier ground transport (US)' },
  { id: 'GROUND_HD',     label: 'Ground Home Delivery (5–7 days)',    description: 'Residential ground delivery' },
  { id: 'GROUND_BUS',    label: 'Ground Business (5–7 days)',         description: 'Business address ground delivery' },
  { id: 'EXPEDITED',     label: 'Expedited (3–5 business days)',      description: '2nd-day air or equivalent' },
  { id: 'EXPRESS',       label: 'Express (1–2 business days)',        description: 'Overnight / fastest available' }
];

// ── Helper: Build POD Package ID (dotted new format) ─────────────────────────
function buildPodPackageId({ trim, ink, quality, binding, paper, finish, linen = 'X', foil = 'X' }) {
  return `${trim}.${ink}.${quality}.${binding}.${paper}.${finish}${linen}${foil}`;
}

// ── Helper: Parse structured Lulu error into a human-readable message ────────
function parseLuluError(err) {
  const data = err.response?.data;
  if (!data) return err.message || 'Unknown error';

  // Lulu returns field-level errors as nested objects
  if (typeof data === 'object') {
    const messages = [];
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        const detail = value.detail || value;
        if (detail && typeof detail === 'object') {
          const errors = detail.errors;
          if (Array.isArray(errors)) {
            messages.push(`${field}: ${errors.join(', ')}`);
          } else if (typeof detail === 'string') {
            messages.push(`${field}: ${detail}`);
          } else {
            messages.push(`${field}: ${JSON.stringify(detail)}`);
          }
        } else if (typeof value === 'string') {
          messages.push(`${field}: ${value}`);
        }
      } else if (typeof value === 'string') {
        messages.push(`${field}: ${value}`);
      }
    }
    if (messages.length) return messages.join('; ');
    return JSON.stringify(data);
  }
  return String(data);
}

// ── POST /quotes/calculate ────────────────────────────────────────────────────
// Accepts either a pre-built podPackageId OR individual component fields.
// Always uses a well-formed default shipping address so the Lulu API never
// returns a shipping_address validation error when the caller omits it.
router.post('/calculate', async (req, res) => {
  const {
    // Option A: caller passes a pre-built POD package ID
    podPackageId,

    // Option B: caller passes individual components (we build the ID)
    trim,
    ink,
    quality,
    binding,
    paper,
    finish,
    linen,
    foil,

    // Common fields
    pageCount,
    quantity,
    shippingLevel,

    // Optional shipping address (caller may supply for accurate tax/shipping)
    shippingAddress
  } = req.body;

  // ── Validate required fields ──────────────────────────────────────────────
  if (!pageCount || parseInt(pageCount) < 2) {
    return res.status(400).json({ error: 'pageCount is required and must be at least 2.' });
  }

  // ── Resolve POD Package ID ────────────────────────────────────────────────
  let resolvedPodPackageId = podPackageId;
  if (!resolvedPodPackageId) {
    if (!trim || !ink || !quality || !binding || !paper || !finish) {
      return res.status(400).json({
        error: 'Either podPackageId or all of (trim, ink, quality, binding, paper, finish) are required.'
      });
    }
    resolvedPodPackageId = buildPodPackageId({
      trim, ink, quality, binding, paper, finish,
      linen: linen || 'X',
      foil:  foil  || 'X'
    });
  }

  // ── Resolve shipping level ────────────────────────────────────────────────
  const resolvedShippingLevel = shippingLevel || 'MAIL';
  const validShippingLevels = SHIPPING_OPTIONS.map(s => s.id);
  if (!validShippingLevels.includes(resolvedShippingLevel)) {
    return res.status(400).json({
      error: `Invalid shippingLevel. Must be one of: ${validShippingLevels.join(', ')}`
    });
  }

  // ── Build a well-formed shipping address ─────────────────────────────────
  // The Lulu /print-job-cost-calculations/ endpoint REQUIRES:
  //   city, country_code, postcode, street1
  // It also strongly recommends phone_number (required for actual print jobs).
  // state_code is required for US addresses.
  // If the caller does not supply an address we fall back to a valid US default
  // so the API never returns a shipping_address validation error.
  const addr = shippingAddress || {};
  const resolvedAddress = {
    street1:      addr.street1      || addr.address1 || addr.line1 || '123 Main St',
    street2:      addr.street2      || addr.address2 || '',
    city:         addr.city         || 'Austin',
    state_code:   addr.state_code   || addr.state    || 'TX',
    country_code: addr.country_code || addr.country  || 'US',
    postcode:     addr.postcode     || addr.postal_code || addr.zip || '78701',
    phone_number: addr.phone_number || addr.phone    || '5125550100'
  };

  // ── Call Lulu API ─────────────────────────────────────────────────────────
  try {
    const qty = parseInt(quantity) || 1;
    const costData = await lulu.calculatePrintCost(
      resolvedPodPackageId,
      parseInt(pageCount),
      resolvedShippingLevel,
      resolvedAddress,
      qty
    );

    // ── Build enriched response ───────────────────────────────────────────
    const unitPrintCost  = parseFloat(costData.unitPrintCost  || 0);
    const totalPrintCost = parseFloat(costData.totalPrintCost || 0);
    const shippingCost   = parseFloat(costData.shippingCost   || 0);
    const fulfillmentFee = parseFloat(costData.fulfillmentFee || 0.75);
    const totalCost      = parseFloat(costData.totalCost      || 0);

    res.json({
      // Resolved configuration
      podPackageId:    resolvedPodPackageId,
      pageCount:       parseInt(pageCount),
      quantity:        qty,
      shippingLevel:   resolvedShippingLevel,
      shippingAddress: resolvedAddress,

      // Cost breakdown
      unitPrintCost,
      totalPrintCost,
      shippingCost,
      fulfillmentFee,
      totalCost,
      currency:        costData.currency || 'USD',

      // Volume discounts (if any)
      discounts:       costData.discounts || [],

      // Tax info
      totalTax:        parseFloat(costData.totalTax || 0),
      totalCostInclTax: parseFloat(costData.totalCostInclTax || 0),

      // Raw Lulu response for debugging (only in non-production)
      ...(process.env.NODE_ENV !== 'production' && { _raw: costData.raw })
    });
  } catch (err) {
    const luluErrorMsg = parseLuluError(err);
    const statusCode   = err.response?.status || 500;
    console.error('[Quotes] Lulu API error:', luluErrorMsg);
    console.error('[Quotes] Full error data:', JSON.stringify(err.response?.data, null, 2));
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      error:     'Failed to calculate quote from Lulu.',
      detail:    luluErrorMsg,
      luluError: err.response?.data || null
    });
  }
});

// ── GET /quotes/options ───────────────────────────────────────────────────────
// Returns all configurable print options so the frontend can build its UI
// dynamically without hardcoding values.
router.get('/options', (req, res) => {
  res.json({
    trimSizes:      TRIM_SIZES,
    inkTypes:       INK_TYPES,
    printQualities: PRINT_QUALITIES,
    bindingTypes:   BINDING_TYPES,
    paperTypes:     PAPER_TYPES,
    coverFinishes:  COVER_FINISHES,
    linenColors:    LINEN_COLORS,
    foilColors:     FOIL_COLORS,
    shippingOptions: SHIPPING_OPTIONS
  });
});

// ── GET /quotes/shipping-options ─────────────────────────────────────────────
// Kept for backward compatibility
router.get('/shipping-options', (req, res) => {
  res.json({ options: SHIPPING_OPTIONS });
});

// ── POST /quotes/shipping-options ────────────────────────────────────────────
// Proxy to Lulu's /shipping-options/ endpoint for live shipping availability
// by country/region. Requires: country_code, page_count, pod_package_id.
router.post('/shipping-options', async (req, res) => {
  const { countryCode, pageCount, podPackageId, quantity, stateCode } = req.body;

  if (!countryCode || !pageCount || !podPackageId) {
    return res.status(400).json({
      error: 'countryCode, pageCount, and podPackageId are required.'
    });
  }

  try {
    const options = await lulu.getShippingOptions({
      countryCode,
      stateCode: stateCode || '',
      pageCount: parseInt(pageCount),
      podPackageId,
      quantity: parseInt(quantity) || 1
    });
    res.json({ options });
  } catch (err) {
    const luluErrorMsg = parseLuluError(err);
    console.error('[Quotes] Shipping options error:', luluErrorMsg);
    res.status(err.response?.status || 500).json({
      error:  'Failed to retrieve shipping options from Lulu.',
      detail: luluErrorMsg
    });
  }
});

module.exports = router;
