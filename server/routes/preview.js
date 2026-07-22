'use strict';
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const lulu = require('../services/luluService');
const storage = require('../services/storageService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

// ── Transient Validation Cache ────────────────────────────────────────────────
// Stores validation state in memory (not persisted to DB) so users can preview
// before committing to a full upload. TTL: 30 minutes.
const previewCache = new Map();
const PREVIEW_TTL = 30 * 60 * 1000; // 30 minutes

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of previewCache) {
    if (now - entry.createdAt > PREVIEW_TTL) {
      previewCache.delete(id);
    }
  }
}, 10 * 60 * 1000);

// ── Preflight Validation: Upload & Validate ───────────────────────────────────
// POST /preview/validate
// Body (multipart): interiorPdf, coverPdf, podPackageId, pageCount
// Returns: previewId, interiorValidationId, coverValidationId, expectedCoverDimensions
// Does NOT create a permanent book record — purely for preview/confirmation.

router.post('/validate', upload.fields([
  { name: 'interiorPdf', maxCount: 1 },
  { name: 'coverPdf', maxCount: 1 }
]), async (req, res) => {
  const { podPackageId, pageCount } = req.body;

  if (!podPackageId) {
    return res.status(400).json({ error: 'podPackageId is required' });
  }
  if (!req.files?.interiorPdf) {
    return res.status(400).json({ error: 'Interior PDF is required' });
  }

  const previewId = uuidv4();
  const parsedPageCount = parseInt(pageCount) || 0;

  // Basic local preflight checks
  const localErrors = [];
  if (parsedPageCount < 2) {
    localErrors.push('Page count must be at least 2.');
  }
  if (parsedPageCount > 0 && parsedPageCount % 2 !== 0) {
    localErrors.push(`Page count must be even for perfect bound books (received: ${parsedPageCount}). Add blank pages to make it even.`);
  }
  if (parsedPageCount > 0 && parsedPageCount < 24) {
    localErrors.push('Page count should be at least 24 for paperback books.');
  }

  if (localErrors.length > 0) {
    return res.status(400).json({ error: 'Preflight checks failed', details: localErrors });
  }

  try {
    // 1. Upload interior PDF to temporary storage
    const interiorResult = await storage.uploadInteriorPdf(
      req.files.interiorPdf[0].buffer,
      `preview_${previewId}_${req.files.interiorPdf[0].originalname}`
    );

    // 2. Upload cover PDF if provided
    let coverResult = null;
    if (req.files?.coverPdf) {
      coverResult = await storage.uploadCoverPdf(
        req.files.coverPdf[0].buffer,
        `preview_${previewId}_${req.files.coverPdf[0].originalname}`
      );
    }

    // 3. Calculate expected cover dimensions
    let expectedCover = null;
    if (parsedPageCount > 0) {
      try {
        expectedCover = await lulu.calculateCoverDimensions(podPackageId, parsedPageCount, 'in');
      } catch (dimErr) {
        console.warn('[Preview] Cover dimension calculation failed:', dimErr.message);
      }
    }

    // 4. Submit interior file to Lulu for validation
    const interiorVal = await lulu.validateInteriorFile(interiorResult.url, podPackageId);

    // 5. Submit cover file to Lulu if provided
    let coverVal = null;
    if (coverResult) {
      coverVal = await lulu.validateCoverFile(coverResult.url, podPackageId, parsedPageCount);
    }

    // 6. Store in cache
    previewCache.set(previewId, {
      createdAt: Date.now(),
      podPackageId,
      pageCount: parsedPageCount,
      interiorPdfUrl: interiorResult.url,
      interiorStoragePath: interiorResult.path,
      coverPdfUrl: coverResult?.url || null,
      coverStoragePath: coverResult?.path || null,
      interiorValidationId: interiorVal.id,
      coverValidationId: coverVal?.id || null,
      expectedCoverDimensions: expectedCover,
      interiorFile: req.files.interiorPdf[0].originalname,
      coverFile: coverResult ? req.files.coverPdf[0].originalname : null,
      interiorStatus: interiorVal.status,
      coverStatus: coverVal?.status || null,
      interiorErrors: interiorVal.errors || null,
      coverErrors: coverVal?.errors || null
    });

    // 7. Build response
    const result = {
      previewId,
      interiorValidationId: interiorVal.id,
      interiorStatus: interiorVal.status,
      interiorPageCount: interiorVal.page_count || null,
      interiorErrors: interiorVal.errors || null,
      coverValidationId: coverVal?.id || null,
      coverStatus: coverVal?.status || null,
      coverErrors: coverVal?.errors || null,
      expectedCoverDimensions: expectedCover,
      podPackageId,
      pageCount: parsedPageCount,
      files: {
        interior: interiorResult.url,
        cover: coverResult?.url || null
      }
    };

    res.status(200).json(result);

  } catch (err) {
    const detail = err.response
      ? `[${err.response.status}] ${JSON.stringify(err.response.data || {}).substring(0, 500)} at ${err.config?.url || 'unknown'}`
      : err.message;
    console.error('[Preview] Validation error:', err.message, '\n  URL:', err.config?.url, '\n  Status:', err.response?.status);
    res.status(500).json({ error: err.message, detail });
  }
});

