const axios = require('axios');
const db = require('../db/database');
const triggerDb = require('../db/triggerDb');

const SHIPPED_TRIGGER_KEY = 'lulu_print_job_shipped';
const SHIPPED_EVENT_NAME = 'LULU_PRINT_JOB_SHIPPED';
const STATUS_TRIGGER_KEY = 'lulu_print_job_status_changed';
const STATUS_EVENT_NAME = 'LULU_PRINT_JOB_STATUS_CHANGED';
const DELIVERY_TIMEOUT_MS = 8000;
const MAX_DELIVERY_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getShippingAddress(job) {
  if (!job?.shipping_address) return {};
  if (typeof job.shipping_address === 'object') return job.shipping_address;
  try {
    return JSON.parse(job.shipping_address);
  } catch (_) {
    return {};
  }
}

/**
 * HighLevel Internal Reference filters may arrive as a scalar ID, an array,
 * or an object containing an ID/name. Normalize all of those representations
 * before comparing them with the outgoing payload.
 */
function comparableValues(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(comparableValues);
  if (typeof value === 'object') {
    return [
      value.id,
      value._id,
      value.productId,
      value.product_id,
      value.value,
      value.name,
      value.title,
    ].flatMap(comparableValues);
  }
  return [String(value).trim()];
}

function filterMatches(filters, payload) {
  for (const filter of (Array.isArray(filters) ? filters : [])) {
    const field = filter.field || filter.reference || filter.id || filter.key;
    const expected = filter.value ?? filter.selectedValue ?? filter.values;
    if (!field || expected === undefined || expected === null || expected === '') continue;

    // Older Marketplace configurations used reference=bookTitle while loading
    // values from Global Products. Match both the exact title and the product
    // ID so those existing subscriptions continue to work after the payload
    // gains the explicit ghlProductId field.
    const actual = field === 'bookTitle'
      ? [payload.bookTitle, payload.ghlProductId]
      : payload[field];
    const operator = String(filter.operator || filter.condition || '==').toLowerCase();
    const expectedValues = comparableValues(expected);
    const actualValues = comparableValues(actual);
    const equal = expectedValues.some(expectedValue => actualValues.some(actualValue => (
      expectedValue === actualValue || expectedValue.toLowerCase() === actualValue.toLowerCase()
    )));

    if (operator === '!=' || operator === 'not_equal' || operator === 'not_equals') {
      if (equal) return false;
    } else if (operator === 'contains') {
      const contains = expectedValues.some(expectedValue => actualValues.some(actualValue => (
        actualValue.toLowerCase().includes(expectedValue.toLowerCase())
      )));
      if (!contains) return false;
    } else if (!equal) {
      return false;
    }
  }
  return true;
}

function buildPayload(job, tracking, changedAt, options = {}) {
  const address = getShippingAddress(job);
  const contactName = String(job.reader_name || address.name || '').trim();
  const nameParts = contactName.split(/\s+/).filter(Boolean);
  const firstName = String(address.first_name || nameParts[0] || '').trim();
  const lastName = String(address.last_name || nameParts.slice(1).join(' ')).trim();
  const trackingItems = Array.isArray(tracking) ? tracking : [];
  const trackingIds = trackingItems.map(item => item?.id).filter(Boolean).map(String);
  const trackingUrls = trackingItems.map(item => item?.url).filter(Boolean).map(String);
  const carrierNames = trackingItems.map(item => item?.carrier).filter(Boolean).map(String);
  const status = String(options.status || job.lulu_status || 'SHIPPED').toUpperCase();
  const triggerKey = options.triggerKey || SHIPPED_TRIGGER_KEY;
  const eventName = options.eventName || SHIPPED_EVENT_NAME;

  return {
    event: eventName,
    triggerKey,
    status,
    statusChangedAt: changedAt || new Date().toISOString(),
    locationId: job.location_id,
    contactId: job.contact_id || null,
    contactName,
    firstName,
    lastName,
    trackingId: trackingIds[0] || null,
    trackingIds,
    trackingUrl: trackingUrls[0] || null,
    trackingUrls,
    carrierName: carrierNames[0] || null,
    carrierNames,
    luluPrintJobId: job.lulu_print_job_id || null,
    internalPrintJobId: job.id,
    bookTitle: job.book_title || '',
    // This is the actual GHL Global Product ID created for the book.
    ghlProductId: job.ghl_product_id || null,
    quantity: job.quantity || 1,
    shippingLevel: job.shipping_level || null,
  };
}

