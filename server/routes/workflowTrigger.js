const express = require('express');
const router = express.Router();
const triggerDb = require('../db/triggerDb');
const { SHIPPED_TRIGGER_KEY } = require('../services/ghlTriggerService');

function extractSubscriptionSecret(req) {
  const header = req.headers['x-literaryapp-trigger-secret'] || req.headers.authorization || '';
  return String(header).replace(/^Bearer\s+/i, '').trim();
}

function assertSubscriptionSecret(req) {
  const expected = String(process.env.GHL_TRIGGER_SUBSCRIPTION_SECRET || '').trim();
  // Local development and the existing smoke harness may omit the secret, but a
  // production deployment must explicitly configure it before accepting callbacks.
  if (!expected) return process.env.NODE_ENV !== 'production';
  return extractSubscriptionSecret(req) === expected;
}

function extractLocationId(payload) {
  return String(payload?.extras?.locationId || payload?.locationId || '').trim();
}

function extractWorkflowId(payload) {
  return String(payload?.extras?.workflowId || payload?.workflowId || '').trim();
}

function normalizeTriggerData(payload) {
  const data = payload?.triggerData || payload?.data || {};
  return {
    id: String(data.id || data.triggerId || '').trim(),
    key: String(data.key || payload?.meta?.key || '').trim(),
    filters: Array.isArray(data.filters) ? data.filters : [],
    eventType: String(data.eventType || '').trim().toUpperCase(),
    targetUrl: String(data.targetUrl || '').trim(),
  };
}

router.post('/subscription', async (req, res) => {
  if (!assertSubscriptionSecret(req)) {
    return res.status(401).json({ error: 'Invalid trigger subscription secret' });
  }

  const payload = req.body || {};
  const triggerData = normalizeTriggerData(payload);
  const locationId = extractLocationId(payload);
  const workflowId = extractWorkflowId(payload);
  const companyId = String(payload?.extras?.companyId || payload?.companyId || '').trim() || null;

  if (!locationId || !workflowId || !triggerData.id || !triggerData.key || !triggerData.eventType) {
    return res.status(400).json({
      error: 'Invalid trigger subscription payload',
      required: ['extras.locationId', 'extras.workflowId', 'triggerData.id', 'triggerData.key', 'triggerData.eventType'],
    });
  }

  if (triggerData.key !== SHIPPED_TRIGGER_KEY) {
    return res.status(400).json({ error: `Unsupported trigger key: ${triggerData.key}` });
  }

  try {
    if (triggerData.eventType === 'DELETED') {
      await triggerDb.deactivateSubscription({
        locationId,
        triggerInstanceId: triggerData.id,
        triggerKey: triggerData.key,
        eventType: triggerData.eventType,
      });
      return res.status(200).json({ success: true, active: false });
    }

    if (!['CREATED', 'UPDATED'].includes(triggerData.eventType)) {
      return res.status(400).json({ error: `Unsupported eventType: ${triggerData.eventType}` });
    }
    if (!triggerData.targetUrl) {
      return res.status(400).json({ error: 'triggerData.targetUrl is required for CREATED/UPDATED' });
    }

    const subscription = await triggerDb.upsertSubscription({
      locationId,
      companyId,
      workflowId,
      triggerInstanceId: triggerData.id,
      triggerKey: triggerData.key,
      targetUrl: triggerData.targetUrl,
      filters: triggerData.filters,
      eventType: triggerData.eventType,
      active: true,
    });

    return res.status(200).json({ success: true, active: true, subscriptionId: subscription?.id || null });
  } catch (error) {
    console.error('[GHL Trigger] Subscription processing failed:', error.message);
    return res.status(500).json({ error: 'Unable to persist trigger subscription' });
  }
});

module.exports = router;
