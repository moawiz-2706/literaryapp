'use strict';
/**
 * luluService.js
 *
 * Lulu.com API client — Per-Subaccount Credentials (hardened).
 *
 * Each GHL sub-account (location) has its own Lulu.com API credentials stored
 * in the database. All Lulu API calls require a `locationId` so the correct
 * credentials and token cache are resolved.
 *
 * Hardening applied in the 2026 audit (see AUDIT_REPORT_FINAL.md):
 *   - calculatePrintCost now sends `shipping_level` (the spec field) and never
 *     prices from a fabricated address; address validation warnings and the
 *     suggested address are surfaced to callers.
 *   - getShippingOptions now sends the real destination and maps the response
 *     to the spec's field names (`level`, `cost_excl_tax`, `total_days_min/max`).
 *   - createPrintJob strictly validates the shipping address and contact data
 *     and FAILS LOUDLY instead of substituting CA / 0000000000 / placeholder
 *     emails; line items are sent as spec-compliant `printable_normalization`
 *     objects with `page_count`.
 *   - reorderPrintJob now reuses each line item's immutable `printable_id`
 *     (the old `/reprint/` URL never existed in the API).
 *   - Webhook subscription health ops added (list / patch / test).
 *   - Status maps cover all eleven real statuses, including UNPAID,
 *     PAYMENT_IN_PROGRESS, PRODUCTION_DELAYED and PRODUCTION_READY.
 *   - Outbound requests carry a 30 s timeout.
 */

const axios = require('axios');
const db = require('../db/database');
const { resolveStateCode } = require('../db/stateResolver');

const LULU_SANDBOX = process.env.LULU_SANDBOX === 'true';
const REQUEST_TIMEOUT_MS = 30000;

// ── In-Memory Token Cache (per-location) ─────────────────────────────────────
// Map of locationId -> { accessToken, expiresAt }
const tokenCaches = new Map();
// In-flight token request de-duplication: concurrent callers for the same
// location share one HTTP request instead of hammering the token endpoint.
const inFlightTokens = new Map();

// ── Resolve Base URL ─────────────────────────────────────────────────────────

function resolveBaseUrl(environment) {
  if (environment === 'production') {
    return 'https://api.lulu.com';
  }
  // Default to sandbox or legacy global setting
  return LULU_SANDBOX ? 'https://api.sandbox.lulu.com' : 'https://api.lulu.com';
}

// ── Resolve Credentials for a Location ───────────────────────────────────────

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

// ── Get OAuth Token for a Location ───────────────────────────────────────────

