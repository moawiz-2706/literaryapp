'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const ghl = require('../services/ghlService');
const lulu = require('../services/luluService');
const storage = require('../services/storageService');
const flatShipping = require('../services/flatShipping');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// ── List Books for a Location ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { locationId } = req.query;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });
  try {
    const books = await db.getBooksByLocation(locationId);
    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Single Book ───────────────────────────────────────────────────────────
router.get('/:bookId', async (req, res) => {
  try {
    const book = await db.getBook(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ book });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Upload Book PDFs and Begin Validation ─────────────────────────────────────
router.post('/upload', upload.fields([
  { name: 'interiorPdf', maxCount: 1 },
  { name: 'coverPdf', maxCount: 1 }
]), async (req, res) => {
  const { locationId, authorContactId, title, podPackageId, retailPrice, pageCount, description } = req.body;

  if (!locationId || !title || !podPackageId) {
    return res.status(400).json({ error: 'locationId, title, and podPackageId are required' });
  }
  if (!req.files?.interiorPdf || !req.files?.coverPdf) {
    return res.status(400).json({ error: 'Both interior and cover PDF files are required' });
  }

  const bookId = uuidv4();

  try {
    // 1. Determine book number for this location (for GHL custom field suffix _1, _2, _3...)
    const bookNumber = await db.getNextBookNumber(locationId);

    // 2. Upload PDFs to Supabase Storage (public URLs so Lulu can fetch them)
    const [interiorResult, coverResult] = await Promise.all([
      storage.uploadInteriorPdf(req.files.interiorPdf[0].buffer, req.files.interiorPdf[0].originalname),
      storage.uploadCoverPdf(req.files.coverPdf[0].buffer, req.files.coverPdf[0].originalname)
    ]);

    // 3. Create book record in database
    await db.createBook({
      id: bookId,
      locationId,
      bookNumber,
      title,
      podPackageId,
      interiorPdfUrl: interiorResult.url,
      coverPdfUrl: coverResult.url,
      interiorStoragePath: interiorResult.path,
      coverStoragePath: coverResult.path,
      status: 'Setup',
      retailPrice: parseFloat(retailPrice) || 0,
      pageCount: parseInt(pageCount) || 0
    });

    // 4. If the author's contact ID is provided, write initial GHL custom fields
    if (authorContactId) {
      await ghl.writeBookCustomFields(locationId, authorContactId, bookNumber, {
        bookTitle: title,
        podPackageId,
        interiorPdfUrl: interiorResult.url,
        coverPdfUrl: coverResult.url,
        bookStatus: 'Setup',
        retailPrice: parseFloat(retailPrice) || 0
      }).catch(err => console.warn('[Books] GHL field write warning:', err.message));
    }

    // 5. Submit files to Lulu for validation (async — client polls for status)
    const [interiorVal, coverVal] = await Promise.all([
      lulu.validateInteriorFile(interiorResult.url, podPackageId),
      lulu.validateCoverFile(coverResult.url, podPackageId, parseInt(pageCount) || null)
    ]);

    await db.updateBook(bookId, {
      interiorValidationId: interiorVal.id,
      coverValidationId: coverVal.id,
      status: 'Validating'
    });

    if (authorContactId) {
      await ghl.writeBookCustomFields(locationId, authorContactId, bookNumber, {
        bookStatus: 'Validating'
      }).catch(() => {});
    }

    res.status(202).json({
      bookId,
      bookNumber,
      status: 'Validating',
      message: `Files uploaded. Poll /books/${bookId}/validation-status for updates.`,
      interiorValidationId: interiorVal.id,
      coverValidationId: coverVal.id
    });

  } catch (err) {
    const detail = err.response
      ? `[${err.response.status}] ${JSON.stringify(err.response.data || {}).substring(0, 500)} at ${err.config?.url || 'unknown'}`
      : err.message;
    console.error('[Books] Upload error:', err.message, '\n  URL:', err.config?.url, '\n  Status:', err.response?.status, '\n  Data:', JSON.stringify(err.response?.data || {}).substring(0, 500));
    await db.updateBook(bookId, { status: 'Error', validationError: err.message }).catch(() => {});
    res.status(500).json({ error: err.message, detail });
  }
});

// ── Poll Validation Status ────────────────────────────────────────────────────
router.get('/:bookId/validation-status', async (req, res) => {
  const { bookId } = req.params;
  const { authorContactId } = req.query;

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    if (book.status === 'Ready') {
      return res.json({ bookId, status: 'Ready', ghlProductId: book.ghl_product_id, printCost: book.print_cost });
    }
    if (book.status === 'Error') {
      return res.json({ bookId, status: 'Error', validationError: book.validation_error });
    }
    if (!book.interior_validation_id || !book.cover_validation_id) {
      return res.json({ bookId, status: book.status });
    }

    // Check Lulu validation status
    const [interior, cover] = await Promise.all([
      lulu.getInteriorValidationStatus(book.interior_validation_id),
      lulu.getCoverValidationStatus(book.cover_validation_id)
    ]);

    const DONE_STATUSES = ['VALIDATED', 'NORMALIZED', 'ERROR', 'REJECTED'];
    const interiorDone = DONE_STATUSES.includes(interior.status);
    const coverDone = DONE_STATUSES.includes(cover.status);

    if (interiorDone && coverDone) {
      const errors = [];
      if (['ERROR', 'REJECTED'].includes(interior.status)) {
        const detail = interior.errors
          ? `Interior PDF: ${JSON.stringify(interior.errors)}`
          : `Interior PDF: ${interior.error_message || interior.status || 'Validation failed'}`;
        console.log('[Books] Interior validation error:', JSON.stringify(interior));
        errors.push(detail);
      }
      if (['ERROR', 'REJECTED'].includes(cover.status)) {
        const detail = cover.errors
          ? `Cover PDF: ${JSON.stringify(cover.errors)}`
          : `Cover PDF: ${cover.error_message || cover.status || 'Validation failed'}`;
        console.log('[Books] Cover validation error:', JSON.stringify(cover));
        errors.push(detail);
      }

      if (errors.length > 0) {
        const errMsg = errors.join(' | ');
        await db.updateBook(bookId, { status: 'Error', validationError: errMsg });
        if (authorContactId) {
          await ghl.writeBookCustomFields(book.location_id, authorContactId, book.book_number, {
            bookStatus: 'Error'
          }).catch(() => {});
        }
        return res.json({ bookId, status: 'Error', errors });
      }

      // Validation passed — fetch print cost from Lulu (printing cost only)
      let printCost = 0;
      try {
        const costData = await lulu.calculatePrintCost(book.pod_package_id, book.page_count || 100, 'MAIL');
        printCost = costData.printCost;
      } catch (costErr) {
        console.warn('[Books] Print cost fetch warning:', costErr.message);
      }

      // Royalty formula: Retail - Print Cost - Flat-Rate Shipping = Author Profit
      // Use US domestic flat rate as the default for profit estimation
      const flatRateShipping = flatShipping.getCustomerShippingCost('US');
      const authorProfit = Math.max(0, (book.retail_price || 0) - printCost - flatRateShipping);

      // Create GHL product with Lulu metadata embedded
      let ghlProductId = null;
      try {
        const product = await ghl.createProduct(book.location_id, {
          bookId,
          title: book.title,
          podPackageId: book.pod_package_id,
          interiorPdfUrl: book.interior_pdf_url,
          coverPdfUrl: book.cover_pdf_url,
          pageCount: book.page_count,
          printCost,
          retailPrice: book.retail_price,
          description: `Print-on-demand: ${book.title}`
        });
        ghlProductId = product.id || product._id || product.product?.id;
      } catch (prodErr) {
        console.warn('[Books] GHL product creation warning:', prodErr.message);
      }

      await db.updateBook(bookId, { status: 'Ready', printCost, authorProfit, ghlProductId });

      if (authorContactId) {
        await ghl.writeBookCustomFields(book.location_id, authorContactId, book.book_number, {
          bookStatus: 'Ready',
          printCost,
          authorProfit
        }).catch(() => {});
      }

      return res.json({
        bookId,
        status: 'Ready',
        printCost,
        authorProfit,
        ghlProductId,
        message: 'Book validated and ready to sell. Attach the GHL product to your order form.'
      });
    }

    // Still validating
    res.json({ bookId, status: 'Validating', interior: interior.status, cover: cover.status });

  } catch (err) {
    console.error('[Books] Validation status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Book ───────────────────────────────────────────────────────────────
router.delete('/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const { locationId } = req.query;

  try {
    const book = await db.getBook(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.location_id !== locationId) return res.status(403).json({ error: 'Forbidden' });

    await Promise.allSettled([
      storage.deleteFile(book.interior_storage_path),
      storage.deleteFile(book.cover_storage_path)
    ]);

    await db.updateBook(bookId, { status: 'Deleted' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
