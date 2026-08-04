import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  colors, Button, Card, Badge, Spinner, PageHeader, EmptyState,
  Input, Select, statusBadge, DataTable, Modal, Tabs, Alert, ProgressBar,
  Skeleton,
} from '../components/UI';
import { useToast } from '../components/UI';
import {
  listOrders, getOrderDetail, syncOrder, syncAllOrders, reorderOrder, exportOrdersCSV
} from '../api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function formatDate(ts) {
  if (!ts) return '—';
  const ms = typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts;
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatAddress(addr) {
  if (!addr) return '—';
  const obj = typeof addr === 'string' ? JSON.parse(addr) : addr;
  const parts = [
    obj.name,
    obj.street1,
    obj.street2,
    `${obj.city || ''}${obj.state_code ? ', ' + obj.state_code : ''} ${obj.postcode || ''}`.trim(),
    obj.country_code,
    obj.phone_number
  ].filter(Boolean);
  return parts.join('\n');
}

function getStatusVariant(status) {
  const s = (status || '').toLowerCase().replace(/_/g, ' ');
  const map = {
    'ready': 'success', 'validated': 'info', 'setup': 'default',
    'error': 'error', 'failed': 'error', 'fulfillment error': 'error',
    'sent to print': 'info', 'submitted': 'info', 'created': 'info',
    'in production': 'info', 'shipped': 'success', 'delivered': 'success',
    'cancelled': 'default', 'pending': 'warning', 'pending approval': 'warning',
    'sample ordered': 'warning', 'sample shipped': 'info', 'sample delivered': 'success',
    'approved': 'success', 'normalizing': 'info',
  };
  return map[s] || 'default';
}

