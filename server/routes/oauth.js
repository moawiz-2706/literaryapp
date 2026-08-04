'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const ghl = require('../services/ghlService');

// ── GHL OAuth Callback ────────────────────────────────────────────────────────
// GHL redirects here after the agency admin or sub-account installs the app.
//
// GHL Marketplace App install flow:
//   1. Agency installs -> GHL returns userType: "Company", no locationId
//      The agency token is stored keyed by companyId.
//      Individual sub-account tokens are obtained later via the INSTALL webhook.
//   2. Sub-account installs directly -> GHL returns userType: "Location" with locationId
//      The location token is stored and menu links are injected immediately.

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2 style="color:#dc2626;">Installation Failed</h2>
        <p>No authorization code received from GoHighLevel.</p>
        <p>Please try installing the app again from the GHL Marketplace.</p>
      </body></html>
    `);
  }

  try {
    // 1. Exchange code for tokens
    const tokenData = await ghl.exchangeCodeForTokens(code);
    const { access_token, refresh_token, expires_in, locationId, companyId, userType } = tokenData;

    console.log('[OAuth] Token exchange success', { userType, companyId, locationId });

    if (userType === 'Company') {
      // ── Agency-level install ──────────────────────────────────────────────
      // Store the company token keyed by companyId.
      // Individual location tokens will arrive via the INSTALL webhook below.
      if (!companyId) {
        throw new Error('GHL returned userType Company but no companyId');
      }
      // expiresAt is a unix timestamp in seconds. expires_in is seconds from now.
      const expiresAt = Math.floor(Date.now() / 1000) + (expires_in || 86400);
      // upsertGhlToken(locationId, accessToken, refreshToken, expiresAt, userType)
      // For Company tokens, locationId = companyId (matches reference app pattern)
      await db.upsertGhlToken(companyId, access_token, refresh_token, expiresAt, 'Company');
      console.log(`[OAuth] Agency token stored for companyId: ${companyId}`);

      return res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
          <div style="max-width:420px;margin:0 auto;">
            <div style="width:64px;height:64px;background:#16a34a;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style="color:#16a34a;margin-bottom:8px;">App Installed Successfully</h2>
            <p style="color:#6b7280;">The LiteraryApp Print Integration has been connected to your GoHighLevel agency account.</p>
            <p style="color:#6b7280;font-size:14px;">Sub-accounts will receive access automatically. You can now close this window.</p>
          </div>
        </body></html>
      `);

    } else {
      // ── Sub-account (Location) install ────────────────────────────────────
      // GHL returned a Location token directly. Store it and inject menu links.
      if (!locationId) {
        throw new Error('GHL returned userType Location but no locationId');
      }
      const expiresAt = Math.floor(Date.now() / 1000) + (expires_in || 86400);
      await db.upsertGhlToken(locationId, access_token, refresh_token, expiresAt, 'Location');
      console.log(`[OAuth] Location token stored for locationId: ${locationId}`);

      // Inject custom menu links into the sub-account
      try {
        await ghl.injectCustomMenuLinks(locationId);
        console.log(`[OAuth] Custom menu links injected for location: ${locationId}`);
      } catch (menuErr) {
        console.warn(`[OAuth] Menu link injection warning for ${locationId}:`, menuErr.message);
      }

      // Register the "Create Lulu Print Job" custom workflow action
      // This makes the action available in the workflow builder for this sub-account.
      try {
        const actionResult = await ghl.registerCustomAction(locationId);
        if (actionResult.registered) {
          console.log(`[OAuth] Custom workflow action registered for location: ${locationId}`);
        } else {
          console.warn(`[OAuth] Custom action registration skipped for ${locationId}: ${actionResult.reason}`);
        }
      } catch (actionErr) {
        console.warn(`[OAuth] Custom action registration error for ${locationId}:`, actionErr.message);
      }

      // Register Lulu webhook for this location
      // Note: Webhook registration requires valid Lulu credentials. If the sub-account
      // hasn't configured their Lulu integration yet, this will be deferred to when
      // they save their credentials via the Lulu Integration settings page.
      try {
        const creds = await db.getLuluCredentials(locationId);
        if (creds) {
          const lulu = require('../services/luluService');
          const webhookUrl = `${process.env.APP_BASE_URL}/webhooks/lulu?locationId=${locationId}`;
          await lulu.registerWebhook(webhookUrl, locationId);
          console.log(`[OAuth] Lulu webhook registered for location: ${locationId}`);
        } else {
          console.log(`[OAuth] Skipping Lulu webhook registration for ${locationId} - credentials not yet configured. Will register when credentials are saved.`);
        }
      } catch (webhookErr) {
        console.warn(`[OAuth] Lulu webhook registration warning:`, webhookErr.message);
      }

      // Redirect author to the Book Setup Portal
      const frontendUrl = `${process.env.FRONTEND_BASE_URL}/book-setup?locationId=${locationId}&installed=true`;
      return res.redirect(frontendUrl);
    }

  } catch (err) {
    console.error('[OAuth] Error during app installation:', err.response?.data || err.message);
    return res.status(500).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2 style="color:#dc2626;">Installation Failed</h2>
        <p>There was an error connecting to GoHighLevel.</p>
        <p style="color:#6b7280;font-size:14px;">${err.message}</p>
        <p>Please try installing the app again.</p>
      </body></html>
    `);
  }
});

// ── GHL App Install / Uninstall Webhook ───────────────────────────────────────
// GHL sends a POST to this endpoint when a sub-account installs or uninstalls
// the app after the agency has already completed the OAuth flow above.
// This is how individual location tokens are obtained for bulk-install scenarios.

router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[OAuth Webhook] Received:', JSON.stringify(payload));

    if (payload.type === 'INSTALL' && payload.locationId) {
      const { locationId, companyId } = payload;

      if (!companyId || !locationId) {
        return res.status(400).json({ error: 'Missing companyId or locationId' });
      }

      // Retrieve the stored agency (Company) token
      const agencyToken = await db.getGhlToken(companyId);
      if (!agencyToken) {
        console.error(`[OAuth Webhook] No agency token found for companyId: ${companyId}`);
        return res.status(500).json({ error: 'Agency token not found. Complete agency OAuth first.' });
      }

      // Exchange agency token for a location-scoped token
      // Matches reference app: POST /oauth/locationToken with companyId + locationId
      try {
        const locationToken = await ghl.exchangeAgencyTokenForLocation(agencyToken.access_token, companyId, locationId);
        const locExpiresAt = Math.floor(Date.now() / 1000) + (locationToken.expires_in || 86400);
        await db.upsertGhlToken(locationId, locationToken.access_token, locationToken.refresh_token, locExpiresAt, 'Location');
        console.log(`[OAuth Webhook] Location token stored for: ${locationId}`);

        // Inject menu links for this location
        try {
          await ghl.injectCustomMenuLinks(locationId);
        } catch (menuErr) {
          console.warn(`[OAuth Webhook] Menu link injection warning for ${locationId}:`, menuErr.message);
        }

        // Register the "Create Lulu Print Job" custom workflow action
        try {
          const actionResult = await ghl.registerCustomAction(locationId);
          if (actionResult.registered) {
            console.log(`[OAuth Webhook] Custom workflow action registered for: ${locationId}`);
          } else {
            console.warn(`[OAuth Webhook] Custom action registration skipped for ${locationId}: ${actionResult.reason}`);
          }
        } catch (actionErr) {
          console.warn(`[OAuth Webhook] Custom action registration error for ${locationId}:`, actionErr.message);
        }

        // Register Lulu webhook (only if credentials are configured)
        try {
          const creds = await db.getLuluCredentials(locationId);
          if (creds) {
            const lulu = require('../services/luluService');
            const webhookUrl = `${process.env.APP_BASE_URL}/webhooks/lulu?locationId=${locationId}`;
            await lulu.registerWebhook(webhookUrl, locationId);
            console.log(`[OAuth Webhook] Lulu webhook registered for ${locationId}`);
          } else {
            console.log(`[OAuth Webhook] Skipping Lulu webhook for ${locationId} - credentials not yet configured.`);
          }
        } catch (webhookErr) {
          console.warn(`[OAuth Webhook] Lulu webhook warning:`, webhookErr.message);
        }

      } catch (tokenErr) {
        console.error(`[OAuth Webhook] Location token exchange failed for ${locationId}:`, tokenErr.message);
        return res.status(500).json({ error: tokenErr.message });
      }

    } else if (payload.type === 'UNINSTALL' && payload.locationId) {
      await db.deleteGhlToken(payload.locationId);
      console.log(`[OAuth Webhook] App uninstalled for location: ${payload.locationId}`);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[OAuth Webhook] Error:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
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
