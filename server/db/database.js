'use strict';
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── GHL Token Operations ──────────────────────────────────────────────────────

async function upsertGhlToken(locationId, accessToken, refreshToken, expiresAt, userType = 'Location') {
  // Determine companyId: for Company tokens, locationId IS the companyId
  // For Location tokens, we look up the companyId from the Company row
  const { data: companyRow } = await supabase
    .from('ghl_tokens')
    .select('location_id')
    .eq('location_id', locationId)
    .eq('user_type', 'Company')
    .single();

  const companyId = companyRow ? companyRow.location_id : locationId;

  const { error } = await supabase.from('ghl_tokens').upsert({
    location_id: locationId,
    company_id: companyId,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    user_type: userType,
    updated_at: Math.floor(Date.now() / 1000)
  }, { onConflict: 'location_id' });
  if (error) throw new Error(`upsertGhlToken failed: ${error.message}`);
}


async function getGhlToken(locationId) {
  const { data, error } = await supabase
    .from('ghl_tokens')
    .select('*')
    .eq('location_id', locationId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getGhlToken failed: ${error.message}`);
  return data;
}

async function getAllGhlTokens() {
  const { data, error } = await supabase
    .from('ghl_tokens')
    .select('*');
  if (error) throw new Error(`getAllGhlTokens failed: ${error.message}`);
  return data || [];
}

async function deleteGhlToken(locationId) {
  const { error } = await supabase
    .from('ghl_tokens')
    .delete()
    .eq('location_id', locationId);
  if (error) throw new Error(`deleteGhlToken failed: ${error.message}`);
}

// ── Legacy Lulu Token (Global) ────────────────────────────────────────────────

async function storeLuluToken(accessToken, expiresIn) {
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn) - 60;
  const { error } = await supabase.from('lulu_tokens').upsert({
    id: 1,
    access_token: accessToken,
    expires_at: expiresAt
  }, { onConflict: 'id' });
  if (error) throw new Error(`storeLuluToken failed: ${error.message}`);
}

async function getLatestLuluToken() {
  const { data, error } = await supabase
    .from('lulu_tokens')
    .select('*')
    .eq('id', 1)
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
    .order('book_number', { ascending: false })
    .limit(1);
  if (error) throw new Error(`getNextBookNumber failed: ${error.message}`);
  return (data && data.length > 0) ? data[0].book_number + 1 : 1;
}

async function createBook(book) {
  const { error } = await supabase.from('books').insert({
    id: book.id,
    location_id: book.locationId,
    book_number: book.bookNumber,
    title: book.title,
    pod_package_id: book.podPackageId,
    interior_pdf_url: book.interiorPdfUrl,
    cover_pdf_url: book.coverPdfUrl,
    interior_storage_path: book.interiorStoragePath,
    cover_storage_path: book.coverStoragePath,
    status: book.status || 'Setup',
    retail_price: book.retailPrice || 0,
    page_count: book.pageCount || 0,
    updated_at: Math.floor(Date.now() / 1000)
  });
  if (error) throw new Error(`createBook failed: ${error.message}`);
}

async function updateBook(bookId, updates) {
  const snakeUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    snakeUpdates[camelToSnake(k)] = v;
  }
  snakeUpdates.updated_at = Math.floor(Date.now() / 1000);

  // Resilient: strip missing columns and retry (same approach as createPrintJob)
  let payload = snakeUpdates;
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    const { error } = await supabase.from('books').update(payload).eq('id', bookId);
    if (!error) return;

    const missingMatch = error.message.match(/['"]?(\w+)['"]?\s+column\s+of\s+['"]books['"]/i);
    if (missingMatch) {
      const missingColumn = missingMatch[1];
      console.warn(`[DB] Column "${missingColumn}" missing in books — stripping and retrying (attempt ${attempts + 1}).`);
      delete payload[missingColumn];
      attempts++;
      continue;
    }
    throw new Error(`updateBook failed: ${error.message}`);
  }
  throw new Error(`updateBook failed after ${maxAttempts} retries`);
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

/**
 * createPrintJob — fully resilient to missing columns.
 * Uses a while loop to strip any missing columns and retry.
 */
async function createPrintJob(job) {
  // Build the full payload
  let payload = {
    id:                       job.id,
    location_id:              job.locationId,
    contact_id:               job.contactId || '',
    book_id:                  job.bookId || null,
    status:                   job.status || 'Pending',
    retail_price:             job.retailPrice || 0,
    print_cost:               job.printCost || 0,
    shipping_cost:            job.shippingCost || 0,
    markup:                   job.markup || 0,
    agency_fee:               job.agencyFee || 0,
    wallet_charge_id:         job.walletChargeId || null,
    ghl_opportunity_id:       job.ghlOpportunityId || null,
    lulu_print_job_id:        job.luluPrintJobId || null,
    tracking_url:             job.trackingUrl || null,
    reader_name:              job.readerName || '',
    reader_email:             job.readerEmail || '',
    book_title:               job.bookTitle || '',
    pod_package_id:           job.podPackageId || '',
    interior_pdf_url:         job.interiorPdfUrl || '',
    cover_pdf_url:            job.coverPdfUrl || '',
    shipping_address:         JSON.stringify(job.shippingAddress || {}),
    shipping_level:           job.shippingLevel || 'MAIL',
    quantity:                 job.quantity || 1,
    workflow_id:              job.workflowId || null,
    execution_id:             job.executionId || null,
    parent_job_id:            job.parentJobId || null,
    lulu_status:              job.luluStatus || null
  };

  // Only add fulfillment_fee if the job has it set
  if (job.fulfillmentFee != null) {
    payload.fulfillment_fee = job.fulfillmentFee;
  }

  // Retry loop — strip missing columns dynamically
  const MAX_RETRIES = 10;
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    const { error, data } = await supabase.from('print_jobs').insert(payload).select();
    if (!error) {
      return data;
    }

    // Parse the error message to find the missing column name
    // Supabase returns errors with single quotes: column 'lulu_status' of 'print_jobs'
    const missingMatch = error.message.match(/['"]?(\w+)['"]?\s+column\s+of\s+['"]print_jobs['"]/i);
    if (missingMatch) {
      const missingColumn = missingMatch[1];
      console.warn(`[DB] Column "${missingColumn}" missing in print_jobs — stripping and retrying (attempt ${attempt + 1}). Run supabase_migration.sql to add it.`);
      delete payload[missingColumn];
      attempt++;
      continue;
    }

    // If it's a different error (not a missing column), throw immediately
    throw new Error(`createPrintJob failed: ${error.message}`);
  }

  throw new Error(`createPrintJob failed after ${MAX_RETRIES} retries — too many missing columns`);
}

async function updatePrintJob(jobId, updates) {
  const snakeUpdates = {};
  for (const [k, v] of Object.entries(updates)) {
    snakeUpdates[camelToSnake(k)] = v;
  }
  snakeUpdates.updated_at = Math.floor(Date.now() / 1000);

  // Resilient: strip missing columns and retry
  let payload = snakeUpdates;
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    const { error } = await supabase.from('print_jobs').update(payload).eq('id', jobId);
    if (!error) return;

    const missingMatch = error.message.match(/['"]?(\w+)['"]?\s+column\s+of\s+['"]print_jobs['"]/i);
    if (missingMatch) {
      const missingColumn = missingMatch[1];
      console.warn(`[DB] Column "${missingColumn}" missing in print_jobs (update) — stripping and retrying (attempt ${attempts + 1}).`);
      delete payload[missingColumn];
      attempts++;
      continue;
    }
    throw new Error(`updatePrintJob failed: ${error.message}`);
  }
  throw new Error(`updatePrintJob failed after ${maxAttempts} retries`);
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

async function getPrintJobByContactAndBook(contactId, bookId) {
  const { data, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('contact_id', contactId)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(`getPrintJobByContactAndBook failed: ${error.message}`);
  return (data && data.length > 0) ? data[0] : null;
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

// ── Lulu Credentials (Per-Subaccount) ─────────────────────────────────────────

async function upsertLuluCredentials(locationId, clientId, clientSecret, environment = 'sandbox') {
  const { error } = await supabase.from('lulu_credentials').upsert({
    location_id:   locationId,
    client_id:     clientId,
    client_secret: clientSecret,
    environment,
    connected_at:  Math.floor(Date.now() / 1000),
    updated_at:    Math.floor(Date.now() / 1000)
  }, { onConflict: 'location_id' });
  if (error) throw new Error(`upsertLuluCredentials failed: ${error.message}`);
}

async function getLuluCredentials(locationId) {
  const { data, error } = await supabase
    .from('lulu_credentials')
    .select('*')
    .eq('location_id', locationId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getLuluCredentials failed: ${error.message}`);
  return data;
}

