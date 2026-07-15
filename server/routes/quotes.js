'use strict';
const express = require('express');
const router  = express.Router();
const lulu    = require('../services/luluService');
const {
  TRIM_LABELS,
  INK_LABELS,
  QUALITY_LABELS,
  BINDING_LABELS,
  PAPER_LABELS,
  SHIPPING_LABELS,
  COMPAT_TREE,
  BINDING_INK_PAPERS,
  TRIM_BINDINGS,
  TRIM_INK_BINDINGS,
  VALID_SKUS,
  buildPodPackageId,
  validatePodPackageId,
  autoCorrectPodPackageId,
} = require('../config/luluConstants');

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
router.get('/options', (req, res) => {
  res.json({
    // Human-readable labels for every option
    labels: {
      trim:     TRIM_LABELS,
      ink:      INK_LABELS,
      quality:  QUALITY_LABELS,
      binding:  BINDING_LABELS,
      paper:    PAPER_LABELS,
      shipping: SHIPPING_LABELS,
    },
    // Full compatibility tree: COMPAT_TREE[trim][ink][quality][binding] = [papers]
    compatTree:       COMPAT_TREE,
    // Quick paper lookup by (binding, ink): BINDING_INK_PAPERS[binding][ink] = [papers]
    bindingInkPapers: BINDING_INK_PAPERS,
    // Per-trim available bindings (ink-independent)
    trimBindings:     TRIM_BINDINGS,
    // Per-trim, per-ink available bindings
    trimInkBindings:  TRIM_INK_BINDINGS,
    // Total valid SKUs in catalog
    totalValidSkus:   VALID_SKUS.size,
    // Shipping options as array for easy iteration
    shippingOptions: Object.entries(SHIPPING_LABELS).map(([id, label]) => ({ id, label })),
  });
});

// ── GET /quotes/validate-sku ──────────────────────────────────────────────────
// Validate a pod_package_id without making a Lulu API call.
// Query param: ?sku=0600X0900.BW.STD.PB.060UW444.MXX
router.get('/validate-sku', (req, res) => {
  const { sku } = req.query;
  if (!sku) return res.status(400).json({ error: 'sku query parameter is required' });
  const result = validatePodPackageId(sku);
  res.json({ sku, ...result });
});

