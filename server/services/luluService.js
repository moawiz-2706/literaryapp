'use strict';
/**
 * luluService.js
 *
 * Lulu.com API client — Per-Subaccount Credentials.
 *
 * Each GHL sub-account (location) has its own Lulu.com API credentials stored
 * in the database. All Lulu API calls require a `locationId` parameter so the
 * correct credentials and token cache can be resolved.
 *
 * Backward compatibility: If a `locationId` is not provided, the service falls
 * back to the legacy global credentials from environment variables. This allows
 * existing integrations to continue working during the migration period.
 */

const axios = require('axios');
const db = require('../db/database');

const LULU_SANDBOX = process.env.LULU_SANDBOX === 'true';

// ── In-Memory Token Cache (per-location) ─────────────────────────────────────
// Map of locationId -> { accessToken, expiresAt }
const tokenCaches = new Map();

// ── Resolve Base URL ─────────────────────────────────────────────────────────

function resolveBaseUrl(environment) {
  if (environment === 'production') {
    return 'https://api.lulu.com';
  }
  // Default to sandbox or legacy global setting
  return LULU_SANDBOX ? 'https://api.sandbox.lulu.com' : 'https://api.lulu.com';
}

// ── Resolve Credentials for a Location ────────────────────────────────────────

async function resolveCredentials(locationId) {
  if (!locationId) {
    // Fallback to global credentials (backward compatibility)
    const clientId = process.env.LULU_CLIENT_ID;
    const clientSecret = process.env.LULU_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('No Lulu credentials found. Please configure Lulu integration for this sub-account.');
    }
    return {
      clientId,
      clientSecret,
      environment: LULU_SANDBOX ? 'sandbox' : 'production'
    };
  }

  const stored = await db.getLuluCredentials(locationId);
  if (!stored) {
    throw new Error(`Lulu integration not configured for this sub-account. Please connect your Lulu account in Settings.`);
  }
  return {
    clientId: stored.client_id,
    clientSecret: stored.client_secret,
    environment: stored.environment
  };
}

// ── Get OAuth Token for a Location ────────────────────────────────────────────

/**
 * Fetches a fresh OAuth token for the given location.
 * Uses the location's stored credentials to authenticate with Lulu.
 * Tokens are cached both in-memory and in the database.
 *
 * @param {string} locationId - The GHL sub-account location ID
 * @param {boolean} forceRefresh - Force a new token request even if cached token exists
 * @returns {Promise<{ accessToken: string, baseUrl: string }>}
 */
