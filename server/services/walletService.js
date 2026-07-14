/**
 * walletService.js
 *
 * Handles the GHL Marketplace Wallet Charge API.
 * Every time a print job is submitted, this service charges the sub-account
 * wallet a $10 service fee using the Create Wallet Charge endpoint.
 *
 * Endpoint: POST https://services.leadconnectorhq.com/marketplace/billing/charges
 * Auth:     Sub-Account OAuth Token (charges.write scope required)
 * Docs:     https://marketplace.gohighlevel.com/docs/ghl/marketplace/charge/
 */

const axios = require('axios');
const { getTokensForLocation, refreshTokenIfNeeded } = require('./ghlService');

const GHL_API_BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';
const APP_ID = process.env.GHL_APP_ID;
const METER_ID = process.env.GHL_BILLING_METER_ID;
const SERVICE_FEE = parseFloat(process.env.AGENCY_SERVICE_FEE_PER_ORDER || '10.00');

/**
 * Charges the sub-account wallet the configured service fee per print order.
 *
 * @param {string} locationId   - GHL sub-account location ID
 * @param {string} companyId    - GHL agency company ID
 * @param {string} printJobId   - Lulu print job ID, used as the unique eventId
 * @param {string} bookTitle    - Human-readable book title for the charge description
 * @returns {Promise<{success: boolean, chargeId: string}>}
 */
async function chargeOrderServiceFee(locationId, companyId, printJobId, bookTitle) {
  if (!APP_ID) {
    throw new Error('GHL_APP_ID is not set in environment variables.');
  }
  if (!METER_ID) {
    throw new Error('GHL_BILLING_METER_ID is not set in environment variables.');
  }

  // Retrieve and refresh the sub-account token so the charge is posted
  // against the correct location's wallet.
  const tokens = await getTokensForLocation(locationId);
  if (!tokens) {
    throw new Error(`No OAuth tokens found for locationId: ${locationId}`);
  }
  const accessToken = await refreshTokenIfNeeded(locationId, tokens);

  const eventId = `print_job_${printJobId}_${Date.now()}`;
  const description = `LiteraryApp Print Service Fee - "${bookTitle}" (Print Job: ${printJobId})`;

  const payload = {
    appId: APP_ID,
    meterId: METER_ID,
    eventId,
    locationId,
    companyId,
    description,
    units: 1,
    price: SERVICE_FEE,
    eventTime: new Date().toISOString(),
  };

  try {
    const response = await axios.post(
      `${GHL_API_BASE}/marketplace/billing/charges`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Version: '2021-07-28',
        },
      }
    );

    if (response.status === 201 && response.data.success) {
      console.log(
        `[walletService] Charged $${SERVICE_FEE} to locationId=${locationId}, chargeId=${response.data.chargeId}`
      );
      return { success: true, chargeId: response.data.chargeId };
    }

    throw new Error(`Unexpected wallet charge response: ${JSON.stringify(response.data)}`);
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(`[walletService] Charge failed for locationId=${locationId}: ${detail}`);
    throw new Error(`Wallet charge failed: ${detail}`);
  }
}

module.exports = { chargeOrderServiceFee };
