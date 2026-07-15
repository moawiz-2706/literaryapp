'use strict';
const express = require('express');
const router  = express.Router();
const lulu    = require('../services/luluService');
const {
  TRIM_SIZES,
  INK_TYPES,
  PRINT_QUALITIES,
  BINDING_TYPES,
  PAPER_TYPES,
  COVER_FINISHES,
  LINEN_COLORS,
  FOIL_COLORS,
  SHIPPING_OPTIONS,
  TRIM_BINDING_COMPAT,
  BINDING_PAPER_COMPAT,
  BINDING_INK_COMPAT,
  INK_QUALITY_COMPAT,
  buildPodPackageId,
  validateCombination
} = require('../config/luluConstants');

// ── Helper: Parse structured Lulu error into a human-readable message ─────────
function parseLuluError(err) {
  const data = err.response?.data;
  if (!data) return err.message || 'Unknown error';

  if (typeof data === 'object') {
    const messages = [];

    const walk = (obj, prefix = '') => {
      for (const [key, val] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(val)) {
          // Array of error strings or objects
          val.forEach((item, i) => {
            if (typeof item === 'string') {
              messages.push(`${path}: ${item}`);
            } else if (typeof item === 'object' && item !== null) {
              walk(item, `${path}[${i}]`);
            }
          });
        } else if (typeof val === 'object' && val !== null) {
          walk(val, path);
        } else if (typeof val === 'string') {
          messages.push(`${path}: ${val}`);
        }
      }
    };

    walk(data);
    if (messages.length) return messages.join('; ');
    return JSON.stringify(data);
  }
  return String(data);
}

// ── GET /quotes/options ────────────────────────────────────────────────────────
// Returns all configurable print options with compatibility matrices so the
// frontend can build a fully dynamic, validated UI without hardcoding values.
router.get('/options', (req, res) => {
  res.json({
    trimSizes:       TRIM_SIZES,
    inkTypes:        INK_TYPES,
    printQualities:  PRINT_QUALITIES,
    bindingTypes:    BINDING_TYPES,
    paperTypes:      PAPER_TYPES,
    coverFinishes:   COVER_FINISHES,
    linenColors:     LINEN_COLORS,
    foilColors:      FOIL_COLORS,
    shippingOptions: SHIPPING_OPTIONS,
    // Compatibility matrices for client-side dynamic filtering
    compatibility: {
      trimBinding:  TRIM_BINDING_COMPAT,
      bindingPaper: BINDING_PAPER_COMPAT,
      bindingInk:   BINDING_INK_COMPAT,
      inkQuality:   INK_QUALITY_COMPAT
    }
  });
});

// ── GET /quotes/shipping-options ──────────────────────────────────────────────
// Backward-compatible static shipping level list.
router.get('/shipping-options', (req, res) => {
  res.json({ options: SHIPPING_OPTIONS });
});

