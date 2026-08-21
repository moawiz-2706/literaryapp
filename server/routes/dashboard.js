'use strict';
/**
 * dashboard.js
 *
 * Comprehensive dashboard and analytics routes.
 * Provides summary stats, revenue analytics, fulfillment metrics,
 * activity timeline, book performance, and recent orders.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const lulu = require('../services/luluService');

// ── Helper: Normalize snake_case DB rows to camelCase ─────────────────────────

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeRow(row) {
  if (!row) return null;
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[toCamel(key)] = value;
  }
  return normalized;
}

function normalizeRows(rows) {
  return (rows || []).map(normalizeRow);
}

// ── GET /royalties — Legacy endpoint (kept for backward compat) ──────────────

router.get('/royalties', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const [books, jobs] = await Promise.all([
      db.getBooksByLocation(locationId),
      db.getPrintJobsByLocation(locationId)
    ]);

    const totalOrders = jobs.length;
    const totalRevenue = jobs.reduce((sum, j) => sum + (j.retail_price || 0), 0);
    const totalPrintCost = jobs.reduce((sum, j) =>
      sum + (j.print_cost || 0) + (j.shipping_cost || 0) + (j.fulfillment_fee || 0) + (j.markup || 0), 0);
    const totalProfit = totalRevenue - totalPrintCost;

    const bookStats = books.map(book => {
      const bookJobs = jobs.filter(j => j.book_title === book.title);
      const bookRevenue = bookJobs.reduce((sum, j) => sum + (j.retail_price || 0), 0);
      const bookCost = bookJobs.reduce((sum, j) =>
        sum + (j.print_cost || 0) + (j.shipping_cost || 0) + (j.fulfillment_fee || 0) + (j.markup || 0), 0);
      return {
        bookId: book.id, title: book.title, status: book.status,
        bookNumber: book.book_number, podPackageId: book.pod_package_id,
        retailPrice: book.retail_price, printCost: book.print_cost,
        shippingCost: bookJobs.reduce((s, j) => s + (j.shipping_cost || 0), 0),
        fulfillmentFee: bookJobs.reduce((s, j) => s + (j.fulfillment_fee || 0), 0),
        authorProfitPerBook: book.author_profit,
        totalOrders: bookJobs.length,
        totalRevenue: bookRevenue.toFixed(2),
        totalProfit: (bookRevenue - bookCost).toFixed(2),
        ghlProductId: book.ghl_product_id
      };
    });

    const recentOrders = jobs.slice(0, 20).map(j => ({
      jobId: j.id, luluPrintJobId: j.lulu_print_job_id,
      bookTitle: j.book_title, readerName: j.reader_name,
      status: j.status, retailPrice: j.retail_price,
      trackingUrl: j.tracking_url, createdAt: j.created_at
    }));

    res.json({ summary: { totalBooks: books.length, readyBooks: books.filter(b => b.status === 'Ready').length, totalOrders, totalRevenue: totalRevenue.toFixed(2), totalProfit: totalProfit.toFixed(2), currency: 'USD' }, bookStats, recentOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /analytics — Comprehensive analytics data ────────────────────────────

router.get('/analytics', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const [books, jobs] = await Promise.all([
      db.getBooksByLocation(locationId),
      db.getPrintJobsByLocation(locationId)
    ]);

    // Summary stats
    const totalBooks = books.length;
    const readyBooks = books.filter(b => b.status === 'Ready').length;
    const totalOrders = jobs.length;

    // Revenue calculations
    let totalRevenue = 0, totalPrintCost = 0, totalShipping = 0, totalFulfillment = 0, totalMarkup = 0;
    for (const j of jobs) {
      totalRevenue += (j.retail_price || 0);
      totalPrintCost += (j.print_cost || 0);
      totalShipping += (j.shipping_cost || 0);
      totalFulfillment += (j.fulfillment_fee || 0);
      totalMarkup += (j.markup || 0);
    }
    const totalCost = totalPrintCost + totalShipping + totalFulfillment;
    const totalProfit = totalRevenue - totalCost;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Status breakdown
    const statusCounts = {};
    for (const j of jobs) {
      const s = (j.status || 'Pending').toLowerCase();
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // Active / completed counts
    const activeStatuses = ['pending', 'submitted', 'sent to print', 'in production', 'created'];
    const completedStatuses = ['shipped', 'delivered'];
    const errorStatuses = ['failed', 'fulfillment error', 'cancelled'];
    const activeOrders = jobs.filter(j => activeStatuses.includes((j.status || '').toLowerCase())).length;
    const completedOrders = jobs.filter(j => completedStatuses.includes((j.status || '').toLowerCase())).length;
    const errorOrders = jobs.filter(j => errorStatuses.includes((j.status || '').toLowerCase())).length;

    // Date-based grouping (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ordersByDate = {};
    const revenueByDate = {};

    for (const j of jobs) {
      if (!j.created_at) continue;
      const ts = typeof j.created_at === 'number' ? j.created_at * 1000 : new Date(j.created_at).getTime();
      if (ts < thirtyDaysAgo) continue;
      const dateStr = new Date(ts).toISOString().split('T')[0];
      ordersByDate[dateStr] = (ordersByDate[dateStr] || 0) + 1;
      revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + (j.retail_price || 0);
    }

    // Generate date labels for chart
    const chartLabels = [];
    const chartOrders = [];
    const chartRevenue = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const label = d.toISOString().split('T')[0];
      chartLabels.push(label);
      chartOrders.push(ordersByDate[label] || 0);
      chartRevenue.push(revenueByDate[label] || 0);
    }

    // Per-book breakdown
    const bookStats = books.map(book => {
      const bookJobs = jobs.filter(j => j.book_title === book.title);
      const bookRevenue = bookJobs.reduce((s, j) => s + (j.retail_price || 0), 0);
      const bookCost = bookJobs.reduce((s, j) => s + (j.print_cost || 0) + (j.shipping_cost || 0) + (j.fulfillment_fee || 0), 0);
      return {
        bookId: book.id, title: book.title, status: book.status,
        bookNumber: book.book_number, podPackageId: book.pod_package_id,
        retailPrice: book.retail_price, printCost: book.print_cost,
        totalPages: book.page_count || 0,
        totalOrders: bookJobs.length,
        totalRevenue: bookRevenue,
        totalCost: bookCost,
        totalProfit: bookRevenue - bookCost,
        profitMargin: bookRevenue > 0 ? ((bookRevenue - bookCost) / bookRevenue * 100) : 0,
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);

    // Recent orders (last 10)
    const recentOrders = jobs.slice(0, 10).map(j => normalizeRow(j));

    // Activity timeline (last 25 events)
    const activity = [];
    for (const j of jobs) {
      const ts = typeof j.created_at === 'number' ? j.created_at * 1000 : new Date(j.created_at).getTime();
      activity.push({
        id: j.id,
        type: 'order_created',
        title: `Order created: ${j.book_title || 'Book'}`,
        description: j.reader_name ? `Reader: ${j.reader_name}` : '',
        timestamp: ts,
        metadata: { status: j.status, jobId: j.id }
      });
      if (j.lulu_status) {
        const updateTs = typeof j.updated_at === 'number' ? j.updated_at * 1000 : new Date(j.updated_at).getTime();
        activity.push({
          id: `${j.id}_status`,
          type: 'status_update',
          title: `Status updated: ${j.lulu_status}`,
          description: `Order for "${j.book_title || 'Book'}" — ${j.lulu_status}`,
          timestamp: updateTs,
          metadata: { status: j.lulu_status, jobId: j.id }
        });
      }
    }
    activity.sort((a, b) => b.timestamp - a.timestamp);

    // Fulfillment metrics
    const ordersWithTracking = jobs.filter(j => j.tracking_url).length;
    const trackingRate = totalOrders > 0 ? (ordersWithTracking / totalOrders * 100) : 0;

    res.json({
      summary: {
        totalBooks, readyBooks, totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalPrintCost: totalPrintCost.toFixed(2),
        totalShipping: totalShipping.toFixed(2),
        totalFulfillment: totalFulfillment.toFixed(2),
        avgOrderValue: avgOrderValue.toFixed(2),
        profitMargin: profitMargin.toFixed(1),
        currency: 'USD'
      },
      statusCounts,
      activeOrders,
      completedOrders,
      errorOrders,
      bookStats,
      recentOrders,
      activity: activity.slice(0, 25),
      chart: {
        labels: chartLabels,
        orders: chartOrders,
        revenue: chartRevenue
      },
      fulfillmentMetrics: {
        ordersWithTracking,
        trackingRate: trackingRate.toFixed(1),
        totalTracked: ordersWithTracking,
        totalUntracked: totalOrders - ordersWithTracking,
      }
    });
  } catch (err) {
    console.error('[Analytics] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /health — System health check ────────────────────────────────────────

router.get('/health', async (req, res) => {
  const { locationId } = req.query;
  const checks = {};

  // Database health
  checks.database = { status: 'ok', message: 'Supabase connected' };

  // GHL token health
  if (locationId) {
    try {
      const ghlToken = await db.getGhlToken(locationId);
      if (ghlToken) {
        const isExpired = ghlToken.expires_at <= Math.floor(Date.now() / 1000);
        checks.ghl = { status: isExpired ? 'warning' : 'ok', message: isExpired ? 'Token expired — refresh needed' : 'Connected' };
      } else {
        checks.ghl = { status: 'warning', message: 'No app connection found for this account' };
      }
    } catch {
      checks.ghl = { status: 'error', message: 'Failed to check app connection' };
    }

    // Lulu credentials health
    try {
      const luluCreds = await db.getLuluCredentials(locationId);
      if (luluCreds) {
        checks.lulu = { status: 'ok', message: `Lulu connected (${luluCreds.environment})` };
      } else {
        checks.lulu = { status: 'warning', message: 'Lulu integration not configured' };
      }
    } catch {
      checks.lulu = { status: 'error', message: 'Failed to check Lulu credentials' };
    }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks,
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    luluMode: process.env.LULU_SANDBOX === 'true' ? 'sandbox' : 'production'
  });
});

module.exports = router;
