const axios = require('axios');
const db = require('../db/database');
const triggerDb = require('../db/triggerDb');

const SHIPPED_TRIGGER_KEY = 'lulu_print_job_shipped';
const SHIPPED_EVENT_NAME = 'LULU_PRINT_JOB_SHIPPED';
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

function filterMatches(filters, payload) {
  for (const filter of (Array.isArray(filters) ? filters : [])) {
    const field = filter.field || filter.id;
    const expected = filter.value;
    if (!field || expected === undefined || expected === null || expected === '') continue;

    const actual = payload[field];
    const operator = filter.operator || '==';
    if (operator === '!=' && String(actual) === String(expected)) return false;
    if (operator !== '!=' && String(actual) !== String(expected)) return false;
  }
  return true;
}

function buildPayload(job, tracking, changedAt) {
  const address = getShippingAddress(job);
  const contactName = String(job.reader_name || address.name || '').trim();
  const nameParts = contactName.split(/\s+/).filter(Boolean);
  const firstName = String(address.first_name || nameParts[0] || '').trim();
  const lastName = String(address.last_name || nameParts.slice(1).join(' ')).trim();
  const trackingItems = Array.isArray(tracking) ? tracking : [];
  const trackingIds = trackingItems.map(item => item?.id).filter(Boolean).map(String);
  const trackingUrls = trackingItems.map(item => item?.url).filter(Boolean).map(String);
  const carrierNames = trackingItems.map(item => item?.carrier).filter(Boolean).map(String);

  return {
    event: SHIPPED_EVENT_NAME,
    triggerKey: SHIPPED_TRIGGER_KEY,
    status: 'SHIPPED',
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
    quantity: job.quantity || 1,
    shippingLevel: job.shipping_level || null,
  };
}

async function deliverOnce(subscription, delivery, payload) {
  const attemptCount = Number(delivery.attempt_count || 0) + 1;
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
        'X-LiteraryApp-Event': SHIPPED_EVENT_NAME,
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

async function deliverWithRetry(subscription, delivery, payload) {
  let current = delivery;
  for (let attempt = 0; attempt < MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    const result = await deliverOnce(subscription, current, payload);
    if (result.delivered) return result;
    if (attempt < MAX_DELIVERY_ATTEMPTS - 1) {
      await sleep(500 * (2 ** attempt));
      current = { ...current, attempt_count: Number(current.attempt_count || 0) + 1 };
    }
  }
  return { delivered: false };
}

async function emitPrintJobShipped({ jobId, locationId, tracking = [], changedAt }) {
  const job = await db.getPrintJobById(jobId);
  if (!job) {
    console.warn(`[GHL Trigger] Cannot emit SHIPPED event; job ${jobId} was not found.`);
    return { emitted: false, reason: 'job_not_found' };
  }

  // Samples use the canonical order service but are not customer orders.
  if (job.contact_id === 'sample' || !job.contact_id) {
    return { emitted: false, reason: 'non_customer_order' };
  }

  const resolvedLocationId = locationId || job.location_id;
  const payload = buildPayload({ ...job, location_id: resolvedLocationId }, tracking, changedAt);
  const subscriptions = await triggerDb.getActiveSubscriptions(resolvedLocationId, SHIPPED_TRIGGER_KEY);
  if (subscriptions.length === 0) {
    return { emitted: false, reason: 'no_active_subscriptions', payload };
  }

  const eventKey = [job.id, 'SHIPPED', changedAt || job.updated_at || 'unknown'].join('|');
  const results = [];

  for (const subscription of subscriptions) {
    if (!filterMatches(subscription.filters, payload)) {
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

    const result = await deliverWithRetry(subscription, delivery, payload);
    results.push({ subscriptionId: subscription.id, ...result });
  }

  return { emitted: true, eventKey, payload, results };
}

module.exports = {
  SHIPPED_TRIGGER_KEY,
  SHIPPED_EVENT_NAME,
  buildPayload,
  filterMatches,
  emitPrintJobShipped,
};
