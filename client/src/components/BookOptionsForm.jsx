/**
 * BookOptionsForm.jsx
 *
 * Shared progressive book options selection component.
 * Used by BOTH the Quote Calculator and Book Setup pages.
 *
 * Progressive selection flow (matches the COMPAT_TREE structure):
 *   Step 1: Trim Size → Step 2: Ink → Step 3: Quality → Step 4: Binding
 *   Step 5: Paper → Step 6: Cover Finish
 *
 * This component works ENTIRELY client-side using the options data passed
 * as props. No API calls are needed for the progressive selection — it
 * uses the compatibility tree (compatTree) directly.
 *
 * Props:
 *   fullOptions: object - The full options object from the API, including:
 *     - labels: { trim, ink, quality, binding, paper }
 *     - compatTree: the nested compatibility tree
 *     - shippingRates: { usDomestic, international }
 *     - coverFinishOptions: array of cover finish options
 *   onChange: function(components) - Called with { trim, ink, quality, binding, paper, coverFinish, podPackageId }
 *   initialComponents: object - Optional pre-selected values (for edit mode)
 *   compact: boolean - Use compact layout (for Book Setup page)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

const css = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

  .bof-option-card {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 14px 10px; border-radius: 10px; border: 2px solid #E5E7EB;
    cursor: pointer; transition: all 0.18s ease; background: #fff;
    text-align: center; gap: 5px; min-height: 80px; user-select: none;
  }
  .bof-option-card:hover:not(.bof-disabled) { border-color: #2563EB; background: #EFF6FF; }
  .bof-option-card.bof-selected { border-color: #2563EB; background: #EFF6FF; }
  .bof-option-card.bof-disabled { opacity: 0.38; cursor: not-allowed; background: #F9FAFB; }
  .bof-option-card .bof-label { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; }
  .bof-option-card .bof-desc  { font-size: 11px; color: #6B7280; line-height: 1.4; }
  .bof-option-card .bof-icon  { font-size: 20px; line-height: 1; }

  .bof-step-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6;
  }
  .bof-step-num {
    width: 26px; height: 26px; border-radius: 50%; background: #2563EB; color: #fff;
    font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .bof-step-title { font-size: 15px; font-weight: 700; color: #111827; }

  .bof-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .bof-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .bof-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .bof-grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  @media (max-width: 640px) {
    .bof-grid-4, .bof-grid-5 { grid-template-columns: repeat(2, 1fr); }
  }

  .bof-step-complete {
    background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;
    padding: 8px 12px; margin-bottom: 12px; font-size: 12px; color: #16A34A;
    display: flex; align-items: center; gap: 6px;
  }
  .bof-step-complete .bof-value { font-weight: 600; }

  .bof-compact .bof-option-card { min-height: 65px; padding: 10px 8px; }
  .bof-compact .bof-option-card .bof-label { font-size: 12px; }
  .bof-compact .bof-option-card .bof-icon { font-size: 18px; }
  .bof-compact .bof-step-header { margin-bottom: 10px; }
`;

// Icons for each binding type
const BINDING_ICONS = { PB: '📖', CW: '📕', LW: '🏅', CO: '🔄', WO: '📎', SS: '✂️' };
const INK_ICONS = { BW: '⬛', FC: '🎨' };

// Descriptions
const BINDING_DESC = {
  PB: 'Glued spine — standard paperback',
  CW: 'Hardcover — printed cover wrap',
  LW: 'Hardcover — linen cloth with foil stamp',
  CO: 'Plastic coil — lays flat when open',
  WO: 'Metal wire — professional notebooks',
  SS: 'Stapled — magazines & booklets',
};
const INK_DESC = { BW: 'Standard B&W interior printing', FC: 'Full color interior printing' };
const QUALITY_DESC = { STD: 'Standard print quality', PRE: 'Premium — sharper, richer' };

function OptionCard({ code, label, description, selected, onSelect, icon, compact }) {
  return (
    <div
      className={`bof-option-card${selected ? ' bof-selected' : ''}`}
      onClick={() => onSelect(code)}
      role="button"
      aria-pressed={selected}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(code); }}
    >
      {icon && <span className="bof-icon">{icon}</span>}
      <span className="bof-label">{label}</span>
      {description && !compact && <span className="bof-desc">{description}</span>}
    </div>
  );
}

function StepComplete({ label, value }) {
  return (
    <div className="bof-step-complete">
      <span>✅</span>
      <span>{label}: <span className="bof-value">{value}</span></span>
    </div>
  );
}

/**
 * Build pod_package_id from components.
 */
function buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish = 'MXX' }) {
  return `${trim}.${ink}.${quality}.${binding}.${paper}.${coverFinish}`;
}

/**
 * Get available inks for a given trim (from compatTree).
 */
function getAvailableInks(trim, compatTree, inkLabels) {
  if (!trim || !compatTree[trim]) return Object.keys(inkLabels);
  return Object.keys(compatTree[trim]);
}

/**
 * Get available qualities for a given trim + ink.
 */
function getAvailableQualities(trim, ink, compatTree, qualityLabels) {
  if (!trim || !ink || !compatTree[trim] || !compatTree[trim][ink]) {
    return Object.keys(qualityLabels);
  }
  return Object.keys(compatTree[trim][ink]);
}

/**
 * Get available bindings for a given trim + ink + quality.
 */
function getAvailableBindings(trim, ink, quality, compatTree, bindingLabels) {
  if (!trim || !ink || !quality) {
    return Object.keys(bindingLabels);
  }
  const qualityNode = compatTree[trim]?.[ink]?.[quality];
  if (!qualityNode) return Object.keys(bindingLabels);
  return Object.keys(qualityNode);
}

/**
 * Get available papers for a given trim + ink + quality + binding.
 */
function getAvailablePapers(trim, ink, quality, binding, compatTree, paperLabels) {
  if (!trim || !ink || !quality || !binding) {
    return Object.keys(paperLabels);
  }
  const papers = compatTree[trim]?.[ink]?.[quality]?.[binding];
  return papers || Object.keys(paperLabels);
}

/**
 * Get available cover finishes for a given binding.
 */
