import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { colors, Button, Card, Alert, Spinner, PageHeader } from '../components/UI';

// ─────────────────────────────────────────────────────────────────────────────
// Static fallback data — used only if the /quotes/options API call fails.
// Keys match the new backend response shape exactly.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_LABELS = {
  trim: {
    '0425X0687': '4.25" × 6.87" (Digest)',
    '0500X0800': '5" × 8"',
    '0550X0850': '5.5" × 8.5" (Half Letter)',
    '0583X0827': '5.83" × 8.27" (A5)',
    '0600X0900': '6" × 9" (US Trade — Most Popular)',
    '0614X0921': '6.14" × 9.21"',
    '0663X1025': '6.63" × 10.25"',
    '0700X1000': '7" × 10"',
    '0744X0968': '7.44" × 9.68" (Crown Quarto)',
    '0750X0750': '7.5" × 7.5" (Small Square)',
    '0827X1169': '8.27" × 11.69" (A4)',
    '0850X0850': '8.5" × 8.5" (Square)',
    '0850X1100': '8.5" × 11" (US Letter)',
    '0900X0700': '9" × 7" (Landscape)',
    '1100X0850': '11" × 8.5" (Landscape Letter)',
    '1169X0827': '11.69" × 8.27" (A4 Landscape)',
  },
  ink:     { BW: 'Black & White', FC: 'Full Color' },
  quality: { STD: 'Standard', PRE: 'Premium' },
  binding: {
    PB: 'Perfect Bound (Paperback)',
    CW: 'Case Wrap (Hardcover)',
    CO: 'Coil Bound',
    SS: 'Saddle Stitch (Stapled)',
    LW: 'Linen Wrap (Hardcover)',
    WO: 'Wire-O',
  },
  paper: {
    '060UW444': '60# Uncoated White (Standard)',
    '060UC444': '60# Uncoated Cream (Standard)',
    '070CW460': '70# Coated White (Thick)',
    '080CW444': '80# Coated White (Premium)',
    '100CW200': '100# Coated White (Heavy)',
  },
  shipping: {
    MAIL:          'Standard Mail (Slowest)',
    PRIORITY_MAIL: 'Priority Mail',
    GROUND:        'Ground (Courier)',
    GROUND_HD:     'Ground Home Delivery',
    GROUND_BUS:    'Ground Business',
    EXPEDITED:     'Expedited (2-Day)',
    EXPRESS:       'Express (Overnight)',
  },
};

// Minimal fallback compat tree for the most common trim
const FALLBACK_COMPAT_TREE = {
  '0600X0900': {
    BW: { STD: { PB: ['060UW444','060UC444','080CW444'], CW: ['060UW444','060UC444','080CW444'] },
          PRE: { PB: ['060UW444','060UC444','080CW444'], CW: ['060UW444','060UC444','080CW444'] } },
    FC: { STD: { PB: ['060UW444','080CW444'], CW: ['060UW444','080CW444'] },
          PRE: { PB: ['060UW444','080CW444'], CW: ['060UW444','080CW444'] } },
  },
};

const FALLBACK_TRIM_INK_BINDINGS = {
  '0600X0900': { BW: ['PB','CW','CO','SS','LW'], FC: ['PB','CW','CO','SS','LW'] },
};