async function getLuluToken(locationId, forceRefresh = false) {
  // ── Check in-memory cache ─────────────────────────────────────────────
  if (!forceRefresh && locationId) {
    const cached = tokenCaches.get(locationId);
    if (cached && cached.expiresAt > Math.floor(Date.now() / 1000)) {
      return {
        accessToken: cached.accessToken,
        baseUrl: cached.baseUrl
      };
    }
  }

  // ── Check database cache ──────────────────────────────────────────────
  if (!forceRefresh && locationId) {
    const stored = await db.getLatestLuluTokenForLocation(locationId);
    if (stored && stored.expires_at > Math.floor(Date.now() / 1000)) {
      // Also populate in-memory cache
      const creds = await resolveCredentials(locationId);
      const baseUrl = resolveBaseUrl(creds.environment);
      tokenCaches.set(locationId, {
        accessToken: stored.access_token,
        expiresAt: stored.expires_at,
        baseUrl
      });
      return { accessToken: stored.access_token, baseUrl };
    }
  }

  // ── Resolve credentials ───────────────────────────────────────────────
  const creds = await resolveCredentials(locationId);
  const baseUrl = resolveBaseUrl(creds.environment);
  const authUrl = `${baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`;

  console.log(`[Lulu] Requesting token for location ${locationId || '(global)'} at ${authUrl}`);

  const credentials = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

  const resp = await axios.post(
    authUrl,
    'grant_type=client_credentials',
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` } }
  );

  const { access_token, expires_in } = resp.data;

  // ── Cache the token ───────────────────────────────────────────────────
  const expiresAt = Math.floor(Date.now() / 1000) + expires_in - 60;
  if (locationId) {
    tokenCaches.set(locationId, { accessToken: access_token, expiresAt, baseUrl });
    try {
      await db.storeLuluTokenForLocation(locationId, access_token, expires_in);
    } catch (dbErr) {
      console.warn('[Lulu] Token storage failed (non-critical):', dbErr.message);
    }
  }

  console.log(`[Lulu] Token obtained for location ${locationId || '(global)'} (expires in ${expires_in}s)`);
  return { accessToken: access_token, baseUrl };
}

/**
 * Helper that returns just the access token (for backward-compatible call sites).
 * @param {string} [locationId] - Optional location ID
 * @param {boolean} [forceRefresh] - Force refresh
 * @returns {Promise<string>}
 */
async function getLuluTokenLegacy(locationId, forceRefresh = false) {
  const result = await getLuluToken(locationId, forceRefresh);
  return result.accessToken;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── File Validation ───────────────────────────────────────────────────────────

async function validateInteriorFile(pdfUrl, podPackageId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  try {
    const resp = await axios.post(
      `${baseUrl}/validate-interior/`,
      { source_url: pdfUrl, pod_package_id: podPackageId },
      { headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('[Lulu] 401 on validate-interior, forcing token refresh');
      const { accessToken: newToken, baseUrl: newUrl } = await getLuluToken(locationId, true);
      const resp = await axios.post(
        `${newUrl}/validate-interior/`,
        { source_url: pdfUrl, pod_package_id: podPackageId },
        { headers: headers(newToken) }
      );
      return resp.data;
    }
    throw err;
  }
}

async function validateCoverFile(pdfUrl, podPackageId, interiorPageCount, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const payload = {
    source_url: pdfUrl,
    pod_package_id: podPackageId
  };
  if (interiorPageCount) {
    payload.interior_page_count = interiorPageCount;
  }
  try {
    const resp = await axios.post(
      `${baseUrl}/validate-cover/`,
      payload,
      { headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('[Lulu] 401 on validate-cover, forcing token refresh');
      const { accessToken: newToken, baseUrl: newUrl } = await getLuluToken(locationId, true);
      const resp = await axios.post(
        `${newUrl}/validate-cover/`,
        payload,
        { headers: headers(newToken) }
      );
      return resp.data;
    }
    throw err;
  }
}

async function getInteriorValidationStatus(validationId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/validate-interior/${validationId}/`, { headers: headers(accessToken) });
  return resp.data;
}

