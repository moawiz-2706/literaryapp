'use strict';
const axios = require('axios');
const db = require('../db/database');

const LULU_SANDBOX = process.env.LULU_SANDBOX === 'true';
const LULU_BASE = LULU_SANDBOX ? 'https://api.sandbox.lulu.com' : 'https://api.lulu.com';
const LULU_AUTH_URL = `${LULU_BASE}/auth/realms/glasstree/protocol/openid-connect/token`;

// ── Master Lulu Authentication ────────────────────────────────────────────────
// Single agency-owned account. Authors never see Lulu credentials.

let tokenCache = null;

async function getLuluToken() {
  if (tokenCache && tokenCache.expiresAt > Math.floor(Date.now() / 1000)) {
    return tokenCache.accessToken;
  }
  const stored = await db.getLatestLuluToken();
  if (stored && stored.expires_at > Math.floor(Date.now() / 1000)) {
    tokenCache = { accessToken: stored.access_token, expiresAt: stored.expires_at };
    return stored.access_token;
  }
  const credentials = Buffer.from(
    `${process.env.LULU_CLIENT_ID}:${process.env.LULU_CLIENT_SECRET}`
  ).toString('base64');
  const resp = await axios.post(
    LULU_AUTH_URL,
    'grant_type=client_credentials',
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` } }
  );
  const { access_token, expires_in } = resp.data;
  await db.storeLuluToken(access_token, expires_in);
  tokenCache = { accessToken: access_token, expiresAt: Math.floor(Date.now() / 1000) + expires_in - 60 };
  return access_token;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── File Validation ───────────────────────────────────────────────────────────

async function validateInteriorFile(pdfUrl, podPackageId) {
  const token = await getLuluToken();
  const resp = await axios.post(
    `${LULU_BASE}/files/interior/`,
    { source_url: pdfUrl, pod_package_id: podPackageId },
    { headers: headers(token) }
  );
  return resp.data;
}

async function validateCoverFile(pdfUrl, podPackageId) {
  const token = await getLuluToken();
  const resp = await axios.post(
    `${LULU_BASE}/files/cover/`,
    { source_url: pdfUrl, pod_package_id: podPackageId },
    { headers: headers(token) }
  );
  return resp.data;
}

async function getInteriorValidationStatus(validationId) {
  const token = await getLuluToken();
  const resp = await axios.get(`${LULU_BASE}/files/interior/${validationId}/`, { headers: headers(token) });
  return resp.data;
}

async function getCoverValidationStatus(validationId) {
  const token = await getLuluToken();
  const resp = await axios.get(`${LULU_BASE}/files/cover/${validationId}/`, { headers: headers(token) });
  return resp.data;
}

// ── Print Cost Calculation ────────────────────────────────────────────────────
// Calls the Lulu /print-job-cost-calculations/ endpoint.
//
// IMPORTANT: The Lulu API requires a fully-formed shipping_address with:
//   - street1, city, country_code, postcode  (always required)
//   - state_code                             (required for US, CA, AU, and ~30 other countries)
//   - phone_number                           (required for actual print jobs; recommended for quotes)
//
// The caller MUST supply a valid shippingAddress object. If none is provided,
// a safe US default is used so the API never returns a shipping_address error.
//
// The `shipping_option` field accepts:
//   MAIL | PRIORITY_MAIL | GROUND_HD | GROUND_BUS | GROUND | EXPEDITED | EXPRESS

async function calculatePrintCost(
  podPackageId,
  pageCount,
  shippingLevel = 'MAIL',
  shippingAddress = null,
  quantity = 1
) {
  const token = await getLuluToken();

  // Build a safe, fully-formed shipping address.
  // The Lulu API validates every field; missing or empty required fields
  // cause a 400 with shipping_address.detail.errors.
  const addr = shippingAddress || {};
  const resolvedAddress = {
    street1:      addr.street1      || addr.address1 || addr.line1 || '123 Main St',
    street2:      addr.street2      || addr.address2 || undefined,
    city:         addr.city         || 'Austin',
    state_code:   addr.state_code   || addr.state    || 'TX',
    country_code: addr.country_code || addr.country  || 'US',
    postcode:     addr.postcode     || addr.postal_code || addr.zip || '78701',
    phone_number: addr.phone_number || addr.phone    || '5125550100'
  };

  // Remove undefined/empty optional fields to avoid Lulu validation warnings
  if (!resolvedAddress.street2) delete resolvedAddress.street2;

  const payload = {
    line_items: [{
      pod_package_id: podPackageId,
      page_count:     parseInt(pageCount),
      quantity:       parseInt(quantity) || 1
    }],
    shipping_address: resolvedAddress,
    shipping_option:  shippingLevel
  };

  const resp = await axios.post(
    `${LULU_BASE}/print-job-cost-calculations/`,
    payload,
    { headers: headers(token) }
  );

  const data = resp.data;

  // Parse line item costs
  const lineItemCost = data.line_item_costs?.[0] || {};
  const unitPrintCost  = parseFloat(lineItemCost.cost_excl_discounts || 0);
  const totalPrintCost = parseFloat(lineItemCost.total_cost_excl_tax || lineItemCost.total_cost_excl_discounts || 0);

  // Parse shipping cost
  const shippingCost = parseFloat(data.shipping_cost?.total_cost_excl_tax || 0);

  // Parse fulfillment fee
  const fulfillmentFee = parseFloat(data.fulfillment_cost?.total_cost_excl_tax || 0.75);

  // Parse discounts
  const discounts = lineItemCost.discounts || [];

  // Parse tax
  const totalTax = parseFloat(data.total_tax || 0);
  const totalCostInclTax = parseFloat(data.total_cost_incl_tax || 0);

  // Total cost excluding tax
  const totalCost = parseFloat(data.total_cost_excl_tax || 0) || (totalPrintCost + shippingCost + fulfillmentFee);

  return {
    unitPrintCost,
    totalPrintCost,
    // Legacy field name kept for backward compatibility with existing callers
    printCost: unitPrintCost,
    shippingCost,
    fulfillmentFee,
    totalCost,
    discounts,
    totalTax,
    totalCostInclTax,
    currency: data.currency || 'USD',
    raw: data
  };
}

// ── Shipping Options ──────────────────────────────────────────────────────────
// Calls the Lulu /shipping-options/ endpoint to get live shipping availability
// and estimated delivery dates for a given country/region.
//
// Required: countryCode, pageCount, podPackageId
// Optional: stateCode, quantity, currency

async function getShippingOptions({ countryCode, stateCode, pageCount, podPackageId, quantity = 1, currency = 'USD' }) {
  const token = await getLuluToken();

  const shippingAddress = {
    country: countryCode,
    city:    'N/A',
    postcode: '00000'
  };
  if (stateCode) shippingAddress.state_code = stateCode;

  const payload = {
    currency,
    line_items: [{
      pod_package_id: podPackageId,
      page_count:     parseInt(pageCount),
      quantity:       parseInt(quantity) || 1
    }],
    shipping_address: shippingAddress
  };

  const resp = await axios.post(
    `${LULU_BASE}/shipping-options/`,
    payload,
    { headers: headers(token) }
  );
  return resp.data;
}

// ── Print Job Creation ────────────────────────────────────────────────────────
// Exact payload from spec Section 7, Payload 2

async function createPrintJob(orderData) {
  const token = await getLuluToken();
  const payload = {
    contact_email: orderData.readerEmail,
    external_id: orderData.contactId,
    production_delay: parseInt(process.env.LULU_PRODUCTION_DELAY) || 60,
    line_items: [
      {
        title: orderData.bookTitle,
        cover: orderData.coverPdfUrl,
        interior: orderData.interiorPdfUrl,
        pod_package_id: orderData.podPackageId,
        quantity: orderData.quantity || 1
      }
    ],
    shipping_address: {
      name:         orderData.shippingAddress.name,
      street1:      orderData.shippingAddress.street1,
      street2:      orderData.shippingAddress.street2 || undefined,
      city:         orderData.shippingAddress.city,
      state_code:   orderData.shippingAddress.state_code || '',
      country_code: orderData.shippingAddress.country_code || 'US',
      postcode:     orderData.shippingAddress.postcode,
      phone_number: orderData.shippingAddress.phone_number || orderData.shippingAddress.phone || '',
      email:        orderData.readerEmail
    },
    shipping_level: orderData.shippingLevel || 'MAIL'
  };

  // Remove undefined optional fields
  if (!payload.shipping_address.street2) delete payload.shipping_address.street2;

  const resp = await axios.post(`${LULU_BASE}/print-jobs/`, payload, { headers: headers(token) });
  return resp.data;
}

async function getPrintJobStatus(luluPrintJobId) {
  const token = await getLuluToken();
  const resp = await axios.get(`${LULU_BASE}/print-jobs/${luluPrintJobId}/`, { headers: headers(token) });
  return resp.data;
}

// ── Webhook Registration ──────────────────────────────────────────────────────

async function registerWebhook(webhookUrl) {
  const token = await getLuluToken();
  const resp = await axios.post(
    `${LULU_BASE}/webhooks/`,
    { url: webhookUrl, topics: ['PRINT_JOB_STATUS_CHANGED'] },
    { headers: headers(token) }
  );
  return resp.data;
}

// ── Lulu Status -> GHL Stage Mapping ─────────────────────────────────────────
// Maps Lulu status strings to GHL pipeline stage env var names

function getGhlStageForLuluStatus(luluStatus) {
  const map = {
    'CREATED':       process.env.GHL_STAGE_SENT_TO_PRINT,
    'IN_PRODUCTION': process.env.GHL_STAGE_IN_PRODUCTION,
    'SHIPPED':       process.env.GHL_STAGE_SHIPPED,
    'DELIVERED':     process.env.GHL_STAGE_DELIVERED,
    'ERROR':         process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'REJECTED':      process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'CANCELLED':     process.env.GHL_STAGE_REFUNDED_CANCELLED
  };
  return map[luluStatus] || null;
}

// Maps Lulu status to a human-readable local status string
function mapLuluStatusToLocal(luluStatus) {
  const map = {
    'CREATED':       'Sent to Print',
    'IN_PRODUCTION': 'In Production',
    'SHIPPED':       'Shipped',
    'DELIVERED':     'Delivered',
    'ERROR':         'Fulfillment Error',
    'REJECTED':      'Fulfillment Error',
    'CANCELLED':     'Cancelled'
  };
  return map[luluStatus] || luluStatus;
}

module.exports = {
  getLuluToken,
  validateInteriorFile,
  validateCoverFile,
  getInteriorValidationStatus,
  getCoverValidationStatus,
  calculatePrintCost,
  getShippingOptions,
  createPrintJob,
  getPrintJobStatus,
  registerWebhook,
  getGhlStageForLuluStatus,
  mapLuluStatusToLocal,
  sleep
};