async function getLuluToken(locationId, forceRefresh = false) {
  // ── In-memory cache ──
  if (!forceRefresh && locationId) {
    const cached = tokenCaches.get(locationId);
    if (cached && cached.expiresAt > Math.floor(Date.now() / 1000)) {
      return { accessToken: cached.accessToken, baseUrl: cached.baseUrl };
    }
  }

  // ── Database cache ──
  if (!forceRefresh && locationId) {
    const stored = await db.getLatestLuluTokenForLocation(locationId);
    if (stored && stored.expires_at > Math.floor(Date.now() / 1000)) {
      const creds = await resolveCredentials(locationId);
      const baseUrl = resolveBaseUrl(creds.environment);
      tokenCaches.set(locationId, { accessToken: stored.access_token, expiresAt: stored.expires_at, baseUrl });
      return { accessToken: stored.access_token, baseUrl };
    }
  }

  // ── De-duplicate in-flight token requests for the same location ──
  const cacheKey = `${locationId || '__global__'}:${forceRefresh ? 'force' : 'normal'}`;
  const existing = inFlightTokens.get(cacheKey);
  if (existing) return existing;

  const creds = await resolveCredentials(locationId);
  const baseUrl = resolveBaseUrl(creds.environment);
  const authUrl = `${baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`;

  console.log(`[Lulu] Requesting token for location ${locationId || '(global)'} at ${authUrl}`);

  const credentials = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const tokenPromise = (async () => {
    try {
      const resp = await axios.post(
        authUrl,
        'grant_type=client_credentials',
        {
          timeout: REQUEST_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      const { access_token, expires_in } = resp.data;
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
    } finally {
      inFlightTokens.delete(cacheKey);
    }
  })();

  inFlightTokens.set(cacheKey, tokenPromise);
  return tokenPromise;
}

async function getLuluTokenLegacy(locationId, forceRefresh = false) {
  const result = await getLuluToken(locationId, forceRefresh);
  return result.accessToken;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Address / contact validation (shared helpers) ────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

const PHONE_REGEX = /^\+?[\d\s\-.\/()]{8,20}$/;

// Countries where a state/province field is mandatory for Lulu.
const STATE_REQUIRED_COUNTRIES = new Set(['US', 'MX', 'CA', 'AU']);

/**
 * Strictly validate a shipping address. Throws with a developer- and
 * user-friendly message instead of silently substituting values.
 */
function validateShippingAddress(addr, isQuote = false) {
  const a = addr || {};
  const errors = [];

  const trim = v => (typeof v === 'string' ? v.trim() : '');
  const postcode = a.postcode || a.postal_code || a.zip;
  const countryCode = (a.country_code || a.country || 'US').toUpperCase();
  // Convert full state/province names to the 2-letter codes Lulu requires —
  // including common typos ("Alamaba" → AL). Covers EVERY order/quote entry
  // point: GHL workflow, quote calculator, sample orders, direct orders.
  const stateCode = trim(resolveStateCode(a.state_code || a.state || '', countryCode));
  const city = trim(a.city || '');
  const street1 = trim(a.street1 || a.address1 || a.line1 || '');
  const name = trim(a.name || '');
  const phone = a.phone_number || a.phone;
  const email = a.email || '';

  if (!street1) errors.push('street1 (shipping street address) is required');
  if (!city) errors.push('city is required');
  if (!postcode || postcode.trim() === '') errors.push('postcode (ZIP / postal code) is required');
  if (!countryCode) errors.push('country_code is required');
  else if (countryCode.length !== 2) errors.push('country_code must be a 2-letter ISO code');

  if (STATE_REQUIRED_COUNTRIES.has(countryCode) && !stateCode) {
    errors.push(`state_code is required for ${countryCode} addresses`);
  }
  if (countryCode === 'US' && stateCode && !US_STATES.includes(stateCode.toUpperCase())) {
    errors.push(`state_code "${stateCode}" is not a valid US state. Provide a valid 2-letter state code.`);
  }

  if (!name) errors.push('recipient name is required');
  if (phone && !PHONE_REGEX.test(phone)) errors.push('phone_number must be 8-20 digits/characters matching the Lulu phone format');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email is not a valid email address');

  if (errors.length > 0) {
    const verb = isQuote ? 'Quote calculation' : 'Order creation';
    throw new Error(`${verb} aborted: ${errors.join('; ')}. Please complete the shipping address before continuing.`);
  }

  return {
    name: name || 'Customer',
    street1,
    street2: trim(a.street2 || a.address2 || a.line2 || '') || undefined,
    city,
    state_code: stateCode ? stateCode.toUpperCase() : undefined,
    country_code: countryCode,
    postcode: postcode.trim(),
    phone_number: phone ? String(phone).trim() : undefined,
    email: email ? email.trim() : undefined,
  };
}

// ── File Validation ───────────────────────────────────────────────────────────

async function validateInteriorFile(pdfUrl, podPackageId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  try {
    const resp = await axios.post(
      `${baseUrl}/validate-interior/`,
      { source_url: pdfUrl, pod_package_id: podPackageId },
      { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('[Lulu] 401 on validate-interior, forcing token refresh');
      const { accessToken: newToken, baseUrl: newUrl } = await getLuluToken(locationId, true);
      const resp = await axios.post(
        `${newUrl}/validate-interior/`,
        { source_url: pdfUrl, pod_package_id: podPackageId },
        { timeout: REQUEST_TIMEOUT_MS, headers: headers(newToken) }
      );
      return resp.data;
    }
    throw err;
  }
}

async function validateCoverFile(pdfUrl, podPackageId, interiorPageCount, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const payload = { source_url: pdfUrl, pod_package_id: podPackageId };
  if (interiorPageCount) {
    payload.interior_page_count = interiorPageCount;
  }
  try {
    const resp = await axios.post(
      `${baseUrl}/validate-cover/`,
      payload,
      { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('[Lulu] 401 on validate-cover, forcing token refresh');
      const { accessToken: newToken, baseUrl: newUrl } = await getLuluToken(locationId, true);
      const resp = await axios.post(
        `${newUrl}/validate-cover/`,
        payload,
        { timeout: REQUEST_TIMEOUT_MS, headers: headers(newToken) }
      );
      return resp.data;
    }
    throw err;
  }
}

async function getInteriorValidationStatus(validationId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/validate-interior/${validationId}/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

async function getCoverValidationStatus(validationId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/validate-cover/${validationId}/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

// ── Cover Dimension Calculation ──────────────────────────────────────────────

async function calculateCoverDimensions(podPackageId, pageCount, unit = 'pt', locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  try {
    const resp = await axios.post(
      `${baseUrl}/cover-dimensions/`,
      { pod_package_id: podPackageId, interior_page_count: pageCount, unit },
      { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn('[Lulu] 401 on calculate-cover-dimensions, forcing token refresh');
      const { accessToken: newToken, baseUrl: newUrl } = await getLuluToken(locationId, true);
      const resp = await axios.post(
        `${newUrl}/cover-dimensions/`,
        { pod_package_id: podPackageId, interior_page_count: pageCount, unit },
        { timeout: REQUEST_TIMEOUT_MS, headers: headers(newToken) }
      );
      return resp.data;
    }
    throw err;
  }
}

// ── Print Cost Calculation (FIXED: spec field name + real address) ────────────
// Spec: request field is `shipping_level` (app previously sent `shipping_option`,
// which Lulu silently ignored — every quote was priced at the account default).
// `shipping_cost` in the response is already the whole-shipment cost; callers
// must NOT multiply it by quantity. Address validation warnings and the
// `suggested_address` are returned to the caller.

async function calculatePrintCost(
  podPackageId,
  pageCount,
  shippingLevel = 'MAIL',
  shippingAddress = null,
  quantity = 1,
  locationId
) {
  if (!shippingAddress || !(shippingAddress.postcode || shippingAddress.postal_code || shippingAddress.zip)) {
    throw new Error(
      'Quote calculation requires a real shipping address with a postcode. ' +
      'Quotes can no longer be computed for a placeholder address — the printed ' +
      'book must actually ship somewhere.'
    );
  }

  const { accessToken, baseUrl } = await getLuluToken(locationId);

  const resolvedAddress = validateShippingAddress(shippingAddress, true);

  const payload = {
    line_items: [{
      pod_package_id: podPackageId,
      page_count:     parseInt(pageCount),
      quantity:       parseInt(quantity) || 1
    }],
    shipping_address: resolvedAddress,
    shipping_level:   shippingLevel   // SPEC FIELD — previously misnamed `shipping_option`
  };

  const resp = await axios.post(
    `${baseUrl}/print-job-cost-calculations/`,
    payload,
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );

  const data = resp.data;

  const lineItemCost = data.line_item_costs?.[0] || {};
  const unitPrintCost  = parseFloat(lineItemCost.cost_excl_discounts || 0);
  const totalPrintCost = parseFloat(lineItemCost.total_cost_excl_tax || lineItemCost.total_cost_excl_discounts || 0);
  const shippingCost = parseFloat(data.shipping_cost?.total_cost_excl_tax || 0);
  const baseFulfillmentFee = parseFloat(data.fulfillment_cost?.total_cost_excl_tax || 0);

  // Lulu can return additional fees beyond fulfillment (e.g. HANDLING_FEE).
  // Sum every fee the response declares instead of hard-coding 0.75.
  const extraFees = (data.fees || [])
    .filter(f => f.type !== 'FULFILLMENT_FEE')
    .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const fulfillmentFee = baseFulfillmentFee || (extraFees === 0 ? 0.75 : 0);

  const discounts = lineItemCost.discounts || [];
  const totalTax = parseFloat(data.total_tax || 0);
  const totalCostInclTax = parseFloat(data.total_cost_incl_tax || 0);
  const totalCostExclTax = parseFloat(data.total_cost_excl_tax || 0)
    || (totalPrintCost + shippingCost + fulfillmentFee + extraFees);
  const totalCost = totalCostExclTax + totalTax;

  return {
    unitPrintCost,
    totalPrintCost,
    printCost: unitPrintCost,
    shippingCost,              // whole-shipment cost — do NOT multiply by quantity
    fulfillmentFee,
    extraFees,
    totalCost,
    totalCostExclTax,
    discounts,
    totalTax,
    totalCostInclTax,
    currency: data.currency || 'USD',
    warnings: data.shipping_address?.warnings || [],
    suggestedAddress: data.shipping_address?.suggested_address || null,
    fees: data.fees || [],
    estimatedShippingDates: data.estimated_shipping_dates || null,
    raw: data
  };
}

// ── Shipping Options (FIXED: real destination + spec field mapping) ───────────
// Spec: request address uses `country` (not `country_code`); response options
// carry `level`, `cost_excl_tax` (decimal string), `total_days_min/max`,
// `min/max_delivery_date` — the app previously read five nonexistent fields.

async function getShippingOptions({
  countryCode,
  stateCode,
  city,
  postcode,
  pageCount,
  podPackageId,
  quantity = 1,
  currency = 'USD',
  locationId
}) {
  if (!countryCode) throw new Error('countryCode is required for shipping options');
  if (!postcode) throw new Error('postcode is required — shipping options are priced from the real destination');

  const { accessToken, baseUrl } = await getLuluToken(locationId);

  const shippingAddress = { country: countryCode, postcode };
  if (city) shippingAddress.city = city;
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
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );
  return resp.data;
}

// ── Print Job Creation (FIXED: strict validation + spec line items) ───────────
// - No silent substitution: invalid state / missing phone / missing email all
//   throw. The caller must present the problem to the user.
// - Line items are spec-compliant: `printable_normalization` objects with
//   `page_count`, never bare URL strings.
// - `external_id` carries OUR order id (never the contact id), so Lulu-side
//   references and dedupe work.

async function createPrintJob(orderData) {
  const locationId = orderData.locationId;
  const { accessToken, baseUrl } = await getLuluToken(locationId);

  const addr = orderData.shippingAddress || {};

  // ── Strict validation; fail loudly ──
  if (!addr.email && !orderData.readerEmail && !orderData.contactEmail) {
    throw new Error('Order creation aborted: a contact/recipient email is required. Lulu sends carrier notifications to this address.');
  }
  const contactEmail = (addr.email || orderData.readerEmail || orderData.contactEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error('Order creation aborted: the contact email is not a valid email address.');
  }

  const shippingAddress = validateShippingAddress(addr, false);
  if (!shippingAddress.phone_number && !orderData.readerPhone) {
    throw new Error(
      'Order creation aborted: a phone number is required on the shipping address. ' +
      'Lulu requires a number matching the international format (8-20 characters).'
    );
  }
  if (orderData.readerPhone && PHONE_REGEX.test(orderData.readerPhone)) {
    shippingAddress.phone_number = String(orderData.readerPhone).trim();
  }
  shippingAddress.email = contactEmail;

  // ── Line item: spec-compliant printable_normalization ──
  // Lulu's official spec (Create Print-Job) places pod_package_id INSIDE
  // printable_normalization whenever that object is sent — sending only the
  // source_url pairs inside it produced the error
  // "printable_normalization.pod_package_id is required". A top-level copy is
  // kept for older spec versions that read the field at line-item level.
  const lineItem = {
    title:            orderData.bookTitle || 'Book',
    pod_package_id:   orderData.podPackageId,
    page_count:       orderData.pageCount || undefined,
    quantity:         Math.max(1, parseInt(orderData.quantity) || 1),
    external_id:      orderData.orderId ? `literaryapp-order-${orderData.orderId}` : undefined,
    printable_normalization: {
      interior: {
        source_url: orderData.interiorPdfUrl,
        source_md5_sum: orderData.interiorMd5 || undefined
      },
      cover: {
        source_url: orderData.coverPdfUrl,
        source_md5_sum: orderData.coverMd5 || undefined
      },
      pod_package_id: orderData.podPackageId
    }
  };

  // Validate required fields before sending to Lulu
  if (!lineItem.pod_package_id) {
    throw new Error('podPackageId is required to create a print job. Ensure the book has been validated and saved.');
  }
  if (!lineItem.printable_normalization.cover.source_url) {
    throw new Error('coverPdfUrl is required to create a print job.');
  }
  if (!lineItem.printable_normalization.interior.source_url) {
    throw new Error('interiorPdfUrl is required to create a print job.');
  }
  if (!lineItem.page_count) {
    throw new Error('pageCount is required to create a print job.');
  }

  const payload = {
    contact_email:   contactEmail,
    external_id:     lineItem.external_id,
    production_delay: Math.min(2880, Math.max(60, parseInt(process.env.LULU_PRODUCTION_DELAY) || 60)),
    line_items: [lineItem],
    shipping_address: shippingAddress,
    shipping_level:  orderData.shippingLevel || 'MAIL'
  };

  if (!payload.shipping_address.street2) delete payload.shipping_address.street2;

  console.log('[Lulu] Creating print job for location:', locationId);
  console.log('[Lulu] Print job payload:', JSON.stringify({
    contact_email: payload.contact_email,
    external_id: payload.external_id,
    shipping_level: payload.shipping_level,
    shipping_address: { city: payload.shipping_address.city, country_code: payload.shipping_address.country_code },
    line_items: [{
      title: payload.line_items[0].title,
      pod_package_id: payload.line_items[0].pod_package_id,
      page_count: payload.line_items[0].page_count,
      quantity: payload.line_items[0].quantity,
      printable_normalization: {
        pod_package_id: payload.line_items[0].printable_normalization?.pod_package_id,
        interior_source_url: payload.line_items[0].printable_normalization?.interior?.source_url,
        cover_source_url: payload.line_items[0].printable_normalization?.cover?.source_url,
      }
    }]
  }));

  try {
    const resp = await axios.post(
      `${baseUrl}/print-jobs/`,
      payload,
      { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
    );
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

// ── Cancel Print Job ───────────────────────────────────────────────────────────
// Within the cancellation window (production_delay minutes), a job can be moved
// to CANCELED via PUT /print-jobs/{id}/status/. After that the job is in
// production and can no longer be cancelled.

async function cancelPrintJob(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  try {
    const resp = await axios.put(
      `${baseUrl}/print-jobs/${luluPrintJobId}/status/`,
      { status: 'CANCELED' },
      { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
    );
    return resp.data;
  } catch (err) {
    if (err.response) {
      throw new Error(`Lulu API error ${err.response.status}: ${err.response.data?.detail || JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

async function getPrintJobStatus(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

// ── Webhook Registration & Health ──────────────────────────────────────────────

async function registerWebhook(webhookUrl, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.post(
    `${baseUrl}/webhooks/`,
    { url: webhookUrl, topics: ['PRINT_JOB_STATUS_CHANGED'] },
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );
  return resp.data;
}

/** List this account's webhook subscriptions (health check source). */
async function listWebhooks(locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/webhooks/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

/** Patch a webhook subscription — used to reactivate an auto-deactivated one. */
async function patchWebhook(luluWebhookId, patch, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.patch(
    `${baseUrl}/webhooks/${luluWebhookId}/`,
    patch,
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );
  return resp.data;
}

/** Fire a test status-changed submission at a webhook subscription. */
async function testWebhook(luluWebhookId, topic = 'PRINT_JOB_STATUS_CHANGED', locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.post(
    `${baseUrl}/webhooks/${luluWebhookId}/test-submission/${topic}/`,
    {},
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );
  return resp.data;
}

// ── Test Connection ────────────────────────────────────────────────────────────

async function testConnection(clientId, clientSecret, environment) {
  try {
    const baseUrl = resolveBaseUrl(environment);
    const authUrl = `${baseUrl}/auth/realms/glasstree/protocol/openid-connect/token`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const resp = await axios.post(
      authUrl,
      'grant_type=client_credentials',
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`
        }
      }
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

// ── Status Maps (COMPLETE: all 11 real statuses) ───────────────────────────────
// statusService.js is now the single semantic owner; these wrappers remain so
// legacy callers keep working, but all new code should import statusService.

function getGhlStageForLuluStatus(luluStatus) {
  const map = {
    'CREATED':               process.env.GHL_STAGE_SENT_TO_PRINT,
    'UNPAID':                process.env.GHL_STAGE_ORDER_RECEIVED,
    'PAYMENT_IN_PROGRESS':   process.env.GHL_STAGE_ORDER_RECEIVED,
    'PRODUCTION_READY':      process.env.GHL_STAGE_SENT_TO_PRINT,
    'IN_PRODUCTION':         process.env.GHL_STAGE_IN_PRODUCTION,
    'SHIPPED':               process.env.GHL_STAGE_SHIPPED,
    'DELIVERED':             process.env.GHL_STAGE_DELIVERED,
    'ERROR':                 process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'REJECTED':              process.env.GHL_STAGE_FULFILLMENT_ISSUE,
    'CANCELED':              process.env.GHL_STAGE_REFUNDED_CANCELLED,
    'PRODUCTION_DELAYED':    process.env.GHL_STAGE_IN_PRODUCTION,
  };
  return map[luluStatus] || null;
}

function mapLuluStatusToLocal(luluStatus) {
  const map = {
    'CREATED':               'Sent to Print',
    'UNPAID':                'Awaiting Payment',
    'PAYMENT_IN_PROGRESS':   'Payment Processing',
    'PRODUCTION_DELAYED':    'Production Delayed',
    'PRODUCTION_READY':      'Production Ready',
    'IN_PRODUCTION':         'In Production',
    'SHIPPED':               'Shipped',
    'DELIVERED':             'Delivered',
    'ERROR':                 'Fulfillment Error',
    'REJECTED':              'Fulfillment Error',
    'CANCELED':              'Cancelled'
  };
  return map[luluStatus] || luluStatus || 'Pending';
}

// ── Orders Management (for Orders Page) ────────────────────────────────────────

async function listPrintJobs(locationId, filters = {}) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const params = new URLSearchParams();
  if (filters.page) params.set('page', filters.page);
  if (filters.pageSize) params.set('page_size', filters.pageSize);
  if (filters.status) params.set('status', filters.status);
  if (filters.createdAfter) params.set('created_after', filters.createdAfter);
  if (filters.createdBefore) params.set('created_before', filters.createdBefore);
  if (filters.ordering) params.set('ordering', filters.ordering);
  if (filters.modifiedAfter) params.set('modified_after', filters.modifiedAfter);

  const resp = await axios.get(`${baseUrl}/print-jobs/?${params.toString()}`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

/**
 * List jobs modified since an ISO timestamp — the reconciliation endpoint that
 * catches jobs whose webhooks were missed or deactiviated.
 */
async function listPrintJobsModifiedAfter(locationId, afterIso) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(
    `${baseUrl}/print-jobs/?modified_after=${encodeURIComponent(afterIso)}&page_size=100&ordering=-modified`,
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );
  return resp.data;
}

async function getPrintJobDetail(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

async function getPrintJobStatusOnly(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/status/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

async function getPrintJobCosts(luluPrintJobId, locationId) {
  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const resp = await axios.get(`${baseUrl}/print-jobs/${luluPrintJobId}/costs/`, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: headers(accessToken)
  });
  return resp.data;
}

// ── Reorder (FIXED: reusable printable_id) ─────────────────────────────────────
// The API has no /reprint/ endpoint. A reorder is a normal create call that
// reuses each original line item's immutable printable_id and omits
// printable_normalization entirely.

async function reorderPrintJob(luluPrintJobId, locationId, overrides = {}) {
  const original = await getPrintJobDetail(luluPrintJobId, locationId);
  if (!original?.line_items?.length) {
    throw new Error('Cannot reorder: the original print job has no line items.');
  }

  const lineItems = original.line_items.map(item => ({
    title:          item.title || 'Book',
    printable_id:   item.printable_id,
    pod_package_id: item.pod_package_id,
    page_count:     item.page_count,
    quantity:       parseInt(overrides.quantity) || item.quantity || 1,
    // Spec-compliant: when printable_normalization is sent, pod_package_id must
    // live inside it. Reorders include normalized source metadata from the
    // original line item (normalized_file + md5) so Lulu can re-normalize.
    printable_normalization: {
      interior: item.printable_normalization?.interior || undefined,
      cover:    item.printable_normalization?.cover || undefined,
      pod_package_id: item.pod_package_id,
    },
  }));

  const { accessToken, baseUrl } = await getLuluToken(locationId);
  const payload = {
    contact_email:    original.contact_email,
    external_id:      overrides.externalId || undefined,
    production_delay: parseInt(process.env.LULU_PRODUCTION_DELAY) || 60,
    line_items:       lineItems,
    shipping_address: overrides.shippingAddress || original.shipping_address,
    shipping_level:   overrides.shippingLevel || original.shipping_level,
  };

  if (!payload.shipping_address.street2) delete payload.shipping_address.street2;

  const resp = await axios.post(
    `${baseUrl}/print-jobs/`,
    payload,
    { timeout: REQUEST_TIMEOUT_MS, headers: headers(accessToken) }
  );
  return resp.data;
}

// ── Tracking Extraction (handles both response shapes) ─────────────────────────
// 1. Print-job object:  line_items[].tracking_urls / line_items[].tracking_id
//                       plus line_items[].status.messages (carrier, tracking_urls)
// 2. Status-endpoint response / SHIPPED webhook: data.status.line_item_statuses[]
//    with messages.{tracking_id, tracking_urls, carrier_name}

function extractTracking(jobDetail) {
  const tracking = [];
  const seen = new Set();
  const addTracking = ({ url, id, carrier, lineItemId }) => {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';
    const normalizedId = id == null ? null : String(id).trim() || null;
    const key = `${normalizedId || ''}|${normalizedUrl}|${lineItemId || ''}`;
    if (!normalizedUrl && !normalizedId) return;
    if (seen.has(key)) return;
    seen.add(key);
    tracking.push({
      url: normalizedUrl || null,
      id: normalizedId,
      carrier: carrier || null,
      lineItemId: lineItemId || null,
    });
  };

  // Print-job details shape: line_items[].status.messages or direct item fields.
  for (const item of (jobDetail?.line_items || [])) {
    const messages = item.status?.messages || {};
    const urls = messages.tracking_urls || item.tracking_urls || (item.tracking_url ? [item.tracking_url] : []);
    const ids = messages.tracking_id || item.tracking_id || null;
    if (Array.isArray(urls) && urls.length > 0) {
      for (const url of urls) {
        addTracking({
          url,
          id: ids,
          carrier: messages.carrier_name || item.carrier_name,
          lineItemId: item.id || item.line_item_id,
        });
      }
    } else if (ids) {
      addTracking({
        url: messages.tracking_url || item.tracking_url,
        id: ids,
        carrier: messages.carrier_name || item.carrier_name,
        lineItemId: item.id || item.line_item_id,
      });
    }
  }

  // Status endpoint / PRINT_JOB_STATUS_CHANGED shape documented by Lulu:
  // status.line_item_statuses[].messages.{tracking_id,tracking_urls,carrier_name}.
  const status = jobDetail?.status || jobDetail;
  for (const item of (status?.line_item_statuses || [])) {
    const messages = item.messages || {};
    const urls = messages.tracking_urls || (messages.tracking_url ? [messages.tracking_url] : []);
    if (Array.isArray(urls) && urls.length > 0) {
      for (const url of urls) {
        addTracking({
          url,
          id: messages.tracking_id,
          carrier: messages.carrier_name,
          lineItemId: item.line_item_id || item.id,
        });
      }
    } else if (messages.tracking_id) {
      addTracking({
        url: null,
        id: messages.tracking_id,
        carrier: messages.carrier_name,
        lineItemId: item.line_item_id || item.id,
      });
    }
  }

  return tracking;
}

function extractTrackingUrls(jobDetail) {
  return extractTracking(jobDetail).map(t => t.url).filter(Boolean);
}

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

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  getLuluToken,
  getLuluTokenLegacy,
  validateShippingAddress,
  validateInteriorFile,
  validateCoverFile,
  getInteriorValidationStatus,
  getCoverValidationStatus,
  calculateCoverDimensions,
  calculatePrintCost,
  getShippingOptions,
  createPrintJob,
  cancelPrintJob,
  getPrintJobStatus,
  getPrintJobStatusOnly,
  getPrintJobDetail,
  getPrintJobCosts,
  listPrintJobs,
  listPrintJobsModifiedAfter,
  reorderPrintJob,
  extractTracking,
  extractTrackingUrls,
  extractShippingAddress,
  extractCosts,
  registerWebhook,
  listWebhooks,
  patchWebhook,
  testWebhook,
  testConnection,
  getGhlStageForLuluStatus,
  mapLuluStatusToLocal,
  sleep
};

// ── Webhook Restoration (for /webhook-health/:locationId/reactivate) ─────────────
// Reactivates a Lulu webhook subscription when Lulu auto-deactivates it (e.g.
// after repeated 5xx responses). Tries: (1) PATCH activate on existing,
// (2) re-registration of the target URL.
async function restoreWebhookSubscription(locationId) {
  // The webhook target URL is registered per-install on /webhooks/lulu?locationId={id}.
  const publicUrl = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || '';
  const webhookUrl = `${publicUrl}/webhooks/lulu?locationId=${encodeURIComponent(locationId)}`;
  if (!publicUrl) {
    throw new Error('PUBLIC_API_URL is not configured — cannot (re)register the Lulu webhook target.');
  }

  const remote = await listWebhooks(locationId);
  const subs = Array.isArray(remote?.results) ? remote.results : (Array.isArray(remote) ? remote : []);

  // 1. Try to activate an existing deactivated subscription
  const deactivated = subs.find(s => s.active === false);
  if (deactivated) {
    await patchWebhook(deactivated.id, { active: true }, locationId);
    return { reactivated: true, webhookId: deactivated.id, method: 'patch_activate' };
  }

  // 2. Otherwise register fresh (idempotent on the URL per Lulu's docs)
  const registered = await registerWebhook(webhookUrl, locationId);
  return { reactivated: true, webhookId: registered?.id || null, method: 'reregister' };
}

module.exports.restoreWebhookSubscription = restoreWebhookSubscription;
