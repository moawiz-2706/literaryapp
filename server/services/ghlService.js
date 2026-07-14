'use strict';
/**
 * ghlService.js
 *
 * GoHighLevel API client for the LiteraryApp x Lulu integration.
 * Uses a single master Lulu account (credentials in server env vars).
 * No per-author Stripe Connect or per-author Lulu credentials.
 */

const axios = require('axios');
const db = require('../db/database');

const GHL_BASE = process.env.GHL_API_BASE || 'https://services.leadconnectorhq.com';
const GHL_AUTH = `${GHL_BASE}/oauth/token`;

function ghlHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28'
  };
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    client_id: process.env.GHL_CLIENT_ID,
    client_secret: process.env.GHL_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.APP_BASE_URL}/oauth/callback`,
    user_type: 'Company'
  });
  const resp = await axios.post(GHL_AUTH, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return resp.data;
}


async function refreshAccessToken(locationId) {
  const stored = await db.getGhlToken(locationId);
  if (!stored) throw new Error(`No token found for location ${locationId}`);
  const params = new URLSearchParams({
    client_id: process.env.GHL_CLIENT_ID,
    client_secret: process.env.GHL_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: stored.refresh_token
  });
  const resp = await axios.post(GHL_AUTH, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const { access_token, refresh_token, expires_in } = resp.data;
  await db.upsertGhlToken(locationId, stored.company_id, access_token, refresh_token, expires_in);
  return access_token;
}


async function getValidToken(locationId) {
  const stored = await db.getGhlToken(locationId);
  if (!stored) throw new Error(`Location ${locationId} has not installed the app`);
  if (stored.expires_at > Math.floor(Date.now() / 1000) + 60) return stored.access_token;
  return refreshAccessToken(locationId);
}

/**
 * Returns the stored token row for a location.
 * Used by walletService to obtain the sub-account token for wallet charges.
 */
async function getTokensForLocation(locationId) {
  return db.getGhlToken(locationId);
}

/**
 * Returns a valid (refreshed if needed) access token for a location.
 * Exported so walletService can call it without duplicating refresh logic.
 */
async function refreshTokenIfNeeded(locationId, tokens) {
  if (tokens.expires_at > Math.floor(Date.now() / 1000) + 60) {
    return tokens.access_token;
  }
  return refreshAccessToken(locationId);
}

// ── App Install: Inject Custom Menu Links ─────────────────────────────────────

async function injectCustomMenuLinks(locationId) {
  const token = await getValidToken(locationId);
  const frontendBase = process.env.FRONTEND_BASE_URL;
  const links = [
    {
      name: 'Set Up On-Demand Printing',
      url: `${frontendBase}/book-setup?locationId=${locationId}`,
      icon: 'book',
      showInMenu: true,
      openInNewTab: false
    },
    {
      name: 'Print Quote Calculator',
      url: `${frontendBase}/quote-calculator?locationId=${locationId}`,
      icon: 'calculator',
      showInMenu: true,
      openInNewTab: false
    },
    {
      name: 'Royalty Dashboard',
      url: `${frontendBase}/royalty-dashboard?locationId=${locationId}`,
      icon: 'chart-bar',
      showInMenu: true,
      openInNewTab: false
    }
  ];
  for (const link of links) {
    try {
      await axios.post(
        `${GHL_BASE}/custom-menu-links/`,
        { ...link, locationId },
        { headers: ghlHeaders(token) }
      );
    } catch (err) {
      console.warn(`[GHL] Could not create menu link "${link.name}":`, err.response?.data?.message || err.message);
    }
  }
}

// ── Custom Fields: Write Book Data Back to GHL ────────────────────────────────
// Spec requires numbered fields: book_title_1, pod_package_id_1, etc.

async function writeBookCustomFields(locationId, contactId, bookNumber, fieldData) {
  const token = await getValidToken(locationId);
  const n = bookNumber || 1;
  const customFields = [];
  if (fieldData.bookTitle !== undefined) {
    customFields.push({ key: `contact.book_title_${n}`, field_value: fieldData.bookTitle });
  }
  if (fieldData.podPackageId !== undefined) {
    customFields.push({ key: `contact.pod_package_id_${n}`, field_value: fieldData.podPackageId });
  }
  if (fieldData.interiorPdfUrl !== undefined) {
    customFields.push({ key: `contact.interior_pdf_url_${n}`, field_value: fieldData.interiorPdfUrl });
  }
  if (fieldData.coverPdfUrl !== undefined) {
    customFields.push({ key: `contact.cover_pdf_url_${n}`, field_value: fieldData.coverPdfUrl });
  }
  if (fieldData.bookStatus !== undefined) {
    customFields.push({ key: `contact.book_status_${n}`, field_value: fieldData.bookStatus });
  }
  if (fieldData.retailPrice !== undefined) {
    customFields.push({ key: `contact.retail_price_${n}`, field_value: String(fieldData.retailPrice) });
  }
  if (fieldData.printCost !== undefined) {
    customFields.push({ key: `contact.print_cost_${n}`, field_value: String(fieldData.printCost) });
  }
  if (fieldData.authorProfit !== undefined) {
    customFields.push({ key: `contact.author_profit_per_book_${n}`, field_value: String(fieldData.authorProfit) });
  }
  if (customFields.length === 0) return;
  await axios.put(
    `${GHL_BASE}/contacts/${contactId}`,
    { customFields },
    { headers: ghlHeaders(token) }
  );
}

// Write per-order tracking fields to a contact
async function writeOrderCustomFields(locationId, contactId, fieldData) {
  const token = await getValidToken(locationId);
  const customFields = [];
  if (fieldData.luluPrintJobId !== undefined) {
    customFields.push({ key: 'contact.lulu_print_job_id', field_value: fieldData.luluPrintJobId });
  }
  if (fieldData.orderTrackingNumber !== undefined) {
    customFields.push({ key: 'contact.order_tracking_number', field_value: fieldData.orderTrackingNumber });
  }
  if (fieldData.fulfillmentStatus !== undefined) {
    customFields.push({ key: 'contact.fulfillment_status', field_value: fieldData.fulfillmentStatus });
  }
  if (customFields.length === 0) return;
  await axios.put(
    `${GHL_BASE}/contacts/${contactId}`,
    { customFields },
    { headers: ghlHeaders(token) }
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────

async function createOrUpdateContact(locationId, contactData) {
  const token = await getValidToken(locationId);
  try {
    const searchResp = await axios.get(
      `${GHL_BASE}/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(contactData.email)}`,
      { headers: ghlHeaders(token) }
    );
    const existing = searchResp.data?.contact;
    if (existing) {
      await axios.put(
        `${GHL_BASE}/contacts/${existing.id}`,
        { ...contactData, locationId },
        { headers: ghlHeaders(token) }
      );
      return existing;
    }
  } catch (_) { /* no existing contact, create new */ }

  const resp = await axios.post(
    `${GHL_BASE}/contacts/`,
    { ...contactData, locationId },
    { headers: ghlHeaders(token) }
  );
  return resp.data.contact;
}

async function addTagsToContact(locationId, contactId, tags) {
  const token = await getValidToken(locationId);
  await axios.post(
    `${GHL_BASE}/contacts/${contactId}/tags`,
    { tags },
    { headers: ghlHeaders(token) }
  );
}

// ── Opportunities / Pipeline ──────────────────────────────────────────────────

async function createOpportunity(locationId, opportunityData) {
  const token = await getValidToken(locationId);
  const resp = await axios.post(
    `${GHL_BASE}/opportunities/`,
    {
      locationId,
      name: opportunityData.name,
      pipelineId: opportunityData.pipelineId || process.env.GHL_PIPELINE_ID,
      pipelineStageId: opportunityData.stageId || process.env.GHL_STAGE_ORDER_RECEIVED,
      contactId: opportunityData.contactId,
      status: 'open',
      monetaryValue: opportunityData.monetaryValue || 0
    },
    { headers: ghlHeaders(token) }
  );
  return resp.data.opportunity;
}

async function updateOpportunityStage(locationId, opportunityId, stageId) {
  const token = await getValidToken(locationId);
  await axios.put(
    `${GHL_BASE}/opportunities/${opportunityId}`,
    { pipelineStageId: stageId },
    { headers: ghlHeaders(token) }
  );
}

// ── GHL Products ──────────────────────────────────────────────────────────────
// Lulu metadata is embedded in the product description so the middleware
// can read it back when the GHL order webhook fires.

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
  const resp = await axios.post(
    `${GHL_BASE}/products/`,
    {
      locationId,
      name: bookData.title,
      description: `${bookData.description || ''}\n\n<!--LULU_META:${luluMeta}:LULU_META-->`,
      productType: 'PHYSICAL',
      availableInStore: true,
      variants: [{
        name: 'Standard',
        price: bookData.retailPrice,
        sku: `BOOK-${bookData.bookId}`,
        available: true,
        options: []
      }]
    },
    { headers: ghlHeaders(token) }
  );
  return resp.data;
}

// ── Custom Values ─────────────────────────────────────────────────────────────

async function getCustomValues(locationId) {
  const token = await getValidToken(locationId);
  const resp = await axios.get(
    `${GHL_BASE}/locations/${locationId}/customValues`,
    { headers: ghlHeaders(token) }
  );
  return resp.data.customValues || [];
}

async function upsertCustomValue(locationId, key, value) {
  const token = await getValidToken(locationId);
  const existing = await getCustomValues(locationId);
  const found = existing.find(cv => cv.fieldKey === key || cv.name === key);
  if (found) {
    await axios.put(
      `${GHL_BASE}/locations/${locationId}/customValues/${found.id}`,
      { value },
      { headers: ghlHeaders(token) }
    );
  } else {
    await axios.post(
      `${GHL_BASE}/locations/${locationId}/customValues`,
      { name: key, fieldKey: key, value },
      { headers: ghlHeaders(token) }
    );
  }
}

async function getCustomValueByKey(locationId, key) {
  const all = await getCustomValues(locationId);
  return all.find(cv => cv.fieldKey === key || cv.name === key) || null;
}

// ── Location Info ─────────────────────────────────────────────────────────────

async function getLocationInfo(locationId) {
  const token = await getValidToken(locationId);
  const resp = await axios.get(
    `${GHL_BASE}/locations/${locationId}`,
    { headers: ghlHeaders(token) }
  );
  return resp.data.location;
}

// ── Payments (GHL native) ─────────────────────────────────────────────────────

async function getPaymentsSummary(locationId) {
  const token = await getValidToken(locationId);
  try {
    const resp = await axios.get(
      `${GHL_BASE}/payments/orders?locationId=${locationId}&limit=100`,
      { headers: ghlHeaders(token) }
    );
    return resp.data;
  } catch (err) {
    console.warn('[GHL] Could not fetch payments:', err.message);
    return { orders: [] };
  }
}

module.exports = {
  exchangeCodeForTokens,
  refreshAccessToken,
  getValidToken,
  getTokensForLocation,
  refreshTokenIfNeeded,
  injectCustomMenuLinks,
  writeBookCustomFields,
  writeOrderCustomFields,
  createOrUpdateContact,
  addTagsToContact,
  createOpportunity,
  updateOpportunityStage,
  createProduct,
  getCustomValues,
  upsertCustomValue,
  getCustomValueByKey,
  getLocationInfo,
  getPaymentsSummary
};
