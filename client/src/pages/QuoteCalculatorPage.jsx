import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { colors, Button, Card, Alert, Spinner, Input, PageHeader } from '../components/UI';

// ─────────────────────────────────────────────────────────────────────────────
// Static fallback option lists (mirrors server/config/luluConstants.js).
// These are used if the /quotes/options API call fails.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_TRIM_SIZES = [
  { code: '0425X0687', label: '4.25" × 6.875"',  bookType: 'Pocketbook',          description: 'Small pocket-sized book' },
  { code: '0500X0800', label: '5" × 8"',          bookType: 'Novella',             description: 'Compact novel format' },
  { code: '0550X0850', label: '5.5" × 8.5"',      bookType: 'Digest',              description: 'Standard digest size' },
  { code: '0583X0827', label: '5.83" × 8.27"',    bookType: 'A5',                  description: 'European A5 standard' },
  { code: '0600X0900', label: '6" × 9"',          bookType: 'US Trade',            description: 'Most popular trade paperback' },
  { code: '0614X0921', label: '6.14" × 9.21"',    bookType: 'Royal',               description: 'UK Royal format' },
  { code: '0663X1025', label: '6.63" × 10.25"',   bookType: 'Comic',               description: 'Standard comic/graphic novel' },
  { code: '0700X1000', label: '7" × 10"',         bookType: 'Executive',           description: 'Executive / textbook format' },
  { code: '0744X0968', label: '7.44" × 9.68"',    bookType: 'Crown Quarto',        description: 'UK Crown Quarto format' },
  { code: '0750X0750', label: '7.5" × 7.5"',      bookType: 'Small Square',        description: "Square format — children's / photo" },
  { code: '0827X1169', label: '8.27" × 11.69"',   bookType: 'A4',                  description: 'European A4 standard' },
  { code: '0850X0850', label: '8.5" × 8.5"',      bookType: 'Square',              description: 'Large square — photo / art books' },
  { code: '0850X1100', label: '8.5" × 11"',       bookType: 'US Letter',           description: 'US Letter — workbooks / manuals' },
  { code: '0900X0700', label: '9" × 7"',          bookType: 'Landscape',           description: 'Landscape — photo / art books' },
  { code: '1100X0850', label: '11" × 8.5"',       bookType: 'US Letter Landscape', description: 'US Letter landscape' },
  { code: '1169X0827', label: '11.69" × 8.27"',   bookType: 'A4 Landscape',        description: 'A4 landscape' }
];
const FALLBACK_INK_TYPES = [
  { code: 'BW', label: 'Black & White', description: 'Standard B&W interior printing' },
  { code: 'FC', label: 'Full Color',    description: 'Full color interior printing' }
];
const FALLBACK_PRINT_QUALITIES = [
  { code: 'STD', label: 'Standard', description: 'Standard print quality' },
  { code: 'PRE', label: 'Premium',  description: 'Premium print quality' }
];
const FALLBACK_BINDING_TYPES = [
  { code: 'PB', label: 'Perfect Bound',   description: 'Glued spine — standard paperback' },
  { code: 'CW', label: 'Case Wrap',       description: 'Hardcover — printed cover wrap' },
  { code: 'LW', label: 'Linen Wrap',      description: 'Hardcover — linen cloth with foil stamp' },
  { code: 'CO', label: 'Coil Bound',      description: 'Plastic coil — lays flat when open' },
  { code: 'WO', label: 'Wire-O Bound',    description: 'Metal wire — professional notebooks' },
  { code: 'SS', label: 'Saddle Stitch',   description: 'Stapled — magazines & booklets' }
];
const FALLBACK_PAPER_TYPES = [
  { code: '060UW444', label: '60# Uncoated White', description: 'Standard white — ideal for text-heavy books' },
  { code: '060UC444', label: '60# Uncoated Cream', description: 'Warm cream tone — classic novel feel' },
  { code: '080CW444', label: '80# Coated White',   description: 'Bright coated — best for images and color' }
];
const FALLBACK_COVER_FINISHES = [
  { code: 'G', label: 'Gloss', description: 'Shiny finish — vibrant colors' },
  { code: 'M', label: 'Matte', description: 'Flat finish — elegant, reduced glare' }
];
const FALLBACK_LINEN_COLORS = [
  { code: 'X', label: 'None'   },
  { code: 'R', label: 'Red'    },
  { code: 'N', label: 'Navy'   },
  { code: 'B', label: 'Black'  },
  { code: 'G', label: 'Gray'   },
  { code: 'T', label: 'Tan'    },
  { code: 'F', label: 'Forest' }
];
const FALLBACK_FOIL_COLORS = [
  { code: 'X', label: 'None'  },
  { code: 'G', label: 'Gold'  },
  { code: 'B', label: 'Black' },
  { code: 'W', label: 'White' }
];
const FALLBACK_SHIPPING_OPTIONS = [
  { id: 'MAIL',          label: 'Standard Mail',        days: '7–14 business days' },
  { id: 'PRIORITY_MAIL', label: 'Priority Mail',        days: '5–10 business days' },
  { id: 'GROUND',        label: 'Ground',               days: '5–7 business days'  },
  { id: 'GROUND_HD',     label: 'Ground Home Delivery', days: '5–7 business days'  },
  { id: 'GROUND_BUS',    label: 'Ground Business',      days: '5–7 business days'  },
  { id: 'EXPEDITED',     label: 'Expedited',            days: '3–5 business days'  },
  { id: 'EXPRESS',       label: 'Express',              days: '1–2 business days'  }
];
// Fallback compatibility matrix
const FALLBACK_COMPAT = {
  trimBinding:  {},
  bindingPaper: {
    PB: ['060UW444','060UC444','080CW444'],
    CW: ['060UW444','060UC444','080CW444'],
    LW: ['060UW444','060UC444','080CW444'],
    CO: ['060UW444','060UC444','080CW444'],
    WO: ['100CW200'],
    SS: ['060UW444','060UC444','080CW444']
  },
  bindingInk:   { WO: ['FC'] },
  inkQuality:   { BW: ['STD','PRE'], FC: ['PRE','STD'] }
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
  .qc-summary-total .qc-summary-label { font-weight: 700; color: #111827; font-size: 15px; }
  .qc-summary-total .qc-summary-value { font-weight: 700; color: #2563EB; font-size: 18px; }

  .qc-result-card { animation: fadeIn 0.3s ease; }
  .qc-profit-positive { color: #16A34A; }
  .qc-profit-negative { color: #DC2626; }

  .qc-select-native {
    width: 100%; padding: 9px 12px; font-size: 14px; border-radius: 8px;
    border: 1px solid #D1D5DB; outline: none; background: #fff; color: #111827;
    font-family: inherit; margin-bottom: 16px;
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
`;

// ─────────────────────────────────────────────────────────────────────────────
// Tiny icon helpers (Unicode / emoji-free, CSS-drawn)
// ─────────────────────────────────────────────────────────────────────────────
const BINDING_ICONS = { PB: '📖', CW: '📕', LW: '🏅', CO: '🔄', WO: '📎', SS: '✂️' };
const INK_ICONS     = { BW: '⬛', FC: '🎨' };
const FINISH_ICONS  = { G: '✨', M: '🪵' };

// ─────────────────────────────────────────────────────────────────────────────
// OptionCard — a clickable visual card for selecting a print option
// ─────────────────────────────────────────────────────────────────────────────
function OptionCard({ item, selected, disabled, onSelect, icon }) {
  return (
    <div
      className={`qc-option-card${selected ? ' qc-selected' : ''}${disabled ? ' qc-disabled' : ''}`}
      onClick={() => !disabled && onSelect(item.code || item.id)}
      role="button"
      aria-pressed={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onSelect(item.code || item.id); }}
    >
      {icon && <span className="qc-icon">{icon}</span>}
      <span className="qc-label">{item.label}</span>
      {item.description && <span className="qc-desc">{item.description}</span>}
      {item.days && <span className="qc-desc">{item.days}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function QuoteCalculatorPage() {
  const [searchParams] = useSearchParams();

  // ── Options loaded from API ──────────────────────────────────────────────
  const [opts, setOpts] = useState({
    trimSizes:       FALLBACK_TRIM_SIZES,
    inkTypes:        FALLBACK_INK_TYPES,
    printQualities:  FALLBACK_PRINT_QUALITIES,
    bindingTypes:    FALLBACK_BINDING_TYPES,
    paperTypes:      FALLBACK_PAPER_TYPES,
    coverFinishes:   FALLBACK_COVER_FINISHES,
    linenColors:     FALLBACK_LINEN_COLORS,
    foilColors:      FALLBACK_FOIL_COLORS,
    shippingOptions: FALLBACK_SHIPPING_OPTIONS,
    compatibility:   FALLBACK_COMPAT
  });
  const [optsLoading, setOptsLoading] = useState(true);

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    trim:     '0600X0900',
    ink:      'BW',
    quality:  'STD',
    binding:  'PB',
    paper:    '060UW444',
    finish:   'M',
    linen:    'X',
    foil:     'X',
    pageCount:   '',
    quantity:    1,
    retailPrice: '',
    shippingLevel: 'MAIL',
    useCustomAddress: false,
    street1: '', city: '', stateCode: '', countryCode: 'US', postcode: '', phoneNumber: ''
  });

  // ── Validation errors ────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Quote result ─────────────────────────────────────────────────────────
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Auto-calculate debounce ref
  const debounceRef = useRef(null);

  // ── Load options from API ────────────────────────────────────────────────
  useEffect(() => {
    api.get('/quotes/options')
      .then(r => { setOpts(r.data); setOptsLoading(false); })
      .catch(() => setOptsLoading(false));
  }, []);

  // ── Derived: compatibility filtering ────────────────────────────────────
  const compat = opts.compatibility || FALLBACK_COMPAT;

  const availableBindings = compat.trimBinding?.[form.trim]
    ? opts.bindingTypes.filter(b => compat.trimBinding[form.trim].includes(b.code))
    : opts.bindingTypes;

  const availablePapers = compat.bindingPaper?.[form.binding]
    ? opts.paperTypes.filter(p => compat.bindingPaper[form.binding].includes(p.code))
    : opts.paperTypes;

  const availableInks = compat.bindingInk?.[form.binding]
    ? opts.inkTypes.filter(i => compat.bindingInk[form.binding].includes(i.code))
    : opts.inkTypes;

  const availableQualities = compat.inkQuality?.[form.ink]
    ? opts.printQualities.filter(q => compat.inkQuality[form.ink].includes(q.code))
    : opts.printQualities;

  const showLinenFoil = form.binding === 'LW';

  // ── Auto-fix incompatible selections when parent changes ─────────────────
  const setField = useCallback((field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };

      // If trim changes, ensure binding is still valid
      if (field === 'trim') {
        const validBindings = compat.trimBinding?.[value];
        if (validBindings && !validBindings.includes(next.binding)) {
          next.binding = validBindings[0] || 'PB';
        }
      }

      // If binding changes, ensure ink, paper are still valid; reset linen/foil
      if (field === 'binding') {
        const validInks = compat.bindingInk?.[value];
        if (validInks && !validInks.includes(next.ink)) {
          next.ink = validInks[0] || 'BW';
        }
        const validPapers = compat.bindingPaper?.[value];
        if (validPapers && !validPapers.includes(next.paper)) {
          next.paper = validPapers[0] || '060UW444';
        }
        if (value !== 'LW') { next.linen = 'X'; next.foil = 'X'; }
      }

      // If ink changes, ensure quality is still valid
      if (field === 'ink') {
        const validQualities = compat.inkQuality?.[value];
        if (validQualities && !validQualities.includes(next.quality)) {
          next.quality = validQualities[0] || 'STD';
        }
      }

      return next;
    });
    setFieldErrors(e => ({ ...e, [field]: undefined }));
    setResult(null);
    setApiError(null);
  }, [compat]);

  // ── Validate form ────────────────────────────────────────────────────────
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

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleCalculate(e) {
    if (e) e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    const payload = {
      trim: form.trim, ink: form.ink, quality: form.quality,
      binding: form.binding, paper: form.paper, finish: form.finish,
      linen: form.linen, foil: form.foil,
      pageCount:     parseInt(form.pageCount),
      quantity:      parseInt(form.quantity) || 1,
      shippingLevel: form.shippingLevel
    };

    if (form.useCustomAddress && form.street1 && form.city && form.postcode) {
      payload.shippingAddress = {
        street1:      form.street1,
        city:         form.city,
        state_code:   form.stateCode,
        country_code: form.countryCode || 'US',
        postcode:     form.postcode,
        phone_number: form.phoneNumber
      };
    }

    try {
      const r = await api.post('/quotes/calculate', payload);
      setResult({ ...r.data, retailPrice: parseFloat(form.retailPrice) || 0 });
    } catch (err) {
      setApiError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Derived result values ────────────────────────────────────────────────
  const unitCost      = result?.unitPrintCost  || 0;
  const shipCost      = result?.shippingCost   || 0;
  const fulfillFee    = result?.fulfillmentFee || 0.75;
  const totalCost     = result?.totalCost      || 0;
  const totalTax      = result?.totalTax       || 0;
  const totalInclTax  = result?.totalCostInclTax || totalCost;
  const qty           = result?.quantity       || 1;
  const retailPrice   = result?.retailPrice    || 0;
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

        {/* ── Loading skeleton ─────────────────────────────────────────── */}
        {optsLoading && (
          <div style={{ textAlign: 'center', padding: '48px', color: colors.gray500 }}>
            <Spinner size={28} />
            <p style={{ marginTop: 12, fontSize: 14 }}>Loading print options…</p>
          </div>
        )}

        {!optsLoading && (
          <form onSubmit={handleCalculate} noValidate>

            {/* ── STEP 1: Book Size ──────────────────────────────────── */}
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
                {opts.trimSizes.map(t => (
                  <option key={t.code} value={t.code}>
                    {t.label} — {t.bookType}{t.description ? ` · ${t.description}` : ''}
                  </option>
                ))}
              </select>
            </Card>

            {/* ── STEP 2: Binding Type ───────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">2</div>
                <div>
                  <div className="qc-step-title">Binding Type</div>
                  <div className="qc-step-sub">How the pages are bound together</div>
                </div>
              </div>
              <div className="qc-grid-3">
                {opts.bindingTypes.map(b => {
                  const available = availableBindings.some(ab => ab.code === b.code);
                  return (
                    <OptionCard
                      key={b.code}
                      item={b}
                      selected={form.binding === b.code}
                      disabled={!available}
                      onSelect={v => setField('binding', v)}
                      icon={BINDING_ICONS[b.code]}
                    />
                  );
                })}
              </div>
            </Card>

            {/* ── STEP 3: Interior Color & Print Quality ─────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">3</div>
                <div>
                  <div className="qc-step-title">Interior Color</div>
                  <div className="qc-step-sub">Color type and print quality for the interior pages</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="qc-label-sm">Color Type</label>
                <div className="qc-grid-2">
                  {opts.inkTypes.map(i => {
                    const available = availableInks.some(ai => ai.code === i.code);
                    return (
                      <OptionCard
                        key={i.code}
                        item={i}
                        selected={form.ink === i.code}
                        disabled={!available}
                        onSelect={v => setField('ink', v)}
                        icon={INK_ICONS[i.code]}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="qc-label-sm">Print Quality</label>
                <div className="qc-grid-2">
                  {opts.printQualities.map(q => {
                    const available = availableQualities.some(aq => aq.code === q.code);
                    return (
                      <OptionCard
                        key={q.code}
                        item={q}
                        selected={form.quality === q.code}
                        disabled={!available}
                        onSelect={v => setField('quality', v)}
                      />
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* ── STEP 4: Paper & Cover Finish ───────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">4</div>
                <div>
                  <div className="qc-step-title">Paper & Cover Finish</div>
                  <div className="qc-step-sub">Interior paper stock and cover lamination</div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="qc-label-sm">Interior Paper</label>
                <div className="qc-grid-2">
                  {opts.paperTypes.map(p => {
                    const available = availablePapers.some(ap => ap.code === p.code);
                    return (
                      <OptionCard
                        key={p.code}
                        item={p}
                        selected={form.paper === p.code}
                        disabled={!available}
                        onSelect={v => setField('paper', v)}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="qc-label-sm">Cover Finish</label>
                <div className="qc-grid-2">
                  {opts.coverFinishes.map(f => (
                    <OptionCard
                      key={f.code}
                      item={f}
                      selected={form.finish === f.code}
                      disabled={false}
                      onSelect={v => setField('finish', v)}
                      icon={FINISH_ICONS[f.code]}
                    />
                  ))}
                </div>
              </div>

              {/* Linen & Foil — only for Linen Wrap binding */}
              {showLinenFoil && (
                <div style={{ marginTop: 20, padding: '16px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray700, marginBottom: 12 }}>
                    Linen Wrap Options
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <div>
                      <label className="qc-label-sm">Linen Color</label>
                      <select className="qc-select-native" value={form.linen} onChange={e => setField('linen', e.target.value)}>
                        {opts.linenColors.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="qc-label-sm">Foil Stamp Color</label>
                      <select className="qc-select-native" value={form.foil} onChange={e => setField('foil', e.target.value)}>
                        {opts.foilColors.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* ── STEP 5: Order Details ──────────────────────────────── */}
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
                    onChange={e => { setField('pageCount', e.target.value); }}
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
                  <label className="qc-label-sm">Your Retail Price (USD) <span style={{ color: colors.gray500, fontWeight: 400 }}>— optional, for profit calculation</span></label>
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

            {/* ── STEP 6: Shipping ───────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div className="qc-step-header">
                <div className="qc-step-num">6</div>
                <div>
                  <div className="qc-step-title">Shipping Options</div>
                  <div className="qc-step-sub">Select your preferred delivery speed</div>
                </div>
              </div>
              <div className="qc-grid-2">
                {opts.shippingOptions.map(s => (
                  <OptionCard
                    key={s.id}
                    item={s}
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

            {/* ── Error ─────────────────────────────────────────────── */}
            {apiError && (
              <div style={{ marginBottom: 20 }}>
                <Alert variant="error" title="Unable to Calculate Quote">
                  {apiError}
                </Alert>
              </div>
            )}

            {/* ── Submit ────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', fontSize: 16, fontWeight: 700,
                borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#93C5FD' : '#2563EB', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 28, transition: 'background 0.2s', fontFamily: 'inherit'
              }}
            >
              {loading ? (
                <><Spinner size={18} color="#fff" /> Calculating your quote…</>
              ) : (
                'Get Instant Quote'
              )}
            </button>
          </form>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
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
                { label: 'Unit Print Cost', value: `$${unitCost.toFixed(2)}`,     sub: 'Per copy',          color: '#DC2626' },
                { label: 'Shipping',        value: `$${shipCost.toFixed(2)}`,     sub: `${qty} ${qty===1?'copy':'copies'}`, color: '#D97706' },
                { label: 'Fulfillment',     value: `$${fulfillFee.toFixed(2)}`,   sub: 'Per order',         color: '#6B7280' },
                { label: 'Total (excl. tax)', value: `$${totalCost.toFixed(2)}`, sub: 'Before tax',        color: '#2563EB' },
                ...(retailPrice > 0 && profitPerCopy !== null ? [{
                  label: 'Your Profit',
                  value: `$${profitPerCopy.toFixed(2)}`,
                  sub: 'Per copy sold',
                  color: profitPerCopy >= 0 ? '#16A34A' : '#DC2626'
                }] : [])
              ].map((s, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB',
                  padding: '16px 12px', textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
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
                ['Configuration',       result.podPackageId,                                    false],
                ['Page Count',          result.pageCount,                                       false],
                ['Quantity',            result.quantity,                                        false],
                ['Shipping Method',     result.shippingLevel,                                   false],
                ['Unit Print Cost',     `$${unitCost.toFixed(2)}`,                             false],
                ['Total Print Cost',    `$${(result.totalPrintCost||0).toFixed(2)}`,           false],
                ['Shipping Cost',       `$${shipCost.toFixed(2)}`,                             false],
                ['Fulfillment Fee',     `$${fulfillFee.toFixed(2)}`,                           false],
                ['Subtotal (excl. tax)', `$${totalCost.toFixed(2)}`,                           false],
                ['Estimated Tax',       `$${totalTax.toFixed(2)}`,                             false],
                ['Total (incl. tax)',   `$${totalInclTax.toFixed(2)}`,                         true]
              ].map(([label, value, bold], i) => (
                <div key={i} className="qc-summary-row" style={bold ? { borderTop: '2px solid #E5E7EB', marginTop: 4, paddingTop: 14 } : {}}>
                  <span className={`qc-summary-label${bold ? ' qc-summary-total' : ''}`}
                    style={bold ? { fontWeight: 700, color: '#111827', fontSize: 15 } : {}}>
                    {label}
                  </span>
                  <span className={`qc-summary-value${bold ? ' qc-summary-total' : ''}`}
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
                  ['Reader pays (retail)',         `$${retailPrice.toFixed(2)}`,          '#111827'],
                  ['Print cost (per copy)',        `-$${unitCost.toFixed(2)}`,             '#DC2626'],
                  ['Shipping (per copy est.)',     `-$${shipPerCopy.toFixed(2)}`,          '#D97706'],
                  ['Fulfillment fee (per order)',  `-$${fulfillFee.toFixed(2)}`,           '#6B7280'],
                  ['Your profit per copy',         `$${profitPerCopy.toFixed(2)}`,        profitPerCopy >= 0 ? '#16A34A' : '#DC2626']
                ].map(([label, value, color], i) => (
                  <div key={i} className="qc-summary-row"
                    style={i === 4 ? { borderTop: '2px solid #E5E7EB', marginTop: 4, paddingTop: 14 } : {}}>
                    <span style={{ fontSize: 13, color: i === 4 ? '#111827' : '#6B7280', fontWeight: i === 4 ? 700 : 400 }}>{label}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: i === 4 ? 18 : 14, fontWeight: i === 4 ? 700 : 500, color }}>{value}</span>
                  </div>
                ))}
                <Alert variant="info" style={{ marginTop: 16 }}>
                  Profit estimate is per copy and excludes taxes. Actual shipping cost may vary by destination. The fulfillment fee is charged once per order regardless of quantity.
                </Alert>
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
                marginBottom: 32, transition: 'all 0.2s'
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
