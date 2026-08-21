'use strict';
/**
 * orderService.js
 *
 * The SINGLE canonical entry point for placing an order with Lulu.
 *
 * All call sites — the GHL workflow action, the legacy /print endpoint,
 * sample orders, and future direct-API submissions — route through
 * placeOrder(). This eliminates the four duplicated create paths and gives
 * the whole system one idempotency and validation contract.
 *
 * Contract
 * --------
 * placeOrder(params) where params:
 *   locationId        {string}   GHL sub-account id                    (req)
 *   book              {object}   books row: id, title, pod_package_id,
 *                                page_count, interior_pdf_url,
 *                                cover_pdf_url, retail_price, status     (req)
 *   quantity          {number}   1..1000                                 (req)
 *   shippingLevel     {string}   MAIL | PRIORITY_MAIL | GROUND | GROUND_HD |
 *                                GROUND_BUS | EXPEDITED | EXPRESS          (req)
 *   shippingAddress   {object}   name, street1, city, state_code,
 *                                postcode, country_code, phone_number,
 *                                email                                     (req)
 *   readerEmail       {string}   Lulu contact_email (falls back to
 *                                shippingAddress.email)                    (req)
 *   readerName        {string}                                               (opt)
 *   retailPrice       {number}   book retail price                         (req)
 *   contactId         {string}                                               (opt)
 *   workflowId        {string}                                               (opt)
 *   executionId       {string}                                               (opt)
 *   parentJobId       {string}   for reorder/sample child jobs               (opt)
 *   source            {string}   'workflow' | 'api' | 'sample' | 'reorder'
 *
 * Returns:
 *   {
 *     jobId,
 *     luluPrintJobId,
 *     idempotent: boolean,        true when the existing row was returned
 *     job,                        print_jobs row
 *     luluJob,                    raw Lulu create response (if new)
 *     costs: { ... }
 *   }
 *
 * Idempotency: the idempotency key is derived from
 *   {locationId, bookId, contactId, quantity, shippingAddress fingerprint,
 *    shippingLevel} so retries or duplicate GHL executions can never create
 *   two Lulu jobs for one intended order. If a live Lulu job already exists
 *   for that key, it is returned as-is (with idempotent:true).
 *
 * Status recording: the first transition ('CREATED' → 'Sent to Print') is
 * written to print_job_status_history through statusService.recordTransition,
 * so every order starts its timeline from a real data row instead of a
 * fabricated "Submitted" marker.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db/database');
const statusDb = require('../db/statusDb');
const lulu = require('./luluService');
const statusService = require('./statusService');

const VALID_SHIPPING_LEVELS = [
  'MAIL', 'PRIORITY_MAIL', 'GROUND', 'GROUND_HD', 'GROUND_BUS',
  'EXPEDITED', 'EXPRESS'
];

function deriveIdempotencyKey(params) {
  const addr = params.shippingAddress || {};
  const keyData = [
    params.locationId,
    params.book?.id,
    params.contactId || '',
    String(params.quantity || 1),
    String(params.shippingLevel || 'MAIL'),
    (addr.street1 || '').toLowerCase().trim(),
    (addr.city || '').toLowerCase().trim(),
    (addr.state_code || addr.state || '').toUpperCase().trim(),
    String(addr.postcode || addr.zip || '').toUpperCase().trim(),
    (addr.country_code || addr.country || 'US').toUpperCase().trim(),
  ].join('|');
  return crypto.createHash('sha256').update(keyData).digest('hex').slice(0, 40);
}

function validateParams(params) {
  const errors = [];

  if (!params.locationId) errors.push('locationId is required');
  if (!params.book) errors.push('book is required');
  else {
    if (!params.book.pod_package_id) errors.push('book.pod_package_id is required — validate the book in Lulu Integration first');
    if (!params.book.interior_pdf_url) errors.push('book.interior_pdf_url is required');
    if (!params.book.cover_pdf_url) errors.push('book.cover_pdf_url is required');
    if (!params.book.page_count) errors.push('book.page_count is required');
  }
  if (!params.quantity || params.quantity < 1 || params.quantity > 1000) {
    errors.push('quantity must be between 1 and 1000');
  }
  if (!params.shippingLevel) errors.push('shippingLevel is required');
  else if (!VALID_SHIPPING_LEVELS.includes(params.shippingLevel)) {
    errors.push(`shippingLevel must be one of: ${VALID_SHIPPING_LEVELS.join(', ')}`);
  }
  if (!params.readerEmail) errors.push('readerEmail is required — Lulu sends shipping notifications to it');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.readerEmail || '')) {
    errors.push('readerEmail is not a valid email address');
  }
  if (!params.shippingAddress) errors.push('shippingAddress is required');
  else {
    const a = params.shippingAddress;
    if (!a.name) errors.push('shippingAddress.name is required');
    if (!a.street1) errors.push('shippingAddress.street1 is required');
    if (!a.city) errors.push('shippingAddress.city is required');
    if (!a.postcode && !a.zip) errors.push('shippingAddress.postcode is required');
    if (!a.phone_number && !a.phone) errors.push('shippingAddress.phone_number is required');
    if (!a.email) errors.push('shippingAddress.email is required');
  }

  if (errors.length > 0) {
    const err = new Error(errors.join('; '));
    err.validationErrors = errors;
    throw err;
  }
}

async function placeOrder(params) {
  validateParams(params);

  // Ensure a normalized address with explicit email/phone for Lulu.
  const addr = {
    name: params.shippingAddress.name,
    street1: params.shippingAddress.street1,
    street2: params.shippingAddress.street2,
    city: params.shippingAddress.city,
    state_code: params.shippingAddress.state_code || params.shippingAddress.state || '',
    country_code: (params.shippingAddress.country_code || params.shippingAddress.country || 'US').toUpperCase(),
    postcode: params.shippingAddress.postcode || params.shippingAddress.zip || '',
    phone_number: params.shippingAddress.phone_number || params.shippingAddress.phone,
    email: params.shippingAddress.email,
  };

  const idempotencyKey = params.idempotencyKey || deriveIdempotencyKey(params);

  // ── Idempotency: return the existing order if one exists ────────────────────
  const existing = await statusDb.getPrintJobByIdempotencyKey(params.locationId, idempotencyKey);
  if (existing) {
    return {
      jobId: existing.id,
      luluPrintJobId: existing.lulu_print_job_id,
      idempotent: true,
      job: existing,
      luluJob: null,
      costs: {
        printCost: existing.print_cost || 0,
        shippingCost: existing.shipping_cost || 0,
        fulfillmentFee: existing.fulfillment_fee || 0,
        totalCost: (existing.print_cost || 0) + (existing.shipping_cost || 0) + (existing.fulfillment_fee || 0),
      },
    };
  }

  // ── Lulu cost calculation ───────────────────────────────────────────────────
  const costData = await lulu.calculatePrintCost(
    params.book.pod_package_id,
    params.book.page_count,
    params.shippingLevel,
    addr,
    params.quantity,
    params.locationId
  );

  const printCost = parseFloat(costData.unitPrintCost);
  const shippingCost = parseFloat(costData.shippingCost);
  const fulfillmentFee = parseFloat(costData.fulfillmentFee);
  const retailPrice = parseFloat(params.retailPrice || 0);
  const markup = Math.max(0, retailPrice - printCost - shippingCost - fulfillmentFee);

  // ── Persist the order FIRST (status: Pending) ───────────────────────────────
  const jobId = params.jobId || uuidv4();
  const job = await db.createPrintJob({
    id: jobId,
    locationId: params.locationId,
    contactId: params.contactId || '',
    bookId: params.book.id,
    status: 'Pending',
    retailPrice,
    printCost,
    shippingCost,
    fulfillmentFee,
    markup,
    agencyFee: 0,
    walletChargeId: null,
    readerName: params.readerName || addr.name,
    readerEmail: params.readerEmail,
    bookTitle: params.book.title,
    podPackageId: params.book.pod_package_id,
    interiorPdfUrl: params.book.interior_pdf_url,
    coverPdfUrl: params.book.cover_pdf_url,
    shippingAddress: addr,
    shippingLevel: params.shippingLevel,
    quantity: params.quantity,
    workflowId: params.workflowId || null,
    executionId: params.executionId || null,
    parentJobId: params.parentJobId || null,
    idempotencyKey,
    estimatedShippingDates: costData.estimatedShippingDates,
    luluCosts: {
      warnings: costData.warnings,
      suggestedAddress: costData.suggestedAddress,
      fees: costData.fees,
      discounts: costData.discounts,
      currency: costData.currency,
      totalCostExclTax: costData.totalCostExclTax,
      totalTax: costData.totalTax,
    },
  });

  // ── Submit to Lulu ──────────────────────────────────────────────────────────
  let luluResult;
  try {
    luluResult = await lulu.createPrintJob({
      locationId: params.locationId,
      orderId: jobId,
      bookTitle: params.book.title,
      podPackageId: params.book.pod_package_id,
      pageCount: params.book.page_count,
      interiorPdfUrl: params.book.interior_pdf_url,
      coverPdfUrl: params.book.cover_pdf_url,
      shippingAddress: addr,
      shippingLevel: params.shippingLevel,
      quantity: params.quantity,
      readerEmail: params.readerEmail,
    });
  } catch (luluErr) {
    await db.updatePrintJob(jobId, {
      status: 'Failed',
      luluErrorDetail: String(luluErr.message).slice(0, 2000),
      luluStatus: null,
    });
    await statusService.recordTransition({
      jobId,
      locationId: params.locationId,
      luluStatus: null,
      localStatus: 'Failed',
      message: `Lulu submission failed: ${String(luluErr.message).slice(0, 500)}`,
      source: 'error',
    });
    throw luluErr;
  }

  // ── Mark live + record the CREATED transition ───────────────────────────────
  await db.updatePrintJob(jobId, {
    status: 'Sent to Print',
    luluStatus: 'CREATED',
    luluPrintJobId: luluResult.id,
    estimatedShippingDates: luluResult.estimated_shipping_dates || job.estimated_shipping_dates,
  });

  await statusService.recordTransition({
    jobId,
    locationId: params.locationId,
    luluStatus: 'CREATED',
    localStatus: 'Sent to Print',
    message: 'Order submitted to Lulu.com',
    changedAt: luluResult.created || new Date().toISOString(),
    source: 'created',
  });

  const refreshed = await db.getPrintJobById(jobId);

  return {
    jobId,
    luluPrintJobId: luluResult.id,
    idempotent: false,
    job: refreshed,
    luluJob: luluResult,
    costs: {
      printCost,
      shippingCost,
      fulfillmentFee,
      extraFees: costData.extraFees || 0,
      totalCost: printCost + shippingCost + fulfillmentFee + (costData.extraFees || 0),
      warnings: costData.warnings || [],
      suggestedAddress: costData.suggestedAddress || null,
      estimatedShippingDates: luluResult.estimated_shipping_dates || costData.estimatedShippingDates,
    },
  };
}

/**
 * Reorder an existing order: creates a child job reusing the original line
 * item's printable_id. Same idempotency and history rules as placeOrder.
 */
