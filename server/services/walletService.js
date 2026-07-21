'use strict';
/**
 * walletService.js
 *
 * Manages subaccount wallet balances. Each subaccount (author) has a wallet
 * that must be charged BEFORE an order is submitted to Lulu.
 *
 * The charge includes:
 *   - Printing cost (from Lulu)
 *   - Customer-facing shipping cost (flat rate)
 *   - Internal shipping cost (flat rate + $0.50 processing fee)
 *   - Markup (author profit margin)
 *   - Fulfillment fee
 */

const db = require('../db/database');

// ── Get Wallet Balance ────────────────────────────────────────────────────────

async function getWalletBalance(locationId) {
  const wallet = await db.getWallet(locationId);
  return {
    locationId,
    balance: wallet?.balance || 0,
    currency: 'USD',
    lastUpdated: wallet?.updated_at || null,
  };
}

// ── Add Funds to Wallet ──────────────────────────────────────────────────────

async function addFunds(locationId, amount, description = 'Manual deposit') {
  const wallet = await db.getWallet(locationId);
  const currentBalance = wallet?.balance || 0;
  const newBalance = currentBalance + (parseFloat(amount) || 0);

  await db.upsertWallet({
    locationId,
    balance: newBalance,
    lastTransaction: {
      type: 'deposit',
      amount: parseFloat(amount) || 0,
      description,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    locationId,
    previousBalance: currentBalance,
    depositAmount: parseFloat(amount) || 0,
    newBalance,
    transaction: {
      type: 'deposit',
      amount: parseFloat(amount) || 0,
      description,
    },
  };
}

// ── Charge Wallet for Full Order Cost ────────────────────────────────────────

async function chargeOrderFullCost({
  locationId,
  contactId,
  bookTitle,
  retailPrice,
  printCost,
  shippingCost,
  internalShippingCost,
  markup,
  agencyFee = 0,
  fulfillmentFee = 0,
  totalCharge,
}) {
  const wallet = await db.getWallet(locationId);
  const currentBalance = wallet?.balance || 0;

  if (currentBalance < totalCharge) {
    throw new Error(
      `Insufficient wallet balance. Required: $${totalCharge.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`
    );
  }

  const newBalance = currentBalance - totalCharge;
  const chargeId = uuidv4();

  await db.upsertWallet({
    locationId,
    balance: newBalance,
    lastTransaction: {
      type: 'charge',
      amount: totalCharge,
      description: `Order: ${bookTitle}`,
      timestamp: new Date().toISOString(),
      details: {
        contactId,
        retailPrice,
        printCost,
        shippingCost,
        internalShippingCost,
        markup,
        agencyFee,
        fulfillmentFee,
        totalCharge,
      },
    },
  });

  return {
    chargeId,
    locationId,
    previousBalance: currentBalance,
    chargeAmount: totalCharge,
    newBalance,
    breakdown: {
      retailPrice,
      printCost,
      shippingCost,
      internalShippingCost,
      markup,
      agencyFee,
      fulfillmentFee,
    },
  };
}

// ── Refund Wallet ─────────────────────────────────────────────────────────────

async function refundOrder(locationId, amount, orderId, reason = 'Refund') {
  const wallet = await db.getWallet(locationId);
  const currentBalance = wallet?.balance || 0;
  const newBalance = currentBalance + (parseFloat(amount) || 0);

  await db.upsertWallet({
    locationId,
    balance: newBalance,
    lastTransaction: {
      type: 'refund',
      amount: parseFloat(amount) || 0,
      description: `Refund for order ${orderId}: ${reason}`,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    locationId,
    previousBalance: currentBalance,
    refundAmount: parseFloat(amount) || 0,
    newBalance,
    orderId,
    reason,
  };
}

const { v4: uuidv4 } = require('uuid');

module.exports = {
  getWalletBalance,
  addFunds,
  chargeOrderFullCost,
  refundOrder,
};