import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  colors, Button, Card, Badge, Spinner, PageHeader, EmptyState,
  Input, Select, Alert, Tabs, ProgressBar, Skeleton, statusBadge,
} from '../components/UI';
import { useToast } from '../components/UI';
import {
  getLuluCredentials, saveLuluCredentials, deleteLuluCredentials, testLuluCredentials,
  fetchHealth, fetchAnalytics,
} from '../api';

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'lulu', label: 'Lulu API' },
    { key: 'health', label: 'System Health' },
    { key: 'audit', label: 'Audit Log' },
  ];

  if (!locationId) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <EmptyState title="No Location Selected" description="Please access this page from your GHL sub-account." icon="🔒" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="Settings" subtitle="Configure your app and view system status" />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'general' && <GeneralSettings locationId={locationId} />}
      {activeTab === 'lulu' && <LuluSettings locationId={locationId} />}
      {activeTab === 'health' && <SystemHealth locationId={locationId} />}
      {activeTab === 'audit' && <AuditLog locationId={locationId} />}
    </div>
  );
}

// ── General Settings ──────────────────────────────────────────────────────────

function GeneralSettings({ locationId }) {
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Location</h3>
        <div style={{ fontSize: 13, color: colors.gray600, fontFamily: 'monospace', background: colors.gray50, padding: '8px 12px', borderRadius: 6 }}>
          {locationId}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>App Information</h3>
        <div style={{ fontSize: 13, lineHeight: 2, color: colors.gray600 }}>
          <div><strong>LiteraryApp v2.0</strong> — Print-on-Demand Manager</div>
          <div>Platform: GoHighLevel Integration</div>
          <div>Print Provider: Lulu.com</div>
          <div>Environment: {import.meta.env.MODE || 'production'}</div>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/dashboard?locationId=${locationId}`)}>
            View Dashboard
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/orders?locationId=${locationId}`)}>
            View Orders
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/analytics?locationId=${locationId}`)}>
            View Analytics
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Lulu Settings ─────────────────────────────────────────────────────────────

function LuluSettings({ locationId }) {
  const toast = useToast();
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

  const handleSave = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      setError('Client ID and Client Secret are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await saveLuluCredentials({
        locationId,
        clientId: credentials.clientId.trim(),
        clientSecret: credentials.clientSecret.trim(),
        environment: credentials.environment,
      });
      setSuccessMsg('Credentials saved successfully');
      toast?.addToast('Lulu credentials saved', 'success');
      loadCredentials();
    } catch (err) {
      setError(err.message);
      toast?.addToast('Failed to save credentials', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!credentials.clientId.trim() || !credentials.clientSecret.trim()) {
      setError('Client ID and Client Secret are required.');
      return;
    }
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const resp = await testLuluCredentials({
        clientId: credentials.clientId.trim(),
        clientSecret: credentials.clientSecret.trim(),
        environment: credentials.environment,
      });
      setTestResult(resp.data);
      toast?.addToast('Lulu API connection test successful', 'success');
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      toast?.addToast('Lulu API connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the Lulu API credentials for this location?')) return;
    try {
      await deleteLuluCredentials(locationId);
      setSavedCredentials(null);
      setConnected(false);
      setSuccessMsg('Credentials deleted');
      toast?.addToast('Lulu credentials deleted', 'success');
    } catch (err) {
      setError(err.message);
      toast?.addToast('Failed to delete credentials', 'error');
    }
  };

  if (loading) return <Card><Skeleton height={200} /></Card>;

  return (
    <div>
      {error && <Alert variant="error" title="Error" style={{ marginBottom: 16 }}>{error}</Alert>}
      {successMsg && <Alert variant="success" title="Success" style={{ marginBottom: 16 }}>{successMsg}</Alert>}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Lulu API Credentials</h3>
          <Badge variant={connected ? 'success' : 'default'} dot>
            {connected ? 'Connected' : 'Not Connected'}
          </Badge>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.gray700, marginBottom: 6 }}>
              Client ID
            </label>
            <Input
              value={credentials.clientId}
              onChange={e => setCredentials(p => ({ ...p, clientId: e.target.value }))}
              placeholder="Enter your Lulu Client ID"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.gray700, marginBottom: 6 }}>
              Client Secret
            </label>
            <div style={{ position: 'relative' }}>
              <Input
                value={credentials.clientSecret}
                onChange={e => setCredentials(p => ({ ...p, clientSecret: e.target.value }))}
                type={showSecret ? 'text' : 'password'}
                placeholder="Enter your Lulu Client Secret"
                style={{ marginBottom: 0, paddingRight: 40 }}
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: colors.gray500, fontSize: 12,
                }}
                type="button"
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.gray700, marginBottom: 6 }}>
              Environment
            </label>
            <Select
              value={credentials.environment}
              onChange={e => setCredentials(p => ({ ...p, environment: e.target.value }))}
              style={{ marginBottom: 0 }}
            >
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </Select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={14} /> : 'Save Credentials'}
          </Button>
          <Button variant="secondary" onClick={handleTest} disabled={testing}>
            {testing ? <Spinner size={14} /> : 'Test Connection'}
          </Button>
          {savedCredentials && (
            <Button variant="outline" onClick={handleDelete} style={{ color: colors.error }}>
              Delete
            </Button>
          )}
        </div>
      </Card>

      {testResult && (
        <Card>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Test Result</h4>
          {testResult.success ? (
            <Alert variant="success" title="Connection successful">
              <div style={{ fontSize: 13 }}>OAuth token obtained successfully. Your Lulu API credentials are valid.</div>
            </Alert>
          ) : (
            <Alert variant="error" title="Connection failed">
              <div style={{ fontSize: 13 }}>{testResult.error || 'Unable to connect to Lulu API.'}</div>
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
}

// ── System Health ─────────────────────────────────────────────────────────────

function SystemHealth({ locationId }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    const check = async () => {
      setLoading(true);
      try {
        const resp = await fetchHealth(locationId);
        setHealth(resp.data);
        setLastCheck(new Date());
      } catch (err) {
        console.error('Health check failed:', err);
        // Set a fallback health object so the UI doesn't break
        setHealth({
          status: 'degraded',
          checks: {
            database: { status: 'error', message: 'Unable to reach health endpoint' },
            ghl: { status: 'error', message: 'Unable to reach health endpoint' },
            lulu: { status: 'warning', message: 'Unable to reach health endpoint' },
          },
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [locationId]);

  if (loading && !health) {
    return <Card><Skeleton height={200} /></Card>;
  }

  const checks = health?.checks || {};
  const dbStatus = checks.database?.status === 'ok' ? 'success' : 'error';
  const ghlStatus = checks.ghl?.status === 'ok' ? 'success' : checks.ghl?.status === 'warning' ? 'warning' : 'error';
  const luluStatus = checks.lulu?.status === 'ok' ? 'success' : 'warning';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Database</h3>
            <Badge variant={dbStatus} dot>{checks.database?.status || 'unknown'}</Badge>
          </div>
          <p style={{ fontSize: 13, color: colors.gray500, margin: 0 }}>
            {checks.database?.message || 'Database status unknown.'}
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>GHL Token</h3>
            <Badge variant={ghlStatus} dot>{ghlStatus === 'success' ? 'Valid' : ghlStatus === 'warning' ? 'Expired' : 'Missing'}</Badge>
          </div>
          <p style={{ fontSize: 13, color: colors.gray500, margin: 0 }}>
            {checks.ghl?.message || 'GHL token status unknown.'}
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Lulu API</h3>
            <Badge variant={luluStatus} dot>{luluStatus === 'success' ? 'Connected' : 'Not Connected'}</Badge>
          </div>
          <p style={{ fontSize: 13, color: colors.gray500, margin: 0 }}>
            {checks.lulu?.message || 'Lulu status unknown.'}
          </p>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Overall System Status</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge
              variant={(dbStatus === 'success' && ghlStatus === 'success' && luluStatus === 'success') ? 'success' : 'warning'}
              dot
            >
              {(dbStatus === 'success' && ghlStatus === 'success' && luluStatus === 'success') ? 'All Systems Operational' : 'Degraded'}
            </Badge>
            <span style={{ fontSize: 12, color: colors.gray500 }}>
              Last checked: {lastCheck ? lastCheck.toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </div>
        <ProgressBar
          value={[dbStatus === 'success', ghlStatus === 'success', luluStatus === 'success'].filter(Boolean).length}
          max={3}
          color={dbStatus === 'success' && ghlStatus === 'success' && luluStatus === 'success' ? colors.success : colors.warning}
          height={8}
          label="System Health Score"
        />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Environment</h3>
          <Badge variant="info">{health?.environment || 'development'}</Badge>
        </div>
        <div style={{ fontSize: 13, color: colors.gray600 }}>
          <div>Lulu Mode: {health?.luluMode || 'unknown'}</div>
          <div>Version: {health?.version || 'unknown'}</div>
          <div>Checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}</div>
        </div>
      </Card>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

function AuditLog({ locationId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetchAnalytics(locationId);
        setActivities(resp.data?.activity || []);
      } catch (err) {
        console.error('Audit log error:', err);
        // Don't show error UI — just show empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [locationId]);

  if (loading) {
    return <Card><Skeleton height={200} /></Card>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <EmptyState title="No audit entries" description="Activity will be logged here as orders are processed and status updates occur." icon="📋" />
      </Card>
    );
  }

  // Group by date
  const grouped = {};
  for (const a of activities) {
    const ts = typeof a.timestamp === 'number' ? a.timestamp * 1000 : a.timestamp;
    const date = new Date(ts).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push({ ...a, _ts: ts });
  }

  return (
    <Card>
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Activity Log</h3>
      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12, color: colors.gray500, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4,
              borderBottom: `1px solid ${colors.gray200}`,
            }}>
              {date}
            </div>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${colors.gray100}` }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: item.type === 'status_update' ? colors.primaryLight : colors.successLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {item.type === 'status_update' ? '↻' : '✓'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: colors.gray800 }}>{item.title}</div>
                  {item.description && <div style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>{item.description}</div>}
                  <div style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>
                    {new Date(item._ts).toLocaleTimeString()}
                    {item.metadata?.jobId && <span> · Job: {item.metadata.jobId.slice(0, 8)}</span>}
                  </div>
                </div>
                <Badge variant={item.type === 'status_update' ? 'info' : 'success'} size="sm">
                  {item.type === 'status_update' ? 'Status' : 'Created'}
                </Badge>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
