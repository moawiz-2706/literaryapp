import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  colors, Button, Card, Badge, Spinner, PageHeader, EmptyState,
  Skeleton, StatCard, Tabs, ProgressBar, Select,
} from '../components/UI';
import { useToast } from '../components/UI';
import { fetchAnalytics } from '../api';

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('revenue');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30d');

  const fetchData = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchAnalytics(locationId);
      setData(resp.data);
    } catch (err) {
      const msg = err.message || 'Failed to load analytics';
      setError(msg);
      toast?.addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [locationId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!locationId) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <EmptyState title="No Location Selected" description="Please access this page from your GHL sub-account." icon="🔒" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const tabs = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
    { key: 'fulfillment', label: 'Fulfillment' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Analytics"
        subtitle="Advanced reporting and performance metrics"
        action={
          <Select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 140, marginBottom: 0 }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </Select>
        }
      />

      {error && !data && (
        <Card style={{ textAlign: 'center', padding: 32, marginBottom: 24 }}>
          <p style={{ color: colors.error, marginBottom: 16 }}>{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </Card>
      )}

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading ? (
          <>
            <Card><Skeleton height={20} width="60%" style={{ marginBottom: 12 }} /><Skeleton height={28} width="40%" /></Card>
            <Card><Skeleton height={20} width="60%" style={{ marginBottom: 12 }} /><Skeleton height={28} width="40%" /></Card>
            <Card><Skeleton height={20} width="60%" style={{ marginBottom: 12 }} /><Skeleton height={28} width="40%" /></Card>
            <Card><Skeleton height={20} width="60%" style={{ marginBottom: 12 }} /><Skeleton height={28} width="40%" /></Card>
          </>
        ) : (
          <>
            <StatCard label="Total Revenue" value={`$${summary.totalRevenue || '0.00'}`} color={colors.success} icon="💰" />
            <StatCard label="Total Orders" value={summary.totalOrders || 0} color={colors.primary} icon="📦" />
            <StatCard label="Avg Order Value" value={`$${summary.avgOrderValue || '0.00'}`} color={colors.warning} icon="🧾" />
            <StatCard label="Profit Margin" value={`${summary.profitMargin || 0}%`} color={colors.primaryDark} icon="📈" />
          </>
        )}
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Revenue Breakdown</h3>
            {loading ? <Skeleton height={200} /> : data?.chart?.labels?.length > 0 ? (
              <RevenueChart data={data.chart} />
            ) : (
              <EmptyState title="No revenue data" description="Revenue data will appear once orders are processed." />
            )}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Cost Breakdown</h3>
              {loading ? <Skeleton height={150} /> : (
                <div>
                  <CostRow label="Print Costs" value={summary.totalPrintCost || 0} color={colors.error} />
                  <CostRow label="Shipping" value={summary.totalShipping || 0} color={colors.warning} />
                  <CostRow label="Fulfillment Fees" value={summary.totalFulfillment || 0} color={colors.gray500} />
                  <CostRow label="Total Profit" value={summary.totalProfit || 0} color={colors.success} bold />
                </div>
              )}
            </Card>
            <Card>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Book Performance</h3>
              {loading ? <Skeleton height={150} /> : (
                <div>
                  {(data?.bookStats || []).slice(0, 5).map((book, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.gray100}` }}>
                      <span style={{ fontSize: 13 }}>{book.title || 'Unknown'}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>${(Number(book.totalRevenue) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Order Volume</h3>
            {loading ? <Skeleton height={200} /> : data?.chart?.labels?.length > 0 ? (
              <OrderVolumeChart data={data.chart} />
            ) : (
              <EmptyState title="No order data" description="Order volume data will appear once orders are processed." />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Status Distribution</h3>
            {loading ? <Skeleton height={150} /> : (
              <StatusDistribution counts={data?.statusCounts || {}} total={summary.totalOrders || 0} />
            )}
          </Card>
        </div>
      )}

      {/* Fulfillment Tab */}
      {activeTab === 'fulfillment' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Card>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Fulfillment Metrics</h3>
              {loading ? <Skeleton height={150} /> : (
                <div>
                  <FulfillmentRow label="Orders with tracking" value={`${data?.fulfillmentMetrics?.ordersWithTracking || 0}/${summary.totalOrders || 0}`} />
                  <FulfillmentRow label="Tracking rate" value={`${data?.fulfillmentMetrics?.trackingRate || 0}%`} />
                  <FulfillmentRow label="Completed" value={data?.completedOrders || 0} />
                  <FulfillmentRow label="Failed" value={data?.errorOrders || 0} />
                </div>
              )}
            </Card>
            <Card>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Processing Time</h3>
              {loading ? <Skeleton height={150} /> : (
                <div>
                  <FulfillmentRow label="Avg. time to submit" value={data?.fulfillmentMetrics?.avgSubmitTime || 'N/A'} />
                  <FulfillmentRow label="Avg. time to ship" value={data?.fulfillmentMetrics?.avgShipTime || 'N/A'} />
                  <FulfillmentRow label="Avg. time to deliver" value={data?.fulfillmentMetrics?.avgDeliverTime || 'N/A'} />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Revenue Chart ─────────────────────────────────────────────────────────────

function RevenueChart({ data }) {
  if (!data || !data.labels || data.labels.length === 0) return null;
  const maxRevenue = Math.max(...data.revenue, 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
        {data.revenue.map((val, i) => {
          const height = (val / maxRevenue) * 100;
          return (
            <div key={i} title={`$${val.toFixed(2)} on ${data.labels[i]}`} style={{
              flex: 1, height: `${Math.max(height, 2)}%`, background: colors.success,
              borderRadius: '2px 2px 0 0', opacity: 0.8, transition: 'opacity 0.15s',
              minWidth: 2,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: colors.gray500, marginTop: 4 }}>Revenue over time</div>
    </div>
  );
}

// ── Order Volume Chart ────────────────────────────────────────────────────────

function OrderVolumeChart({ data }) {
  if (!data || !data.labels || data.labels.length === 0) return null;
  const maxOrders = Math.max(...data.orders, 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
        {data.orders.map((val, i) => {
          const height = (val / maxOrders) * 100;
          return (
            <div key={i} title={`${val} orders on ${data.labels[i]}`} style={{
              flex: 1, height: `${Math.max(height, 4)}%`, background: colors.primary,
              borderRadius: '2px 2px 0 0', opacity: 0.8, transition: 'opacity 0.15s',
              minWidth: 2,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: colors.gray500, marginTop: 4 }}>Orders over time</div>
    </div>
  );
}

// ── Cost Row ──────────────────────────────────────────────────────────────────

function CostRow({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.gray100}` }}>
      <span style={{ fontSize: 13, color: colors.gray500 }}>{label}</span>
      <span style={{ fontSize: 13, color: color || colors.gray900, fontWeight: bold ? 700 : 400 }}>${Number(value || 0).toFixed(2)}</span>
    </div>
  );
}

// ── Fulfillment Row ───────────────────────────────────────────────────────────

function FulfillmentRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.gray100}` }}>
      <span style={{ fontSize: 13, color: colors.gray500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.gray800 }}>{value}</span>
    </div>
  );
}

// ── Status Distribution ───────────────────────────────────────────────────────

function StatusDistribution({ counts, total }) {
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

  if (total === 0) return <EmptyState title="No orders" description="Status distribution will appear once you have orders." />;

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
