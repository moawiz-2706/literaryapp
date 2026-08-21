process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'trigger-smoketest-key';

const assert = require('assert');
const lulu = require('./services/luluService');
const trigger = require('./services/ghlTriggerService');

const shippedStatus = {
  name: 'SHIPPED',
  changed: '2026-08-21T12:34:56.000Z',
  line_item_statuses: [{
    line_item_id: 57999,
    name: 'SHIPPED',
    messages: {
      tracking_id: 'tracking-123',
      tracking_urls: ['https://tracking.example/123'],
      carrier_name: 'USPS',
    },
  }],
};

const statusTracking = lulu.extractTracking({ status: shippedStatus });
assert.strictEqual(statusTracking.length, 1);
assert.strictEqual(statusTracking[0].id, 'tracking-123');
assert.strictEqual(statusTracking[0].url, 'https://tracking.example/123');
assert.strictEqual(statusTracking[0].carrier, 'USPS');
assert.strictEqual(statusTracking[0].lineItemId, 57999);

const detailTracking = lulu.extractTracking({
  line_items: [{
    id: 57999,
    status: { messages: shippedStatus.line_item_statuses[0].messages },
  }],
});
assert.strictEqual(detailTracking.length, 1);
assert.strictEqual(detailTracking[0].id, 'tracking-123');

const payload = trigger.buildPayload({
  id: 'local-job',
  location_id: 'location-1',
  contact_id: 'contact-1',
  reader_name: 'Jane Doe',
  book_title: 'Example Book',
  lulu_print_job_id: '42776',
  quantity: 1,
  shipping_level: 'MAIL',
}, statusTracking, shippedStatus.changed);

assert.strictEqual(payload.event, 'LULU_PRINT_JOB_SHIPPED');
assert.strictEqual(payload.status, 'SHIPPED');
assert.strictEqual(payload.contactName, 'Jane Doe');
assert.strictEqual(payload.firstName, 'Jane');
assert.strictEqual(payload.trackingId, 'tracking-123');
assert.strictEqual(payload.trackingUrl, 'https://tracking.example/123');
assert.strictEqual(payload.carrierName, 'USPS');
assert.strictEqual(trigger.filterMatches([{ field: 'status', operator: '==', value: 'SHIPPED' }], payload), true);
assert.strictEqual(trigger.filterMatches([{ field: 'status', operator: '==', value: 'DELIVERED' }], payload), false);

console.log('PASS trigger smoke tests');
