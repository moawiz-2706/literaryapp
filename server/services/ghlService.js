'use strict';
/**
 * ghlService.js
 *
 * GoHighLevel (GHL) API integration.
 * Handles OAuth, product creation, pipeline management, custom values,
 * contact operations (tags, custom fields), opportunity management, and menu injection.
 *
 * OAuth flow matches the reference GHL app (Royal-Review):
 *   1. Callback: POST /oauth/token with form-urlencoded body + user_type: Company
 *   2. Webhook:  POST /oauth/locationToken with companyId + locationId (2021-07-28)
 *   3. Refresh:  POST /oauth/token with form-urlencoded body
 */

const axios = require('axios');

const GHL_BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';
const GHL_TIMEOUT = 15000; // ms — never let a GHL call hang a request forever

// ── OAuth Token Exchange ──────────────────────────────────────────────────────

/**
 * Exchange an OAuth authorization code for access and refresh tokens.
 * Used during the initial app install callback from GHL.
 */
async function exchangeCodeForTokens(code) {
  const formData = new URLSearchParams();
  formData.append('client_id', process.env.GHL_CLIENT_ID);
  formData.append('client_secret', process.env.GHL_CLIENT_SECRET);
  formData.append('grant_type', 'authorization_code');
  formData.append('code', code);
  formData.append('redirect_uri', process.env.GHL_REDIRECT_URI || `${process.env.APP_BASE_URL}/oauth/callback`);
  formData.append('user_type', 'Company');

  const resp = await axios.post(`${GHL_BASE}/oauth/token`, formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: GHL_TIMEOUT,
  });

  return {
    access_token: resp.data.access_token,
    refresh_token: resp.data.refresh_token,
    expires_in: resp.data.expires_in,
    locationId: resp.data.locationId || null,
    companyId: resp.data.companyId || null,
    userType: resp.data.userType || 'Location'
  };
}

/**
 * Exchange an agency-level (Company) token for a location-scoped token.
 */
