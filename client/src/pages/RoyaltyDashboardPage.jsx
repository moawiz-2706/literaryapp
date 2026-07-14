import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { colors, Card, Alert, Spinner, PageHeader, StatCard, statusBadge } from '../components/UI';

export default function RoyaltyDashboardPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const resp = await api.get(`/royalties?locationId=${locationId}`);
      setData(resp.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { load(); }, [load]);

  if (!locationId) {
    return (
      <div style={{ padding: '40px' }}>
        <Alert variant="error" title="Configuration Error">This page must be opened from within your GoHighLevel account.</Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert variant="error" title="Error loading dashboard">{error}</Alert>
      </div>
    );
  }

  const { summary, bookStats, recentOrders } = data || {};

  return (
    <div style={{ minHeight: '100vh', background: colors.gray50, fontFamily: colors.fontFamily }}>
      <PageHeader
        title="Royalty Dashboard"
        subtitle="Track your book sales, print costs, and earnings across all titles."
      />
      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Total Books" value={summary?.totalBooks || 0} sub={`${summary?.readyBooks || 0} ready to sell`} />
          <StatCard label="Total Orders" value={summary?.totalOrders || 0} sub="All time" color={colors.primary} />
          <StatCard label="Total Revenue" value={`$${parseFloat(summary?.totalRevenue || 0).toFixed(2)}`} sub="Gross sales" color={colors.warning} />
          <StatCard label="Total Profit" value={`$${parseFloat(summary?.totalProfit || 0).toFixed(2)}`} sub="After print costs" color={colors.success} />
        </div>

        {/* Per-Book Performance */}
        {bookStats?.length > 0 && (
          <Card style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: colors.gray900 }}>
              Book Performance
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.gray200}` }}>
                    {['#', 'Title', 'Status', 'Retail Price', 'Print Cost', 'Profit/Book', 'Orders', 'Total Revenue', 'Total Profit'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.gray500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookStats.map(book => (
                    <tr key={book.bookId} style={{ borderBottom: `1px solid ${colors.gray100}` }}>
                      <td style={{ padding: '12px', color: colors.gray500 }}>{book.bookNumber}</td>
                      <td style={{ padding: '12px', fontWeight: '500', color: colors.gray900 }}>{book.title}</td>
                      <td style={{ padding: '12px' }}>{statusBadge(book.status)}</td>
                      <td style={{ padding: '12px' }}>${parseFloat(book.retailPrice || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>${parseFloat(book.printCost || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px', color: colors.success, fontWeight: '500' }}>${parseFloat(book.authorProfitPerBook || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>{book.totalOrders}</td>
                      <td style={{ padding: '12px' }}>${book.totalRevenue}</td>
                      <td style={{ padding: '12px', color: colors.success, fontWeight: '500' }}>${book.totalProfit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Recent Orders */}
        {recentOrders?.length > 0 && (
          <Card>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: colors.gray900 }}>
              Recent Orders
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.gray200}` }}>
                    {['Book', 'Reader', 'Status', 'Revenue', 'Tracking', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.gray500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.jobId} style={{ borderBottom: `1px solid ${colors.gray100}` }}>
                      <td style={{ padding: '12px', fontWeight: '500', color: colors.gray900 }}>{order.bookTitle}</td>
                      <td style={{ padding: '12px', color: colors.gray700 }}>{order.readerName}</td>
                      <td style={{ padding: '12px' }}>{statusBadge(order.status)}</td>
                      <td style={{ padding: '12px' }}>${parseFloat(order.retailPrice || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        {order.trackingUrl
                          ? <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontSize: '13px' }}>Track</a>
                          : <span style={{ color: colors.gray300 }}>--</span>}
                      </td>
                      <td style={{ padding: '12px', color: colors.gray500, fontSize: '13px' }}>
                        {order.createdAt ? new Date(order.createdAt * 1000).toLocaleDateString() : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {(!bookStats?.length && !recentOrders?.length) && (
          <Card style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: colors.gray500, fontSize: '15px', margin: 0 }}>
              No data yet. Add books and start selling to see your royalty data here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