async function reorderOrder(params) {
  if (!params.luluPrintJobId) throw new Error('luluPrintJobId is required to reorder');
  if (!params.locationId) throw new Error('locationId is required to reorder');

  const idempotencyKey = params.idempotencyKey || `${deriveIdempotencyKey(params)}:reorder`;
  const existing = await statusDb.getPrintJobByIdempotencyKey(params.locationId, idempotencyKey);
  if (existing) {
    return { jobId: existing.id, luluPrintJobId: existing.lulu_print_job_id, idempotent: true, job: existing, luluJob: null };
  }

  const luluResult = await lulu.reorderPrintJob(params.luluPrintJobId, params.locationId, {
    quantity: params.quantity,
    shippingLevel: params.shippingLevel,
    shippingAddress: params.shippingAddress,
    externalId: params.parentJobId ? `literaryapp-reorder-${params.parentJobId}` : undefined,
  });

  // Build a child job row from the parent for audit + tracking continuity.
  const jobId = params.jobId || uuidv4();
  const parent = params.parentJob || await db.getPrintJobByLuluId(params.luluPrintJobId);

  const job = await db.createPrintJob({
    id: jobId,
    locationId: params.locationId,
    contactId: parent?.contact_id || params.contactId || '',
    bookId: parent?.book_id || params.bookId || null,
    status: 'Sent to Print',
    retailPrice: parent?.retail_price || 0,
    printCost: parent?.print_cost || 0,
    shippingCost: parent?.shipping_cost || 0,
    fulfillmentFee: parent?.fulfillment_fee || 0,
    markup: parent?.markup || 0,
    agencyFee: 0,
    walletChargeId: null,
    readerName: parent?.reader_name || '',
    readerEmail: parent?.reader_email || '',
    bookTitle: parent?.book_title || '',
    podPackageId: parent?.pod_package_id || '',
    interiorPdfUrl: parent?.interior_pdf_url || '',
    coverPdfUrl: parent?.cover_pdf_url || '',
    shippingAddress: params.shippingAddress || (parent ? JSON.parse(parent.shipping_address || '{}') : {}),
    shippingLevel: params.shippingLevel || parent?.shipping_level || 'MAIL',
    quantity: params.quantity || parent?.quantity || 1,
    parentJobId: parent?.id || null,
    idempotencyKey,
    luluPrintJobId: luluResult.id,
    luluStatus: 'CREATED',
  });

  await statusService.recordTransition({
    jobId,
    locationId: params.locationId,
    luluStatus: 'CREATED',
    localStatus: 'Sent to Print',
    message: `Reorder of print job ${params.luluPrintJobId}`,
    changedAt: luluResult.created || new Date().toISOString(),
    source: 'created',
  });

  return {
    jobId,
    luluPrintJobId: luluResult.id,
    idempotent: false,
    job,
    luluJob: luluResult,
    costs: null,
  };
}

module.exports = {
  placeOrder,
  reorderOrder,
  deriveIdempotencyKey,
  VALID_SHIPPING_LEVELS,
};
