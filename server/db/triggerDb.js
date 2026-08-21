const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function isMissingTableError(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === 'PGRST204';
}

async function getActiveSubscriptions(locationId, triggerKey) {
  const { data, error } = await supabase
    .from('ghl_trigger_subscriptions')
    .select('*')
    .eq('location_id', locationId)
    .eq('trigger_key', triggerKey)
    .eq('active', true);

  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[GHL Trigger DB] Subscription table is missing; run production_schema.sql.');
      return [];
    }
    throw new Error(`getActiveSubscriptions failed: ${error.message}`);
  }
  return data || [];
}

async function upsertSubscription(subscription) {
  const payload = {
    location_id: subscription.locationId,
    company_id: subscription.companyId || null,
    workflow_id: subscription.workflowId,
    trigger_instance_id: subscription.triggerInstanceId,
    trigger_key: subscription.triggerKey,
    target_url: subscription.targetUrl,
    filters: subscription.filters || [],
    active: subscription.active !== false,
    last_event_type: subscription.eventType || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ghl_trigger_subscriptions')
    .upsert(payload, { onConflict: 'location_id,trigger_instance_id' })
    .select()
    .single();

  if (error) throw new Error(`upsertSubscription failed: ${error.message}`);
  return data;
}

async function deactivateSubscription({ locationId, triggerInstanceId, triggerKey, eventType }) {
  const { data, error } = await supabase
    .from('ghl_trigger_subscriptions')
    .update({ active: false, last_event_type: eventType || 'DELETED', updated_at: new Date().toISOString() })
    .eq('location_id', locationId)
    .eq('trigger_instance_id', triggerInstanceId)
    .eq('trigger_key', triggerKey)
    .select()
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      console.warn('[GHL Trigger DB] Subscription table is missing; run production_schema.sql.');
      return null;
    }
    throw new Error(`deactivateSubscription failed: ${error.message}`);
  }
  return data || null;
}

async function ensureDelivery({ subscriptionId, eventKey, payload }) {
  const insert = {
    subscription_id: subscriptionId,
    event_key: eventKey,
    payload,
    status: 'pending',
    attempt_count: 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ghl_trigger_deliveries')
    .upsert(insert, { onConflict: 'subscription_id,event_key', ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('GHL trigger delivery table is missing; run production_schema.sql.');
    }
    throw new Error(`ensureDelivery failed: ${error.message}`);
  }
  if (data) return data;

  const existing = await supabase
    .from('ghl_trigger_deliveries')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('event_key', eventKey)
    .maybeSingle();

  if (existing.error) throw new Error(`ensureDelivery lookup failed: ${existing.error.message}`);
  return existing.data || null;
}

async function updateDelivery(deliveryId, updates) {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('ghl_trigger_deliveries')
    .update(payload)
    .eq('id', deliveryId)
    .select()
    .single();

  if (error) throw new Error(`updateDelivery failed: ${error.message}`);
  return data;
}

module.exports = {
  getActiveSubscriptions,
  upsertSubscription,
  deactivateSubscription,
  ensureDelivery,
  updateDelivery,
};
