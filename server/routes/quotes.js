'use strict';
const express = require('express');
const router  = express.Router();
const lulu    = require('../services/luluService');
const bookOptions = require('../services/bookOptions');
const flatShipping = require('../services/flatShipping');

// ── Helper: Parse structured Lulu error into a human-readable message ─────────
function parseLuluError(err) {
  const status = err?.response?.status;
  const data   = err?.response?.data;

  if (!data) {
    return {
      status:  status || 500,
      message: err.message || 'Unknown error communicating with print provider',
      details: null,
    };
  }

  const fieldErrors = [];

  function extractErrors(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => extractErrors(item, prefix ? `${prefix}[${i}]` : `[${i}]`));
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (key === 'detail' && typeof val === 'string') {
        fieldErrors.push(val);
      } else if (key === 'errors' && Array.isArray(val)) {
        val.forEach(e => fieldErrors.push(typeof e === 'string' ? `${path}: ${e}` : JSON.stringify(e)));
      } else if (key === 'non_field_errors' && Array.isArray(val)) {
        val.forEach(e => fieldErrors.push(typeof e === 'string' ? e : JSON.stringify(e)));
      } else if (typeof val === 'string') {
        fieldErrors.push(`${path}: ${val}`);
      } else if (Array.isArray(val)) {
        val.forEach(e => fieldErrors.push(typeof e === 'string' ? `${path}: ${e}` : JSON.stringify(e)));
      } else {
        extractErrors(val, path);
      }
    }
  }

  extractErrors(data);

  const message = fieldErrors.length > 0
    ? fieldErrors.join(' | ')
    : (typeof data === 'string' ? data : JSON.stringify(data));

  return { status: status || 400, message, details: data };
}

// ── GET /quotes/options ────────────────────────────────────────────────────────
// Returns the full compatibility matrix and human-readable labels so the
// frontend can build a fully dynamic, validated UI without hardcoding values.
// This endpoint is shared by BOTH the Quote Calculator and Book Setup pages.
router.get('/options', (req, res) => {
  res.json(bookOptions.getFullOptions());
});

// ── GET /quotes/options/available ─────────────────────────────────────────────
// Progressive selection: returns available options at each step based on
// the user's previous selections. Used by both Quote Calculator and Book Setup.
//
// Query params (all optional):
//   trim, ink, quality, binding
//
// Returns the next step's available options based on what's already selected.
router.get('/options/available', (req, res) => {
  const { trim, ink, quality, binding } = req.query;

  // Determine what's available at the next step
  const availableInks = ink ? undefined : bookOptions.getAvailableInks(trim);
  const availableQualities = (ink && quality === undefined) ? bookOptions.getAvailableQualities(trim, ink) : undefined;
  const availableBindings = (ink && quality && binding === undefined) ? bookOptions.getAvailableBindings(trim, ink, quality) : undefined;
  const availablePapers = (ink && quality && binding) ? bookOptions.getAvailablePapers(trim, ink, quality, binding) : undefined;
  const availableCoverFinishes = binding ? bookOptions.getAvailableCoverFinishes(binding) : undefined;

  res.json({
    availableInks,
    availableQualities,
    availableBindings,
    availablePapers: availablePapers ? availablePapers.map(code => ({
      code,
      label: bookOptions.PAPER_LABELS[code] || code,
    })) : undefined,
    availableCoverFinishes,
    labels: {
      trim:     bookOptions.TRIM_LABELS,
      ink:      bookOptions.INK_LABELS,
      quality:  bookOptions.QUALITY_LABELS,
      binding:  bookOptions.BINDING_LABELS,
    },
  });
});

// ── GET /quotes/validate-sku ──────────────────────────────────────────────────
// Validate a pod_package_id without making a Lulu API call.
// Query param: ?sku=0600X0900.BW.STD.PB.060UW444.MXX
router.get('/validate-sku', (req, res) => {
  const { sku } = req.query;
  if (!sku) return res.status(400).json({ error: 'sku query parameter is required' });
  const result = bookOptions.validatePodPackageId(sku);
  res.json({ sku, ...result });
});

