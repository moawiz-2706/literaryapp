'use strict';
const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const db = require('../db/database');

// ── Create Stripe Connect Onboarding Link ─────────────────────────────────────
// Called from the Book Setup Portal when the author clicks "Connect Stripe Account"

router.post('/connect', async (req, res) => {
  const { locationId, authorEmail } = req.body;
  if (!locationId || !authorEmail) {
    return res.status(400).json({ error: 'locationId and authorEmail are required' });
  }

  try {
    const frontendBase = process.env.FRONTEND_BASE_URL;
    const returnUrl = `${frontendBase}/book-setup?locationId=${locationId}&stripe_return=true`;
    const refreshUrl = `${frontendBase}/book-setup?locationId=${locationId}&stripe_refresh=true`;

    const { url, accountId } = await stripeService.createConnectAccountLink(
      locationId,
      authorEmail,
      returnUrl,
      refreshUrl
    );

    res.json({ url, accountId });
  } catch (err) {
    console.error('[Stripe] Connect link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Check Stripe Account Status ───────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const status = await stripeService.checkAccountStatus(locationId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create PaymentIntent for a Book Order ─────────────────────────────────────
// Called before submitting a print job when Stripe Connect is the payment method.

router.post('/payment-intent', async (req, res) => {
  const { locationId, amountCents, applicationFeeCents, metadata } = req.body;
  if (!locationId || !amountCents) {
    return res.status(400).json({ error: 'locationId and amountCents are required' });
  }

  try {
    const paymentIntent = await stripeService.createDestinationCharge({
      locationId,
      amountCents: parseInt(amountCents),
      applicationFeeCents: parseInt(applicationFeeCents || 0),
      metadata: metadata || {}
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error('[Stripe] PaymentIntent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