// ── POST /quotes/calculate ────────────────────────────────────────────────────
// Calculate a print cost quote using the Lulu print-job-cost-calculations API.
//
// Request body (option A — individual components):
// {
//   trim:          string  (e.g. "0600X0900")
//   ink:           string  ("BW" | "FC")
//   quality:       string  ("STD" | "PRE")
//   binding:       string  ("PB" | "CW" | "CO" | "SS" | "LW" | "WO")
//   paper:         string  (e.g. "060UW444")
//   coverFinish:   string  (e.g. "MXX" | "GXX" | "MNG")  — optional, default "MXX"
//   pageCount:     number  (required, min 2)
//   quantity:      number  (optional, default 1)
//   shippingLevel: string  (optional, default "MAIL")
//   shippingAddress: object (optional — uses a US default if omitted)
// }
//
// Request body (option B — pre-built SKU):
// {
//   podPackageId:  string  (full dotted SKU, e.g. "0600X0900.BW.STD.PB.060UW444.MXX")
//   pageCount:     number
//   quantity:      number
//   shippingLevel: string
//   shippingAddress: object
// }
router.post('/calculate', async (req, res) => {
  const {
    podPackageId: rawPodPackageId,
    trim, ink, quality, binding, paper,
    coverFinish = 'MXX',
    pageCount,
    quantity    = 1,
    shippingLevel = 'MAIL',
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
    resolvedPodPackageId = buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish });
  }

  // Validate the SKU against the spec sheet
  const validation = validatePodPackageId(resolvedPodPackageId);
  if (!validation.valid) {
    // Attempt auto-correction
    let correctionHint = null;
    if (!rawPodPackageId) {
      const corrected = autoCorrectPodPackageId({ trim, ink, quality, binding, paper, coverFinish });
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

  // ── 3. Validate shipping level ──────────────────────────────────────────────
  const validShippingLevels = Object.keys(SHIPPING_LABELS);
  const resolvedShippingLevel = shippingLevel || 'MAIL';
  if (!validShippingLevels.includes(resolvedShippingLevel)) {
    return res.status(400).json({
      error:        `Invalid shippingLevel "${resolvedShippingLevel}".`,
      validOptions: validShippingLevels,
    });
  }

  // ── 4. Build a fully-formed shipping address ────────────────────────────────
  // The Lulu API requires: street1, city, country_code, postcode,
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
    phone_number: addr.phone_number || addr.phone      || '5125550100',
  };
  if (addr.street2) resolvedAddress.street2 = addr.street2;

  // ── 5. Call the Lulu API ────────────────────────────────────────────────────
  const qty = Math.max(1, parseInt(quantity) || 1);
  console.log(`[Quotes] Calculating cost for ${resolvedPodPackageId} × ${qty} copies, ${parsedPageCount} pages, ${resolvedShippingLevel}`);

  try {
    const costData = await lulu.calculatePrintCost(
      resolvedPodPackageId,
      parsedPageCount,
      resolvedShippingLevel,
      resolvedAddress,
      qty
    );

    const unitPrintCost    = parseFloat(costData.unitPrintCost    || 0);
    const totalPrintCost   = parseFloat(costData.totalPrintCost   || 0);
    const shippingCost     = parseFloat(costData.shippingCost     || 0);
    const fulfillmentFee   = parseFloat(costData.fulfillmentFee   || 0.75);
    const totalCost        = parseFloat(costData.totalCost        || 0);
    const totalTax         = parseFloat(costData.totalTax         || 0);
    const totalCostInclTax = parseFloat(costData.totalCostInclTax || totalCost);

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
          trim:     TRIM_LABELS[resTrim]       || resTrim,
          ink:      INK_LABELS[resInk]         || resInk,
          quality:  QUALITY_LABELS[resQuality] || resQuality,
          binding:  BINDING_LABELS[resBinding] || resBinding,
          paper:    PAPER_LABELS[resPaper]     || resPaper,
          shipping: SHIPPING_LABELS[resolvedShippingLevel] || resolvedShippingLevel,
        },
      },
      pageCount:       parsedPageCount,
      quantity:        qty,
      shippingLevel:   resolvedShippingLevel,
      unitPrintCost,
      totalPrintCost,
      shippingCost,
      fulfillmentFee,
      totalCost,
      totalTax,
      totalCostInclTax,
      currency:        costData.currency || 'USD',
      discounts:       costData.discounts || [],
      ...(process.env.NODE_ENV !== 'production' && { _raw: costData.raw }),
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
// Proxy to the Lulu live shipping options endpoint.
// Requires: countryCode, pageCount, podPackageId
router.post('/shipping-options', async (req, res) => {
  const { countryCode, pageCount, podPackageId, quantity, stateCode } = req.body;

  if (!countryCode || !pageCount || !podPackageId) {
    return res.status(400).json({
      error: 'countryCode, pageCount, and podPackageId are required.',
    });
  }

  const validation = validatePodPackageId(podPackageId);
  if (!validation.valid) {
    return res.status(400).json({ error: `Invalid pod_package_id: ${validation.reason}` });
  }

  try {
    const options = await lulu.getShippingOptions({
      countryCode,
      stateCode:  stateCode || '',
      pageCount:  parseInt(pageCount),
      podPackageId,
      quantity:   parseInt(quantity) || 1,
    });
    res.json({ options });
  } catch (err) {
    const parsed = parseLuluError(err);
    console.error('[Quotes] Shipping options error:', parsed.message);
    res.status(parsed.status >= 400 && parsed.status < 600 ? parsed.status : 500).json({
      error:  'Failed to retrieve shipping options.',
      detail: parsed.message,
    });
  }
});

module.exports = router;
