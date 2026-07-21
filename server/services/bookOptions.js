'use strict';
/**
 * bookOptions.js
 *
 * Shared book options and compatibility logic used by BOTH the Quote Calculator
 * and the Book Setup page. This is the single source of truth for:
 *   - All print option labels
 *   - The compatibility matrix (COMPAT_TREE)
 *   - Derived availability functions (progressive selection)
 *   - Flat shipping rate constants
 *   - Internal processing fee constants
 *
 * Centralizing this ensures future updates only need to be implemented once,
 * and both pages stay perfectly synchronized.
 */

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

// ── Flat Shipping Rates ───────────────────────────────────────────────────────
const SHIPPING_RATES = {
  US_DOMESTIC:     5.95,
  INTERNATIONAL:   14.95,
  INTERNAL_UPCHARGE: 0.50,  // Added internally before submitting to Lulu, never shown to customer
};

// ── US Country Code Set ───────────────────────────────────────────────────────
// ISO-3166-1 alpha-2 code for the United States
const US_COUNTRY_CODE = 'US';

// ── Flat Shipping Options ─────────────────────────────────────────────────────
const FLAT_SHIPPING_OPTIONS = [
  {
    id: 'STANDARD',
    label: 'Standard Shipping',
    description: '5–10 business days',
    usRate: 5.95,
    internationalRate: 14.95,
  },
];

// ── Helper: Determine if address is US domestic ───────────────────────────────
function isUsDomestic(countryCode) {
  return (countryCode || '').toUpperCase() === US_COUNTRY_CODE;
}

// ── Helper: Get flat shipping rate for a given country ────────────────────────
function getFlatShippingRate(countryCode) {
  return isUsDomestic(countryCode)
    ? SHIPPING_RATES.US_DOMESTIC
    : SHIPPING_RATES.INTERNATIONAL;
}

// ── Helper: Get internal shipping rate (with $0.50 upcharge) for Lulu ─────────
function getInternalShippingRate(countryCode) {
  return getFlatShippingRate(countryCode) + SHIPPING_RATES.INTERNAL_UPCHARGE;
}

// ── Progressive Selection: Available options at each step ─────────────────────

/**
 * Returns the list of available trim sizes (all of them — this is always step 1).
 */
function getAvailableTrims() {
  return Object.keys(TRIM_LABELS);
}

/**
 * Given a selected trim, returns the available ink options.
 */
function getAvailableInks(trim) {
  if (!trim || !COMPAT_TREE[trim]) return Object.keys(INK_LABELS);
  return Object.keys(COMPAT_TREE[trim]);
}

/**
 * Given a selected trim and ink, returns the available quality options.
 */
function getAvailableQualities(trim, ink) {
  if (!trim || !ink || !COMPAT_TREE[trim] || !COMPAT_TREE[trim][ink]) {
    return Object.keys(QUALITY_LABELS);
  }
  return Object.keys(COMPAT_TREE[trim][ink]);
}

/**
 * Given a selected trim, ink, and quality, returns the available binding options.
 */
function getAvailableBindings(trim, ink, quality) {
  if (!trim || !ink || !quality) {
    return Object.keys(BINDING_LABELS);
  }
  const qualityNode = COMPAT_TREE[trim]?.[ink]?.[quality];
  if (!qualityNode) return Object.keys(BINDING_LABELS);
  return Object.keys(qualityNode);
}

/**
 * Given a selected trim, ink, quality, and binding, returns the available paper options.
 */
function getAvailablePapers(trim, ink, quality, binding) {
  if (!trim || !ink || !quality || !binding) {
    return Object.keys(PAPER_LABELS);
  }
  const papers = COMPAT_TREE[trim]?.[ink]?.[quality]?.[binding];
  return papers || Object.keys(PAPER_LABELS);
}

/**
 * Returns the available cover finish options.
 * For Linen Wrap (LW) bindings, the finish options include linen/foil variants.
 * For all other bindings, only Matte (MXX) and Gloss (GXX) are available.
 */
function getAvailableCoverFinishes(binding) {
  const base = [
    { code: 'MXX', label: 'Matte', description: 'Flat finish — elegant, reduced glare' },
    { code: 'GXX', label: 'Gloss', description: 'Shiny finish — vibrant colors' },
  ];
  if (binding === 'LW') {
    const linens = ['BB', 'BG', 'BW', 'FB', 'FG', 'FW', 'GB', 'GG', 'GW', 'NB', 'NG', 'NW', 'RB', 'RG', 'RW', 'TB', 'TG', 'TW'];
    const baseLabels = { M: 'Matte', G: 'Gloss' };
    const linenLabels = {
      B: 'Black', G: 'Gold', W: 'White',
      F: 'Forest', N: 'Navy', R: 'Red', T: 'Teal',
    };
    for (const [baseChar, baseLabel] of Object.entries(baseLabels)) {
      for (const [linenChar, linenLabel] of Object.entries(linenLabels)) {
        const code = `${baseChar}${linenChar}`;
        base.push({
          code,
          label: `${baseLabel} — ${linenLabel} Linen`,
          description: `Linen Wrap with ${baseLabel} lamination and ${linenLabel} linen cloth`,
        });
      }
    }
  }
  return base;
}

// ── Full Options API Response ─────────────────────────────────────────────────
function getFullOptions() {
  return {
    labels: {
      trim:     TRIM_LABELS,
      ink:      INK_LABELS,
      quality:  QUALITY_LABELS,
      binding:  BINDING_LABELS,
      paper:    PAPER_LABELS,
      shipping: SHIPPING_LABELS,
    },
    // Full compatibility tree for validation
    compatTree:       COMPAT_TREE,
    // Quick paper lookup
    bindingInkPapers: BINDING_INK_PAPERS,
    // Per-trim available bindings (ink-independent)
    trimBindings:     TRIM_BINDINGS,
    // Per-trim, per-ink available bindings
    trimInkBindings:  TRIM_INK_BINDINGS,
    // Total valid SKUs
    totalValidSkus:   VALID_SKUS.size,
    // Cover finish options
    coverFinishOptions: getAvailableCoverFinishes(),
    // Flat shipping options
    shippingOptions: FLAT_SHIPPING_OPTIONS,
    // Shipping rates
    shippingRates: {
      usDomestic:     SHIPPING_RATES.US_DOMESTIC,
      international:  SHIPPING_RATES.INTERNATIONAL,
    },
  };
}

module.exports = {
  // Constants
  SHIPPING_RATES,
  US_COUNTRY_CODE,
  FLAT_SHIPPING_OPTIONS,

  // Utility functions
  isUsDomestic,
  getFlatShippingRate,
  getInternalShippingRate,

  // Progressive selection functions
  getAvailableTrims,
  getAvailableInks,
  getAvailableQualities,
  getAvailableBindings,
  getAvailablePapers,
  getAvailableCoverFinishes,

  // Full options builder
  getFullOptions,

  // Re-export luluConstants helpers for convenience
  TRIM_LABELS,
  INK_LABELS,
  QUALITY_LABELS,
  BINDING_LABELS,
  PAPER_LABELS,
  SHIPPING_LABELS,
  COMPAT_TREE,
  TRIM_INK_BINDINGS,
  VALID_SKUS,
  buildPodPackageId,
  validatePodPackageId,
  autoCorrectPodPackageId,
};