async function getCoverValidationStatus(validationId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/validate-cover/${validationId}/`, { headers: headers(accessToken) });
  return resp.data;
}

// ── Cover Dimension Calculation ──────────────────────────────────────────────

async function calculateCoverDimensions(podPackageId, pageCount, unit = 'pt', locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  try {
    const resp = await axios.post(
      `${baseUrl}/cover-dimensions/`,
      { pod_package_id: podPackageId, interior_page_count: pageCount, unit },
      { headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('[Lulu] 401 on calculate-cover-dimensions, forcing token refresh');
      const { accessToken: newToken, baseUrl: newUrl } = await getLuluToken(locationId, true);
      const resp = await axios.post(
        `${newUrl}/cover-dimensions/`,
        { pod_package_id: podPackageId, interior_page_count: pageCount, unit },
        { headers: headers(newToken) }
      );
      return resp.data;
    }
    throw err;
  }
}

// ── Print Cost Calculation ────────────────────────────────────────────────────

async function calculatePrintCost(
  podPackageId,
  pageCount,
  shippingLevel = 'MAIL',
  shippingAddress = null,
  quantity = 1,
  locationId
) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);

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
    `${baseUrl}/print-job-cost-calculations/`,
    payload,
    { headers: headers(accessToken) }
  );

  const data = resp.data;

  const lineItemCost = data.line_item_costs?.[0] || {};
  const unitPrintCost  = parseFloat(lineItemCost.cost_excl_discounts || 0);
  const totalPrintCost = parseFloat(lineItemCost.total_cost_excl_tax || lineItemCost.total_cost_excl_discounts || 0);
  const shippingCost = parseFloat(data.shipping_cost?.total_cost_excl_tax || 0);
  const fulfillmentFee = parseFloat(data.fulfillment_cost?.total_cost_excl_tax || 0.75);
  const discounts = lineItemCost.discounts || [];
  const totalTax = parseFloat(data.total_tax || 0);
  const totalCostInclTax = parseFloat(data.total_cost_incl_tax || 0);
  const totalCost = parseFloat(data.total_cost_excl_tax || 0) || (totalPrintCost + shippingCost + fulfillmentFee);

  return {
    unitPrintCost,
    totalPrintCost,
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

async function getShippingOptions({ countryCode, stateCode, pageCount, podPackageId, quantity = 1, currency = 'USD', locationId }) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);

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
    `${baseUrl}/shipping-options/`,
    payload,
    { headers: headers(accessToken) }
  );
  return resp.data;
}

// ── Print Job Creation ────────────────────────────────────────────────────────

async function createPrintJob(orderData) {
  const locationId = orderData.locationId;
  const { accessToken, baseUrl } = await getLuluToken(locationId);

  // Ensure contact_email is always a valid email (empty string is falsy, so fallback applies)
  const contactEmail = orderData.readerEmail || orderData.contactEmail || 'orders@literaryapp.com';
  const externalId = orderData.contactId || undefined;
  const addr = orderData.shippingAddress || {};

  // Validate postcode — Lulu requires this for most countries
  const postcode = addr.postcode || addr.postal_code || addr.zip;
  if (!postcode || postcode.trim() === '') {
    throw new Error('Shipping address is missing postcode. Lulu requires this field for all orders. Please provide a valid ZIP/postal code.');
  }

  let phoneNumber = addr.phone_number || addr.phone || '0000000000';
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    phoneNumber = '0000000000';
    console.warn('[Lulu] Phone number too short, using fallback');
  }

  const countryCode = addr.country_code || 'US';
  // Lulu requires valid 2-letter state codes for US orders; for other countries or empty state, omit the field
  const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  let stateCode = null;
  if (countryCode === 'US' && addr.state_code) {
    const upperState = (addr.state_code || '').toUpperCase().trim();
    if (US_STATES.includes(upperState)) {
      stateCode = upperState;
    } else {
      console.warn('[Lulu] Invalid US state code:', addr.state_code, '— omitting from payload');
      // For US orders with invalid state, we must still provide a valid one for Lulu
      stateCode = 'CA'; // Default to CA as fallback for sandbox testing
    }
  } else if (addr.state_code && addr.state_code.trim() !== '') {
    // For non-US countries, send the state if provided
    stateCode = addr.state_code.toUpperCase().trim();
  }

  // Build the line item with all required fields from the API docs
  const lineItem = {
    title: orderData.bookTitle || 'Book',
    cover: orderData.coverPdfUrl,
    interior: orderData.interiorPdfUrl,
    pod_package_id: orderData.podPackageId,
    quantity: orderData.quantity || 1,
  };

  // Validate required fields before sending to Lulu
  if (!lineItem.pod_package_id) {
    throw new Error('podPackageId is required to create a print job. Ensure the book has been validated and saved.');
  }
  if (!lineItem.cover) {
    throw new Error('coverPdfUrl is required to create a print job.');
  }
  if (!lineItem.interior) {
    throw new Error('interiorPdfUrl is required to create a print job.');
  }

  const payload = {
    contact_email: contactEmail,
    external_id: externalId,
    production_delay: parseInt(process.env.LULU_PRODUCTION_DELAY) || 60,
    line_items: [lineItem],
    shipping_address: {
      name:         addr.name || 'Customer',
      street1:      addr.street1,
      street2:      addr.street2 || undefined,
      city:         addr.city,
      state_code:   stateCode,
      country_code: countryCode,
      postcode:     postcode,
      phone_number: phoneNumber,
      email:        contactEmail
    },
    shipping_level: orderData.shippingLevel || 'MAIL'
  };

  if (!payload.shipping_address.street2) delete payload.shipping_address.street2;

  console.log('[Lulu] Creating print job for location:', locationId);
  console.log('[Lulu] Print job payload:', JSON.stringify({
    contact_email: payload.contact_email,
    shipping_level: payload.shipping_level,
    shipping_address: { city: payload.shipping_address.city, country_code: payload.shipping_address.country_code },
    line_items: [{ title: payload.line_items[0].title, pod_package_id: payload.line_items[0].pod_package_id, quantity: payload.line_items[0].quantity }]
  }));

  try {
    const resp = await axios.post(`${baseUrl}/print-jobs/`, payload, { headers: headers(accessToken) });
    console.log('[Lulu] Print job created successfully:', resp.data.id);
    return resp.data;
  } catch (err) {
    if (err.response) {
      console.error('[Lulu] Print job creation failed:', JSON.stringify(err.response.data, null, 2));
      throw new Error(`Lulu API error ${err.response.status}: ${err.response.data?.detail || JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

async function getPrintJobStatus(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/`, { headers: headers(accessToken) });
  return resp.data;
}

// ── Webhook Registration ──────────────────────────────────────────────────────

async function registerWebhook(webhookUrl, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.post(
    `${baseUrl}/webhooks/`,
    { url: webhookUrl, topics: ['PRINT_JOB_STATUS_CHANGED'] },
    { headers: headers(accessToken) }
  );
  return resp.data;
}

// ── Test Connection ───────────────────────────────────────────────────────────

/**
 * Tests the Lulu connection for a given set of credentials.
 * Used by the integration settings page to validate credentials before saving.
 *
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} environment - 'sandbox' or 'production'
 * @returns {Promise<{ success: boolean, environment: string, error?: string }>}
 */
async function testConnection(clientId, clientSecret, environment) {
  try {
    const baseUrl = resolveBaseUrl(environment);
    const authUrl = `${baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const resp = await axios.post(
      authUrl,
      'grant_type=client_credentials',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${credentials}` } }
    );

    if (resp.data.access_token) {
      return { success: true, environment };
    }
    return { success: false, error: 'No access token returned', environment };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error_description || err.response?.data?.error || err.message,
      environment
    };
  }
}

// ── Lulu Status -> GHL Stage Mapping ─────────────────────────────────────────

function getGhlStageForLuluStatus(luluStatus) {
  const map = {
    'CREATED':       process.env.GHL_STAGE_SENT_TO_PRINT,
    'IN_PRODUCTION': process.env.GHL_STAGE_IN_PRODUCTION,
    'SHIPPED':       process.env.GHL_STAGE_SHIPPED,
    'DELIVERED':     process.env.GHL_STAGE_DELIVERED,
    'ERROR':         process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'REJECTED':      process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'CANCELED':      process.env.GHL_STAGE_REFUNDED_CANCELLED
  };
  return map[luluStatus] || null;
}

function mapLuluStatusToLocal(luluStatus) {
  const map = {
    'CREATED':       'Sent to Print',
    'IN_PRODUCTION': 'In Production',
    'SHIPPED':       'Shipped',
    'DELIVERED':     'Delivered',
    'ERROR':         'Fulfillment Error',
    'REJECTED':      'Fulfillment Error',
    'CANCELED':      'Cancelled'
  };
  return map[luluStatus] || luluStatus;
}

// ── Print Cost Only (ignores Lulu shipping) ──────────────────────────────────

async function calculatePrintCostOnly(podPackageId, pageCount, shippingLevel = 'MAIL', shippingAddress = null, quantity = 1, locationId) {
  const result = await calculatePrintCost(podPackageId, pageCount, shippingLevel, shippingAddress, quantity, locationId);
  return {
    ...result,
    shippingCost: 0,
    totalCost: result.totalPrintCost + result.fulfillmentFee,
  };
}

// ── Orders Management (for Orders Page) ──────────────────────────────────────

/**
 * List all print jobs for a location with optional filtering.
 * Syncs data from Lulu into local DB.
 *
 * @param {string} locationId - GHL sub-account ID
 * @param {object} filters - { page, pageSize, status, createdAfter, createdBefore, ordering }
 * @returns {Promise<{ count: number, results: Array }>}
 */
async function listPrintJobs(locationId, filters = {}) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const params = new URLSearchParams();
  if (filters.page) params.set('page', filters.page);
  if (filters.pageSize) params.set('page_size', filters.pageSize);
  if (filters.status) params.set('status', filters.status);
  if (filters.createdAfter) params.set('created_after', filters.createdAfter);
  if (filters.createdBefore) params.set('created_before', filters.createdBefore);
  if (filters.ordering) params.set('ordering', filters.ordering);

  const resp = await axios.get(`${baseUrl}/print-jobs/?${params.toString()}`, {
    headers: headers(accessToken)
  });
  return resp.data;
}

/**
 * Get detailed print job info from Lulu including costs, status, and line items.
 *
 * @param {string} luluPrintJobId - Lulu's internal job ID
 * @param {string} locationId - GHL sub-account ID
 * @returns {Promise<object>} Full job detail with costs, status, shipping info
 */
async function getPrintJobDetail(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/`, {
    headers: headers(accessToken)
  });
  return resp.data;
}

/**
 * Get the status of a specific print job.
 *
 * @param {string} luluPrintJobId - Lulu's internal job ID
 * @param {string} locationId - GHL sub-account ID
 * @returns {Promise<{ name: string, changed: string, message: string }>}
 */
async function getPrintJobStatusOnly(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/status/`, {
    headers: headers(accessToken)
  });
  return resp.data;
}

/**
 * Get the cost breakdown for a specific print job.
 *
 * @param {string} luluPrintJobId - Lulu's internal job ID
 * @param {string} locationId - GHL sub-account ID
 * @returns {Promise<object>} Cost breakdown with line_item_costs, shipping_cost, fulfillment_cost
 */
async function getPrintJobCosts(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/costs/`, {
    headers: headers(accessToken)
  });
  return resp.data;
}

/**
 * Reorder (reprint) a previously created print job.
 *
 * @param {string} luluPrintJobId - Lulu's internal job ID to reorder
 * @param {string} locationId - GHL sub-account ID
 * @returns {Promise<{ id: string }>} New print job ID
 */
async function reorderPrintJob(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.post(
    `${baseUrl}/print-jobs/${luluPrintJobId}/reprint/`,
    {},
    { headers: headers(accessToken) }
  );
  return resp.data;
}

/**
 * Extract tracking URLs from a print job's line item statuses.
 *
 * @param {object} jobDetail - The full job detail from getPrintJobDetail
 * @returns {Array<string>} Array of tracking URLs
 */
function extractTrackingUrls(jobDetail) {
  const urls = [];
  if (jobDetail.line_items) {
    for (const item of jobDetail.line_items) {
      if (item.status?.messages?.tracking_urls) {
        urls.push(...item.status.messages.tracking_urls);
      }
    }
  }
  return urls;
}

/**
 * Extract the shipping address from a print job detail.
 *
 * @param {object} jobDetail - The full job detail from getPrintJobDetail
 * @returns {object} Shipping address object
 */
function extractShippingAddress(jobDetail) {
  if (!jobDetail.shipping_address) return null;
  const addr = jobDetail.shipping_address;
  return {
    name: addr.name || '',
    street1: addr.street1 || '',
    street2: addr.street2 || '',
    city: addr.city || '',
    state_code: addr.state_code || '',
    postcode: addr.postcode || '',
    country_code: addr.country_code || '',
    phone_number: addr.phone_number || ''
  };
}

/**
 * Extract cost totals from a print job detail.
 *
 * @param {object} jobDetail - The full job detail from getPrintJobDetail
 * @returns {object} Cost breakdown
 */
function extractCosts(jobDetail) {
  if (!jobDetail.costs) return null;
  const costs = jobDetail.costs;
  return {
    currency: costs.currency || 'USD',
    totalCostExclTax: costs.total_cost_excl_tax ? parseFloat(costs.total_cost_excl_tax) : 0,
    totalCostInclTax: costs.total_cost_incl_tax ? parseFloat(costs.total_cost_incl_tax) : 0,
    totalTax: costs.total_tax ? parseFloat(costs.total_tax) : 0,
    shippingCost: costs.shipping_cost?.total_cost_incl_tax ? parseFloat(costs.shipping_cost.total_cost_incl_tax) : 0,
    fulfillmentFee: costs.fulfillment_cost?.total_cost_incl_tax ? parseFloat(costs.fulfillment_cost.total_cost_incl_tax) : 0,
    lineItemCosts: (costs.line_item_costs || []).map(li => ({
      title: li.title || '',
      quantity: li.quantity || 1,
      totalCostInclTax: li.total_cost_incl_tax ? parseFloat(li.total_cost_incl_tax) : 0
    }))
  };
}

module.exports = {
  getLuluToken,
  getLuluTokenLegacy,
  validateInteriorFile,
  validateCoverFile,
  getInteriorValidationStatus,
  getCoverValidationStatus,
  calculateCoverDimensions,
  calculatePrintCost,
  calculatePrintCostOnly,
  getShippingOptions,
  createPrintJob,
  getPrintJobStatus,
  getPrintJobStatusOnly,
  getPrintJobDetail,
  getPrintJobCosts,
  listPrintJobs,
  reorderPrintJob,
  extractTrackingUrls,
  extractShippingAddress,
  extractCosts,
  registerWebhook,
  testConnection,
  getGhlStageForLuluStatus,
  mapLuluStatusToLocal,
  sleep
};
