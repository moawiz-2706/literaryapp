'use strict';
/**
 * pipelines.js
 *
 * Per-location CRM pipeline configuration. Replaces the global GHL_PIPELINE_ID
 * / GHL_STAGE_* env vars: each installed location maps the app's lifecycle
 * statuses to the stages of its own GHL pipeline (dashboard UI sends the
 * mapping after the merchant picks stages).
 *
 *   GET  /pipelines/:locationId            — current mapping + available pipelines/stages
 *   POST /pipelines/:locationId            — save { pipelineId, pipelineName, stages[] }
 *   GET  /pipelines/:locationId/options    — list pipelines + stages to choose from
 */

const express = require('express');
const router = express.Router();
const crmService = require('../services/crmService');
const statusService = require('../services/statusService');
const statusDb = require('../db/statusDb');
const ghl = require('../services/ghlService');

// ── GET /pipelines/:locationId/options — pipeline and stage discovery ────────────

router.get('/:locationId/options', async (req, res) => {
  const { locationId } = req.params;
  if (!locationId) return res.status(400).json({ error: 'locationId required' });

  try {
    const pipelines = await ghl.getPipelines(locationId);
    const options = (pipelines || []).map(p => ({
      pipelineId: p.id,
      pipelineName: p.name,
      stages: (p.stages || []).map(s => ({ stageId: s.id, stageName: s.name })),
    }));
    res.json({ locationId, pipelines: options, lifecycleStatuses: Object.values(statusService.LOCAL_STATUS_MAP) });
  } catch (err) {
    console.error('[Pipelines] Options error:', err.message);
    res.status(500).json({ error: `Failed to list GHL pipelines: ${err.message}` });
  }
});

// ── GET /pipelines/:locationId — current mapping ────────────────────────────────

router.get('/:locationId', async (req, res) => {
  const { locationId } = req.params;
  try {
    const stages = await statusDb.getPipelineStages(locationId);
    res.json({ locationId, stages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /pipelines/:locationId — save mapping ──────────────────────────────────

router.post('/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const { pipelineId, pipelineName, stages } = req.body;
  if (!pipelineId || !Array.isArray(stages)) {
    return res.status(400).json({ error: 'pipelineId and stages array required' });
  }

  try {
    const result = await crmService.configurePipelineStages(locationId, { pipelineId, pipelineName, stages });
    res.json(result);
  } catch (err) {
    console.error('[Pipelines] Save error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
