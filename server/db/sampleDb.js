'use strict';
/**
 * sampleDb.js
 *
 * Database helpers for sample-order state on the books table.
 * Resilient to missing columns — will silently skip columns that don't exist.
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

/**
 * Update book sample info. Resilient to missing columns —
 * will strip unknown columns and retry.
 */
async function updateBookSampleInfo(bookId, sampleData) {
  // Build the snake_case payload
  const payload = {};
  for (const [k, v] of Object.entries(sampleData)) {
    payload[camelToSnake(k)] = v;
  }
  payload.updated_at = Math.floor(Date.now() / 1000);

  // Attempt insert; if a column is missing, strip it and retry (up to 5 levels)
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    const { error } = await supabase.from('books').update(payload).eq('id', bookId);
    if (!error) return;

    // Check if the error is about a missing column
    const missingMatch = error.message.match(/column\s+"?(\w+)"?\s+of\s+['"]books['"]/i);
    if (missingMatch) {
      const missingColumn = missingMatch[1];
      console.warn(`[DB] Column "${missingColumn}" missing in books table — stripping and retrying (attempt ${attempts + 1}).`);
      delete payload[missingColumn];
      attempts++;
      continue;
    }

    // Not a missing column error — throw
    throw new Error(`updateBookSampleInfo failed: ${error.message}`);
  }

  throw new Error(`updateBookSampleInfo failed after ${maxAttempts} retries — too many missing columns in books table`);
}

// ── Product Approval ──────────────────────────────────────────────────────────

async function approveProduct(bookId, locationId) {
  // Try to set product_approved; if the column doesn't exist, that's OK
  try {
    await updateBookSampleInfo(bookId, {
      productApproved: true,
      productApprovedAt: Math.floor(Date.now() / 1000)
    });
  } catch (err) {
    if (err.message.includes('product_approved') || err.message.includes('product_approved_at')) {
      console.warn('[DB] product_approved columns missing on books table — skipping approval flag');
    } else {
      throw err;
    }
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  updateBookSampleInfo,
  approveProduct
};
