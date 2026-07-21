'use strict';
/**
 * flatShipping.js
 *
 * Flat shipping rate utilities. Replaces the live Lulu shipping cost calculation
 * with fixed flat-rate shipping for customer-facing quotes and orders.
 *
 * Customer-facing rates (shown in UI):
 *   - US Domestic: $5.95
 *   - International: $14.95
 *
 * Internal rate (sent to Lulu when creating the print job):
 *   - US Domestic: $6.45 ($5.95 + $0.50)
 *   - International: $15.45 ($14.95 + $0.50)
 *
 * The $0.50 internal processing fee is NEVER displayed in any customer-facing UI.
 */

const { SHIPPING_RATES, US_COUNTRY_CODE, isUsDomestic } = require('./bookOptions');

/**
 * Calculate the customer-facing shipping cost based on country code.
 * @param {string} countryCode - ISO-3166-1 alpha-2 country code
 * @returns {number} Flat shipping rate in USD
 */
function getCustomerShippingCost(countryCode) {
  return isUsDomestic(countryCode)
    ? SHIPPING_RATES.US_DOMESTIC
    : SHIPPING_RATES.INTERNATIONAL;
}

/**
 * Calculate the internal shipping cost to submit to Lulu.
 * This adds the $0.50 processing fee on top of the customer-facing rate.
 * @param {string} countryCode - ISO-3166-1 alpha-2 country code
 * @returns {number} Internal shipping rate in USD
 */
function getInternalShippingCost(countryCode) {
  const baseRate = getCustomerShippingCost(countryCode);
  return baseRate + SHIPPING_RATES.INTERNAL_UPCHARGE;
}

/**
 * Get the shipping breakdown for a quote or order.
 * Returns both customer-facing and internal rates.
 * @param {string} countryCode
 * @returns {{ customerShipping: number, internalShipping: number, isDomestic: boolean, rateLabel: string }}
 */
function getShippingBreakdown(countryCode) {
  const isDomestic = isUsDomestic(countryCode);
  return {
    customerShipping: getCustomerShippingCost(countryCode),
    internalShipping: getInternalShippingCost(countryCode),
    isDomestic,
    rateLabel: isDomestic ? 'US Domestic' : 'International',
  };
}

module.exports = {
  getCustomerShippingCost,
  getInternalShippingCost,
  getShippingBreakdown,
};