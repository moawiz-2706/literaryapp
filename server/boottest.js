/*
 * boottest.js — Verifies the server boots with ZERO SQL execution on startup,
 * against a legacy Supabase database that has none of the migration tables.
 *
 * Approach: prime the require cache for @supabase/supabase-js with a spy
 * client that returns "table not found" errors, then load the app and probe a
 * real HTTP route. Expect: the server starts and serves requests; the spy
 * sees NO calls during boot.
 */
process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'fake-key';
process.env.GHL_CLIENT_ID = 'fake';
process.env.GHL_CLIENT_SECRET = 'fake';
process.env.API_SECRET = 'fake';

// Prime the require cache for @supabase/supabase-js before the app loads.
const supaPath = require.resolve('@supabase/supabase-js');
const calls = [];

function makeSpyClient() {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    insert: () => chain,
    upsert: () => chain,
    update: () => chain,
    delete: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve, reject) =>
      Promise.resolve({ data: null, error: null }).then(resolve, reject),
  };
  const client = {
    from: (table) => {
      calls.push({ from: table });
      return chain;
    },
    rpc: () => chain,
  };
  return client;
}

require.cache[supaPath] = {
  id: supaPath,
  filename: supaPath,
  loaded: true,
  exports: { createClient: makeSpyClient },
};

const http = require('http');

async function main() {
  require('./index'); // loads routes and starts the server via app.listen

  // Let the async start() promise settle.
  await new Promise((r) => setTimeout(r, 2500));

  const bootCalls = calls.slice();
  console.log('');
  console.log('=== BOOT-TEST RESULT ===');
  console.log(
    bootCalls.length === 0
      ? 'PASS: zero SQL calls during startup (legacy schema)'
      : `FAIL: startup made ${bootCalls.length} SQL call(s):`
  );
  bootCalls.forEach((c) => console.log('  -', c.from));

  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('probe timed out')), 5000);
    const req = http.get('http://localhost:3001/print-jobs?locationId=test', (res) => {
      clearTimeout(timer);
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
  });
  console.log('GET /print-jobs?locationId=test ->', result, '(>0 = server is serving)');
  process.exit(result > 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('BOOT TEST FAILED:', e.message);
  process.exit(1);
});
