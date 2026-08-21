'use strict';
/**
 * installStatus.js
 *
 * Centralized app-installation validation for the Literary App.
 *
 * The Literary App is considered "installed" for a subaccount/location when a
 * valid GHL OAuth token row exists in the `ghl_tokens` table for that
 * location_id. Rows are created by the OAuth callback / INSTALL webhook and
 * removed by the UNINSTALL webhook, so this table is the single source of
 * truth for installation state (same approach as the reference app).
 *
 * Exports:
 *  - isInstalled(locationId): boolean check (db-level).
 *  - requireInstalled: Express middleware that extracts locationId from
 *    req.query / req.params / req.body, checks installation, and returns
 *    HTTP 426 with a clear message when the app is not installed.
 *  - NOT_INSTALLED_MESSAGE: the canonical user-facing error string.
 */

const db = require('../db/database');

const NOT_INSTALLED_MESSAGE = 'The Literary App is not installed for this account.';

/**
 * Extract a locationId from a request, checking query, params, then body.
 */
function extractLocationId(req) {
  const fromQuery = (req.query && (req.query.locationId || req.query.location_id) || '').trim();
  if (fromQuery) return fromQuery;
  const fromParams = (req.params && req.params.locationId) || '';
  if (fromParams) return fromParams;
  const body = req.body || {};
  const fromBody = (body.locationId || body.location_id || '').trim();
  return fromBody;
}

/**
 * Check whether the Literary App is installed for the given locationId.
 * Installed = a GHL token row exists for that location.
 */
async function isInstalled(locationId) {
  if (!locationId || typeof locationId !== 'string' || !locationId.trim()) return false;
  try {
    const token = await db.getGhlToken(locationId.trim());
    return !!token;
  } catch (err) {
    // A DB outage should not be misread as "not installed". Log and treat as
    // an installation verification failure rather than a silent pass.
    console.error('[InstallStatus] getGhlToken failed for', locationId, ':', err.message);
    throw err;
  }
}

/**
 * Express middleware: requires the app to be installed for the location of
 * the current request.
 *
 * - If no locationId can be found on the request, passes through (downstream
 *   route handlers already return a 400 "locationId required" error for that
 *   case; keep that behavior unchanged).
 * - If the locationId is present but the app is not installed, responds with
 *   426 + the canonical message and halts the request.
 * - If the app is installed, or if the DB check unexpectedly fails, passes
 *   through so existing functionality is never broken by a transient DB error
 *   (a failed check never returns 426).
 */
function requireInstalled(req, res, next) {
  // System health checks are infrastructure endpoints, not account data.
  if (req.path === '/health' || req.path.endsWith('/health')) return next();

  const locationId = extractLocationId(req);
  if (!locationId) return next();

  isInstalled(locationId)
    .then(installed => {
      if (!installed) {
        console.warn(`[InstallStatus] App not installed for location: ${locationId} (${req.method} ${req.originalUrl})`);
        return res.status(426).json({
          error: NOT_INSTALLED_MESSAGE,
          installed: false,
          locationId
        });
      }
      next();
    })
    .catch(() => {
      // Transient DB error — do not block the request on an infrastructure
      // failure. The downstream handler will surface its own error if needed.
      next();
    });
}

module.exports = {
  extractLocationId,
  isInstalled,
  requireInstalled,
  NOT_INSTALLED_MESSAGE
};
