'use strict';
/**
 * index.js
 *
 * LiteraryApp x Lulu Print-on-Demand Middleware
 * Single master Lulu account. GHL Marketplace Wallet Charge for $10 service fee.
 * Custom GHL Workflow Action for print job creation.
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
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch (_) { req.body = {}; }
      next();
    });
  } else {
    next();
  }
});

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('combined'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/oauth', require('./routes/oauth'));
// GHL sends INSTALL/UNINSTALL events to /oauth/webhook
// This is registered separately in the GHL Developer Portal as the App Webhook URL
app.use('/books', require('./routes/books'));
app.use('/print-jobs', require('./routes/printJobs'));
app.use('/webhooks', require('./routes/webhooks'));
app.use('/quotes', require('./routes/quotes'));
app.use('/workflow-action', require('./routes/workflowAction'));
app.use('/', require('./routes/dashboard'));

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
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`[Server] LiteraryApp x Lulu Middleware running on port ${PORT}`);
    console.log(`[Server] Architecture: Single master Lulu account`);
    console.log(`[Server] Lulu mode: ${process.env.LULU_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUCTION'}`);
    console.log(`[Server] Service fee per order: $${process.env.AGENCY_SERVICE_FEE_PER_ORDER || '10.00'}`);
    console.log(`[Server] Frontend: ${process.env.FRONTEND_BASE_URL || 'not set'}`);
    console.log(`[Server] Workflow Action URL: ${process.env.APP_BASE_URL || 'not set'}/workflow-action/create-print-job`);
  });
}

start().catch(err => {
  console.error('[Server] Fatal startup error:', err.message);
  process.exit(1);
});

module.exports = app;