function getAvailableCoverFinishes(binding) {
  const base = [
    { code: 'MXX', label: 'Matte', description: 'Flat finish — elegant, reduced glare' },
    { code: 'GXX', label: 'Gloss', description: 'Shiny finish — vibrant colors' },
  ];
  if (binding === 'LW') {
    const linens = ['BB', 'BG', 'BW', 'FB', 'FG', 'FW', 'GB', 'GG', 'GW', 'NB', 'NG', 'NW', 'RB', 'RG', 'RW', 'TB', 'TG', 'TW'];
    const baseLabels = { M: 'Matte', G: 'Gloss' };
    const linenLabels = {
      B: 'Black', G: 'Gold', W: 'White',
      F: 'Forest', N: 'Navy', R: 'Red', T: 'Teal',
    };
    for (const [baseChar, baseLabel] of Object.entries(baseLabels)) {
      for (const [linenChar, linenLabel] of Object.entries(linenLabels)) {
        const code = `${baseChar}${linenChar}`;
        base.push({
          code,
          label: `${baseLabel} — ${linenLabel} Linen`,
          description: `Linen Wrap with ${baseLabel} lamination and ${linenLabel} linen cloth`,
        });
      }
    }
  }
  return base;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookOptionsForm({ fullOptions, onChange, initialComponents, compact }) {
  // Extract labels and compat tree from fullOptions
  const labels = fullOptions?.labels || {};
  const compatTree = fullOptions?.compatTree || {};

  // ── Selection state ──────────────────────────────────────────────────────
  const [trim, setTrim] = useState(initialComponents?.trim || '');
  const [ink, setInk] = useState(initialComponents?.ink || '');
  const [quality, setQuality] = useState(initialComponents?.quality || '');
  const [binding, setBinding] = useState(initialComponents?.binding || '');
  const [paper, setPaper] = useState(initialComponents?.paper || '');
  const [coverFinish, setCoverFinish] = useState(initialComponents?.coverFinish || 'MXX');

  // ── Available options at each step (computed client-side) ───────────────
  const [availableInks, setAvailableInks] = useState([]);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [availableBindings, setAvailableBindings] = useState([]);
  const [availablePapers, setAvailablePapers] = useState([]);
  const [availableCoverFinishes, setAvailableCoverFinishes] = useState([]);

  // ── Current step (1 = trim, 7 = all done) ──────────────────────────────
  // This is derived PURELY from which fields are selected — NOT from effects.
  const currentStep = trim
    ? (ink
      ? (quality
        ? (binding
          ? (paper
            ? (coverFinish ? 7 : 6)
            : 5)
          : 4)
        : 3)
      : 2)
    : 1;

  // ── Ref to track whether we've already emitted the full selection ─────
  const lastEmittedRef = useRef('');

  // ── Notify parent of changes — ALWAYS emit all current values ──────────
  const emitChange = useCallback(() => {
    if (!onChange) return;
    onChange({
      trim,
      ink,
      quality,
      binding,
      paper,
      coverFinish,
      podPackageId: buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish }),
    });
  }, [trim, ink, quality, binding, paper, coverFinish, onChange]);

  // Emit whenever any field changes so parent always has latest values
  useEffect(() => {
    const key = `${trim}|${ink}|${quality}|${binding}|${paper}|${coverFinish}`;
    if (key !== lastEmittedRef.current) {
      lastEmittedRef.current = key;
      emitChange();
    }
  }, [trim, ink, quality, binding, paper, coverFinish, emitChange]);

  // ── Auto-complete: set available options ───────────────────────────────
  useEffect(() => {
    if (trim) {
      const inks = getAvailableInks(trim, compatTree, labels.ink || {});
      setAvailableInks(inks);
    }
  }, [trim, compatTree, labels.ink]);

  useEffect(() => {
    if (trim && ink) {
      const qualities = getAvailableQualities(trim, ink, compatTree, labels.quality || {});
      setAvailableQualities(qualities);
    }
  }, [trim, ink, compatTree, labels.quality]);

  useEffect(() => {
    if (trim && ink && quality) {
      const bindings = getAvailableBindings(trim, ink, quality, compatTree, labels.binding || {});
      setAvailableBindings(bindings);
    }
  }, [trim, ink, quality, compatTree, labels.binding]);

  useEffect(() => {
    if (trim && ink && quality && binding) {
      const papers = getAvailablePapers(trim, ink, quality, binding, compatTree, labels.paper || {});
      setAvailablePapers(papers);
    }
  }, [trim, ink, quality, binding, compatTree, labels.paper]);

  useEffect(() => {
    if (binding) {
      const finishes = getAvailableCoverFinishes(binding);
      setAvailableCoverFinishes(finishes);
    }
  }, [binding]);

  // ── Auto-complete from initialComponents ────────────────────────────────
  useEffect(() => {
    if (initialComponents?.trim && initialComponents?.binding &&
        initialComponents?.ink && initialComponents?.quality &&
        initialComponents?.paper) {
      const { trim: t, binding: b, ink: i, quality: q, paper: p, coverFinish: cf } = initialComponents;
      setTrim(t);
      setInk(i);
      setQuality(q);
      setBinding(b);
      setPaper(p);
      setCoverFinish(cf || 'MXX');
    }
  }, [initialComponents]);

  // ── Step Handlers ──────────────────────────────────────────────────────

  function handleTrimSelect(selectedTrim) {
    setTrim(selectedTrim);
    setInk('');
    setQuality('');
    setBinding('');
    setPaper('');
    setCoverFinish('MXX');
    setAvailableInks([]);
    setAvailableQualities([]);
    setAvailableBindings([]);
    setAvailablePapers([]);
    setAvailableCoverFinishes([]);
  }

  function handleInkSelect(selectedInk) {
    setInk(selectedInk);
    setQuality('');
    setBinding('');
    setPaper('');
    setCoverFinish('MXX');
    setAvailableQualities([]);
    setAvailableBindings([]);
    setAvailablePapers([]);
    setAvailableCoverFinishes([]);
  }

  function handleQualitySelect(selectedQuality) {
    setQuality(selectedQuality);
    setBinding('');
    setPaper('');
    setCoverFinish('MXX');
    setAvailableBindings([]);
    setAvailablePapers([]);
    setAvailableCoverFinishes([]);
  }

  function handleBindingSelect(selectedBinding) {
    setBinding(selectedBinding);
    setPaper('');
    setCoverFinish('MXX');
    setAvailablePapers([]);
    setAvailableCoverFinishes([]);
  }

  function handlePaperSelect(selectedPaper) {
    setPaper(selectedPaper);
    setCoverFinish('MXX');
    setAvailableCoverFinishes([]);
  }

  function handleCoverFinishSelect(selectedFinish) {
    setCoverFinish(selectedFinish);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={compact ? 'bof-compact' : ''}>
      <style>{css}</style>

      {/* Step 1: Trim Size — always shown */}
      {currentStep <= 1 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bof-step-header">
            <span className="bof-step-num">1</span>
            <span className="bof-step-title">Book Size (Trim)</span>
          </div>
          <div className="bof-grid-3">
            {Object.entries(labels.trim || {}).map(([code, label]) => (
              <OptionCard
                key={code}
                code={code}
                label={label}
                selected={trim === code}
                onSelect={handleTrimSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Ink — shown after trim is selected */}
      {currentStep === 2 && availableInks.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={labels.trim?.[trim] || trim} />
          <div className="bof-step-header">
            <span className="bof-step-num">2</span>
            <span className="bof-step-title">Interior Color</span>
          </div>
          <div className="bof-grid-2">
            {availableInks.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={labels.ink?.[code] || code}
                description={INK_DESC[code] || ''}
                selected={ink === code}
                onSelect={handleInkSelect}
                icon={INK_ICONS[code] || ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Quality — shown after ink is selected */}
      {currentStep === 3 && availableQualities.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={labels.trim?.[trim] || trim} />
          <StepComplete label="Interior Color" value={labels.ink?.[ink] || ink} />
          <div className="bof-step-header">
            <span className="bof-step-num">3</span>
            <span className="bof-step-title">Print Quality</span>
          </div>
          <div className="bof-grid-2">
            {availableQualities.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={labels.quality?.[code] || code}
                description={QUALITY_DESC[code] || ''}
                selected={quality === code}
                onSelect={handleQualitySelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Binding — shown after quality is selected */}
      {currentStep === 4 && availableBindings.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={labels.trim?.[trim] || trim} />
          <StepComplete label="Interior Color" value={labels.ink?.[ink] || ink} />
          <StepComplete label="Quality" value={labels.quality?.[quality] || quality} />
          <div className="bof-step-header">
            <span className="bof-step-num">4</span>
            <span className="bof-step-title">Binding Type</span>
          </div>
          <div className="bof-grid-3">
            {availableBindings.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={labels.binding?.[code] || code}
                description={BINDING_DESC[code] || ''}
                selected={binding === code}
                onSelect={handleBindingSelect}
                icon={BINDING_ICONS[code] || '📖'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Paper — shown after binding is selected */}
      {currentStep === 5 && availablePapers.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={labels.trim?.[trim] || trim} />
          <StepComplete label="Interior Color" value={labels.ink?.[ink] || ink} />
          <StepComplete label="Quality" value={labels.quality?.[quality] || quality} />
          <StepComplete label="Binding" value={labels.binding?.[binding] || binding} />
          <div className="bof-step-header">
            <span className="bof-step-num">5</span>
            <span className="bof-step-title">Paper Type</span>
          </div>
          <div className={availablePapers.length <= 3 ? 'bof-grid-3' : availablePapers.length <= 4 ? 'bof-grid-4' : 'bof-grid-5'}>
            {availablePapers.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={labels.paper?.[code] || code}
                selected={paper === code}
                onSelect={handlePaperSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Cover Finish — shown after paper is selected */}
      {currentStep === 6 && availableCoverFinishes.length > 0 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={labels.trim?.[trim] || trim} />
          <StepComplete label="Interior Color" value={labels.ink?.[ink] || ink} />
          <StepComplete label="Quality" value={labels.quality?.[quality] || quality} />
          <StepComplete label="Binding" value={labels.binding?.[binding] || binding} />
          <StepComplete label="Paper" value={labels.paper?.[paper] || paper} />
          <div className="bof-step-header">
            <span className="bof-step-num">6</span>
            <span className="bof-step-title">Cover Finish</span>
          </div>
          <div className={availableCoverFinishes.length <= 4 ? 'bof-grid-4' : 'bof-grid-5'}>
            {availableCoverFinishes.map(({ code, label, description }) => (
              <OptionCard
                key={code}
                code={code}
                label={label}
                description={description || ''}
                selected={coverFinish === code}
                onSelect={handleCoverFinishSelect}
                icon={code.startsWith('G') ? '✨' : code.startsWith('M') ? '🪵' : '🎨'}
              />
            ))}
          </div>
        </div>
      )}

      {/* All steps complete — show summary */}
      {currentStep >= 7 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={labels.trim?.[trim] || trim} />
          <StepComplete label="Interior Color" value={labels.ink?.[ink] || ink} />
          <StepComplete label="Quality" value={labels.quality?.[quality] || quality} />
          <StepComplete label="Binding" value={labels.binding?.[binding] || binding} />
          <StepComplete label="Paper" value={labels.paper?.[paper] || paper} />
          <StepComplete label="Cover" value={coverFinish === 'MXX' ? 'Matte' : coverFinish === 'GXX' ? 'Gloss' : coverFinish} />
          {compact && (
            <div style={{ marginTop: 8, padding: 8, background: '#F9FAFB', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <strong>SKU:</strong> {buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
