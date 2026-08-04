'use strict';
/**
 * flatShipping.js
 *
 * DEPRECATED — This module previously provided flat-rate shipping ($5.95 US / $14.95
 * International) with a hidden $0.50 internal upcharge. It has been replaced with
 * Lulu's actual shipping costs.
 *
 * The module is kept as a thin compatibility wrapper. All route code now uses
 * `luluService.calculatePrintCost()` which returns Lulu's actual `shippingCost`
 * directly. No more flat rates, no more hidden fees.
 *
 * Shipping is now calculated by Lulu based on:
 *   - The actual shipping address (country, state, postal code)
 *   - The selected shipping level (MAIL, PRIORITY_MAIL, GROUND, EXPRESS, etc.)
 *   - The book specifications (weight, dimensions, page count)
 *   - The quantity of copies
 */

// Export the old keys for backward compatibility with any code that imports them,
// but they are no longer used by the order paths.
const SHIPPING_RATES = {
  US_DOMESTIC:     5.95,   // legacy — not used
  INTERNATIONAL:   14.95,  // legacy — not used
  INTERNAL_UPCHARGE: 0.50, // legacy — REMOVED, no longer charged
};

const US_COUNTRY_CODE = 'US';

function isUsDomestic(countryCode) {
  return (countryCode || '').toUpperCase() === US_COUNTRY_CODE;
}

module.exports = {
  SHIPPING_RATES,
  US_COUNTRY_CODE,
  isUsDomestic,
};