// ── Poll Preview Validation Status ────────────────────────────────────────────
// GET /preview/:previewId/status

router.get('/:previewId/status', async (req, res) => {
  const { previewId } = req.params;
  const entry = previewCache.get(previewId);

  if (!entry) {
    return res.status(404).json({ error: 'Preview session not found or expired' });
  }

  try {
    const DONE_STATUSES = ['VALIDATED', 'NORMALIZED', 'ERROR', 'REJECTED'];
    let updated = false;

    // Check interior validation status
    if (entry.interiorValidationId && !DONE_STATUSES.includes(entry.interiorStatus)) {
      const interior = await lulu.getInteriorValidationStatus(entry.interiorValidationId);
      entry.interiorStatus = interior.status;
      entry.interiorPageCount = interior.page_count || entry.interiorPageCount;
      if (interior.errors) entry.interiorErrors = interior.errors;
      updated = true;
    }

    // Check cover validation status
    if (entry.coverValidationId && !DONE_STATUSES.includes(entry.coverStatus)) {
      const cover = await lulu.getCoverValidationStatus(entry.coverValidationId);
      entry.coverStatus = cover.status;
      if (cover.errors) entry.coverErrors = cover.errors;
      updated = true;
    }

    // Clean up temp files if both validations are done
    const interiorDone = DONE_STATUSES.includes(entry.interiorStatus);
    const coverDone = !entry.coverValidationId || DONE_STATUSES.includes(entry.coverStatus);

    if (interiorDone && coverDone) {
      // Collect errors
      const errors = [];
      if (['ERROR', 'REJECTED'].includes(entry.interiorStatus)) {
        errors.push({
          type: 'interior',
          message: entry.interiorErrors
            ? JSON.stringify(entry.interiorErrors)
            : `Interior PDF validation failed: ${entry.interiorStatus}`
        });
      }
      if (['ERROR', 'REJECTED'].includes(entry.coverStatus)) {
        errors.push({
          type: 'cover',
          message: entry.coverErrors
            ? JSON.stringify(entry.coverErrors)
            : `Cover PDF validation failed: ${entry.coverStatus}`
        });
      }

      const result = {
        previewId,
        interiorStatus: entry.interiorStatus,
        interiorPageCount: entry.interiorPageCount,
        interiorErrors: entry.interiorErrors,
        coverStatus: entry.coverStatus,
        coverErrors: entry.coverErrors,
        expectedCoverDimensions: entry.expectedCoverDimensions,
        errors: errors.length > 0 ? errors : null,
        files: {
          interior: entry.interiorPdfUrl,
          cover: entry.coverPdfUrl
        },
        podPackageId: entry.podPackageId,
        pageCount: entry.pageCount
      };

      return res.json(result);
    }

    // Still validating
    res.json({
      previewId,
      interiorStatus: entry.interiorStatus,
      coverStatus: entry.coverStatus,
      expectedCoverDimensions: entry.expectedCoverDimensions,
      files: {
        interior: entry.interiorPdfUrl,
        cover: entry.coverPdfUrl
      }
    });

  } catch (err) {
    console.error('[Preview] Status check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Get Preview Details (file URLs for embedding preview) ─────────────────────
// GET /preview/:previewId/details

router.get('/:previewId/details', async (req, res) => {
  const { previewId } = req.params;
  const entry = previewCache.get(previewId);

  if (!entry) {
    return res.status(404).json({ error: 'Preview session not found or expired' });
  }

  res.json({
    previewId,
    files: {
      interior: entry.interiorPdfUrl,
      cover: entry.coverPdfUrl
    },
    expectedCoverDimensions: entry.expectedCoverDimensions,
    podPackageId: entry.podPackageId,
    pageCount: entry.pageCount
  });
});

// ── Clean Up Preview Session ──────────────────────────────────────────────────
// POST /preview/:previewId/cleanup — deletes temp files from storage

router.post('/:previewId/cleanup', async (req, res) => {
  const { previewId } = req.params;
  const entry = previewCache.get(previewId);

  if (!entry) {
    return res.status(404).json({ error: 'Preview session not found or expired' });
  }

  try {
    // Delete temp files from storage
    if (entry.interiorStoragePath) {
      await storage.deleteFile(entry.interiorStoragePath).catch(() => {});
    }
    if (entry.coverStoragePath) {
      await storage.deleteFile(entry.coverStoragePath).catch(() => {});
    }
  } catch (err) {
    console.warn('[Preview] Cleanup warning:', err.message);
  }

  previewCache.delete(previewId);
  res.json({ success: true });
});

module.exports = router;
