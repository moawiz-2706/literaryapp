import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLuluCredentials, saveLuluCredentials, deleteLuluCredentials, testLuluCredentials } from '../api';
import {
  colors, Button, Card, Alert, Spinner, Input, PageHeader, Badge
} from '../components/UI';

// ── Main Component ───────────────────────────────────────────────────────────

export default function LuluIntegrationPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');

  const [credentials, setCredentials] = useState({ clientId: '', clientSecret: '', environment: 'sandbox' });
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [connected, setConnected] = useState(false);

  // ── Load existing credentials ────────────────────────────────────────────
  const loadCredentials = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const resp = await getLuluCredentials(locationId);
      setSavedCredentials(resp.data.credentials || null);
      setConnected(resp.data.connected || false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { loadCredentials(); }, [loadCredentials]);

  // ── Save credentials ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      setError('Client ID and Client Secret are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    setTestResult(null);
    try {
      const resp = await saveLuluCredentials({
        locationId,
        clientId: credentials.clientId.trim(),
        clientSecret: credentials.clientSecret.trim(),
        environment: credentials.environment
      });
      setSavedCredentials(resp.data.credentials);
      setConnected(resp.data.connected);
      setSuccessMsg('Credentials saved successfully!');
      // Clear the secret field after saving
      setCredentials(prev => ({ ...prev, clientSecret: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Test connection ──────────────────────────────────────────────────────
  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const resp = await testLuluCredentials({
        locationId,
        clientId: credentials.clientId.trim() || savedCredentials?.client_id,
        clientSecret: credentials.clientSecret.trim() || null,
        environment: credentials.environment || savedCredentials?.environment
      });
      setTestResult(resp.data);
      setSuccessMsg('Connection test passed!');
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      setError('Connection test failed: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  // ── Remove credentials ───────────────────────────────────────────────────
  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your Lulu credentials? This will disconnect your Lulu account and stop all print-on-demand services.')) return;
    setSaving(true);
    setError(null);
    try {
      await deleteLuluCredentials(locationId);
      setSavedCredentials(null);
      setConnected(false);
      setSuccessMsg('Lulu credentials removed successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px', fontFamily: colors.fontFamily }}>
      <PageHeader
        title="Lulu Integration"
        subtitle="Connect your own Lulu.com account for print-on-demand fulfillment"
      />

      {/* ── Info Banner ─────────────────────────────────────────────────── */}
      <Alert variant="info" style={{ marginBottom: 24 }}>
        <strong>Why you need a Lulu.com account:</strong> This integration uses Lulu.com for print-on-demand book fulfillment.
        Each sub-account must connect their own Lulu account so that all print jobs, revenue, and shipping are managed under
        your personal Lulu account. This ensures complete separation between different locations.
      </Alert>

      {/* ── Setup Instructions ──────────────────────────────────────────── */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, color: colors.gray900 }}>Setup Instructions</h3>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 15, color: colors.gray700 }}>
            Step 1: Create a Lulu.com Account
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: colors.gray600 }}>
            If you don't already have one, create a free account at{' '}
            <a href="https://www.lulu.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>
              lulu.com
            </a>.
            This account will be used to receive your print jobs and manage fulfillment.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 15, color: colors.gray700 }}>
            Step 2: Register as a Lulu Developer
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: colors.gray600 }}>
            Go to{' '}
            <a href="https://developers.lulu.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>
              developers.lulu.com
            </a>{' '}
            and register your developer account. You'll need this to create an API application.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 15, color: colors.gray700 }}>
            Step 3: Create a Developer Application
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: colors.gray600 }}>
            In the Lulu Developer Portal, create a new application. You'll receive a{' '}
            <strong>Client ID</strong> and <strong>Client Secret</strong>.
            These credentials allow this app to submit print jobs to Lulu on your behalf.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 15, color: colors.gray700 }}>
            Step 4: Enter Your Credentials Below
          </h4>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: colors.gray600 }}>
            Copy your Client ID and Client Secret from the Lulu Developer Portal and paste them into the form below.
            Select whether you want to use the Lulu Sandbox (for testing) or Production (for live orders).
          </p>
        </div>

        <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, border: `1px solid ${colors.gray200}` }}>
          <p style={{ margin: 0, fontSize: 13, color: colors.gray600 }}>
            <strong>Documentation:</strong>{' '}
            <a href="https://developers.lulu.com/api-docs" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>
              Lulu API Documentation
            </a>{' '}
            |{' '}
            <a href="https://developers.lulu.com/guides" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>
              Getting Started Guide
            </a>
          </p>
        </div>
      </Card>

      {/* ── Error / Success Messages ─────────────────────────────────────── */}
      {error && <Alert variant="error" style={{ marginBottom: 16 }}>{error}</Alert>}
      {successMsg && <Alert variant="success" style={{ marginBottom: 16 }}>{successMsg}</Alert>}

      {/* ── Credentials Form ─────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, color: colors.gray900 }}>
          Lulu API Credentials
          {connected && (
            <Badge variant="success" style={{ marginLeft: 8 }}>Connected</Badge>
          )}
          {!connected && (
            <Badge variant="warning" style={{ marginLeft: 8 }}>Not Connected</Badge>
          )}
        </h3>

        {savedCredentials && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: colors.gray600 }}>
              <strong>Client ID:</strong> {savedCredentials.client_id ? savedCredentials.client_id.substring(0, 8) + '...' : 'N/A'}
            </p>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: colors.gray600 }}>
              <strong>Environment:</strong>{' '}
              <Badge variant={savedCredentials.environment === 'sandbox' ? 'info' : 'success'}>
                {savedCredentials.environment}
              </Badge>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: colors.gray600 }}>
              <strong>Connected since:</strong>{' '}
              {savedCredentials.connected_at ? new Date(savedCredentials.connected_at * 1000).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: colors.gray700 }}>
              Client ID
            </label>
            <Input
              value={credentials.clientId}
              onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="Enter your Lulu Client ID"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: colors.gray700 }}>
              Client Secret
            </label>
            <div style={{ position: 'relative' }}>
              <Input
                type={showSecret ? 'text' : 'password'}
                value={credentials.clientSecret}
                onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="Enter your Lulu Client Secret"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: colors.gray500, fontSize: 12
                }}
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: colors.gray700 }}>
              Environment
            </label>
            <select
              value={credentials.environment}
              onChange={(e) => setCredentials(prev => ({ ...prev, environment: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${colors.gray300}`,
                fontSize: 14, backgroundColor: colors.white, color: colors.gray900
              }}
            >
              <option value="sandbox">Sandbox (Testing)</option>
              <option value="production">Production (Live)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={14} /> : null} {saving ? 'Saving...' : 'Save Credentials'}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Spinner size={14} /> : null} {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          {savedCredentials && (
            <Button variant="danger" onClick={handleRemove} disabled={saving}>
              Remove Credentials
            </Button>
          )}
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}` }}>
            <p style={{ margin: 0, fontSize: 14, color: testResult.success ? '#166534' : '#991b1b' }}>
              {testResult.success
                ? `Connection successful! Token obtained for ${testResult.environment || credentials.environment}.`
                : `Connection failed: ${testResult.error || 'Unable to authenticate with Lulu.'}`
              }
            </p>
          </div>
        )}
      </Card>

      {/* ── Additional Notes ─────────────────────────────────────────────── */}
      <Card>
        <h3 style={{ margin: '0 0 12px', fontSize: 18, color: colors.gray900 }}>Important Notes</h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: colors.gray600 }}>
          <li>Your Lulu credentials are stored securely and encrypted. They are only used to authenticate with Lulu's API on your behalf.</li>
          <li>Each sub-account has its own isolated Lulu credentials. Other locations cannot access your Lulu account.</li>
          <li>Use the <strong>Sandbox</strong> environment for testing. Switch to <strong>Production</strong> when you're ready for live orders.</li>
          <li>If you change your credentials, all pending print jobs will use the new credentials.</li>
          <li>Removing your credentials will prevent new print jobs from being submitted to Lulu until new credentials are provided.</li>
        </ul>
      </Card>
    </div>
  );
}
