'use strict';
const express = require('express');
const router = express.Router();
const lulu = require('../services/luluService');

// POD Package reference data from spec
const POD_PACKAGES = [
  { id: '0600X0900BWSTDPB060UW444MXX', label: '6x9 Black & White Paperback (60# Uncoated)' },
  { id: '0600X0900FCSTDPB080CW444MXX', label: '6x9 Full Color Paperback (80# Coated)' },
  { id: '0600X0900BWSTDHC060UW444MXX', label: '6x9 Black & White Hardcover (60# Uncoated)' },
  { id: '0850X1100BWSTDPB060UW444MXX', label: '8.5x11 Black & White Paperback (60# Uncoated)' },
  { id: '0500X0800BWSTDPB060UW444MXX', label: '5x8 Black & White Paperback (60# Uncoated)' }
];

const SHIPPING_OPTIONS = [
  { id: 'MAIL', label: 'Standard Mail (7-14 business days)', flatRate: 5.95 },
  { id: 'GROUND', label: 'Ground Shipping (5-7 business days)', flatRate: 8.95 },
  { id: 'EXPEDITED', label: 'Expedited (3-5 business days)', flatRate: 14.95 },
  { id: 'EXPRESS', label: 'Express (1-2 business days)', flatRate: 24.95 }
];

// ── Get Print Quote ───────────────────────────────────────────────────────────
router.post('/calculate', async (req, res) => {
  const { podPackageId, pageCount, shippingLevel, shippingAddress } = req.body;

  if (!podPackageId || !pageCount) {
    return res.status(400).json({ error: 'podPackageId and pageCount are required' });
  }

  try {
    const costData = await lulu.calculatePrintCost(
      podPackageId,
      parseInt(pageCount),
      shippingLevel || 'MAIL',
      shippingAddress || null
    );

    const shippingOption = SHIPPING_OPTIONS.find(s => s.id === (shippingLevel || 'MAIL'));
    const flatRateShipping = shippingOption?.flatRate || 5.95;

    res.json({
      podPackageId,
      pageCount: parseInt(pageCount),
      printCost: costData.printCost,
      actualShippingCost: costData.shippingCost,
      flatRateShippingCharged: flatRateShipping,
      totalLuluCost: costData.totalCost,
      currency: costData.currency,
      royaltyExample: {
        retailPrice: 24.99,
        printCost: costData.printCost,
        flatRateShipping,
        authorProfit: Math.max(0, 24.99 - costData.printCost - flatRateShipping).toFixed(2)
      }
    });
  } catch (err) {
    console.error('[Quotes] Calculation error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get POD Packages List ─────────────────────────────────────────────────────
router.get('/pod-packages', (req, res) => {
  res.json({ packages: POD_PACKAGES });
});

// ── Get Shipping Options ──────────────────────────────────────────────────────
router.get('/shipping-options', (req, res) => {
  res.json({ options: SHIPPING_OPTIONS });
});

module.exports = router;