async function deleteLuluCredentials(locationId) {
  const { error } = await supabase
    .from('lulu_credentials')
    .delete()
    .eq('location_id', locationId);
  if (error) throw new Error(`deleteLuluCredentials failed: ${error.message}`);
}

// ── Lulu Token (Per-Subaccount) ───────────────────────────────────────────────

async function storeLuluTokenForLocation(locationId, accessToken, expiresIn) {
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn) - 60;
  const { data: existing } = await supabase
    .from('lulu_tokens_location')
    .select('id')
    .eq('location_id', locationId)
    .single();

  const row = {
    location_id:  locationId,
    access_token: accessToken,
    expires_at:   expiresAt
  };

  if (existing) {
    const { error } = await supabase.from('lulu_tokens_location').update(row).eq('id', existing.id);
    if (error) throw new Error(`storeLuluTokenForLocation update failed: ${error.message}`);
  } else {
    const { error } = await supabase.from('lulu_tokens_location').insert(row);
    if (error) throw new Error(`storeLuluTokenForLocation insert failed: ${error.message}`);
  }
}

async function getLatestLuluTokenForLocation(locationId) {
  const { data, error } = await supabase
    .from('lulu_tokens_location')
    .select('*')
    .eq('location_id', locationId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) throw new Error(`getLatestLuluTokenForLocation failed: ${error.message}`);
  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  initDatabase,
  upsertGhlToken, getGhlToken, getAllGhlTokens, deleteGhlToken,
  storeLuluToken, getLatestLuluToken,
  upsertLuluCredentials, getLuluCredentials, deleteLuluCredentials,
  storeLuluTokenForLocation, getLatestLuluTokenForLocation,
  getNextBookNumber, createBook, updateBook, getBook, getBooksByLocation,
  createPrintJob, updatePrintJob, getPrintJobByLuluId, getPrintJobByContactAndBook,
  getPrintJobsByLocation, getPrintJobById,
  logWebhook
};

// Stub initDatabase (not used in Supabase mode)
async function initDatabase() {}