async function enrichJobWithProduct(job) {
  if (!job || job.ghl_product_id || !job.book_id) return job;
  try {
    const book = await db.getBook(job.book_id);
    if (book?.ghl_product_id) {
      return { ...job, ghl_product_id: book.ghl_product_id };
    }
  } catch (error) {
    console.warn(`[GHL Trigger] Could not resolve Global Product ID for job ${job.id}:`, error.message);
  }
  return job;
}

async function deliverOnce(subscription, delivery, payload, eventName) {
  const claimed = await triggerDb.claimDelivery(delivery.id);
  if (!claimed) {
    return { delivered: false, skipped: true, reason: 'delivery_claimed_by_another_worker' };
  }

  const attemptCount = Number(claimed.attempt_count || 0) + 1;
  await triggerDb.updateDelivery(delivery.id, {
    status: 'sending',
    attempt_count: attemptCount,
    last_error: null,
  });

  try {
    const response = await axios.post(subscription.target_url, payload, {
      timeout: DELIVERY_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-LiteraryApp-Event': eventName,
      },
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HighLevel trigger endpoint returned HTTP ${response.status}`);
    }

    await triggerDb.updateDelivery(delivery.id, {
      status: 'delivered',
      response_status: response.status,
      delivered_at: new Date().toISOString(),
      last_error: null,
    });
    return { delivered: true, status: response.status };
  } catch (error) {
    await triggerDb.updateDelivery(delivery.id, {
      status: 'failed',
      response_status: error.response?.status || null,
      last_error: String(error.message).slice(0, 1000),
    }).catch(updateError => {
      console.warn('[GHL Trigger] Could not record failed delivery:', updateError.message);
    });
    return { delivered: false, error };
  }
}

async function deliverWithRetry(subscription, delivery, payload, eventName) {
  let current = delivery;
  for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    const result = await deliverOnce(subscription, current, payload, eventName);
    if (result.delivered) return result;
    if (attempt < MAX_DELIVERY_ATTEMPTS - 1) {
      await sleep(500 * (2 ** attempt));
      current = { ...current, attempt_count: Number(current.attempt_count || 0) + 1 };
    }
  }
  return { delivered: false };
}

function hasExplicitStatusFilter(filters, status) {
  return (Array.isArray(filters) ? filters : []).some(filter => {
    const field = filter?.field || filter?.reference || filter?.id || filter?.key;
    if (field !== 'status') return false;
    const expected = filter?.value ?? filter?.selectedValue ?? filter?.values;
    return comparableValues(expected).some(value => value.toUpperCase() === String(status || '').toUpperCase());
  });
}

async function emitForTrigger({ jobId, locationId, tracking = [], changedAt, status, triggerKey, eventName, requireExplicitStatusFilter = false }) {
  let job = await db.getPrintJobById(jobId);
  if (!job) {
    console.warn(`[GHL Trigger] Cannot emit ${eventName}; job ${jobId} was not found.`);
    return { emitted: false, reason: 'job_not_found' };
  }

  // Samples use the canonical order service but are not customer orders.
  if (job.contact_id === 'sample' || !job.contact_id) {
    return { emitted: false, reason: 'non_customer_order' };
  }

  job = await enrichJobWithProduct(job);
  const resolvedLocationId = locationId || job.location_id;
  const payload = buildPayload(
    { ...job, location_id: resolvedLocationId },
    tracking,
    changedAt,
    { status, triggerKey, eventName },
  );
  const subscriptions = await triggerDb.getActiveSubscriptions(resolvedLocationId, triggerKey);
  console.log(`[GHL Trigger] Job ${job.id}: found ${subscriptions.length} active ${triggerKey} subscription(s) for location ${resolvedLocationId}`);
  if (subscriptions.length === 0) {
    return { emitted: false, reason: 'no_active_subscriptions', payload };
  }

  const eventKey = [job.id, triggerKey, status, changedAt || job.updated_at || 'unknown'].join('|');
  const results = [];

  for (const subscription of subscriptions) {
    if (requireExplicitStatusFilter && status !== 'SHIPPED' && !hasExplicitStatusFilter(subscription.filters, status)) {
      console.warn(`[GHL Trigger] Job ${job.id}: legacy ${triggerKey} subscription ${subscription.id} skipped because a non-SHIPPED status requires an explicit status filter`);
      results.push({ subscriptionId: subscription.id, skipped: true, reason: 'legacy_status_filter_required' });
      continue;
    }
    if (!filterMatches(subscription.filters, payload)) {
      console.warn(`[GHL Trigger] Job ${job.id}: subscription ${subscription.id} skipped because filters did not match payload status=${payload.status} ghlProductId=${payload.ghlProductId || 'none'}`);
      results.push({ subscriptionId: subscription.id, skipped: true, reason: 'filter_mismatch' });
      continue;
    }

    const delivery = await triggerDb.ensureDelivery({
      subscriptionId: subscription.id,
      eventKey,
      payload,
    });

    if (!delivery) {
      results.push({ subscriptionId: subscription.id, delivered: false, reason: 'delivery_not_persisted' });
      continue;
    }
    if (delivery.status === 'delivered') {
      results.push({ subscriptionId: subscription.id, delivered: true, duplicate: true });
      continue;
    }

    const result = await deliverWithRetry(subscription, delivery, payload, eventName);
    if (result.delivered) {
      console.log(`[GHL Trigger] Job ${job.id}: delivered ${eventName} to subscription ${subscription.id} with HTTP ${result.status}`);
    } else {
      console.warn(`[GHL Trigger] Job ${job.id}: failed ${eventName} delivery to subscription ${subscription.id}`);
    }
    results.push({ subscriptionId: subscription.id, ...result });
  }

  return { emitted: true, eventKey, payload, results };
}

async function emitPrintJobShipped({ jobId, locationId, tracking = [], changedAt }) {
  return emitForTrigger({
    jobId,
    locationId,
    tracking,
    changedAt,
    status: 'SHIPPED',
    triggerKey: SHIPPED_TRIGGER_KEY,
    eventName: SHIPPED_EVENT_NAME,
  });
}

async function emitPrintJobStatusChanged({ jobId, locationId, luluStatus, tracking = [], changedAt }) {
  const status = String(luluStatus || '').trim().toUpperCase();
  if (!status) return { emitted: false, reason: 'missing_status' };
  const result = await emitForTrigger({
    jobId,
    locationId,
    tracking,
    changedAt,
    status,
    triggerKey: STATUS_TRIGGER_KEY,
    eventName: STATUS_EVENT_NAME,
  });

  // Backward compatibility for the already-published Marketplace trigger. A
  // workflow that was configured with the published `lulu_print_job_shipped`
  // key can receive another status only when it explicitly filters for that
  // status. SHIPPED itself is handled by emitPrintJobShipped below, so avoid
  // emitting it twice through this fallback path.
  if (status !== 'SHIPPED' && result.reason === 'no_active_subscriptions') {
    console.log(`[GHL Trigger] No active ${STATUS_TRIGGER_KEY} subscription for job ${jobId}; trying published ${SHIPPED_TRIGGER_KEY} compatibility path for status ${status}`);
    const legacyResult = await emitForTrigger({
      jobId,
      locationId,
      tracking,
      changedAt,
      status,
      triggerKey: SHIPPED_TRIGGER_KEY,
      eventName: SHIPPED_EVENT_NAME,
      requireExplicitStatusFilter: true,
    });
    return { ...legacyResult, compatibilityFallback: true, fallbackFrom: STATUS_TRIGGER_KEY };
  }
  return result;
}

module.exports = {
  SHIPPED_TRIGGER_KEY,
  SHIPPED_EVENT_NAME,
  STATUS_TRIGGER_KEY,
  STATUS_EVENT_NAME,
  buildPayload,
  filterMatches,
  hasExplicitStatusFilter,
  emitPrintJobShipped,
  emitPrintJobStatusChanged,
};
