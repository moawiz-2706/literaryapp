import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { colors, Button, Card, Badge, Spinner, PageHeader, EmptyState, Alert, Select } from '../components/UI';
import { useToast } from '../components/UI';
import { getPipelineOptions, getPipelineConfig, savePipelineConfig } from '../api';

/**
 * CRMPipelinesPage
 *
 * Lets the merchant pick which GHL pipeline tracks their print orders and map
 * each app lifecycle status to a real stage in that pipeline. Replaces the
 * old global GHL_PIPELINE_ID / GHL_STAGE_* env vars.
 */
export default function CRMPipelinesPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [lifecycleStatuses] = useState(() => [
    { key: 'order_received',      label: 'Order Received',       description: 'Print job placed on Lulu' },
    { key: 'order_in_progress',   label: 'In Production',        description: 'Lulu is printing' },
    { key: 'quality_check',       label: 'Quality Check',        description: 'Print verified before shipping' },
    { key: 'order_shipped',       label: 'Shipped',              description: 'Order handed to carrier' },
    { key: 'order_delivered',     label: 'Delivered',            description: 'Order delivered to customer' },
    { key: 'order_error',         label: 'Order Error',          description: 'Fulfillment failed / needs review' },
    { key: 'order_cancelled',     label: 'Cancelled',            description: 'Order cancelled' },
  ]);
  const [mapping, setMapping] = useState({});   // { order_received: stageId, ... }
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!locationId) return; load(); }, [locationId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [opts, cfg] = await Promise.all([
        getPipelineOptions(locationId).then(r => r.data).catch(() => null),
        getPipelineConfig(locationId).then(r => r.data).catch(() => null),
      ]);
      setPipelines(opts?.pipelines || []);

      let pipeline = null;
      const map = {};
      if (cfg?.stages?.length) {
        pipeline = { pipelineId: cfg.pipelineId, pipelineName: cfg.pipelineName, stages: cfg.stages };
        for (const s of cfg.stages) map[s.lifecycle_status] = s.stage_id;
      } else if (opts?.pipelines?.length) {
        pipeline = opts.pipelines[0];
      }
      if (pipeline) {
        setSelectedPipeline(pipeline);
        // prefill mapping from pipeline stages where available
        for (const st of lifecycleStatuses) {
          if (!map[st.key] && pipeline.stages?.length) {
            map[st.key] = pipeline.stages[Math.min(st.key === 'order_error' || st.key === 'order_cancelled' ? pipeline.stages.length - 1 : 0, pipeline.stages.length - 1)]?.stageId;
          }
        }
        setMapping(map);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pipeline options');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedPipeline) return;
    const unset = lifecycleStatuses.filter(st => !mapping[st.key]);
    if (unset.length) {
      toast?.addToast(`Map every lifecycle status to a pipeline stage. Missing: ${unset.map(u => u.label).join(', ')}`, 'error');
      return;
    }
    setSaving(true);
    try {
      await savePipelineConfig(locationId, {
        pipelineId: selectedPipeline.pipelineId,
        pipelineName: selectedPipeline.pipelineName,
        stages: lifecycleStatuses.map(st => ({
          lifecycle_status: st.key,
          stage_id: mapping[st.key],
          stage_name: (selectedPipeline.stages || []).find(s => s.stageId === mapping[st.key])?.stageName || '',
        })),
      });
      toast?.addToast('Pipeline mapping saved. Orders will now sync their pipeline stage automatically.', 'success');
    } catch (err) {
      toast?.addToast('Save failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function stageOptions() {
    return (selectedPipeline?.stages || []).map(s => (
      <option key={s.stageId} value={s.stageId}>{s.stageName}</option>
    ));
  }

  if (!locationId) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <EmptyState title="No Location Selected" description="Please access this page from your account." icon="🔒" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        title="CRM Pipeline Mapping"
        subtitle="Connect your order lifecycle to a pipeline. Every status change syncs the opportunity stage automatically."
      />

      {loading ? (
        <Card style={{ textAlign: 'center', padding: 48 }}><Spinner size={28} /></Card>
      ) : error ? (
        <Alert variant="error" title="Could not load pipeline options">
          {error}
          <div style={{ marginTop: 8 }}>
            <Button variant="secondary" size="sm" onClick={load}>Retry</Button>
          </div>
        </Alert>
      ) : pipelines.length === 0 ? (
        <EmptyState
          title="No pipelines found"
          description="Create a pipeline in your account first (e.g. 'Print Orders'), then reload this page."
          icon="📋"
        />
      ) : (
        <>
          <Card style={{ marginBottom: 16, padding: '16px 20px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: colors.gray500 }}>Pipeline</h4>
            <Select
              value={selectedPipeline?.pipelineId || ''}
              onChange={e => {
                const p = pipelines.find(x => x.pipelineId === e.target.value);
                setSelectedPipeline(p);
                if (p && p.stages?.length) {
                  const m = { ...mapping };
                  lifecycleStatuses.forEach((st, i) => {
                    if (!m[st.key]) m[st.key] = p.stages[Math.min(i, p.stages.length - 1)]?.stageId;
                  });
                  setMapping(m);
                }
              }}
              style={{ width: '100%' }}
            >
              {pipelines.map(p => <option key={p.pipelineId} value={p.pipelineId}>{p.pipelineName} ({(p.stages || []).length} stages)</option>)}
            </Select>
          </Card>

          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray500 }}>App Lifecycle Status</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray500 }}>Pipeline Stage</div>
            </div>
            {lifecycleStatuses.map(st => (
              <div key={st.key} style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.gray100}` }}>
                <div>
                  <Badge variant={st.key === 'order_error' || st.key === 'order_cancelled' ? 'error' : st.key === 'order_delivered' ? 'success' : 'info'} dot>
                    {st.label}
                  </Badge>
                  <span style={{ fontSize: 12, color: colors.gray400, marginLeft: 8 }}>{st.description}</span>
                </div>
                <Select value={mapping[st.key] || ''} onChange={e => setMapping(m => ({ ...m, [st.key]: e.target.value }))}>
                  <option value="" disabled>Select stage…</option>
                  {stageOptions()}
                </Select>
              </div>
            ))}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleSave} disabled={saving || !selectedPipeline}>
                {saving ? <><Spinner size={14} /> Saving…</> : '💾 Save Mapping'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