// ── POST /quotes/calculate ────────────────────────────────────────────────────
// Accepts either:
//   A) A pre-built podPackageId
//   B) Individual components: trim, ink, quality, binding, paper, finish, linen, foil
//
// Always builds a fully-formed shipping address so the print provider API
// never returns a shipping_address validation error.
router.post('/calculate', async (req, res) => {
  const {
    podPackageId,
    trim, ink, quality, binding, paper, finish, linen, foil,
    pageCount,
    quantity,
    shippingLevel,
    shippingAddress
  } = req.body;

  // ── 1. Validate page count ────────────────────────────────────────────────
  const parsedPageCount = parseInt(pageCount);
  if (!pageCount || isNaN(parsedPageCount) || parsedPageCount < 2) {
    return res.status(400).json({ error: 'pageCount is required and must be at least 2.' });
  }

  // ── 2. Resolve POD Package ID ─────────────────────────────────────────────
  let resolvedPodPackageId = podPackageId;

  if (!resolvedPodPackageId) {
    // Validate all required components are present
    const missing = ['trim', 'ink', 'quality', 'binding', 'paper', 'finish'].filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}. Either provide podPackageId or all individual components.`
      });
    }

    // Validate combination against the compatibility matrix
    const compatErrors = validateCombination({ trim, ink, quality, binding, paper });
    if (compatErrors.length) {
      return res.status(400).json({
        error: 'Invalid print configuration.',
        detail: compatErrors.join(' '),
        validationErrors: compatErrors
      });
    }

    resolvedPodPackageId = buildPodPackageId({
      trim, ink, quality, binding, paper, finish,
      linen: linen || 'X',
      foil:  foil  || 'X'
    });
  }

  // ── 3. Validate shipping level ────────────────────────────────────────────
  const validShippingIds = SHIPPING_OPTIONS.map(s => s.id);
  const resolvedShippingLevel = shippingLevel || 'MAIL';
  if (!validShippingIds.includes(resolvedShippingLevel)) {
    return res.status(400).json({
      error: `Invalid shippingLevel "${resolvedShippingLevel}". Must be one of: ${validShippingIds.join(', ')}`
    });
  }

  // ── 4. Build a fully-formed shipping address ──────────────────────────────
  // The print provider API requires: street1, city, country_code, postcode,
  // state_code (for US/CA/AU etc.), and phone_number.
  // If the caller omits any field we fall back to a safe US default so the
  // API never returns a shipping_address validation error.
  const addr = shippingAddress || {};
  const resolvedAddress = {
    street1:      addr.street1      || addr.address1   || '123 Main St',
    city:         addr.city                            || 'Austin',
    state_code:   addr.state_code   || addr.state      || 'TX',
    country_code: addr.country_code || addr.country    || 'US',
    postcode:     addr.postcode     || addr.postal_code || addr.zip || '78701',
    phone_number: addr.phone_number || addr.phone      || '5125550100'
  };
  if (addr.street2) resolvedAddress.street2 = addr.street2;

  // ── 5. Call the print provider API ───────────────────────────────────────
  const qty = Math.max(1, parseInt(quantity) || 1);

  console.log(`[Quotes] Calculating cost for POD: ${resolvedPodPackageId}, pages: ${parsedPageCount}, qty: ${qty}, shipping: ${resolvedShippingLevel}`);

  try {
    const costData = await lulu.calculatePrintCost(
      resolvedPodPackageId,
      parsedPageCount,
      resolvedShippingLevel,
      resolvedAddress,
      qty
    );

    const unitPrintCost      = parseFloat(costData.unitPrintCost      || 0);
    const totalPrintCost     = parseFloat(costData.totalPrintCost     || 0);
    const shippingCost       = parseFloat(costData.shippingCost       || 0);
    const fulfillmentFee     = parseFloat(costData.fulfillmentFee     || 0.75);
    const totalCost          = parseFloat(costData.totalCost          || 0);
    const totalTax           = parseFloat(costData.totalTax           || 0);
    const totalCostInclTax   = parseFloat(costData.totalCostInclTax   || totalCost);

    res.json({
      podPackageId:    resolvedPodPackageId,
      pageCount:       parsedPageCount,
      quantity:        qty,
      shippingLevel:   resolvedShippingLevel,
      shippingAddress: resolvedAddress,
      unitPrintCost,
      totalPrintCost,
      shippingCost,
      fulfillmentFee,
      totalCost,
      totalTax,
      totalCostInclTax,
      currency:        costData.currency || 'USD',
      discounts:       costData.discounts || [],
      ...(process.env.NODE_ENV !== 'production' && { _raw: costData.raw })
    });
  } catch (err) {
    const luluErrorMsg = parseLuluError(err);
    const statusCode   = err.response?.status || 500;
    console.error('[Quotes] Print provider API error:', luluErrorMsg);
    console.error('[Quotes] Full error data:', JSON.stringify(err.response?.data, null, 2));
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      error:     'Failed to calculate quote. Please check your configuration and try again.',
      detail:    luluErrorMsg,
      luluError: err.response?.data || null
    });
  }
});

// ── POST /quotes/shipping-options ─────────────────────────────────────────────
// Proxy to the print provider's live shipping options endpoint.
// Requires: countryCode, pageCount, podPackageId
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
      stateCode:    stateCode || '',
      pageCount:    parseInt(pageCount),
      podPackageId,
      quantity:     parseInt(quantity) || 1
    });
    res.json({ options });
  } catch (err) {
    const luluErrorMsg = parseLuluError(err);
    console.error('[Quotes] Shipping options error:', luluErrorMsg);
    res.status(err.response?.status || 500).json({
      error:  'Failed to retrieve shipping options.',
      detail: luluErrorMsg
    });
  }
});

module.exports = router;