const FALLBACK_SHIPPING_OPTIONS = [
  { id: 'MAIL',          label: 'Standard Mail',        days: '7–14 business days' },
  { id: 'PRIORITY_MAIL', label: 'Priority Mail',        days: '5–10 business days' },
  { id: 'GROUND',        label: 'Ground',               days: '5–7 business days'  },
  { id: 'GROUND_HD',     label: 'Ground Home Delivery', days: '5–7 business days'  },
  { id: 'GROUND_BUS',    label: 'Ground Business',      days: '5–7 business days'  },
  { id: 'EXPEDITED',     label: 'Expedited',            days: '3–5 business days'  },
  { id: 'EXPRESS',       label: 'Express',              days: '1–2 business days'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Descriptions for option cards (not in the API — purely UI copy)
// ─────────────────────────────────────────────────────────────────────────────
const BINDING_DESC = {
  PB: 'Glued spine — standard paperback',
  CW: 'Hardcover — printed cover wrap',
  LW: 'Hardcover — linen cloth with foil stamp',
  CO: 'Plastic coil — lays flat when open',
  WO: 'Metal wire — professional notebooks',
  SS: 'Stapled — magazines & booklets',
};
const PAPER_DESC = {
  '060UW444': 'Standard white — ideal for text-heavy books',
  '060UC444': 'Warm cream tone — classic novel feel',
  '070CW460': 'Thick coated — great for images',
  '080CW444': 'Bright coated — best for color & images',
  '100CW200': 'Heavy coated — professional notebooks',
};
const INK_DESC = {
  BW: 'Standard B&W interior printing',
  FC: 'Full color interior printing',
};
const QUALITY_DESC = {
  STD: 'Standard print quality',
  PRE: 'Premium print quality — sharper, richer',
};
const SHIPPING_DAYS = {
  MAIL:          '7–14 business days',
  PRIORITY_MAIL: '5–10 business days',
  GROUND:        '5–7 business days',
  GROUND_HD:     '5–7 business days',
  GROUND_BUS:    '5–7 business days',
  EXPEDITED:     '3–5 business days',
  EXPRESS:       '1–2 business days',
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const css = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.5; } }

  .qc-option-card {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 16px 12px; border-radius: 10px; border: 2px solid #E5E7EB;
    cursor: pointer; transition: all 0.18s ease; background: #fff;
    text-align: center; gap: 6px; min-height: 90px; user-select: none;
  }
  .qc-option-card:hover:not(.qc-disabled) { border-color: #2563EB; background: #EFF6FF; }
  .qc-option-card.qc-selected { border-color: #2563EB; background: #EFF6FF; }
  .qc-option-card.qc-disabled { opacity: 0.38; cursor: not-allowed; background: #F9FAFB; }
  .qc-option-card .qc-label { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.3; }
  .qc-option-card .qc-desc  { font-size: 11px; color: #6B7280; line-height: 1.4; }
  .qc-option-card .qc-icon  { font-size: 22px; line-height: 1; }

  .qc-step-header {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #F3F4F6;
  }
  .qc-step-num {
    width: 28px; height: 28px; border-radius: 50%; background: #2563EB; color: #fff;
    font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .qc-step-title { font-size: 16px; font-weight: 700; color: #111827; }
  .qc-step-sub   { font-size: 13px; color: #6B7280; margin-top: 1px; }

  .qc-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .qc-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .qc-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  @media (max-width: 640px) {
    .qc-grid-3, .qc-grid-4 { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 400px) {
    .qc-grid-2, .qc-grid-3, .qc-grid-4 { grid-template-columns: 1fr 1fr; }
  }

  .qc-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F3F4F6; }
  .qc-summary-row:last-child { border-bottom: none; }
  .qc-summary-label { font-size: 13px; color: #6B7280; }
  .qc-summary-value { font-size: 14px; font-weight: 500; color: #111827; font-family: monospace; }

  .qc-result-card { animation: fadeIn 0.3s ease; }

  .qc-select-native {
    width: 100%; padding: 9px 12px; font-size: 14px; border-radius: 8px;
    border: 1px solid #D1D5DB; outline: none; background: #fff; color: #111827;
    font-family: inherit; margin-bottom: 16px; box-sizing: border-box;
  }
  .qc-select-native:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .qc-label-sm { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }

  .qc-qty-row { display: flex; align-items: center; gap: 10px; }
  .qc-qty-btn {
    width: 36px; height: 36px; border-radius: 8px; border: 1px solid #D1D5DB;
    background: #F9FAFB; font-size: 18px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s;
  }
  .qc-qty-btn:hover { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }
  .qc-qty-input {
    width: 70px; text-align: center; padding: 8px; font-size: 15px; font-weight: 600;
    border-radius: 8px; border: 1px solid #D1D5DB; outline: none; font-family: inherit;
  }
  .qc-qty-input:focus { border-color: #2563EB; }

  .qc-live-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; color: #16A34A;
    background: #F0FDF4; border: 1px solid #BBF7D0;
    border-radius: 999px; padding: 2px 10px;
  }
  .qc-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #16A34A; animation: pulse 1.5s infinite; }

  .qc-addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  @media (max-width: 500px) { .qc-addr-grid { grid-template-columns: 1fr; } }

  .qc-suggestion-box {
    background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px;
    padding: 12px 16px; margin-top: 8px; font-size: 13px; color: #92400E;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Icon helpers
// ─────────────────────────────────────────────────────────────────────────────
const BINDING_ICONS = { PB: '📖', CW: '📕', LW: '🏅', CO: '🔄', WO: '📎', SS: '✂️' };
const INK_ICONS     = { BW: '⬛', FC: '🎨' };
const FINISH_ICONS  = { G: '✨', M: '🪵' };

// ─────────────────────────────────────────────────────────────────────────────
// OptionCard — a clickable visual card for selecting a print option
// ─────────────────────────────────────────────────────────────────────────────
function OptionCard({ code, label, description, days, selected, disabled, onSelect, icon }) {
  return (
    <div
      className={`qc-option-card${selected ? ' qc-selected' : ''}${disabled ? ' qc-disabled' : ''}`}
      onClick={() => !disabled && onSelect(code)}
      role="button"
      aria-pressed={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onSelect(code); }}
    >
      {icon && <span className="qc-icon">{icon}</span>}
      <span className="qc-label">{label}</span>
      {description && <span className="qc-desc">{description}</span>}
      {days && <span className="qc-desc">{days}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function QuoteCalculatorPage() {
  const [searchParams] = useSearchParams();

  // ── Options loaded from API ────────────────────────────────────────────────
  const [labels,          setLabels]          = useState(FALLBACK_LABELS);
  const [compatTree,      setCompatTree]      = useState(FALLBACK_COMPAT_TREE);
  const [trimInkBindings, setTrimInkBindings] = useState(FALLBACK_TRIM_INK_BINDINGS);
  const [shippingOptions, setShippingOptions] = useState(FALLBACK_SHIPPING_OPTIONS);
  const [optsLoading,     setOptsLoading]     = useState(true);
  const [optsError,       setOptsError]       = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setFormState] = useState({
    trim:     '0600X0900',
    ink:      'BW',
    quality:  'STD',
    binding:  'PB',
    paper:    '060UW444',
    coverFinish: 'MXX',   // Matte (M) + no linen/foil (XX) → MXX
    pageCount:   '',
    quantity:    1,
    retailPrice: '',
    shippingLevel: 'MAIL',
    useCustomAddress: false,
    street1: '', city: '', stateCode: '', countryCode: 'US', postcode: '', phoneNumber: '',
  });

  // ── Validation errors ──────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Quote result ───────────────────────────────────────────────────────────
  const [result,    setResult]   = useState(null);
  const [loading,   setLoading]  = useState(false);
  const [apiError,  setApiError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // ── Load options from API ──────────────────────────────────────────────────
  useEffect(() => {
    api.get('/quotes/options')
      .then(r => {
        const d = r.data;
        if (d.labels)          setLabels(d.labels);
        if (d.compatTree)      setCompatTree(d.compatTree);
        if (d.trimInkBindings) setTrimInkBindings(d.trimInkBindings);
        if (d.shippingOptions) setShippingOptions(d.shippingOptions);
        setOptsLoading(false);
      })
      .catch(() => {
        setOptsError(true);
        setOptsLoading(false);
      });
  }, []);

  // ── Derived: available options based on current selections ────────────────
  // Available bindings for (trim, ink)
  const availableBindings = trimInkBindings?.[form.trim]?.[form.ink]
    || trimInkBindings?.[form.trim]?.BW
    || Object.keys(BINDING_DESC);

  // Available inks for current trim
  const availableInks = compatTree?.[form.trim]
    ? Object.keys(compatTree[form.trim])
    : ['BW', 'FC'];

  // Available qualities for (trim, ink)
  const availableQualities = compatTree?.[form.trim]?.[form.ink]
    ? Object.keys(compatTree[form.trim][form.ink])
    : ['STD', 'PRE'];

  // Available papers for (trim, ink, quality, binding)
  const availablePapers = compatTree?.[form.trim]?.[form.ink]?.[form.quality]?.[form.binding]
    || ['060UW444', '060UC444', '080CW444'];

  // Cover finish options (always available, cosmetic only)
  const coverFinishOptions = [
    { code: 'MXX', label: 'Matte', description: 'Flat finish — elegant, reduced glare' },
    { code: 'GXX', label: 'Gloss', description: 'Shiny finish — vibrant colors' },
  ];

  const showLinenFoil = form.binding === 'LW';

  // ── Auto-fix incompatible selections when a parent option changes ──────────
  const setField = useCallback((field, value) => {
    setFormState(prev => {
      const next = { ...prev, [field]: value };

      if (field === 'trim') {
        // Ensure ink is valid for new trim
        const validInks = compatTree?.[value] ? Object.keys(compatTree[value]) : null;
        if (validInks && !validInks.includes(next.ink)) {
          next.ink = validInks[0] || 'BW';
        }
        // Ensure binding is valid for new (trim, ink)
        const validBindings = trimInkBindings?.[value]?.[next.ink];
        if (validBindings && !validBindings.includes(next.binding)) {
          next.binding = validBindings.includes('PB') ? 'PB' : validBindings[0];
        }
        // Ensure quality is valid
        const validQualities = compatTree?.[value]?.[next.ink]
          ? Object.keys(compatTree[value][next.ink]) : null;
        if (validQualities && !validQualities.includes(next.quality)) {
          next.quality = validQualities.includes('STD') ? 'STD' : validQualities[0];
        }
        // Ensure paper is valid
        const validPapers = compatTree?.[value]?.[next.ink]?.[next.quality]?.[next.binding];
        if (validPapers && !validPapers.includes(next.paper)) {
          next.paper = validPapers.includes('060UW444') ? '060UW444' : validPapers[0];
        }
      }

      if (field === 'ink') {
        // Ensure binding is valid for new (trim, ink)
        const validBindings = trimInkBindings?.[next.trim]?.[value];
        if (validBindings && !validBindings.includes(next.binding)) {
          next.binding = validBindings.includes('PB') ? 'PB' : validBindings[0];
        }
        // Ensure quality is valid
        const validQualities = compatTree?.[next.trim]?.[value]
          ? Object.keys(compatTree[next.trim][value]) : null;
        if (validQualities && !validQualities.includes(next.quality)) {
          next.quality = validQualities.includes('STD') ? 'STD' : validQualities[0];
        }
        // Ensure paper is valid
        const validPapers = compatTree?.[next.trim]?.[value]?.[next.quality]?.[next.binding];
        if (validPapers && !validPapers.includes(next.paper)) {
          next.paper = validPapers.includes('060UW444') ? '060UW444' : validPapers[0];
        }
      }

      if (field === 'binding') {
        // Ensure paper is valid for new binding
        const validPapers = compatTree?.[next.trim]?.[next.ink]?.[next.quality]?.[value];
        if (validPapers && !validPapers.includes(next.paper)) {
          next.paper = validPapers.includes('060UW444') ? '060UW444' : validPapers[0];
        }
        // Reset linen/foil if not LW
        if (value !== 'LW') {
          next.coverFinish = next.coverFinish === 'MXX' || next.coverFinish === 'GXX'
            ? next.coverFinish : 'MXX';
        }
      }

      if (field === 'quality') {
        // Ensure paper is valid for new quality
        const validPapers = compatTree?.[next.trim]?.[next.ink]?.[value]?.[next.binding];
        if (validPapers && !validPapers.includes(next.paper)) {
          next.paper = validPapers.includes('060UW444') ? '060UW444' : validPapers[0];
        }
      }

      return next;
    });
    setFieldErrors(e => ({ ...e, [field]: undefined }));
    setResult(null);
    setApiError(null);
    setSuggestion(null);
  }, [compatTree, trimInkBindings]);

  // ── Validate form ──────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    const pc = parseInt(form.pageCount);
    if (!form.pageCount || isNaN(pc) || pc < 2) errs.pageCount = 'Page count must be at least 2.';
    if (pc > 9999) errs.pageCount = 'Page count cannot exceed 9,999.';
    if (!form.quantity || form.quantity < 1) errs.quantity = 'Quantity must be at least 1.';
    if (form.quantity > 10000) errs.quantity = 'Quantity cannot exceed 10,000.';
    if (form.retailPrice && parseFloat(form.retailPrice) < 0) errs.retailPrice = 'Retail price cannot be negative.';
    if (form.useCustomAddress) {
      if (!form.street1.trim()) errs.street1 = 'Street address is required.';
      if (!form.city.trim())    errs.city    = 'City is required.';
      if (!form.postcode.trim()) errs.postcode = 'Postcode is required.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleCalculate(e) {
    if (e) e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);
    setSuggestion(null);

    const payload = {
      trim:        form.trim,
      ink:         form.ink,
      quality:     form.quality,
      binding:     form.binding,
      paper:       form.paper,
      coverFinish: form.coverFinish || 'MXX',
      pageCount:   parseInt(form.pageCount),
      quantity:    parseInt(form.quantity) || 1,
      shippingLevel: form.shippingLevel,
    };

    if (form.useCustomAddress && form.street1 && form.city && form.postcode) {
      payload.shippingAddress = {
        street1:      form.street1,
        city:         form.city,
        state_code:   form.stateCode,
        country_code: form.countryCode || 'US',
        postcode:     form.postcode,
        phone_number: form.phoneNumber,
      };
    }

    try {
      const r = await api.post('/quotes/calculate', payload);
      setResult({ ...r.data, retailPrice: parseFloat(form.retailPrice) || 0 });
    } catch (err) {
      // Check if the backend returned a suggestion (auto-correction hint)
      const raw = err?.luluError || err?.response?.data;
      if (raw?.suggestion) setSuggestion(raw.suggestion);
      setApiError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Apply a suggested correction from the backend
  function applySuggestion(s) {
    if (!s?.components) return;
    const c = s.components;
    setFormState(prev => ({
      ...prev,
      trim:        c.trim        || prev.trim,
      ink:         c.ink         || prev.ink,
      quality:     c.quality     || prev.quality,
      binding:     c.binding     || prev.binding,
      paper:       c.paper       || prev.paper,
      coverFinish: c.coverFinish || prev.coverFinish,
    }));
    setApiError(null);
    setSuggestion(null);
    setResult(null);
  }

  // ── Derived result values ──────────────────────────────────────────────────
  const unitCost      = result?.unitPrintCost    || 0;
  const shipCost      = result?.shippingCost     || 0;
  const fulfillFee    = result?.fulfillmentFee   || 0.75;
  const totalCost     = result?.totalCost        || 0;
  const totalTax      = result?.totalTax         || 0;
  const totalInclTax  = result?.totalCostInclTax || totalCost;
  const qty           = result?.quantity         || 1;
  const retailPrice   = result?.retailPrice      || 0;
  const shipPerCopy   = qty > 0 ? shipCost / qty : 0;
  const profitPerCopy = retailPrice > 0
    ? retailPrice - unitCost - shipPerCopy - fulfillFee
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: colors.fontFamily }}>
      <style>{css}</style>

      <PageHeader
        title="Print Quote Calculator"
        subtitle="Configure your book specifications and get an instant cost estimate."
      />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {optsLoading && (
          <div style={{ textAlign: 'center', padding: '48px', color: colors.gray500 }}>
            <Spinner size={28} />
            <p style={{ marginTop: 12, fontSize: 14 }}>Loading print options…</p>
          </div>
        )}

        {optsError && (
          <div style={{ marginBottom: 16 }}>
            <Alert variant="warning" title="Using offline defaults">
              Could not load the latest print options from the server. Using built-in defaults — all options are still available.
            </Alert>
          </div>
        )}

        {!optsLoading && (
          <form onSubmit={handleCalculate} noValidate>

            {/* ── STEP 1: Book Size ──────────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">1</div>
                <div>
                  <div className="qc-step-title">Book Size</div>
                  <div className="qc-step-sub">Choose the trim size (width × height) of your book</div>
                </div>
              </div>
              <label className="qc-label-sm">Trim Size</label>
              <select
                className="qc-select-native"
                value={form.trim}
                onChange={e => setField('trim', e.target.value)}
              >
                {Object.entries(labels.trim || FALLBACK_LABELS.trim).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </Card>

            {/* ── STEP 2: Binding Type ───────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">2</div>
                <div>
                  <div className="qc-step-title">Binding Type</div>
                  <div className="qc-step-sub">How the pages are bound together</div>
                </div>
              </div>
              <div className="qc-grid-3">
                {Object.entries(labels.binding || FALLBACK_LABELS.binding).map(([code, label]) => (
                  <OptionCard
                    key={code}
                    code={code}
                    label={label}
                    description={BINDING_DESC[code]}
                    selected={form.binding === code}
                    disabled={!availableBindings.includes(code)}
                    onSelect={v => setField('binding', v)}
                    icon={BINDING_ICONS[code]}
                  />
                ))}
              </div>
            </Card>

            {/* ── STEP 3: Interior Color & Print Quality ─────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">3</div>
                <div>
                  <div className="qc-step-title">Interior Color &amp; Print Quality</div>
                  <div className="qc-step-sub">Color type and print quality for the interior pages</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="qc-label-sm">Color Type</label>
                <div className="qc-grid-2">
                  {Object.entries(labels.ink || FALLBACK_LABELS.ink).map(([code, label]) => (
                    <OptionCard
                      key={code}
                      code={code}
                      label={label}
                      description={INK_DESC[code]}
                      selected={form.ink === code}
                      disabled={!availableInks.includes(code)}
                      onSelect={v => setField('ink', v)}
                      icon={INK_ICONS[code]}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="qc-label-sm">Print Quality</label>
                <div className="qc-grid-2">
                  {Object.entries(labels.quality || FALLBACK_LABELS.quality).map(([code, label]) => (
                    <OptionCard
                      key={code}
                      code={code}
                      label={label}
                      description={QUALITY_DESC[code]}
                      selected={form.quality === code}
                      disabled={!availableQualities.includes(code)}
                      onSelect={v => setField('quality', v)}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* ── STEP 4: Paper & Cover Finish ───────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">4</div>
                <div>
                  <div className="qc-step-title">Paper &amp; Cover Finish</div>
                  <div className="qc-step-sub">Interior paper stock and cover lamination</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="qc-label-sm">Interior Paper</label>
                <div className="qc-grid-2">
                  {Object.entries(labels.paper || FALLBACK_LABELS.paper).map(([code, label]) => (
                    <OptionCard
                      key={code}
                      code={code}
                      label={label}
                      description={PAPER_DESC[code]}
                      selected={form.paper === code}
                      disabled={!availablePapers.includes(code)}
                      onSelect={v => setField('paper', v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="qc-label-sm">Cover Finish</label>
                <div className="qc-grid-2">
                  {coverFinishOptions.map(f => (
                    <OptionCard
                      key={f.code}
                      code={f.code}
                      label={f.label}
                      description={f.description}
                      selected={form.coverFinish === f.code}
                      disabled={false}
                      onSelect={v => setField('coverFinish', v)}
                      icon={FINISH_ICONS[f.code === 'GXX' ? 'G' : 'M']}
                    />
                  ))}
                </div>
              </div>

              {/* Linen Wrap note */}
              {showLinenFoil && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', fontSize: 13, color: '#166534' }}>
                  <strong>Linen Wrap selected.</strong> The linen cloth color and foil stamp are configured at the print job level. Contact your print provider to specify linen and foil options when placing the order.
                </div>
              )}
            </Card>

            {/* ── STEP 5: Order Details ──────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">5</div>
                <div>
                  <div className="qc-step-title">Order Details</div>
                  <div className="qc-step-sub">Page count, quantity, and your retail price</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div>
                  <label className="qc-label-sm">Page Count</label>
                  <input
                    type="number" min="2" max="9999"
                    className="qc-select-native"
                    value={form.pageCount}
                    onChange={e => setField('pageCount', e.target.value)}
                    placeholder="e.g. 250"
                    style={{ border: fieldErrors.pageCount ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.pageCount && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.pageCount}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">Quantity</label>
                  <div className="qc-qty-row" style={{ marginBottom: 16 }}>
                    <button type="button" className="qc-qty-btn"
                      onClick={() => setField('quantity', Math.max(1, (form.quantity || 1) - 1))}>−</button>
                    <input
                      type="number" min="1" max="10000"
                      className="qc-qty-input"
                      value={form.quantity}
                      onChange={e => setField('quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button type="button" className="qc-qty-btn"
                      onClick={() => setField('quantity', Math.min(10000, (form.quantity || 1) + 1))}>+</button>
                  </div>
                  {fieldErrors.quantity && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.quantity}</p>}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="qc-label-sm">
                    Your Retail Price (USD){' '}
                    <span style={{ color: colors.gray500, fontWeight: 400 }}>— optional, for profit calculation</span>
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    className="qc-select-native"
                    value={form.retailPrice}
                    onChange={e => setField('retailPrice', e.target.value)}
                    placeholder="e.g. 24.99"
                    style={{ border: fieldErrors.retailPrice ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.retailPrice && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.retailPrice}</p>}
                </div>
              </div>
            </Card>

            {/* ── STEP 6: Shipping ───────────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">6</div>
                <div>
                  <div className="qc-step-title">Shipping Options</div>
                  <div className="qc-step-sub">Select your preferred delivery speed</div>
                </div>
              </div>
              <div className="qc-grid-2">
                {shippingOptions.map(s => (
                  <OptionCard
                    key={s.id}
                    code={s.id}
                    label={s.label}
                    days={s.days || SHIPPING_DAYS[s.id]}
                    selected={form.shippingLevel === s.id}
                    disabled={false}
                    onSelect={v => setField('shippingLevel', v)}
                  />
                ))}
              </div>

              {/* Optional shipping address */}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: colors.gray700 }}>
                  <input
                    type="checkbox"
                    checked={form.useCustomAddress}
                    onChange={e => setField('useCustomAddress', e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  Enter a shipping address for accurate regional rates and tax
                </label>
              </div>

              {form.useCustomAddress && (
                <div style={{ marginTop: 16, padding: '16px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  <div className="qc-addr-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="qc-label-sm">Street Address</label>
                      <input type="text" className="qc-select-native" value={form.street1}
                        onChange={e => setField('street1', e.target.value)} placeholder="123 Main St"
                        style={{ border: fieldErrors.street1 ? '1px solid #DC2626' : undefined }} />
                      {fieldErrors.street1 && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.street1}</p>}
                    </div>
                    <div>
                      <label className="qc-label-sm">City</label>
                      <input type="text" className="qc-select-native" value={form.city}
                        onChange={e => setField('city', e.target.value)} placeholder="Austin"
                        style={{ border: fieldErrors.city ? '1px solid #DC2626' : undefined }} />
                      {fieldErrors.city && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.city}</p>}
                    </div>
                    <div>
                      <label className="qc-label-sm">State / Province</label>
                      <input type="text" className="qc-select-native" value={form.stateCode}
                        onChange={e => setField('stateCode', e.target.value)} placeholder="TX" />
                    </div>
                    <div>
                      <label className="qc-label-sm">Country Code</label>
                      <input type="text" className="qc-select-native" value={form.countryCode}
                        onChange={e => setField('countryCode', e.target.value.toUpperCase())} placeholder="US" maxLength={2} />
                    </div>
                    <div>
                      <label className="qc-label-sm">Postcode / ZIP</label>
                      <input type="text" className="qc-select-native" value={form.postcode}
                        onChange={e => setField('postcode', e.target.value)} placeholder="78701"
                        style={{ border: fieldErrors.postcode ? '1px solid #DC2626' : undefined }} />
                      {fieldErrors.postcode && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.postcode}</p>}
                    </div>
                    <div>
                      <label className="qc-label-sm">Phone Number</label>
                      <input type="text" className="qc-select-native" value={form.phoneNumber}
                        onChange={e => setField('phoneNumber', e.target.value)} placeholder="5125550100" />
                    </div>
                  </div>
                </div>
              )}

              {!form.useCustomAddress && (
                <p style={{ marginTop: 10, fontSize: 12, color: colors.gray500 }}>
                  Using a default US address for the estimate. Enable the address fields above for region-specific rates.
                </p>
              )}
            </Card>

            {/* ── Error ─────────────────────────────────────────────────── */}
            {apiError && (
              <div style={{ marginBottom: 20 }}>
                <Alert variant="error" title="Unable to Calculate Quote">
                  {apiError}
                  {suggestion && (
                    <div className="qc-suggestion-box" style={{ marginTop: 10 }}>
                      <strong>Suggestion:</strong> {suggestion.message}
                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        style={{
                          marginLeft: 12, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                          borderRadius: 6, border: '1px solid #D97706', background: '#FEF3C7',
                          color: '#92400E', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Apply Fix
                      </button>
                    </div>
                  )}
                </Alert>
              </div>
            )}

            {/* ── Submit ────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', fontSize: 16, fontWeight: 700,
                borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#93C5FD' : '#2563EB', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 28, transition: 'background 0.2s', fontFamily: 'inherit',
              }}
            >
              {loading
                ? <><Spinner size={18} color="#fff" /> Calculating your quote…</>
                : 'Get Instant Quote'
              }
            </button>
          </form>
        )}

        {/* ── Results ────────────────────────────────────────────────────── */}
        {result && (
          <div className="qc-result-card">

            {/* Live badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.gray900 }}>Quote Summary</h2>
              <span className="qc-live-badge"><span className="qc-live-dot" />Live Quote</span>
            </div>

            {/* Cost stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Unit Print Cost',    value: `$${unitCost.toFixed(2)}`,   sub: 'Per copy',          color: '#DC2626' },
                { label: 'Shipping',           value: `$${shipCost.toFixed(2)}`,   sub: `${qty} ${qty===1?'copy':'copies'}`, color: '#D97706' },
                { label: 'Fulfillment',        value: `$${fulfillFee.toFixed(2)}`, sub: 'Per order',         color: '#6B7280' },
                { label: 'Total (excl. tax)',  value: `$${totalCost.toFixed(2)}`,  sub: 'Before tax',        color: '#2563EB' },
                ...(retailPrice > 0 && profitPerCopy !== null ? [{
                  label: 'Your Profit',
                  value: `$${profitPerCopy.toFixed(2)}`,
                  sub: 'Per copy sold',
                  color: profitPerCopy >= 0 ? '#16A34A' : '#DC2626',
                }] : []),
              ].map((s, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB',
                  padding: '16px 12px', textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Detailed breakdown */}
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: colors.gray900 }}>
                Detailed Cost Breakdown
              </h3>
              {[
                ['Trim Size',          result.components?.labels?.trim    || result.podPackageId, false],
                ['Binding',            result.components?.labels?.binding || '',                  false],
                ['Interior',           `${result.components?.labels?.ink || ''} · ${result.components?.labels?.quality || ''}`, false],
                ['Paper',              result.components?.labels?.paper   || '',                  false],
                ['Page Count',         result.pageCount,                                          false],
                ['Quantity',           result.quantity,                                           false],
                ['Shipping Method',    result.components?.labels?.shipping || result.shippingLevel, false],
                ['Unit Print Cost',    `$${unitCost.toFixed(2)}`,                                 false],
                ['Total Print Cost',   `$${(result.totalPrintCost||0).toFixed(2)}`,               false],
                ['Shipping Cost',      `$${shipCost.toFixed(2)}`,                                 false],
                ['Fulfillment Fee',    `$${fulfillFee.toFixed(2)}`,                               false],
                ['Subtotal (excl. tax)', `$${totalCost.toFixed(2)}`,                             false],
                ['Estimated Tax',      `$${totalTax.toFixed(2)}`,                                 false],
                ['Total (incl. tax)',  `$${totalInclTax.toFixed(2)}`,                             true],
              ].filter(([, v]) => v !== '' && v !== undefined).map(([label, value, bold], i) => (
                <div key={i} className="qc-summary-row"
                  style={bold ? { borderTop: '2px solid #E5E7EB', marginTop: 4, paddingTop: 14 } : {}}>
                  <span className="qc-summary-label"
                    style={bold ? { fontWeight: 700, color: '#111827', fontSize: 15 } : {}}>
                    {label}
                  </span>
                  <span className="qc-summary-value"
                    style={bold ? { fontWeight: 700, color: '#2563EB', fontSize: 18 } : {}}>
                    {String(value)}
                  </span>
                </div>
              ))}

              {/* Volume discounts */}
              {result.discounts?.length > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, fontSize: 13 }}>
                  <strong style={{ color: '#16A34A' }}>Volume Discounts Applied:</strong>
                  {result.discounts.map((d, i) => (
                    <div key={i} style={{ color: '#16A34A' }}>
                      {d.description || `Discount ${i+1}`}: -${parseFloat(d.amount||0).toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Royalty breakdown */}
            {retailPrice > 0 && profitPerCopy !== null && (
              <Card style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: colors.gray900 }}>
                  Royalty Breakdown (per copy)
                </h3>
                {[
                  ['Reader pays (retail)',        `$${retailPrice.toFixed(2)}`,       '#111827'],
                  ['Print cost (per copy)',        `-$${unitCost.toFixed(2)}`,         '#DC2626'],
                  ['Shipping (per copy est.)',     `-$${shipPerCopy.toFixed(2)}`,      '#D97706'],
                  ['Fulfillment fee (per order)', `-$${fulfillFee.toFixed(2)}`,        '#6B7280'],
                  ['Your profit per copy',         `$${profitPerCopy.toFixed(2)}`,    profitPerCopy >= 0 ? '#16A34A' : '#DC2626'],
                ].map(([label, value, color], i) => (
                  <div key={i} className="qc-summary-row"
                    style={i === 4 ? { borderTop: '2px solid #E5E7EB', marginTop: 4, paddingTop: 14 } : {}}>
                    <span style={{ fontSize: 13, color: i === 4 ? '#111827' : '#6B7280', fontWeight: i === 4 ? 700 : 400 }}>{label}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: i === 4 ? 18 : 14, fontWeight: i === 4 ? 700 : 500, color }}>{value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: '10px 14px', background: '#EFF6FF', borderRadius: 8, fontSize: 12, color: '#1D4ED8' }}>
                  Profit estimate is per copy and excludes taxes. Actual shipping cost may vary by destination. The fulfillment fee is charged once per order regardless of quantity.
                </div>
              </Card>
            )}

            {/* Recalculate button */}
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              style={{
                width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
                borderRadius: 10, border: '2px solid #2563EB', cursor: 'pointer',
                background: 'transparent', color: '#2563EB', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 32, transition: 'all 0.2s',
              }}
            >
              {loading ? <><Spinner size={16} color="#2563EB" /> Updating…</> : '↻ Recalculate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
