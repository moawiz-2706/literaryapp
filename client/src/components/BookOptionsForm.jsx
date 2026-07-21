import React, { useState, useEffect, useCallback } from 'react';
import { fetchAvailableOptions, buildPodPackageId } from '../services/optionsService';

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
  .bof-grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
  @media (max-width: 640px) {
    .bof-grid-4, .bof-grid-5, .bof-grid-6 { grid-template-columns: repeat(2, 1fr); }
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

function OptionCard({ code, label, description, selected, disabled, onSelect, icon, compact }) {
  return (
    <div
      className={`bof-option-card${selected ? ' bof-selected' : ''}${disabled ? ' bof-disabled' : ''}`}
      onClick={() => !disabled && onSelect(code)}
      role="button"
      aria-pressed={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onSelect(code); }}
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

export default function BookOptionsForm({ onChange, initialComponents, labels, compact }) {
  // Component state
  const [trim, setTrim] = useState(initialComponents?.trim || '');
  const [binding, setBinding] = useState(initialComponents?.binding || '');
  const [ink, setInk] = useState(initialComponents?.ink || '');
  const [quality, setQuality] = useState(initialComponents?.quality || '');
  const [paper, setPaper] = useState(initialComponents?.paper || '');
  const [coverFinish, setCoverFinish] = useState(initialComponents?.coverFinish || 'MXX');

  // Available options at each step
  const [availableInks, setAvailableInks] = useState(null);
  const [availableQualities, setAvailableQualities] = useState(null);
  const [availableBindings, setAvailableBindings] = useState(null);
  const [availablePapers, setAvailablePapers] = useState(null);
  const [availableCoverFinishes, setAvailableCoverFinishes] = useState(null);

  // Current step (1-6)
  const [currentStep, setCurrentStep] = useState(initialComponents?.trim ? 6 : 1);

  // Notify parent of changes
  const emitChange = useCallback((newState) => {
    if (onChange) {
      onChange({
        trim: newState.trim || trim,
        binding: newState.binding || binding,
        ink: newState.ink || ink,
        quality: newState.quality || quality,
        paper: newState.paper || paper,
        coverFinish: newState.coverFinish || coverFinish,
        podPackageId: buildPodPackageId({
          trim: newState.trim || trim,
          ink: newState.ink || ink,
          quality: newState.quality || quality,
          binding: newState.binding || binding,
          paper: newState.paper || paper,
          coverFinish: newState.coverFinish || coverFinish,
        }),
      });
    }
  }, [trim, binding, ink, quality, paper, coverFinish, onChange]);

  // Load initial options when labels are available
  useEffect(() => {
    if (labels?.trim && !trim) {
      const defaultTrim = '0600X0900';
      setTrim(defaultTrim);
      setCurrentStep(2);
      // Trigger binding availability load
    }
  }, [labels]);

  // When trim changes, load available bindings
  useEffect(() => {
    if (!trim) return;
    loadStepOptions({ trim });
  }, [trim]);

  // When binding changes, load available inks
  useEffect(() => {
    if (!trim || !binding) return;
    loadStepOptions({ trim, binding });
  }, [trim, binding]);

  // When ink changes, load available qualities
  useEffect(() => {
    if (!trim || !binding || !ink) return;
    loadStepOptions({ trim, binding, ink });
  }, [trim, binding, ink]);

  // When quality changes, load available papers
  useEffect(() => {
    if (!trim || !binding || !ink || !quality) return;
    loadStepOptions({ trim, binding, ink, quality });
  }, [trim, binding, ink, quality]);

  async function loadStepOptions(selections) {
    try {
      const result = await fetchAvailableOptions(selections);
      if (result.availableBindings) {
        setAvailableBindings(result.availableBindings);
        setCurrentStep(2);
      }
      if (result.availableInks) {
        setAvailableInks(result.availableInks);
        setCurrentStep(3);
      }
      if (result.availableQualities) {
        setAvailableQualities(result.availableQualities);
        setCurrentStep(4);
      }
      if (result.availablePapers) {
        setAvailablePapers(result.availablePapers);
        setCurrentStep(5);
      }
      if (result.availableCoverFinishes) {
        setAvailableCoverFinishes(result.availableCoverFinishes);
        setCurrentStep(6);
      }
    } catch (err) {
      console.error('[BookOptionsForm] Failed to load options:', err.message);
    }
  }

  // Handle initial load when labels arrive
  useEffect(() => {
    if (!labels?.trim || !trim) return;
    // Build initial selection key
    const key = trim;
    if (labels.trimInkBindings?.[key]) {
      const bindings = labels.trimInkBindings[key];
      setAvailableBindings(bindings);
      setCurrentStep(bindings.length > 0 ? 2 : 1);
    }
  }, [labels]);

  // Auto-complete initial state if all components provided
  useEffect(() => {
    if (initialComponents?.trim && initialComponents?.binding && initialComponents?.ink &&
        initialComponents?.quality && initialComponents?.paper) {
      const { trim: t, binding: b, ink: i, quality: q, paper: p, coverFinish: cf } = initialComponents;
      setTrim(t);
      setBinding(b);
      setInk(i);
      setQuality(q);
      setPaper(p);
      setCoverFinish(cf || 'MXX');
      setCurrentStep(7); // All steps complete
      // Still load available options for validation
      loadStepOptions({ trim: t, binding: b, ink: i, quality: q });
    }
  }, [initialComponents]);

  // ── Step Handlers ──────────────────────────────────────────────────────────

  function handleTrimSelect(selectedTrim) {
    setTrim(selectedTrim);
    setBinding('');
    setInk('');
    setQuality('');
    setPaper('');
    setCoverFinish('MXX');
    setCurrentStep(2);
    emitChange({ trim: selectedTrim });
  }

  function handleBindingSelect(selectedBinding) {
    setBinding(selectedBinding);
    setInk('');
    setQuality('');
    setPaper('');
    setCoverFinish('MXX');
    setCurrentStep(3);
    emitChange({ binding: selectedBinding });
  }

  function handleInkSelect(selectedInk) {
    setInk(selectedInk);
    setQuality('');
    setPaper('');
    setCurrentStep(4);
    emitChange({ ink: selectedInk });
  }

  function handleQualitySelect(selectedQuality) {
    setQuality(selectedQuality);
    setPaper('');
    setCurrentStep(5);
    emitChange({ quality: selectedQuality });
  }

  function handlePaperSelect(selectedPaper) {
    setPaper(selectedPaper);
    setCurrentStep(6);
    emitChange({ paper: selectedPaper });
  }

  function handleCoverFinishSelect(selectedFinish) {
    setCoverFinish(selectedFinish);
    setCurrentStep(7);
    emitChange({ coverFinish: selectedFinish });
  }

  // ── Render Steps ───────────────────────────────────────────────────────────

  const stepLabels = labels || {};

  return (
    <div className={compact ? 'bof-compact' : ''}>
      <style>{css}</style>

      {/* Step 1: Trim Size */}
      {currentStep <= 1 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bof-step-header">
            <span className="bof-step-num">1</span>
            <span className="bof-step-title">Book Size (Trim)</span>
          </div>
          <div className="bof-grid-3">
            {Object.entries(stepLabels.trim || {}).map(([code, label]) => (
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

      {/* Step 2: Binding */}
      {currentStep === 2 && availableBindings && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bof-step-header">
            <span className="bof-step-num">2</span>
            <span className="bof-step-title">Binding Type</span>
          </div>
          <div className="bof-grid-3">
            {availableBindings.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={stepLabels.binding?.[code] || code}
                description={BINDING_DESC[code] || ''}
                selected={binding === code}
                onSelect={handleBindingSelect}
                icon={BINDING_ICONS[code] || '📖'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Ink */}
      {currentStep === 3 && availableInks && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bof-step-header">
            <span className="bof-step-num">3</span>
            <span className="bof-step-title">Interior Color</span>
          </div>
          <div className="bof-grid-2">
            {availableInks.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={stepLabels.ink?.[code] || code}
                description={INK_DESC[code] || ''}
                selected={ink === code}
                onSelect={handleInkSelect}
                icon={INK_ICONS[code] || ''}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Quality */}
      {currentStep === 4 && availableQualities && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bof-step-header">
            <span className="bof-step-num">4</span>
            <span className="bof-step-title">Print Quality</span>
          </div>
          <div className="bof-grid-2">
            {availableQualities.map(code => (
              <OptionCard
                key={code}
                code={code}
                label={stepLabels.quality?.[code] || code}
                description={QUALITY_DESC[code] || ''}
                selected={quality === code}
                onSelect={handleQualitySelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Paper */}
      {currentStep === 5 && availablePapers && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="bof-step-header">
            <span className="bof-step-num">5</span>
            <span className="bof-step-title">Paper Type</span>
          </div>
          <div className={availablePapers.length <= 3 ? 'bof-grid-3' : availablePapers.length <= 4 ? 'bof-grid-4' : 'bof-grid-5'}>
            {availablePapers.map(({ code, label }) => (
              <OptionCard
                key={code}
                code={code}
                label={label || code}
                selected={paper === code}
                onSelect={handlePaperSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Cover Finish */}
      {currentStep === 6 && availableCoverFinishes && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
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

      {/* All steps complete - show summary */}
      {currentStep >= 7 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <StepComplete label="Trim" value={stepLabels.trim?.[trim] || trim} />
          <StepComplete label="Binding" value={stepLabels.binding?.[binding] || binding} />
          <StepComplete label="Ink" value={stepLabels.ink?.[ink] || ink} />
          <StepComplete label="Quality" value={stepLabels.quality?.[quality] || quality} />
          <StepComplete label="Paper" value={stepLabels.paper?.[paper] || paper} />
          <StepComplete label="Cover" value={coverFinish} />
          {compact && (
            <div style={{ marginTop: 8, padding: 8, background: '#F9FAFB', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <strong>SKU:</strong> {buildPodPackageId({ trim, binding, ink, quality, paper, coverFinish })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}