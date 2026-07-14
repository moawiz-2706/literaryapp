'use strict';
/**
 * database.js
 *
 * SQLite data layer using @libsql/client.
 * Single master Lulu account architecture.
 * Wallet charge ID stored per print job.
 * No Stripe Connect dependency.
 */

const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = createClient({ url: `file:${DB_PATH}` });

async function initDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS ghl_tokens (
      location_id     TEXT PRIMARY KEY,
      company_id      TEXT NOT NULL,
      access_token    TEXT NOT NULL,
      refresh_token   TEXT NOT NULL,
      expires_at      INTEGER NOT NULL,
      user_type       TEXT DEFAULT 'Location',
      created_at      INTEGER DEFAULT (strftime('%s','now')),
      updated_at      INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS lulu_tokens (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token    TEXT NOT NULL,
      expires_at      INTEGER NOT NULL,
      created_at      INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS books (
      id                      TEXT PRIMARY KEY,
      location_id             TEXT NOT NULL,
      book_number             INTEGER NOT NULL DEFAULT 1,
      title                   TEXT NOT NULL,
      pod_package_id          TEXT NOT NULL,
      interior_pdf_url        TEXT,
      cover_pdf_url           TEXT,
      interior_storage_path   TEXT,
      cover_storage_path      TEXT,
      status                  TEXT DEFAULT 'Setup',
      retail_price            REAL DEFAULT 0,
      print_cost              REAL DEFAULT 0,
      author_profit           REAL DEFAULT 0,
      page_count              INTEGER DEFAULT 0,
      ghl_product_id          TEXT,
      interior_validation_id  TEXT,
      cover_validation_id     TEXT,
      validation_error        TEXT,
      created_at              INTEGER DEFAULT (strftime('%s','now')),
      updated_at              INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id                      TEXT PRIMARY KEY,
      location_id             TEXT NOT NULL,
      contact_id              TEXT NOT NULL,
      book_id                 TEXT,
      lulu_print_job_id       TEXT,
      ghl_opportunity_id      TEXT,
      wallet_charge_id        TEXT,
      workflow_id             TEXT,
      execution_id            TEXT,
      status                  TEXT DEFAULT 'Pending',
      tracking_url            TEXT,
      retail_price            REAL DEFAULT 0,
      print_cost              REAL DEFAULT 0,
      shipping_cost           REAL DEFAULT 0,
      agency_fee              REAL DEFAULT 0,
      reader_name             TEXT,
      reader_email            TEXT,
      book_title              TEXT,
      pod_package_id          TEXT,
      interior_pdf_url        TEXT,
      cover_pdf_url           TEXT,
      shipping_address        TEXT,
      shipping_level          TEXT DEFAULT 'MAIL',
      quantity                INTEGER DEFAULT 1,
      created_at              INTEGER DEFAULT (strftime('%s','now')),
      updated_at              INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS webhook_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT NOT NULL,
      event_type  TEXT,
      payload     TEXT,
      processed   INTEGER DEFAULT 0,
      error_msg   TEXT,
      created_at  INTEGER DEFAULT (strftime('%s','now'))
    );
  `);
  console.log('[DB] Database initialized at', DB_PATH);
}

// ── GHL Token Operations ──────────────────────────────────────────────────────

async function upsertGhlToken(locationId, companyId, accessToken, refreshToken, expiresIn, userType = 'Location') {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn - 60;
  await db.execute({
    sql: `INSERT INTO ghl_tokens (location_id, company_id, access_token, refresh_token, expires_at, user_type, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'))
          ON CONFLICT(location_id) DO UPDATE SET
            access_token  = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at    = excluded.expires_at,
            user_type     = excluded.user_type,
            updated_at    = strftime('%s','now')`,
    args: [locationId, companyId, accessToken, refreshToken, expiresAt, userType]
  });
}

async function getGhlToken(locationId) {
  const result = await db.execute({ sql: 'SELECT * FROM ghl_tokens WHERE location_id = ?', args: [locationId] });
  return result.rows[0] || null;
}

async function getAllGhlTokens() {
  const result = await db.execute('SELECT * FROM ghl_tokens');
  return result.rows;
}

// ── Lulu Token Operations ─────────────────────────────────────────────────────

async function storeLuluToken(accessToken, expiresIn) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn - 60;
  await db.execute({
    sql: 'INSERT INTO lulu_tokens (access_token, expires_at) VALUES (?, ?)',
    args: [accessToken, expiresAt]
  });
}

async function getLatestLuluToken() {
  const result = await db.execute('SELECT * FROM lulu_tokens ORDER BY created_at DESC LIMIT 1');
  return result.rows[0] || null;
}

// ── Book Operations ───────────────────────────────────────────────────────────

async function getNextBookNumber(locationId) {
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(book_number), 0) + 1 AS next_num
          FROM books WHERE location_id = ? AND status != 'Deleted'`,
    args: [locationId]
  });
  return result.rows[0]?.next_num || 1;
}