// ── POST /quotes/calculate ────────────────────────────────────────────────────
// Calculate a print cost quote using the Lulu print-job-cost-calculations API
// for PRINTING cost only, then apply FLAT shipping rates instead of live
// Lulu shipping costs.
//
// Request body:
// {
//   trim:          string  (e.g. "0600X0900")
//   ink:           string  ("BW" | "FC")
//   quality:       string  ("STD" | "PRE")
//   binding:       string  ("PB" | "CW" | "CO" | "SS" | "LW" | "WO")
//   paper:         string  (e.g. "060UW444")
//   coverFinish:   string  (e.g. "MXX" | "GXX" | "MNG")  — optional, default "MXX"
//   pageCount:     number  (required, min 2)
//   quantity:      number  (optional, default 1)
//   countryCode:   string  (optional, default "US") — used to determine flat shipping rate
//   shippingAddress: object (optional — country_code used for flat rate lookup)
// }
router.post('/calculate', async (req, res) => {
  const {
    podPackageId: rawPodPackageId,
    trim, ink, quality, binding, paper,
    coverFinish = 'MXX',
    pageCount,
    quantity    = 1,
    countryCode = 'US',
    shippingAddress = null,
  } = req.body;

  // ── 1. Validate page count ──────────────────────────────────────────────────
  const parsedPageCount = parseInt(pageCount);
  if (!pageCount || isNaN(parsedPageCount) || parsedPageCount < 2) {
    return res.status(400).json({ error: 'pageCount is required and must be at least 2.' });
  }

  // ── 2. Resolve and validate the POD Package ID ──────────────────────────────
  let resolvedPodPackageId;

  if (rawPodPackageId) {
    // Option B: pre-built SKU provided
    resolvedPodPackageId = rawPodPackageId;
  } else {
    // Option A: build from components
    const missing = ['trim', 'ink', 'quality', 'binding', 'paper'].filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}. Either provide podPackageId or all individual components (trim, ink, quality, binding, paper).`,
      });
    }
    resolvedPodPackageId = bookOptions.buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish });
  }

  // Validate the SKU against the spec sheet
  const validation = bookOptions.validatePodPackageId(resolvedPodPackageId);
  if (!validation.valid) {
    // Attempt auto-correction
    let correctionHint = null;
    if (!rawPodPackageId) {
      const corrected = bookOptions.autoCorrectPodPackageId({ trim, ink, quality, binding, paper, coverFinish });
      if (corrected) {
        const cp = corrected.split('.');
        correctionHint = {
          message:      `The closest valid configuration is: ${corrected}`,
          podPackageId: corrected,
          components: {
            trim:        cp[0],
            ink:         cp[1],
            quality:     cp[2],
            binding:     cp[3],
            paper:       cp[4],
            coverFinish: cp[5],
          },
        };
      }
    }

    return res.status(400).json({
      error:      `Invalid product combination: ${validation.reason}`,
      podPackageId: resolvedPodPackageId,
      suggestion: correctionHint,
      hint:       'Use GET /quotes/options to see all valid combinations.',
    });
  }

  // ── 3. Determine the effective country code ─────────────────────────────────
  // Use countryCode from body, or extract from shippingAddress, default to US
  const resolvedCountryCode = countryCode
    || shippingAddress?.country_code
    || shippingAddress?.country
    || 'US';

  // ── 4. Call the Lulu API for PRINTING COST only ─────────────────────────────
  // We still call Lulu to get the printing cost, but we use a default address
  // since we don't need live shipping rates anymore.
  const qty = Math.max(1, parseInt(quantity) || 1);

  // Default address for Lulu API call (shipping cost is ignored — we use flat rates)
  const defaultAddress = shippingAddress || {
    street1: '123 Main St',
    city: 'Austin',
    state_code: 'TX',
    country_code: 'US',
    postcode: '78701',
    phone_number: '5125550100',
  };

  console.log(`[Quotes] Calculating cost for ${resolvedPodPackageId} × ${qty} copies, ${parsedPageCount} pages, flat shipping to ${resolvedCountryCode}`);

  try {
    // Call Lulu for printing cost only — shipping cost returned by Lulu is ignored
    const costData = await lulu.calculatePrintCost(
      resolvedPodPackageId,
      parsedPageCount,
      'MAIL',  // Shipping level doesn't matter for print cost
      defaultAddress,
      qty
    );

    const unitPrintCost  = parseFloat(costData.unitPrintCost  || 0);
    const totalPrintCost = parseFloat(costData.totalPrintCost || 0);
    const fulfillmentFee = parseFloat(costData.fulfillmentFee || 0.75);
    const totalTax       = parseFloat(costData.totalTax       || 0);
    const totalCostInclTax = parseFloat(costData.totalCostInclTax || 0);

    // ── 5. Apply flat shipping rates ──────────────────────────────────────────
    const shippingBreakdown = flatShipping.getShippingBreakdown(resolvedCountryCode);
    const customerShippingCost = shippingBreakdown.customerShipping;
    const internalShippingCost = shippingBreakdown.internalShipping;

    // Total cost = printing + flat shipping + fulfillment fee
    const totalCost = totalPrintCost + (customerShippingCost * qty) + fulfillmentFee;
    const totalCostInclTaxFinal = totalCostInclTax > 0
      ? totalCostInclTax
      : totalCost;

    // Parse components from the resolved SKU for the response
    const skuParts = resolvedPodPackageId.split('.');
    const [resTrim, resInk, resQuality, resBinding, resPaper, resFinish] = skuParts;

    res.json({
      podPackageId:    resolvedPodPackageId,
      components: {
        trim:        resTrim,
        ink:         resInk,
        quality:     resQuality,
        binding:     resBinding,
        paper:       resPaper,
        coverFinish: resFinish,
        labels: {
          trim:     bookOptions.TRIM_LABELS[resTrim]       || resTrim,
          ink:      bookOptions.INK_LABELS[resInk]         || resInk,
          quality:  bookOptions.QUALITY_LABELS[resQuality] || resQuality,
          binding:  bookOptions.BINDING_LABELS[resBinding] || resBinding,
          paper:    bookOptions.PAPER_LABELS[resPaper]     || resPaper,
        },
      },
      pageCount:           parsedPageCount,
      quantity:            qty,
      // Printing cost from Lulu
      unitPrintCost,
      totalPrintCost,
      // Flat shipping (customer-facing — NO live Lulu shipping)
      shippingCost:        customerShippingCost,
      internalShippingCost, // Not shown to customer
      shippingRateLabel:   shippingBreakdown.rateLabel,
      isDomesticShipping:  shippingBreakdown.isDomestic,
      // Fulfillment and totals
      fulfillmentFee,
      totalCost,
      totalTax,
      totalCostInclTax:    totalCostInclTaxFinal,
      currency:            costData.currency || 'USD',
      discounts:           costData.discounts || [],
    });

  } catch (err) {
    const parsed = parseLuluError(err);
    console.error('[Quotes] Print provider API error:', parsed.message);
    console.error('[Quotes] Full error data:', JSON.stringify(err?.response?.data, null, 2));
    res.status(parsed.status >= 400 && parsed.status < 600 ? parsed.status : 500).json({
      error:     'Failed to calculate quote. Please check your configuration and try again.',
      detail:    parsed.message,
      luluError: parsed.details,
    });
  }
});

// ── POST /quotes/shipping-options ─────────────────────────────────────────────
// Returns the flat shipping options (no longer calls Lulu live API).
router.post('/shipping-options', (req, res) => {
  const { countryCode = 'US' } = req.body;
  const breakdown = flatShipping.getShippingBreakdown(countryCode);
  res.json({
    options: [{
      id: 'STANDARD',
      label: breakdown.isDomestic ? 'US Domestic Shipping' : 'International Shipping',
      description: breakdown.isDomestic ? '5–10 business days' : '10–21 business days',
      cost: breakdown.customerShipping,
      internalCost: breakdown.internalShipping,
      isDomestic: breakdown.isDomestic,
    }],
    rates: {
      usDomestic: bookOptions.SHIPPING_RATES.US_DOMESTIC,
      international: bookOptions.SHIPPING_RATES.INTERNATIONAL,
    },
  });
});

module.exports = router;