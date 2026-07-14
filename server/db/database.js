'use strict';
/**
 * database.js
 *
 * Supabase PostgreSQL data layer.
 * Replaces SQLite so the app runs on Render free tier with no persistent disk.
 * All tables are created via the Supabase SQL Editor (see supabase_migration.sql).
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function initDatabase() {
  // Tables are created in Supabase via SQL migration, not at runtime.
  // This function just verifies the connection is working.
  const { error } = await supabase.from('ghl_tokens').select('location_id').limit(1);
  if (error && error.code !== 'PGRST116') {
    throw new Error(`[DB] Supabase connection failed: ${error.message}. Run supabase_migration.sql first.`);
  }
  console.log('[DB] Supabase connection verified');
}

// ── GHL Token Operations ──────────────────────────────────────────────────────

async function upsertGhlToken(locationId, companyId, accessToken, refreshToken, expiresIn, userType = 'Location') {
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn) - 60;
  const { error } = await supabase.from('ghl_tokens').upsert({
    location_id:   locationId,
    company_id:    companyId,
    access_token:  accessToken,
    refresh_token: refreshToken,
    expires_at:    expiresAt,
    user_type:     userType,
    updated_at:    Math.floor(Date.now() / 1000)
  }, { onConflict: 'location_id' });
  if (error) throw new Error(`upsertGhlToken failed: ${error.message}`);
}

async function getGhlToken(locationId) {
  const { data, error } = await supabase
    .from('ghl_tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();
  if (error && error.code === 'PGRST116') return null; // not found
  if (error) throw new Error(`getGhlToken failed: ${error.message}`);
  return data;
}

async function getAllGhlTokens() {
  const { data, error } = await supabase.from('ghl_tokens').select('*');
  if (error) throw new Error(`getAllGhlTokens failed: ${error.message}`);
  return data || [];
}

async function deleteGhlToken(locationId) {
  const { error } = await supabase.from('ghl_tokens').delete().eq('location_id', locationId);
  if (error) throw new Error(`deleteGhlToken failed: ${error.message}`);
}

// ── Lulu Token Operations ─────────────────────────────────────────────────────

async function storeLuluToken(accessToken, expiresIn) {
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn) - 60;
  const { error } = await supabase.from('lulu_tokens').insert({
    access_token: accessToken,
    expires_at:   expiresAt
  });
  if (error) throw new Error(`storeLuluToken failed: ${error.message}`);
}

async function getLatestLuluToken() {
  const { data, error } = await supabase
    .from('lulu_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getLatestLuluToken failed: ${error.message}`);
  return data;
}

// ── Book Operations ───────────────────────────────────────────────────────────

async function getNextBookNumber(locationId) {
  const { data, error } = await supabase
    .from('books')
    .select('book_number')
    .eq('location_id', locationId)
    .neq('status', 'Deleted')
    .order('book_number', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code === 'PGRST116') return 1;
  if (error) throw new Error(`getNextBookNumber failed: ${error.message}`);
  return (data?.book_number || 0) + 1;
}

async function createBook(book) {
  const { error } = await supabase.from('books').insert({
    id:                     book.id,
    location_id:            book.locationId,
    book_number:            book.bookNumber || 1,
    title:                  book.title,
    pod_package_id:         book.podPackageId,
    interior_pdf_url:       book.interiorPdfUrl || null,
    cover_pdf_url:          book.coverPdfUrl || null,
    interior_storage_path:  book.interiorStoragePath || null,
    cover_storage_path:     book.coverStoragePath || null,
    status:                 book.status || 'Setup',
    retail_price:           book.retailPrice || 0,
    print_cost:             book.printCost || 0,
    author_profit:          book.authorProfit || 0,
    page_count:             book.pageCount || 0,
    ghl_product_id:         book.ghlProductId || null
  });
  if (error) throw new Error(`createBook failed: ${error.message}`);
}

async function updateBook(bookId, updates) {
  const snakeUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    snakeUpdates[camelToSnake(k)] = v;
  }
  snakeUpdates.updated_at = Math.floor(Date.now() / 1000);
  const { error } = await supabase.from('books').update(snakeUpdates).eq('id', bookId);
  if (error) throw new Error(`updateBook failed: ${error.message}`);
}

async function getBook(bookId) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getBook failed: ${error.message}`);
  return data;
}

async function getBooksByLocation(locationId) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('location_id', locationId)
    .neq('status', 'Deleted')
    .order('book_number', { ascending: true });
  if (error) throw new Error(`getBooksByLocation failed: ${error.message}`);
  return data || [];
}

// ── Print Job Operations ──────────────────────────────────────────────────────

async function createPrintJob(job) {
  const { error } = await supabase.from('print_jobs').insert({
    id:               job.id,
    location_id:      job.locationId,
    contact_id:       job.contactId,
    book_id:          job.bookId || null,
    status:           job.status || 'Pending',
    retail_price:     job.retailPrice || 0,
    print_cost:       job.printCost || 0,
    shipping_cost:    job.shippingCost || 0,
    agency_fee:       job.agencyFee || 0,
    reader_name:      job.readerName || '',
    reader_email:     job.readerEmail || '',
    book_title:       job.bookTitle || '',
    pod_package_id:   job.podPackageId || '',
    interior_pdf_url: job.interiorPdfUrl || '',
    cover_pdf_url:    job.coverPdfUrl || '',
    shipping_address: JSON.stringify(job.shippingAddress || {}),
    shipping_level:   job.shippingLevel || 'MAIL',
    quantity:         job.quantity || 1,
    workflow_id:      job.workflowId || null,
    execution_id:     job.executionId || null
  });
  if (error) throw new Error(`createPrintJob failed: ${error.message}`);
}

async function updatePrintJob(jobId, updates) {
  const snakeUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    snakeUpdates[camelToSnake(k)] = v;
  }
  snakeUpdates.updated_at = Math.floor(Date.now() / 1000);
  const { error } = await supabase.from('print_jobs').update(snakeUpdates).eq('id', jobId);
  if (error) throw new Error(`updatePrintJob failed: ${error.message}`);
}

async function getPrintJobByLuluId(luluPrintJobId) {
  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('lulu_print_job_id', luluPrintJobId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getPrintJobByLuluId failed: ${error.message}`);
  return data;
}

async function getPrintJobByContactAndBook(contactId, bookTitle) {
  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('contact_id', contactId)
    .eq('book_title', bookTitle)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getPrintJobByContactAndBook failed: ${error.message}`);
  return data;
}

async function getPrintJobsByLocation(locationId) {
  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getPrintJobsByLocation failed: ${error.message}`);
  return data || [];
}

async function getPrintJobById(jobId) {
  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getPrintJobById failed: ${error.message}`);
  return data;
}

// ── Webhook Log ───────────────────────────────────────────────────────────────

async function logWebhook(source, eventType, payload, errorMsg = null) {
  const { error } = await supabase.from('webhook_log').insert({
    source,
    event_type: eventType,
    payload:    JSON.stringify(payload),
    error_msg:  errorMsg
  });
  if (error) console.warn('[DB] logWebhook failed:', error.message);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

module.exports = {
  initDatabase,
  upsertGhlToken, getGhlToken, getAllGhlTokens, deleteGhlToken,
  storeLuluToken, getLatestLuluToken,
  getNextBookNumber, createBook, updateBook, getBook, getBooksByLocation,
  createPrintJob, updatePrintJob, getPrintJobByLuluId, getPrintJobByContactAndBook,
  getPrintJobsByLocation, getPrintJobById,
  logWebhook
};
