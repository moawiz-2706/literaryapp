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

// ── Helper: Format Lulu validation error into readable structure ─────────────
function formatLuluError(fileType, rawErrors, luluResponse) {
  // If Lulu returned a structured errors array (e.g. dimension mismatch)
  if (Array.isArray(rawErrors) && rawErrors.length > 0) {
    const formatted = rawErrors.map(errMsg => {
      // Try to parse dimension-related errors
      // Lulu format: "Your PDF dimensions are 9.250" x 12.375" (234.95mm x 314.32mm)
      // For the book size you selected, the PDF dimensions need to be within 12.356"-12.481" x 9.188"-9.312". (313.83mm-317.01mm x 233.36mm-236.54mm)."
      const yourDims = errMsg.match(/Your PDF dimensions are ([0-9.]+)"\s*x\s*([0-9.]+)"/i);
      const yourMm   = errMsg.match(/\(([0-9.]+)mm\s*x\s*([0-9.]+)mm\)/i);
      // Expected format: "need to be within Wmin-Wmax" x Hmin-Hmax"
      const expectedMatch = errMsg.match(/need to be within ([0-9.]+)"[–-]([0-9.]+)"\s*x\s*([0-9.]+)"[–-]([0-9.]+)"/i);
      const expectedMm    = errMsg.match(/\(([0-9.]+)mm[–-]([0-9.]+)mm\s*x\s*([0-9.]+)mm[–-]([0-9.]+)mm\)/i);

      if (yourDims && expectedMatch) {
        const wMin = parseFloat(expectedMatch[1]);
        const wMax = parseFloat(expectedMatch[2]);
        const hMin = parseFloat(expectedMatch[3]);
        const hMax = parseFloat(expectedMatch[4]);
        const yourW = parseFloat(yourDims[1]);
        const yourH = parseFloat(yourDims[2]);

        // Determine which dimension is off
        const wDiff = Math.abs(yourW - wMin);
        const hDiff = Math.abs(yourH - hMin);

        let diagnosis = '';
        if (wDiff > hDiff && yourW < wMin) {
          diagnosis = `Your PDF width (${yourW}") is too narrow — needs to be at least ${wMin}".`;
        } else if (wDiff > hDiff && yourW > wMax) {
          diagnosis = `Your PDF width (${yourW}") is too wide — max allowed is ${wMax}".`;
        } else if (yourH < hMin) {
          diagnosis = `Your PDF height (${yourH}") is too short — needs to be at least ${hMin}".`;
        } else if (yourH > hMax) {
          diagnosis = `Your PDF height (${yourH}") is too tall — max allowed is ${hMax}".`;
        } else {
          diagnosis = `Your PDF dimensions are outside the acceptable range for the selected book size.`;
        }

        return {
          type: 'dimension_mismatch',
          summary: diagnosis,
          yourDimensions: `${yourW}" × ${yourH}" (${yourMm ? yourMm[1] + 'mm × ' + yourMm[2] + 'mm' : 'N/A'})`,
          requiredDimensions: `${wMin}"–${wMax}" × ${hMin}"–${hMax}" (${expectedMm ? expectedMm[1] + 'mm–' + expectedMm[2] + 'mm × ' + expectedMm[3] + 'mm–' + expectedMm[4] + 'mm' : ''})`,
          suggestion: 'Re-export your cover PDF with the exact dimensions above. Open the Guidelines for your trim size to get the correct page size.',
          rawError: errMsg
        };
      }
      // Generic error — return as-is but cleaned
      return {
        type: 'general',
        message: errMsg
      };
    });

    return { fileType, errors: formatted };
  }

  // If Lulu returned error_message string
  if (luluResponse?.error_message) {
    return {
      fileType,
      errors: [{ type: 'general', message: luluResponse.error_message }]
    };
  }

  // Fallback
  return {
    fileType,
    errors: [{ type: 'general', message: `${fileType} PDF validation failed with status: ${luluResponse?.status || 'ERROR'}` }]
  };
}

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
    // 1. Determine book number for this location
    const bookNumber = await db.getNextBookNumber(locationId);

    // 2. Upload PDFs to Supabase Storage
    const [interiorResult, coverResult] = await Promise.all([
      storage.uploadInteriorPdf(req.files.interiorPdf[0].buffer, req.files.interiorPdf[0].originalname),
      storage.uploadCoverPdf(req.files.coverPdf[0].buffer, req.files.coverPdf[0].originalname)
    ]);

    // 3. Create book record
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

    // 4. Write initial GHL custom fields
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

    // 5. Pre-validate cover dimensions
    const parsedPageCount = parseInt(pageCount) || 0;
    if (parsedPageCount < 2) {
      throw new Error(`Page count must be at least 2 (received: ${pageCount})`);
    }
    if (parsedPageCount % 2 !== 0) {
      throw new Error(`Page count must be even for perfect bound books (received: ${parsedPageCount}). Please add blank pages to make it even.`);
    }

    // 6. Submit files to Lulu for validation
    const [interiorVal, coverVal] = await Promise.all([
      lulu.validateInteriorFile(interiorResult.url, podPackageId),
      lulu.validateCoverFile(coverResult.url, podPackageId, parsedPageCount)
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
    await db.updateBook(bookId, { status: 'Error', validationError: err.message, validationDetails: JSON.stringify({ error: err.message, detail }) }).catch(() => {});
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
      // Return structured error details if stored
      let structuredErrors = null;
      if (book.validation_details) {
        try {
          structuredErrors = JSON.parse(book.validation_details);
        } catch (_) {
          structuredErrors = null;
        }
      }
      return res.json({
        bookId,
        status: 'Error',
        validationError: book.validation_error,
        validationDetails: structuredErrors
      });
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
      const allErrors = [];
      let rawDetails = { files: {} };

      if (['ERROR', 'REJECTED'].includes(interior.status)) {
        const formatted = formatLuluError('Interior', interior.errors, interior);
        allErrors.push(formatted);
        rawDetails.files.interior = interior;
        console.log('[Books] Interior validation error:', JSON.stringify(formatted));
      }
      if (['ERROR', 'REJECTED'].includes(cover.status)) {
        const formatted = formatLuluError('Cover', cover.errors, cover);
        allErrors.push(formatted);
        rawDetails.files.cover = cover;
        console.log('[Books] Cover validation error:', JSON.stringify(formatted));
      }

      if (allErrors.length > 0) {
        // Build a user-friendly summary
        const summaries = allErrors.map(err => {
          const firstParsed = err.errors.find(e => e.summary);
          if (firstParsed) return `${err.fileType}: ${firstParsed.summary}`;
          return `${err.fileType}: ${err.errors.map(e => e.message).join('; ')}`;
        });
        const userMsg = summaries.join(' | ');

        // Store full structured details in DB
        const detailsJson = JSON.stringify({
          errors: allErrors,
          raw: rawDetails
        });

        try {
          await db.updateBook(bookId, {
            status: 'Error',
            validationError: userMsg,
            validationDetails: detailsJson
          });
        } catch (dbErr) {
          // If validation_details column doesn't exist yet, fall back to just status + validationError
          if (dbErr.message.includes('validation_details')) {
            console.warn('[Books] validation_details column missing — storing only validation_error. Run migration.');
            await db.updateBook(bookId, {
              status: 'Error',
              validationError: userMsg
            });
          } else {
            throw dbErr;
          }
        }

        if (authorContactId) {
          await ghl.writeBookCustomFields(book.location_id, authorContactId, book.book_number, {
            bookStatus: 'Error'
          }).catch(() => {});
        }

        return res.json({
          bookId,
          status: 'Error',
          validationError: userMsg,
          validationDetails: {
            errors: allErrors,
            raw: rawDetails
          }
        });
      }

      // Validation passed — fetch print cost
      let printCost = 0;
      try {
        const costData = await lulu.calculatePrintCost(book.pod_package_id, book.page_count || 100, 'MAIL');
        printCost = costData.printCost;
      } catch (costErr) {
        console.warn('[Books] Print cost fetch warning:', costErr.message);
      }

      const flatRateShipping = flatShipping.getCustomerShippingCost('US');
      const authorProfit = Math.max(0, (book.retail_price || 0) - printCost - flatRateShipping);

      // Create GHL product
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
