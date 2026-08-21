import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAppInstallStatus } from '../api';
import { colors, Spinner } from './UI';

/**
 * AppInstalledGate — centralized app-installation validation.
 *
 * Used by every Literary App page. Before any page functionality is rendered,
 * this component:
 *   1. Reads the subaccount/location ID from the URL query parameters
 *      (?locationId=...).
 *   2. Checks the backend to determine whether the Literary App is installed
 *      for that subaccount.
 *   3. If installed -> renders the page (children) normally.
 *   4. If not installed -> blocks the page and shows a clear error message.
 *
 * Rendered states:
 *   - No locationId in the URL       -> embedding instructions
 *   - Checking with the backend      -> loading spinner
 *   - Backend check failed           -> error with Retry
 *   - App not installed for account  -> clear "not installed" message
 *   - App installed                  -> the actual page content
 */

const GATE_STYLES = {
  wrapper: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    fontFamily: colors.fontFamily,
    background: colors.gray50,
  },
  card: {
    maxWidth: 480,
    width: '100%',
    background: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: 12,
    padding: '40px 32px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  icon: { fontSize: 48, marginBottom: 16, opacity: 0.5 },
  heading: { margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: colors.gray800 },
  text: { margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: colors.gray500, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' },
  mono: {
    padding: '2px 6px',
    background: colors.gray100,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12,
    wordBreak: 'break-all',
  },
  button: {
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: colors.white,
    background: colors.primary,
    border: 'none',
    borderRadius: colors.radius,
    cursor: 'pointer',
  },
};

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - The page content to render once
 *   installation is confirmed.
 * @param {string} [props.appName] - Optional label of the app shown in messages
 *   (defaults to "Literary App").
 */
export default function AppInstalledGate({ children, appName = 'Literary App' }) {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId') || '';

  const [status, setStatus] = useState('checking'); // checking | installed | notInstalled | error
  const [errorMsg, setErrorMsg] = useState(null);

  async function checkInstallation() {
    if (!locationId) {
      setStatus('checking');
      return;
    }
    setStatus('checking');
    setErrorMsg(null);
    try {
      const result = await getAppInstallStatus(locationId);
      setStatus(result.installed ? 'installed' : 'notInstalled');
    } catch (err) {
      // A backend failure must not silently fall through to the page —
      // show an explicit error state with a Retry action.
      setStatus('error');
      setErrorMsg(err?.message || 'Unable to verify installation status.');
    }
  }

  useEffect(() => {
    if (locationId) {
      checkInstallation();
    }
    // Re-check whenever the URL locationId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // ── No locationId in the URL ────────────────────────────────────────────
  if (!locationId) {
    return (
      <div style={GATE_STYLES.wrapper}>
        <div style={GATE_STYLES.card}>
          <div style={GATE_STYLES.icon}>🔗</div>
          <h2 style={GATE_STYLES.heading}>No Account Selected</h2>
          <p style={GATE_STYLES.text}>
            This application is designed to be embedded inside your account
            menu. To use it, add it as a Custom Menu Link with the{' '}
            <code style={GATE_STYLES.mono}>?locationId=YOUR_LOCATION_ID</code>{' '}
            parameter so the app knows which account opened it.
          </p>
          <div style={{ background: colors.gray50, border: `1px solid ${colors.gray200}`, borderRadius: 8, padding: 12, textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: colors.gray700, marginBottom: 4 }}>Example URL:</p>
            <code style={{ ...GATE_STYLES.mono, fontSize: 11 }}>
              {window.location.origin}/book-setup?locationId=abc123xyz
            </code>
          </div>
        </div>
      </div>
    );
  }

  // ── Checking installation status ───────────────────────────────────────
  if (status === 'checking') {
    return (
      <div style={GATE_STYLES.wrapper}>
        <div style={{ textAlign: 'center' }}>
          <Spinner size={32} />
          <p style={{ marginTop: 16, fontSize: 14, color: colors.gray500 }}>
            Verifying {appName} installation...
          </p>
        </div>
      </div>
    );
  }

  // ── Backend check failed ───────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={GATE_STYLES.wrapper}>
        <div style={GATE_STYLES.card}>
          <div style={GATE_STYLES.icon}>⚠️</div>
          <h2 style={{ ...GATE_STYLES.heading, color: colors.error }}>Connection Error</h2>
          <p style={GATE_STYLES.text}>
            We were unable to contact the backend to verify whether {appName} is
            installed for this account.
          </p>
          {errorMsg ? <p style={{ ...GATE_STYLES.text, marginBottom: 20, fontSize: 12 }}>{errorMsg}</p> : null}
          <button type="button" style={GATE_STYLES.button} onClick={checkInstallation}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── App not installed for this subaccount ──────────────────────────────
  if (status === 'notInstalled') {
    return (
      <div style={GATE_STYLES.wrapper}>
        <div style={GATE_STYLES.card}>
          <div style={GATE_STYLES.icon}>🚫</div>
          <h2 style={{ ...GATE_STYLES.heading, color: colors.error }}>
            App Not Installed
          </h2>
          <p style={GATE_STYLES.text}>
            The {appName} is not installed for this account (
            <code style={GATE_STYLES.mono}>{locationId}</code>).
          </p>
          <p style={GATE_STYLES.text}>
            Please install the {appName} for this subaccount first. Once the
            installation is complete, reload this page and your content will
            appear automatically.
          </p>
          <button type="button" style={{ ...GATE_STYLES.button, background: colors.gray600 }} onClick={checkInstallation}>
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // ── Installed — render the actual page ─────────────────────────────────
  return children;
}