async function exchangeAgencyTokenForLocation(agencyToken, companyId, locationId) {
  const formData = new URLSearchParams();
  formData.append('companyId', companyId);
  formData.append('locationId', locationId);

  const resp = await axios.post(`${GHL_BASE}/oauth/locationToken`, formData.toString(), {
    headers: {
      'Authorization': `Bearer ${agencyToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Version': '2021-07-28'
    },
    timeout: GHL_TIMEOUT,
  });

  return {
    access_token: resp.data.access_token,
    refresh_token: resp.data.refresh_token,
    expires_in: resp.data.expires_in
  };
}

// ── Token Helpers ─────────────────────────────────────────────────────────────

function ghlHeaders(token, versionOverride = null) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Version': versionOverride || '2021-07-28',
  };
}

async function getValidToken(locationId) {
  const db = require('../db/database');
  const ghlToken = await db.getGhlToken(locationId);
  if (!ghlToken) {
    throw new Error(`No GHL token found for location: ${locationId}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (ghlToken.expires_at > now) {
    return ghlToken.access_token;
  }

  if (ghlToken.refresh_token) {
    console.log('[GHL] Token expired, refreshing...');
    try {
      const refreshForm = new URLSearchParams();
      refreshForm.append('grant_type', 'refresh_token');
      refreshForm.append('refresh_token', ghlToken.refresh_token);
      refreshForm.append('client_id', process.env.GHL_CLIENT_ID);
      refreshForm.append('client_secret', process.env.GHL_CLIENT_SECRET);

      const resp = await axios.post('https://services.leadconnectorhq.com/oauth/token', refreshForm.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: GHL_TIMEOUT,
      });

      const newExpiry = Math.floor(Date.now() / 1000) + resp.data.expires_in;
      await db.upsertGhlToken(locationId, resp.data.access_token, resp.data.refresh_token, newExpiry);
      console.log('[GHL] Token refreshed successfully');
      return resp.data.access_token;
    } catch (err) {
      console.error('[GHL] Token refresh failed:', err.message);
      throw new Error('GHL token refresh failed');
    }
  }

  throw new Error('GHL token expired and no refresh token available');
}

// ── Product Creation ──────────────────────────────────────────────────────────

async function createProduct(locationId, bookData) {
  const token = await getValidToken(locationId);

  const luluMeta = JSON.stringify({
    pod_package_id: bookData.podPackageId,
    interior_pdf_url: bookData.interiorPdfUrl,
    cover_pdf_url: bookData.coverPdfUrl,
    page_count: bookData.pageCount,
    print_cost: bookData.printCost,
    book_id: bookData.bookId
  });

  const productPayload = {
    locationId,
    name: bookData.title,
    description: `${bookData.description || bookData.title}\n\n<!--LULU_META:${luluMeta}:LULU_META-->`,
    productType: 'PHYSICAL',
    availableInStore: true
  };

  let productResp;
  try {
    productResp = await axios.post(`${GHL_BASE}/products/`, productPayload, { headers: ghlHeaders(token, '2021-07-28') });
    console.log('[GHL] Product created via /products/ (2021-07-28)');
  } catch (err) {
    console.warn('[GHL] Product creation via /products/ failed, trying fallback...');
    try {
      productResp = await axios.post(`${GHL_BASE}/locations/${locationId}/products/`, productPayload, { headers: ghlHeaders(token, '2021-07-28') });
      console.log('[GHL] Product created via fallback endpoint');
    } catch (err2) {
      throw new Error(`GHL product creation failed: ${err2.response?.data?.message || err2.message}`);
    }
  }

  const productId = productResp.data?._id || productResp.data?.id;
  if (!productId) throw new Error('GHL product creation succeeded but no product ID returned');

  let priceId = null;
  const retailPrice = parseFloat(bookData.retailPrice);
  const amount = (!isNaN(retailPrice) && retailPrice > 0) ? Math.round(retailPrice * 100) / 100 : 0.01;

  const pricePayload = {
    product: productId, locationId,
    name: `${bookData.title} — Standard`,
    type: 'one_time', currency: 'USD', amount,
    description: `Retail price for "${bookData.title}"`,
    sku: `BOOK-${bookData.bookId || productId}`,
    isDigitalProduct: false,
    shippingOptions: {
      weight: { value: 300, unit: 'g' },
      dimensions: { length: 20, width: 13, height: 2, unit: 'cm' }
    }
  };

  try {
    const priceResp = await axios.post(`${GHL_BASE}/products/${productId}/price`, pricePayload, { headers: ghlHeaders(token, '2021-07-28') });
    priceId = priceResp.data?._id || priceResp.data?.id;
  } catch (priceErr) {
    console.warn('[GHL] Price could not be attached. You can add it manually in GHL.');
  }

  return { product: productResp.data, price: priceId ? { _id: priceId } : null, productId, priceId };
}

// ── Custom Values ─────────────────────────────────────────────────────────────

async function getCustomValues(locationId) {
  const token = await getValidToken(locationId);
  const resp = await axios.get(`${GHL_BASE}/locations/${locationId}/customValues`, { headers: ghlHeaders(token), timeout: GHL_TIMEOUT });
  return resp.data.customValues || [];
}

async function upsertCustomValue(locationId, key, value) {
  const token = await getValidToken(locationId);
  const existing = await getCustomValues(locationId);
  const found = existing.find(cv => cv.fieldKey === key || cv.name === key);
  if (found) {
    await axios.put(`${GHL_BASE}/locations/${locationId}/customValues/${found.id}`, { value }, { headers: ghlHeaders(token) });
  } else {
    await axios.post(`${GHL_BASE}/locations/${locationId}/customValues`, { name: key, fieldKey: key, value }, { headers: ghlHeaders(token) });
  }
}

async function getCustomValueByKey(locationId, key) {
  const all = await getCustomValues(locationId);
  return all.find(cv => cv.fieldKey === key || cv.name === key) || null;
}

// ── Contact Operations ────────────────────────────────────────────────────────

/**
 * Write custom fields to a GHL contact (order tracking info).
 * Used by the webhook to update fulfillment status and tracking numbers.
 */
async function writeOrderCustomFields(locationId, contactId, fieldUpdates) {
  const token = await getValidToken(locationId);
  const resp = await axios.put(
    `${GHL_BASE}/contacts/${contactId}`,
    fieldUpdates,
    { headers: ghlHeaders(token) }
  );
  return resp.data;
}

/**
 * Add tags to a GHL contact.
 */
async function addTagsToContact(locationId, contactId, tags) {
  const token = await getValidToken(locationId);
  const resp = await axios.post(
    `${GHL_BASE}/contacts/${contactId}/tags`,
    { tags },
    { headers: ghlHeaders(token) }
  );
  return resp.data;
}

/**
 * Get contact details by contact ID.
 */
async function getContact(locationId, contactId) {
  const token = await getValidToken(locationId);
  try {
    const resp = await axios.get(`${GHL_BASE}/contacts/${contactId}`, { headers: ghlHeaders(token), timeout: GHL_TIMEOUT });
    return resp.data;
  } catch (err) {
    console.warn('[GHL] getContact failed:', err.message);
    return null;
  }
}

// ── Pipeline / Opportunity ────────────────────────────────────────────────────

async function createOpportunity(locationId, contactId, bookTitle) {
  const token = await getValidToken(locationId);
  const pipelineId = process.env.GHL_PIPELINE_ID;
  const stageId = process.env.GHL_STAGE_ORDER_RECEIVED;

  const resp = await axios.post(
    `${GHL_BASE}/opportunities/`,
    { pipelineId, stageId, contactId, name: `POD Order: ${bookTitle}`, locationId, source: 'LiteraryApp' },
    { headers: ghlHeaders(token) }
  );
  return resp.data;
}

/**
 * Update an opportunity stage. Fixed: now accepts locationId and passes it to getValidToken.
 */
async function updateOpportunityStage(locationId, opportunityId, stageId) {
  const token = await getValidToken(locationId);
  await axios.put(
    `${GHL_BASE}/opportunities/${opportunityId}/`,
    { stageId },
    { headers: ghlHeaders(token) }
  );
}

/**
 * Get opportunity details. Fixed: now accepts locationId.
 */
async function getOpportunity(locationId, opportunityId) {
  const token = await getValidToken(locationId);
  const resp = await axios.get(`${GHL_BASE}/opportunities/${opportunityId}/`, { headers: ghlHeaders(token), timeout: GHL_TIMEOUT });
  return resp.data;
}

// ── Pipelines (used by per-location stage configuration) ───────────────────────
async function getPipelines(locationId) {
  const token = await getValidToken(locationId);
  const resp = await axios.get(`${GHL_BASE}/pipelines/`, {
    headers: ghlHeaders(token),
    params: { locationId },
    timeout: GHL_TIMEOUT,
  });
  return resp.data?.pipelines || resp.data || [];
}

// ── Menu Link Injection ───────────────────────────────────────────────────────

async function injectCustomMenuLinks(locationId, appBaseUrl, frontendBaseUrl) {
  const token = await getValidToken(locationId);
  const links = [
    { name: 'LiteraryApp', link: `${frontendBaseUrl}/book-setup?locationId=${locationId}` },
    { name: 'Quote Calculator', link: `${frontendBaseUrl}/quote-calculator?locationId=${locationId}` },
    { name: 'Royalty Dashboard', link: `${frontendBaseUrl}/royalty-dashboard?locationId=${locationId}` },
    { name: 'Lulu Integration', link: `${frontendBaseUrl}/lulu-integration?locationId=${locationId}` },
    { name: 'Orders', link: `${frontendBaseUrl}/orders?locationId=${locationId}` },
    { name: 'Analytics', link: `${frontendBaseUrl}/analytics?locationId=${locationId}` },
    { name: 'Settings', link: `${frontendBaseUrl}/settings?locationId=${locationId}` },
    { name: 'CRM Pipelines', link: `${frontendBaseUrl}/crm-pipelines?locationId=${locationId}` },
  ];

  for (const link of links) {
    try {
      await axios.post(
        `${GHL_BASE}/accounts/location/${locationId}/customMenuLinks`,
        { name: link.name, link: link.link, order: links.indexOf(link) },
        { headers: ghlHeaders(token) }
      );
    } catch (err) {
      if (err.response?.status !== 400 && err.response?.status !== 409) {
        console.warn(`[GHL] Menu link injection failed for "${link.name}":`, err.message);
      }
    }
  }
}

// ── Custom Workflow Action Registration ───────────────────────────────────────

/**
 * Register the "Create Lulu Print Job" custom workflow action in a sub-account.
 *
 * GHL provides an API to create workflow actions programmatically per location.
 * This is called during the OAuth callback and INSTALL webhook so the action
 * is available automatically when the app is installed.
 *
 * Note: The action must also be registered in the GHL Developer Portal for it
 * to be recognized. This endpoint ensures the action is linked to the specific
 * sub-account location.
 *
 * If the GHL API does not support programmatic action registration (varies by
 * GHL version), this function logs the event and the action will still be
 * available because it is defined at the app level in the Developer Portal.
 */
async function registerCustomAction(locationId) {
  const token = await getValidToken(locationId);
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!appBaseUrl) {
    console.warn('[GHL] APP_BASE_URL not set — cannot register custom action endpoints.');
    return { registered: false, reason: 'APP_BASE_URL not configured' };
  }

  const actionPayload = {
    locationId,
    name: 'Create Lulu Print Job',
    key: 'create_lulu_print_job',
    description: 'Place a print order on Lulu.com directly from a GHL workflow. Select a product, set quantity and shipping speed. The contact\'s full shipping address is auto-resolved from GHL.',
    executionUrl: `${appBaseUrl}/workflow-action/create-print-job`,
    fields: [
      {
        name: 'product_name',
        type: 'select',
        reference: 'product_name',
        required: true,
        label: 'Select Product (Book)',
        description: 'Choose the book to print from your GHL product catalog.',
        optionType: 'internalReference',
        internalReferenceType: 'products',
      },
      {
        name: 'quantity',
        type: 'numeric',
        reference: 'quantity',
        required: true,
        label: 'Quantity',
      },
      {
        name: 'shipping_level',
        type: 'select',
        reference: 'shipping_level',
        required: true,
        label: 'Shipping Speed',
        options: [
          { label: 'Standard Mail (3-10 business days)', value: 'MAIL' },
          { label: 'Priority Mail (1-3 business days)', value: 'PRIORITY_MAIL' },
          { label: 'Ground (3-5 business days)', value: 'GROUND' },
          { label: 'Ground HD (2-4 business days)', value: 'GROUND_HD' },
          { label: 'Ground Business (3-5 business days)', value: 'GROUND_BUS' },
          { label: 'Expedited (2-3 business days)', value: 'EXPEDITED' },
          { label: 'Express (1-2 business days)', value: 'EXPRESS' }
        ]
      },
      {
        name: 'first_name',
        type: 'text',
        reference: 'first_name',
        required: true,
        label: 'Recipient First Name',
        description: 'Map to {{contact.firstName}}',
      },
      {
        name: 'last_name',
        type: 'text',
        reference: 'last_name',
        required: true,
        label: 'Recipient Last Name',
        description: 'Map to {{contact.lastName}}',
      },
      {
        name: 'email',
        type: 'text',
        reference: 'email',
        required: true,
        label: 'Recipient Email',
        description: 'Map to {{contact.email}}',
      },
      {
        name: 'phone',
        type: 'text',
        reference: 'phone',
        required: true,
        label: 'Recipient Phone',
        description: 'Map to {{contact.phone}}',
      },
      {
        name: 'street1',
        type: 'text',
        reference: 'street1',
        required: true,
        label: 'Street Address',
        description: 'Map to {{contact.address1}}',
      },
      {
        name: 'city',
        type: 'text',
        reference: 'city',
        required: true,
        label: 'City',
        description: 'Map to {{contact.city}}',
      },
      {
        name: 'state_code',
        type: 'text',
        reference: 'state_code',
        required: true,
        label: 'State Code',
        description: 'Map to {{contact.state}}',
      },
      {
        name: 'postal_code',
        type: 'text',
        reference: 'postal_code',
        required: true,
        label: 'Postal Code',
        description: 'Map to {{contact.postalCode}}',
      },
      {
        name: 'country_code',
        type: 'text',
        reference: 'country_code',
        required: true,
        label: 'Country Code',
        description: 'Map to {{contact.country}}',
      }
    ],
    outputVariables: [
      { key: 'jobId', label: 'Internal Print Job ID' },
      { key: 'luluPrintJobId', label: 'Lulu Print Job ID' },
      { key: 'status', label: 'Print Job Status' },
      { key: 'totalCost', label: 'Total Cost' },
      { key: 'printCost', label: 'Print Cost' },
      { key: 'shippingCost', label: 'Shipping Cost' },
      { key: 'markup', label: 'Markup' },
      { key: 'retailPrice', label: 'Retail Price' },
      { key: 'readerName', label: 'Reader Name' },
      { key: 'readerEmail', label: 'Reader Email' },
      { key: 'shippingStreet', label: 'Shipping Street' },
      { key: 'shippingCity', label: 'Shipping City' },
      { key: 'shippingState', label: 'Shipping State' },
      { key: 'shippingCountry', label: 'Shipping Country' },
      { key: 'shippingPostalCode', label: 'Shipping Postal Code' },
      { key: 'message', label: 'Result Message' }
    ]
  };

  try {
    const resp = await axios.post(
      `${GHL_BASE}/workflows/actions`,
      actionPayload,
      { headers: ghlHeaders(token) }
    );
    console.log(`[GHL] Custom action registered for location: ${locationId}`);
    return { registered: true, actionId: resp.data?.id };
  } catch (err) {
    if (err.response?.status === 409) {
      // Action already registered — this is fine
      console.log(`[GHL] Custom action already registered for location: ${locationId}`);
      return { registered: true, reason: 'Already exists' };
    }
    if (err.response?.status === 403 || err.response?.status === 404) {
      // GHL may not support this endpoint in all versions
      console.warn(`[GHL] Custom action API not available (${err.response.status}). Action is defined at app level in Developer Portal and will be available in all sub-accounts.`);
      return { registered: false, reason: `API ${err.response.status} — action available via Developer Portal config` };
    }
    console.warn(`[GHL] Custom action registration failed:`, err.response?.data || err.message);
    return { registered: false, reason: err.message };
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getValidToken,
  ghlHeaders,
  exchangeCodeForTokens,
  exchangeAgencyTokenForLocation,
  createProduct,
  getCustomValues,
  upsertCustomValue,
  getCustomValueByKey,
  createOpportunity,
  updateOpportunityStage,
  getOpportunity,
  injectCustomMenuLinks,
  writeOrderCustomFields,
  addTagsToContact,
  getContact,
  registerCustomAction,
  getPipelines,
};