function formatStatus(status) {
  return status
    ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '—';
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');
  const toast = useToast();

  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        locationId,
        page: String(page),
        pageSize: String(pageSize),
        orderBy: sortBy,
        orderDir: sortDir,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const resp = await listOrders(params);
      setOrders(resp.data.orders || []);
      setTotal(resp.data.total || 0);
    } catch (err) {
      const msg = err.message || 'Failed to load orders';
      setError(msg);
      toast?.addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [locationId, page, pageSize, statusFilter, searchQuery, sortBy, sortDir, toast]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Sync single order
  async function handleSync(order) {
    const orderId = order.id || order.jobId;
    if (!orderId) return;
    setSyncingId(orderId);
    try {
      await syncOrder(orderId, locationId);
      toast?.addToast('Order synced successfully', 'success');
      await loadOrders();
    } catch (err) {
      toast?.addToast('Sync failed: ' + err.message, 'error');
    } finally {
      setSyncingId(null);
    }
  }

  // Sync all orders
  async function handleSyncAll() {
    setSyncingId('__all__');
    try {
      const resp = await syncAllOrders(locationId);
      toast?.addToast(`Synced ${resp.data.synced || 0}/${resp.data.total || 0} orders`, 'success');
      await loadOrders();
    } catch (err) {
      toast?.addToast('Sync all failed: ' + err.message, 'error');
    } finally {
      setSyncingId(null);
    }
  }

  // Reorder
  async function handleReorder(order) {
    const orderId = order.id || order.jobId;
    if (!orderId) return;
    if (!window.confirm('Create a reorder of this order?')) return;
    setReorderingId(orderId);
    try {
      await reorderOrder(orderId, locationId, {
        quantity: order.quantity || 1,
        shippingLevel: order.shippingLevel || order.shipping_level || 'MAIL',
        shippingAddress: order.shippingAddress || order.shipping_address,
      });
      toast?.addToast('Reorder created successfully', 'success');
      await loadOrders();
      setSelectedOrder(null);
    } catch (err) {
      toast?.addToast('Reorder failed: ' + err.message, 'error');
    } finally {
      setReorderingId(null);
    }
  }

  // Export to CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await exportOrdersCSV({ locationId, page: '1', pageSize: '1000' })
        .then(resp => resp.data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${locationId}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast?.addToast('Orders exported successfully', 'success');
    } catch (err) {
      toast?.addToast('Export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Detail modal
  async function openDetail(order) {
    const orderId = order.id || order.jobId;
    if (!orderId) return;
    setSelectedOrder({ ...order, loadingDetail: true });
    setDetailLoading(true);
    try {
      const resp = await getOrderDetail(orderId, locationId);
      const detail = resp.data.order || {};
      setSelectedOrder({
        ...order,
        loadingDetail: false,
        ...detail,
      });
    } catch (err) {
      setSelectedOrder(prev => prev ? { ...prev, loadingDetail: false } : null);
      toast?.addToast('Failed to load order details', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedOrder(null);
  }

  // ── Summary stats ────────────────────────────────────────────────────────

  const totalOrders = total;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.retailPrice || o.totalCharge || o.printCost) || 0), 0);
  const activeOrders = orders.filter(o =>
    !['shipped', 'delivered', 'cancelled', 'canceled', 'error', 'failed', 'fulfillment_error'].includes((o.status || '').toLowerCase().replace(/_/g, ''))
  ).length;
  const completedOrders = orders.filter(o =>
    ['shipped', 'delivered'].includes((o.status || '').toLowerCase())
  ).length;

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / pageSize);

  // ── Column definitions ─────────────────────────────────────────────────
  const columns = [
    { key: 'bookTitle', label: 'Book Title', render: v => <span style={{ fontWeight: 500, color: colors.gray900 }}>{v || '—'}</span> },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
    { key: 'readerName', label: 'Customer', render: v => v || '-' },
    { key: 'retailPrice', label: 'Price', render: v => <span style={{ fontWeight: 500 }}>{formatCurrency(v)}</span> },
    { key: 'quantity', label: 'Qty', render: v => v || 1 },
    { key: 'createdAt', label: 'Date', render: v => {
        if (!v) return '-';
        const ms = typeof v === 'number' && v < 1e12 ? v * 1000 : v;
        return isNaN(new Date(ms).getTime()) ? '-' : new Date(ms).toLocaleDateString();
      }
    },
  ];

  if (!locationId) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <EmptyState title="No Location Selected" description="Please access this page from your GHL sub-account." icon="🔒" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Orders"
        subtitle={`${totalOrders} total orders across this location`}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={exporting}>
              {exporting ? <Spinner size={14} /> : '📄'} Export CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSyncAll} disabled={syncingId === '__all__'}>
              {syncingId === '__all__' ? <Spinner size={14} /> : '↻'} Sync All
            </Button>
          </div>
        }
      />

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>{totalOrders}</div>
          <div style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>Total Orders</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.success }}>{formatCurrency(totalRevenue)}</div>
          <div style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>Total Revenue</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.warning }}>{activeOrders}</div>
          <div style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>Active</div>
        </Card>
        <Card style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.success }}>{completedOrders}</div>
          <div style={{ fontSize: 12, color: colors.gray500, marginTop: 4 }}>Completed</div>
        </Card>
      </div>

      {/* ── Search & Filter Bar ────────────────────────────────────────── */}
      <Card style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Input
              placeholder="Search orders by book, customer, ID..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ marginBottom: 0, width: 160 }}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Sent to Print">Sent to Print</option>
              <option value="In Production">In Production</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Error">Error</option>
              <option value="Cancelled">Cancelled</option>
            </Select>
          </div>
          <div style={{ minWidth: 140 }}>
            <Select value={`${sortBy}:${sortDir}`} onChange={e => {
              const [field, dir] = e.target.value.split(':');
              setSortBy(field);
              setSortDir(dir);
            }} style={{ marginBottom: 0, width: 140 }}>
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="status:asc">Status A-Z</option>
              <option value="retail_price:desc">Price High-Low</option>
              <option value="retail_price:asc">Price Low-High</option>
              <option value="book_title:asc">Book A-Z</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="error" title="Error loading orders" style={{ marginBottom: 16 }}>
          {error}
          <div style={{ marginTop: 8 }}>
            <Button variant="secondary" size="sm" onClick={loadOrders}>Retry</Button>
          </div>
        </Alert>
      )}

      {/* ── Orders Table ───────────────────────────────────────────────── */}
      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 16px', borderBottom: `1px solid ${colors.gray100}` }}>
                {Array.from({ length: 6 }).map((_, j) => <Skeleton key={j} width={60 + j * 20} height={14} />)}
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={searchQuery || statusFilter ? "Try adjusting your search or filters." : "Orders will appear here once sample or print jobs are submitted."}
            icon="📦"
          />
        ) : (
          <DataTable
            columns={columns}
            data={orders}
            onRowClick={openDetail}
          />
        )}
      </Card>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            ← Previous
          </Button>
          <span style={{ fontSize: 13, color: colors.gray500 }}>Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Next →
          </Button>
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          loading={detailLoading}
          onClose={closeDetail}
          onSync={() => handleSync(selectedOrder)}
          onReorder={() => handleReorder(selectedOrder)}
          locationId={locationId}
          syncingId={syncingId}
          reorderingId={reorderingId}
        />
      )}
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({ order, loading, onClose, onSync, onReorder, locationId, syncingId, reorderingId }) {
  const [activeTab, setActiveTab] = useState('details');

  // Parse shipping address
  const shippingAddress = order.shippingAddress || order.shippingAddressFromLulu || order.shipping_address;
  const parsedAddress = shippingAddress
    ? (typeof shippingAddress === 'string' ? (() => { try { return JSON.parse(shippingAddress); } catch { return shippingAddress; } })() : shippingAddress)
    : null;

  // Contact info
  const contactName = order.readerName || order.contactInfo?.firstName || 'Unknown';
  const contactEmail = order.readerEmail || order.contactInfo?.email || '-';

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'tracking', label: 'Tracking' },
    { key: 'customer', label: 'Customer' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'costs', label: 'Costs' },
  ];

  return (
    <Modal open={true} onClose={onClose} title={`Order ${(order.id || order.jobId || '').slice(0, 8)}`} size="lg">
      {loading || order.loadingDetail ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>
      ) : (
        <>
          {/* Status header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.gray200}`, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Badge variant={getStatusVariant(order.status)} dot>{formatStatus(order.status)}</Badge>
              {order.luluStatus && typeof order.luluStatus === 'object' && order.luluStatus.name && (
                <Badge variant="info" dot>Lulu: {formatStatus(order.luluStatus.name)}</Badge>
              )}
              {order.parentJobId && <Badge variant="warning">Reorder</Badge>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={onSync} disabled={syncingId === (order.id || order.jobId)}>
                {syncingId === (order.id || order.jobId) ? 'Syncing...' : 'Sync'}
              </Button>
              <Button variant="outline" size="sm" onClick={onReorder} disabled={reorderingId === (order.id || order.jobId) || !order.luluPrintJobId}>
                {reorderingId === (order.id || order.jobId) ? 'Reordering...' : 'Reorder'}
              </Button>
            </div>
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: colors.gray500 }}>Order Information</h4>
                <DetailRow label="Order ID" value={<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.id || '-'}</span>} />
                <DetailRow label="Lulu Job ID" value={order.luluPrintJobId || order.lulu_print_job_id || '-'} />
                <DetailRow label="Book Title" value={order.bookTitle || order.book_title || '-'} />
                <DetailRow label="POD Package" value={order.podPackageId || order.pod_package_id || '-'} />
                <DetailRow label="Quantity" value={order.quantity || 1} />
                <DetailRow label="Shipping Level" value={order.shippingLevel || order.shipping_level || '-'} />
                <DetailRow label="Order Type" value={order.orderType === 'sample' ? 'Sample' : order.orderType === 'workflow' ? 'Workflow' : 'Direct'} />
                <DetailRow label="Created" value={order.createdAt ? formatDate(order.createdAt) : '-'} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: colors.gray500 }}>Shipping Address</h4>
                {parsedAddress ? (
                  <div style={{ fontSize: 14, lineHeight: 1.8, color: colors.gray700 }}>
                    {parsedAddress.phone_number && <div>{parsedAddress.phone_number}</div>}
                    {parsedAddress.street1 && <div>{parsedAddress.street1}</div>}
                    {parsedAddress.street2 && <div>{parsedAddress.street2}</div>}
                    <div>{parsedAddress.city}{(parsedAddress.city && parsedAddress.state) || (parsedAddress.city && parsedAddress.state_code) ? ', ' : ' '}{parsedAddress.state || parsedAddress.state_code} {parsedAddress.postcode}</div>
                    <div>{parsedAddress.country_code || parsedAddress.country}</div>
                  </div>
                ) : (
                  <span style={{ color: colors.gray400 }}>No shipping address available</span>
                )}
              </div>
            </div>
          )}

          {/* Tracking Tab */}
          {activeTab === 'tracking' && (
            <div>
              {order.trackingUrls && order.trackingUrls.length > 0 ? (
                <div>
                  {order.trackingUrls.map((url, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontSize: 13, wordBreak: 'break-all' }}>{url}</a>
                    </div>
                  ))}
                </div>
              ) : order.trackingUrl || order.tracking_url ? (
                <div style={{ marginBottom: 16 }}>
                  <a href={order.trackingUrl || order.tracking_url} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, fontSize: 13 }}>{order.trackingUrl || order.tracking_url}</a>
                </div>
              ) : (
                <EmptyState title="No tracking yet" description="Tracking information will appear once the order ships." icon="📍" />
              )}
              {order.estimatedShippingDates && (
                <Card style={{ marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: colors.warning }}>Estimated Shipping Window</h4>
                  <div style={{ fontSize: 13, color: colors.gray600 }}>
                    <div>Dispatch: {order.estimatedShippingDates.dispatch_min || '?'} to {order.estimatedShippingDates.dispatch_max || '?'}</div>
                    <div>Arrival: {order.estimatedShippingDates.arrival_min || '?'} to {order.estimatedShippingDates.arrival_max || '?'}</div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Customer Tab */}
          {activeTab === 'customer' && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: colors.primaryLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {(contactName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: colors.gray900 }}>{contactName}</div>
                  <div style={{ fontSize: 13, color: colors.gray500 }}>{contactEmail}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>Contact ID</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{order.contactId || order.contact_id || '-'}</div>
                </Card>
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, color: colors.gray500, marginBottom: 4 }}>GHL Opportunity</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{order.ghlOpportunityId || order.ghl_opportunity_id || '-'}</div>
                </Card>
              </div>
              {parsedAddress && (
                <Card style={{ marginTop: 16, padding: 16 }}>
                  <div style={{ fontSize: 12, color: colors.gray500, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Shipping Address</div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: colors.gray700, whiteSpace: 'pre-line' }}>{formatAddress(parsedAddress)}</div>
                </Card>
              )}
              {order.contactInfo && (
                <Card style={{ marginTop: 16, padding: 16 }}>
                  <div style={{ fontSize: 12, color: colors.gray500, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>GHL Contact Details</div>
                  <DetailRow label="Name" value={`${order.contactInfo.firstName || ''} ${order.contactInfo.lastName || ''}`.trim() || '-'} />
                  <DetailRow label="Email" value={order.contactInfo.email || '-'} />
                  <DetailRow label="Phone" value={order.contactInfo.phone || '-'} />
                </Card>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <TimelineStep label="Order Created" timestamp={order.createdAt} active />
                <TimelineStep label="Submitted to Lulu" timestamp={order.luluPrintJobId || order.lulu_print_job_id ? order.createdAt : null} active={!!(order.luluPrintJobId || order.lulu_print_job_id)} />
                <TimelineStep label="Sent to Print" active={['sent to print', 'in production', 'shipped', 'delivered'].includes((order.status || '').toLowerCase())} />
                <TimelineStep label="In Production" active={['in production', 'shipped', 'delivered'].includes((order.status || '').toLowerCase())} />
                <TimelineStep label="Shipped" active={['shipped', 'delivered'].includes((order.status || '').toLowerCase())} />
                <TimelineStep label="Delivered" active={(order.status || '').toLowerCase() === 'delivered'} />
              </div>
            </div>
          )}

          {/* Costs Tab */}
          {activeTab === 'costs' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card style={{ padding: 16 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: colors.gray500 }}>Local Costs</h4>
                  <DetailRow label="Retail Price" value={formatCurrency(order.retailPrice)} />
                  <DetailRow label="Print Cost" value={formatCurrency(order.printCost)} />
                  <DetailRow label="Shipping" value={formatCurrency(order.shippingCost)} />
                  <DetailRow label="Markup" value={formatCurrency(order.markup)} />
                  <DetailRow label="Fulfillment Fee" value={formatCurrency(order.agencyFee || order.fulfillmentFee || order.fulfillment_fee)} />
                  <div style={{ borderTop: `1px solid ${colors.gray200}`, marginTop: 8, paddingTop: 8 }}>
                    <DetailRow label="Total Charge" value={formatCurrency(
                      (Number(order.printCost) || 0) + (Number(order.shippingCost) || 0) +
                      (Number(order.markup) || 0) + (Number(order.agencyFee || order.fulfillmentFee || order.fulfillment_fee) || 0)
                    )} bold />
                  </div>
                </Card>
                {order.luluCosts && (
                  <Card style={{ padding: 16 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: colors.gray500 }}>Lulu Actual Costs</h4>
                    <DetailRow label="Total (incl. tax)" value={order.luluCosts.totalCostInclTax ? `$${order.luluCosts.totalCostInclTax.toFixed(2)}` : '-'} />
                    <DetailRow label="Shipping (incl. tax)" value={order.luluCosts.shippingCost != null ? `$${order.luluCosts.shippingCost.toFixed(2)}` : '-'} />
                    <DetailRow label="Fulfillment (incl. tax)" value={order.luluCosts.fulfillmentFee != null ? `$${order.luluCosts.fulfillmentFee.toFixed(2)}` : '-'} />
                    <DetailRow label="Tax" value={order.luluCosts.totalTax ? `$${order.luluCosts.totalTax.toFixed(2)}` : '-'} />
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function DetailRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.gray100}` }}>
      <span style={{ fontSize: 13, color: colors.gray500 }}>{label}</span>
      <span style={{ fontSize: 13, color: colors.gray900, fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}

function TimelineStep({ label, timestamp, active }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', position: 'relative' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: active ? colors.successLight : colors.gray100,
        border: `2px solid ${active ? colors.success : colors.gray300}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
      }}>
        {active ? '✓' : '·'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: active ? colors.gray900 : colors.gray400 }}>{label}</div>
        {timestamp && <div style={{ fontSize: 12, color: colors.gray500, marginTop: 2 }}>
          {formatDate(timestamp)}
        </div>}
      </div>
    </div>
  );
}
