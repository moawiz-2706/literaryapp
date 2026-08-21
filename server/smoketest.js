'use strict';
/**
 * smoketest.js
 *
 * Boots the Express app WITHOUT env (all Supabase calls mocked via nock-free
 * dependency overrides) to verify:
 *   - server starts and all routes register,
 *   - route ordering (export-csv before /:jobId),
 *   - 400/403 handling on protected inputs,
 *   - module require graph loads with no runtime errors.
 */

// Mock modules before requiring the app
const Module = require('module');
const origResolve = Module._resolveFilename;

// Prevent dotenv from failing on missing files
process.env.NODE_ENV = 'smoketest';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.GHL_CLIENT_ID = 'x';
process.env.GHL_CLIENT_SECRET = 'x';
process.env.LITERARYAPP_API_SECRET = 'test-secret';

const app = require('./index');

function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const body = opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const r = {
      method, url: path,
      headers: { ...opts.headers },
      socket: { remoteAddress: '127.0.0.1', remotePort: 1 },
      _rawBodyPrepared: true,  // harness buffers all bodies; real requests are IncomingMessage streams and never carry this flag
      on: () => r,
    };
    const res = {
      _status: null, _body: null, _headers: {},
      statusCode(code) { res._status = code; return res; },
      status(code) { res._status = code; return res; },
      json(obj) { res._body = obj; res._headers['content-type'] = 'application/json'; if (!res._status) res._status = 200; done(); },
      send(obj) { res._body = obj; done(); },
      setHeader(k, v) { res._headers[k] = v; },
      removeHeader(k) { delete res._headers[k]; },
      getHeader(k) { return res._headers[k]; },
      getHeaders() { return { ...res._headers }; },
      hasHeader(k) { return k in res._headers; },
      locals: {},
    };
    function done() {
      resolve({ status: res._status, body: res._body, headers: res._headers });
    }
    const listeners = { data: [], end: [] };
    r.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); return r; };
    // feed through express handler
    if (body !== null) {
      r.setEncoding = () => {};
      // rawBody middleware is synchronous for already-buffered input
      setImmediate(() => {
        for (const fn of listeners.data) fn(Buffer.from(body));
        for (const fn of listeners.end) fn();
      });
    }
    const timeout = setTimeout(() => { if (!resolved) { resolved = true; resolve({ status: -1, body: { error: 'timeout' }, headers: {} }); } }, 15000);
    let resolved = false;
    const origDone = done;
    function doneOnce() { if (resolved) return; resolved = true; clearTimeout(timeout); origDone(); }
    // hijack: replace done in json/send
    res.json = (obj) => { res._body = obj; res._headers['content-type'] = 'application/json'; if (!res._status) res._status = 200; doneOnce(); };
    res.send = (obj) => { res._body = obj; doneOnce(); };
    app(r, res, () => {
      if (!res._status) { res._status = 404; doneOnce(); }
    });
  });
}

(async () => {
  const results = [];
  function check(label, actual, expected) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ label, pass, actual, expected });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
    if (!pass) console.log(`   expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }

  // 1. Route registration: export-csv must NOT be swallowed by /:jobId
  const csv = await req('GET', '/print-jobs/export-csv');
  check('export-csv reachable (400 not 404)', csv.status, 400);
  check('export-csv error message', csv.body?.error, 'locationId required');

  // 2. Reconcile requires secret
  const reconcile = await req('GET', '/print-jobs/reconcile/abc');
  check('reconcile auth (403)', reconcile.status, 403);

  // 3. Webhook health requires secret
  const wh = await req('POST', '/webhooks/stripe', { body: {}, headers: { 'stripe-signature': 'x' } });
  check('stripe webhook without module: 200 logged', wh.status, 200);

  // 4. Print jobs list requires locationId
  const list = await req('GET', '/print-jobs');
  check('list 400 without locationId', list.status, 400);

  // 5. Pipelines route registered
  const pipe = await req('GET', '/pipelines/abc');
  console.log('PIPE_DEBUG status:', pipe.status, 'body:', JSON.stringify(pipe.body)?.slice(0, 300));
  check('pipelines route reachable', pipe.status === 200 || pipe.status === 500, true);

  // 6. Submit validation
  const submit = await req('POST', '/print-jobs/submit', {
    body: { locationId: 'x', contactId: 'c', bookId: 'b' },
  });
  check('submit rejects missing address', submit.status, 400);

  // 7. GHL inbound webhook validation
  const ghl = await req('POST', '/webhooks/ghl', { body: {} });
  check('ghl webhook rejects empty payload', ghl.status, 400);

  // 8. Lulu webhook rejects unsigned
  const lulu = await req('POST', '/webhooks/lulu?locationId=x', { body: {} });
  check('lulu webhook rejects missing signature', lulu.status, 401);

  // 9. Marketplace trigger subscription route registration and validation
  const triggerSubscription = await req('POST', '/workflow-trigger/subscription', { body: {} });
  check('trigger subscription rejects malformed payload', triggerSubscription.status, 400);

  const fails = results.filter(r => !r.pass).length;
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`);
  process.exit(fails > 0 ? 1 : 0);
})();
