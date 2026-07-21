'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const ghl = require('../services/ghlService');

// ── Royalty Dashboard Data ────────────────────────────────────────────────────
router.get('/royalties', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const [books, jobs] = await Promise.all([
      db.getBooksByLocation(locationId),
      db.getPrintJobsByLocation(locationId)
    ]);

    // Aggregate metrics
    const totalOrders = jobs.length;
    const totalRevenue = jobs.reduce((sum, j) => sum + (j.retail_price || 0), 0);
    const totalPrintCost = jobs.reduce((sum, j) =>
      sum + (j.print_cost || 0) + (j.shipping_cost || 0) + (j.internal_shipping_cost || 0) + (j.markup || 0), 0);
    const totalProfit = totalRevenue - totalPrintCost;

    // Per-book breakdown
    const bookStats = books.map(book => {
      const bookJobs = jobs.filter(j => j.book_title === book.title);
      const bookRevenue = bookJobs.reduce((sum, j) => sum + (j.retail_price || 0), 0);
      const bookCost = bookJobs.reduce((sum, j) =>
        sum + (j.print_cost || 0) + (j.shipping_cost || 0) + (j.internal_shipping_cost || 0) + (j.markup || 0), 0);
      return {
        bookId: book.id,
        title: book.title,
        status: book.status,
        bookNumber: book.book_number,
        podPackageId: book.pod_package_id,
        retailPrice: book.retail_price,
        printCost: book.print_cost,
        authorProfitPerBook: book.author_profit,
        totalOrders: bookJobs.length,
        totalRevenue: bookRevenue.toFixed(2),
        totalProfit: (bookRevenue - bookCost).toFixed(2),
        ghlProductId: book.ghl_product_id
      };
    });

    // Recent orders
    const recentOrders = jobs.slice(0, 20).map(j => ({
      jobId: j.id,
      luluPrintJobId: j.lulu_print_job_id,
      bookTitle: j.book_title,
      readerName: j.reader_name,
      status: j.status,
      retailPrice: j.retail_price,
      trackingUrl: j.tracking_url,
      createdAt: j.created_at
    }));

    res.json({
      summary: {
        totalBooks: books.length,
        readyBooks: books.filter(b => b.status === 'Ready').length,
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        currency: 'USD'
      },
      bookStats,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health Check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;