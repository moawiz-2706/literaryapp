'use strict';
/**
 * luluIntegration.js
 *
 * Routes for managing per-subaccount Lulu.com API credentials.
 *
 * Endpoints:
 *   GET    /credentials      — Get current credentials status for a location
 *   POST   /credentials      — Save credentials for a location
 *   DELETE /credentials      — Remove credentials for a location
 *   POST   /test             — Test credentials without saving
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const lulu = require('../services/luluService');

// ── GET /credentials?locationId=... ──────────────────────────────────────────
// Returns the current credential status for a location.
// Does NOT return the actual secret — only metadata.

router.get('/credentials', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const creds = await db.getLuluCredentials(locationId);
    if (!creds) {
      return res.json({ connected: false, credentials: null });
    }

    // Return metadata only — never expose the secret
    return res.json({
      connected: true,
      credentials: {
        client_id: creds.client_id,
        environment: creds.environment,
        connected_at: creds.connected_at,
        updated_at: creds.updated_at
      }
    });
  } catch (err) {
    console.error('[LuluIntegration] GET credentials error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /credentials ────────────────────────────────────────────────────────
// Save Lulu credentials for a location.
// Body: { locationId, clientId, clientSecret, environment }

router.post('/credentials', async (req, res) => {
  const { locationId, clientId, clientSecret, environment } = req.body;

  if (!locationId) return res.status(400).json({ error: 'locationId required' });
  if (!clientId || !clientSecret) return res.status(400).json({ error: 'clientId and clientSecret are required' });

  try {
    // Test the credentials before saving
    const testResult = await lulu.testConnection(clientId, clientSecret, environment || 'sandbox');

    if (!testResult.success) {
      return res.status(400).json({
        error: `Lulu authentication failed: ${testResult.error}`,
        detail: 'Please verify your Client ID and Client Secret are correct.'
      });
    }

    // Save to database
    await db.upsertLuluCredentials(
      locationId,
      clientId,
      clientSecret,
      environment || 'sandbox'
    );

    console.log(`[LuluIntegration] Credentials saved for location: ${locationId}`);

    // Register Lulu webhook now that credentials are available
    try {
      const webhookUrl = `${process.env.APP_BASE_URL}/webhooks/lulu?locationId=${locationId}`;
      await lulu.registerWebhook(webhookUrl, locationId);
      console.log(`[LuluIntegration] Lulu webhook registered for location: ${locationId}`);
    } catch (webhookErr) {
      console.warn(`[LuluIntegration] Webhook registration warning:`, webhookErr.message);
    }

    return res.json({
      success: true,
      connected: true,
      credentials: {
        client_id: clientId,
        environment: environment || 'sandbox',
        connected_at: Math.floor(Date.now() / 1000)
      }
    });
  } catch (err) {
    console.error('[LuluIntegration] POST credentials error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /credentials?locationId=... ───────────────────────────────────────
// Remove credentials for a location.

router.delete('/credentials', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    await db.deleteLuluCredentials(locationId);
    console.log(`[LuluIntegration] Credentials removed for location: ${locationId}`);
    return res.json({ success: true, message: 'Lulu credentials removed' });
  } catch (err) {
    console.error('[LuluIntegration] DELETE credentials error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /test ────────────────────────────────────────────────────────────────
// Test Lulu credentials without saving.
// Body: { clientId, clientSecret, environment, locationId }

router.post('/test', async (req, res) => {
  const { clientId, clientSecret, environment, locationId } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret are required for testing' });
  }

  try {
    const result = await lulu.testConnection(clientId, clientSecret, environment || 'sandbox');

    if (result.success) {
      // Also save if locationId is provided (convenience — test and save)
      if (locationId) {
        try {
          await db.upsertLuluCredentials(locationId, clientId, clientSecret, environment || 'sandbox');
        } catch (_) {
          // Don't fail the test if save fails
        }
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('[LuluIntegration] POST test error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