async function createBook(book) {
  await db.execute({
    sql: `INSERT INTO books (id, location_id, book_number, title, pod_package_id,
          interior_pdf_url, cover_pdf_url, interior_storage_path, cover_storage_path,
          status, retail_price, print_cost, author_profit, page_count, ghl_product_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      book.id, book.locationId, book.bookNumber || 1, book.title, book.podPackageId,
      book.interiorPdfUrl || null, book.coverPdfUrl || null,
      book.interiorStoragePath || null, book.coverStoragePath || null,
      book.status || 'Setup', book.retailPrice || 0, book.printCost || 0,
      book.authorProfit || 0, book.pageCount || 0, book.ghlProductId || null
    ]
  });
}

async function updateBook(bookId, updates) {
  const fields = Object.keys(updates).map(k => `${camelToSnake(k)} = ?`).join(', ');
  const values = Object.values(updates);
  await db.execute({
    sql: `UPDATE books SET ${fields}, updated_at = strftime('%s','now') WHERE id = ?`,
    args: [...values, bookId]
  });
}

async function getBook(bookId) {
  const result = await db.execute({ sql: 'SELECT * FROM books WHERE id = ?', args: [bookId] });
  return result.rows[0] || null;
}

async function getBooksByLocation(locationId) {
  const result = await db.execute({
    sql: `SELECT * FROM books WHERE location_id = ? AND status != 'Deleted' ORDER BY book_number ASC`,
    args: [locationId]
  });
  return result.rows;
}

// ── Print Job Operations ──────────────────────────────────────────────────────

async function createPrintJob(job) {
  await db.execute({
    sql: `INSERT INTO print_jobs (
            id, location_id, contact_id, book_id, status,
            retail_price, print_cost, shipping_cost, agency_fee,
            reader_name, reader_email, book_title, pod_package_id,
            interior_pdf_url, cover_pdf_url,
            shipping_address, shipping_level, quantity,
            workflow_id, execution_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      job.id, job.locationId, job.contactId, job.bookId || null,
      job.status || 'Pending', job.retailPrice || 0, job.printCost || 0,
      job.shippingCost || 0, job.agencyFee || 0,
      job.readerName || '', job.readerEmail || '',
      job.bookTitle || '', job.podPackageId || '',
      job.interiorPdfUrl || '', job.coverPdfUrl || '',
      JSON.stringify(job.shippingAddress || {}), job.shippingLevel || 'MAIL',
      job.quantity || 1,
      job.workflowId || null, job.executionId || null
    ]
  });
}

async function updatePrintJob(jobId, updates) {
  const fields = Object.keys(updates).map(k => `${camelToSnake(k)} = ?`).join(', ');
  const values = Object.values(updates);
  await db.execute({
    sql: `UPDATE print_jobs SET ${fields}, updated_at = strftime('%s','now') WHERE id = ?`,
    args: [...values, jobId]
  });
}

async function getPrintJobByLuluId(luluPrintJobId) {
  const result = await db.execute({
    sql: 'SELECT * FROM print_jobs WHERE lulu_print_job_id = ?',
    args: [luluPrintJobId]
  });
  return result.rows[0] || null;
}

async function getPrintJobByContactAndBook(contactId, bookTitle) {
  const result = await db.execute({
    sql: `SELECT * FROM print_jobs WHERE contact_id = ? AND book_title = ? ORDER BY created_at DESC LIMIT 1`,
    args: [contactId, bookTitle]
  });
  return result.rows[0] || null;
}

async function getPrintJobsByLocation(locationId) {
  const result = await db.execute({
    sql: 'SELECT * FROM print_jobs WHERE location_id = ? ORDER BY created_at DESC',
    args: [locationId]
  });
  return result.rows;
}

async function getPrintJobById(jobId) {
  const result = await db.execute({ sql: 'SELECT * FROM print_jobs WHERE id = ?', args: [jobId] });
  return result.rows[0] || null;
}

// ── Webhook Log ───────────────────────────────────────────────────────────────

async function logWebhook(source, eventType, payload, errorMsg = null) {
  await db.execute({
    sql: 'INSERT INTO webhook_log (source, event_type, payload, error_msg) VALUES (?, ?, ?, ?)',
    args: [source, eventType, JSON.stringify(payload), errorMsg]
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

module.exports = {
  initDatabase,
  upsertGhlToken, getGhlToken, getAllGhlTokens,
  storeLuluToken, getLatestLuluToken,
  getNextBookNumber, createBook, updateBook, getBook, getBooksByLocation,
  createPrintJob, updatePrintJob, getPrintJobByLuluId, getPrintJobByContactAndBook,
  getPrintJobsByLocation, getPrintJobById,
  logWebhook
};
