'use strict';
/**
 * index.js
 *
 * LiteraryApp x Lulu Print-on-Demand Middleware
 * Per-subaccount Lulu integration. Payment handled directly by Lulu.com.
 * Custom GHL Workflow Action for print job creation and Marketplace Trigger delivery.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow GHL iFrame embedding and the Vercel frontend
const allowedOrigins = [
  'https://app.gohighlevel.com',
  'https://app.leadconnectorhq.com',
  'https://crm.gohighlevel.com',
  'https://services.leadconnectorhq.com',
  process.env.FRONTEND_BASE_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some(o => origin.startsWith(o)) ||
      origin.includes('vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('gohighlevel.com') ||
      origin.includes('leadconnectorhq.com')
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

// ── Raw Body Capture (required for webhook HMAC verification) ─────────────────
// Must run before express.json() for the webhook routes.
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks/')) {
    // Guard: a request that has no readable stream (tests, or already-consumed
    // bodies) cannot supply raw body bytes. Express's body parser will still
    // attempt to read it later, so mark parsing as done to avoid the second pass.
    const readable = typeof req.read === 'function' || typeof req.pipe === 'function';
    if (!readable || req._rawBodyPrepared) {
      // Already-buffered input: the caller set req.body directly (e.g. tests)
      req.rawBody = req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : '';
      req._rawBodyPrepared = true;
      next();
      return;
    }
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch (_) { req.body = {}; }
      next();
    });
    req.on('error', () => next());
  } else {
    next();
  }
});

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('combined'));

// ── Installation Validation ───────────────────────────────────────────────────
// Centralized app-installation check: every data route below requires the
// Literary App to be installed for the locationId on the request. The OAuth
// flow (/oauth) and inbound webhooks (/webhooks) are deliberately exempt —
// they ARE the install/uninstall mechanism and server-to-server callbacks.
const { requireInstalled } = require('./middleware/installStatus');

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/oauth', require('./routes/oauth'));
// GHL sends INSTALL/UNINSTALL events to /oauth/webhook
// This is registered separately in the GHL Developer Portal as the App Webhook URL
app.use('/books', requireInstalled, require('./routes/books'));
app.use('/print-jobs', requireInstalled, require('./routes/printJobs'));
app.use('/webhooks', require('./routes/webhooks'));
// GHL Marketplace Workflow Trigger subscription lifecycle (CREATED/UPDATED/DELETED).
// This is intentionally outside requireInstalled because GHL sends the location and
// workflow identifiers in the subscription payload itself.
app.use('/workflow-trigger', require('./routes/workflowTrigger'));
app.use('/quotes', requireInstalled, require('./routes/quotes'));
app.use('/workflow-action', requireInstalled, require('./routes/workflowAction'));
app.use('/preview', requireInstalled, require('./routes/preview'));
app.use('/samples', requireInstalled, require('./routes/samples'));
app.use('/lulu-integration', requireInstalled, require('./routes/luluIntegration'));
app.use('/pipelines', requireInstalled, require('./routes/pipelines'));
app.use('/', requireInstalled, require('./routes/dashboard'));

// ── Serve React Build in Production ──────────────────────────────────────────
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error for', req?.method, req?.originalUrl || req?.url, ':', err.message, '\n', (err.stack || '').split('\n').slice(0, 8).join('\n'));
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await initDatabase();
  // NOTE: Database migrations are NEVER executed at runtime. The schema is
  // applied manually, once, in the Supabase SQL Editor using the single
  // consolidated script at server/db/production_schema.sql. No exec-sql edge
  // function is required. See README.md → Database Migrations.
  app.listen(PORT, () => {
    console.log(`[Server] LiteraryApp x Lulu Middleware running on port ${PORT}`);
    console.log(`[Server] Architecture: Per-subaccount Lulu integration`);
    console.log(`[Server] Lulu mode: ${process.env.LULU_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUCTION'}`);
    console.log(`[Server] Frontend: ${process.env.FRONTEND_BASE_URL || 'not set'}`);
    console.log(`[Server] Workflow Action URL: ${process.env.APP_BASE_URL || 'not set'}/workflow-action/create-print-job`);
  });
}

start().catch(err => {
  console.error('[Server] Fatal startup error:', err.message);
  process.exit(1);
});

module.exports = app;
