'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const ghl = require('../services/ghlService');

// ── GHL OAuth Callback ────────────────────────────────────────────────────────
// GHL redirects here after the agency admin installs the app.
// Flow: code -> tokens -> store -> inject menu links -> redirect to frontend

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    // 1. Exchange code for access + refresh tokens
    const tokenData = await ghl.exchangeCodeForTokens(code);
    const {
      access_token,
      refresh_token,
      expires_in,
      locationId,
      companyId,
      userType
    } = tokenData;

    if (!locationId) {
      return res.status(400).send('No locationId returned from GHL token exchange');
    }

    // 2. Store tokens in database
    await db.upsertGhlToken(locationId, companyId, access_token, refresh_token, expires_in, userType);
    console.log(`[OAuth] App installed for location: ${locationId}`);

    // 3. Inject the three custom menu links into the sub-account
    try {
      await ghl.injectCustomMenuLinks(locationId);
      console.log(`[OAuth] Custom menu links injected for location: ${locationId}`);
    } catch (menuErr) {
      console.warn(`[OAuth] Menu link injection warning for ${locationId}:`, menuErr.message);
    }

    // 4. Register Lulu webhook (once per install, idempotent)
    try {
      const lulu = require('../services/luluService');
      const webhookUrl = `${process.env.APP_BASE_URL}/webhooks/lulu?locationId=${locationId}`;
      await lulu.registerWebhook(webhookUrl);
      console.log(`[OAuth] Lulu webhook registered for location: ${locationId}`);
    } catch (webhookErr) {
      console.warn(`[OAuth] Lulu webhook registration warning:`, webhookErr.message);
    }

    // 5. Redirect author to the Book Setup Portal
    const frontendUrl = `${process.env.FRONTEND_BASE_URL}/book-setup?locationId=${locationId}&installed=true`;
    return res.redirect(frontendUrl);

  } catch (err) {
    console.error('[OAuth] Error during app installation:', err.response?.data || err.message);
    return res.status(500).send(`Installation failed: ${err.message}`);
  }
});

// ── App Status Check ──────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });
  const token = await db.getGhlToken(locationId);
  res.json({ installed: !!token, locationId });
});

module.exports = router;
