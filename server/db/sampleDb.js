'use strict';
/**
 * sampleDb.js
 *
 * Database helpers for sample copy ordering and product approval.
 * Stores sample order tracking on the books table.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ── Sample Order Tracking ────────────────────────────────────────────────────

async function updateBookSampleInfo(bookId, sampleData) {
  const snakeUpdates = {};
  for (const [k, v] of Object.entries(sampleData)) {
    snakeUpdates[camelToSnake(k)] = v;
  }
  snakeUpdates.updated_at = Math.floor(Date.now() / 1000);
  const { error } = await supabase.from('books').update(snakeUpdates).eq('id', bookId);
  if (error) throw new Error(`updateBookSampleInfo failed: ${error.message}`);
}

async function approveProduct(bookId, locationId) {
  // Mark the product as approved
  await updateBookSampleInfo(bookId, {
    productApproved: true,
    productApprovedAt: Math.floor(Date.now() / 1000)
  });
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  updateBookSampleInfo,
  approveProduct
};
