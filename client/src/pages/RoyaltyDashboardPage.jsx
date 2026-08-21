import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  colors, Button, Card, Badge, Spinner, PageHeader, StatCard, EmptyState,
  Skeleton, CardSkeleton, statusBadge, DataTable, Tabs, ProgressBar,
} from '../components/UI';
import { useToast } from '../components/UI';
import { fetchAnalytics } from '../api';

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function RoyaltyDashboardPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');
  const toast = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchAnalytics(locationId);
      setData(resp.data);
      setLastSync(new Date());
    } catch (err) {
      const msg = err.message || 'Failed to load dashboard data';
      setError(msg);
      toast?.addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [locationId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (locationId && !loading) fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [locationId, loading, fetchData]);

  if (!locationId) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <EmptyState
          title="No Location Selected"
          description="Please access this page from your account to view your dashboard."
          icon="🔒"
        />
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Dashboard"
        subtitle={lastSync ? `Last synced: ${lastSync.toLocaleTimeString()}` : 'Overview of your print-on-demand business'}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {loading && <Spinner size={16} />}
            <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
              ↻ Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/orders?locationId=${locationId}`)}>
              View All Orders →
            </Button>
          </div>
        }
      />

      {error && !data && (
        <Card style={{ textAlign: 'center', padding: 48, marginBottom: 24 }}>
          <p style={{ color: colors.error, marginBottom: 16 }}>{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </Card>
      )}

      {/* ── Overview Tab ──────────────────────────────────────────────────── */}
      <div>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Total Books" value={summary.totalBooks || 0} sub={`${summary.readyBooks || 0} ready`} color={colors.primary} icon="📚" />
              <StatCard label="Total Orders" value={summary.totalOrders || 0} sub={`${data?.activeOrders || 0} active`} color={colors.warning} icon="📦" />
              <StatCard label="Revenue" value={`$${summary.totalRevenue || '0.00'}`} sub="Lifetime" color={colors.success} icon="💰" />
              <StatCard label="Profit" value={`$${summary.totalProfit || '0.00'}`} sub={`${summary.profitMargin || 0}% margin`} color={colors.primaryDark} icon="📈" />
            </>
          )}
        </div>

        {/* Second row of stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard label="Avg Order Value" value={`$${summary.avgOrderValue || '0.00'}`} color={colors.gray700} icon="🧾" />
          <StatCard label="Completed Orders" value={data?.completedOrders || 0} color={colors.success} icon="✅" />
          <StatCard label="Active Orders" value={data?.activeOrders || 0} color={colors.primary} icon="⏳" />
          <StatCard
            label="Tracking Rate"
            value={`${data?.fulfillmentMetrics?.trackingRate || 0}%`}
            sub={`${data?.fulfillmentMetrics?.ordersWithTracking || 0}/${summary.totalOrders || 0} tracked`}
            color={colors.warning}
            icon="📍"
          />
        </div>

        {/* Chart placeholder */}
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Revenue &amp; Orders (Last 30 Days)</h3>
          {loading ? (
            <Skeleton height={200} />
          ) : data?.chart?.labels?.length > 0 ? (
            <RevenueChart data={data.chart} />
          ) : (
            <EmptyState title="No data yet" description="Orders will appear here once customers start purchasing." />
          )}
        </Card>

        {/* Status breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Order Status Breakdown</h3>
            {loading ? <Skeleton height={120} /> : (
              <StatusBreakdown counts={data?.statusCounts || {}} total={summary.totalOrders || 0} />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Fulfillment Overview</h3>
            {loading ? <Skeleton height={120} /> : (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Orders with tracking</span>
                    <span style={{ fontWeight: 600 }}>{data?.fulfillmentMetrics?.ordersWithTracking || 0}/{summary.totalOrders || 0}</span>
                  </div>
                  <ProgressBar value={data?.fulfillmentMetrics?.ordersWithTracking || 0} max={summary.totalOrders || 1} color={colors.success} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                  <div style={{ textAlign: 'center', padding: 12, background: colors.successLight, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: colors.success }}>{data?.completedOrders || 0}</div>
                    <div style={{ fontSize: 12, color: colors.gray600 }}>Completed</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 12, background: colors.errorLight, borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: colors.error }}>{data?.errorOrders || 0}</div>
                    <div style={{ fontSize: 12, color: colors.gray600 }}>Issues</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Recent Orders */}
        <Card style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Recent Orders</h3>
          {loading ? <div><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /></div> : (
            <DataTable
              columns={[
                { key: 'orderId', label: 'Order ID', render: v => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v?.slice(0, 8) || '-'}</span> },
                { key: 'bookTitle', label: 'Book' },
                { key: 'readerName', label: 'Customer', render: v => v || '-' },
                { key: 'status', label: 'Status', render: v => statusBadge(v) },
                { key: 'retailPrice', label: 'Price', render: v => `$${Number(v || 0).toFixed(2)}` },
                { key: 'createdAt', label: 'Date', render: v => {
                    if (!v) return '-';
                    const ts = typeof v === 'number' ? v * 1000 : new Date(v).getTime();
                    return isNaN(ts) ? '-' : new Date(ts).toLocaleDateString();
                  }
                },
              ]}
              data={data?.recentOrders || []}
              emptyMessage="No orders yet. Orders will appear here once customers purchase your books."
            />
          )}
        </Card>

        {/* Activity */}
        <Card style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Recent Activity</h3>
          {loading ? <Skeleton height={200} /> : (
            <ActivityTimeline activities={data?.activity || []} />
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Status Breakdown Component ────────────────────────────────────────────────

function StatusBreakdown({ counts, total }) {
  const statusConfig = [
    { key: 'pending', label: 'Pending', color: colors.warning },
    { key: 'submitted', label: 'Submitted', color: colors.primary },
    { key: 'sent to print', label: 'Sent to Print', color: colors.primary },
    { key: 'in production', label: 'In Production', color: colors.primary },
    { key: 'shipped', label: 'Shipped', color: colors.success },
    { key: 'delivered', label: 'Delivered', color: colors.success },
    { key: 'fulfillment error', label: 'Error', color: colors.error },
    { key: 'failed', label: 'Failed', color: colors.error },
    { key: 'cancelled', label: 'Cancelled', color: colors.gray500 },
  ];

  if (total === 0) return <EmptyState title="No orders" description="Status breakdown will appear here once you have orders." />;

  return (
    <div>
      {statusConfig.map(s => {
        const count = counts[s.key] || 0;
        const pct = total > 0 ? (count / total * 100) : 0;
        if (count === 0) return null;
        return (
          <div key={s.key} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: colors.gray700 }}>{s.label}</span>
              <span style={{ fontWeight: 600, color: s.color }}>{count} ({pct.toFixed(0)}%)</span>
            </div>
            <ProgressBar value={count} max={total} color={s.color} height={6} />
          </div>
        );
      })}
    </div>
  );
}

// ── Activity Timeline Component ───────────────────────────────────────────────

function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return <EmptyState title="No activity" description="Order and status activity will appear here." icon="📋" />;
  }

  const grouped = {};
  for (const a of activities) {
    const ts = typeof a.timestamp === 'number' ? a.timestamp * 1000 : a.timestamp;
    const date = new Date(ts).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push({ ...a, _ts: ts });
  }

  return (
    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
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
            <div key={item.id} style={{ display: 'flex', gap: 12, padding: '8px 0', position: 'relative' }}>
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
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Simple Revenue Chart (CSS-only) ──────────────────────────────────────────

function RevenueChart({ data }) {
  if (!data || !data.labels || data.labels.length === 0) return null;

  const maxRevenue = Math.max(...data.revenue, 1);
  const maxOrders = Math.max(...data.orders, 1);

  return (
    <div>
      {/* Revenue bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, marginBottom: 12 }}>
        {data.revenue.map((val, i) => {
          const height = (val / maxRevenue) * 100;
          return (
            <div key={i} title={`$${val.toFixed(0)} on ${data.labels[i]}`} style={{
              flex: 1, height: `${Math.max(height, 2)}%`, background: colors.primary,
              borderRadius: '2px 2px 0 0', opacity: 0.8, transition: 'opacity 0.15s',
              minWidth: 2,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: colors.gray500, marginBottom: 8 }}>Revenue (bars) &amp; Orders (dots)</div>

      {/* Order dots */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
        {data.orders.map((val, i) => {
          const height = (val / maxOrders) * 100;
          return (
            <div key={i} style={{
              flex: 1, height: `${Math.max(height, 4)}%`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}>
              {val > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.success }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
