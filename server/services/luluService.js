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
// Royalty formula: Retail Price - Print Cost - Flat-Rate Shipping = Author Profit
// US Domestic flat rate: $5.95 | International: $14.95

async function calculatePrintCost(podPackageId, pageCount, shippingLevel = 'MAIL', shippingAddress = null) {
  const token = await getLuluToken();
  const payload = {
    line_items: [{ pod_package_id: podPackageId, page_count: pageCount, quantity: 1 }],
    shipping_address: shippingAddress || { country_code: 'US', city: 'Austin', postcode: '78701', street1: '123 Main St' },
    shipping_option: shippingLevel
  };
  const resp = await axios.post(
    `${LULU_BASE}/print-job-cost-calculations/`,
    payload,
    { headers: headers(token) }
  );
  const data = resp.data;
  const printCost = parseFloat(data.line_item_costs?.[0]?.cost_excl_discounts || data.total_cost_excl_tax || 0);
  const shippingCost = parseFloat(data.shipping_cost?.cost_excl_tax || 0);
  const totalCost = printCost + shippingCost;
  return { printCost, shippingCost, totalCost, currency: data.currency || 'USD', raw: data };
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
      name: orderData.shippingAddress.name,
      street1: orderData.shippingAddress.street1,
      street2: orderData.shippingAddress.street2 || '',
      city: orderData.shippingAddress.city,
      state_code: orderData.shippingAddress.state_code || '',
      country_code: orderData.shippingAddress.country_code || 'US',
      postcode: orderData.shippingAddress.postcode,
      email: orderData.readerEmail,
      phone_number: orderData.shippingAddress.phone || ''
    },
    shipping_option: orderData.shippingLevel || 'MAIL'
  };
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
  createPrintJob,
  getPrintJobStatus,
  registerWebhook,
  getGhlStageForLuluStatus,
  mapLuluStatusToLocal,
  sleep
};
