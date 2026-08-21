import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { calculateQuote } from '../services/optionsService';
import BookOptionsForm from '../components/BookOptionsForm';
import { colors, Button, Card, Alert, Spinner, PageHeader } from '../components/UI';

// ─────────────────────────────────────────────────────────────────────────────
// Fallback options data — used when the API is unavailable (e.g., on Vercel
// without a backend). Contains all labels and the full compatibility tree.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_OPTIONS = {
  labels: {
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
    ink: {
      'BW': 'Black & White',
      'FC': 'Full Color',
    },
    quality: {
      'STD': 'Standard',
      'PRE': 'Premium',
    },
    binding: {
      'PB': 'Perfect Bound (Paperback)',
      'CW': 'Case Wrap (Hardcover)',
      'CO': 'Coil Bound',
      'SS': 'Saddle Stitch (Stapled)',
      'LW': 'Linen Wrap (Hardcover)',
      'WO': 'Wire-O',
    },
    paper: {
      '060UW444': '60# Uncoated White (Standard)',
      '070UW444': '70# Uncoated White',
      '060UW448': '60# Uncoated Natural',
    },
    coverFinish: {
      'MXX': 'Matte (Standard)',
      'GXX': 'Glossy',
      'MNG': 'Natural (Uncoated)',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const css = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  .qc-result-card { animation: fadeIn 0.35s ease; }

  .qc-select-native {
    width: 100%; padding: 10px 13px; font-size: 14px; border-radius: 10px;
    border: 1px solid #E5E7EB; outline: none; background: #fff; color: #111827;
    font-family: inherit; margin-bottom: 18px; box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .qc-select-native:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
  .qc-label-sm { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 7px; }

  .qc-qty-row { display: flex; align-items: center; gap: 10px; }
  .qc-qty-btn {
    width: 38px; height: 38px; border-radius: 10px; border: 1px solid #E5E7EB;
    background: #F9FAFB; font-size: 18px; cursor: pointer; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s;
    color: #374151;
  }
  .qc-qty-btn:hover { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }
  .qc-qty-input {
    width: 70px; text-align: center; padding: 8px; font-size: 15px; font-weight: 600;
    border-radius: 10px; border: 1px solid #E5E7EB; outline: none; font-family: inherit;
  }
  .qc-qty-input:focus { border-color: #2563EB; }

  .qc-live-badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
    color: #047857;
    background: #ECFDF5; border: 1px solid #A7F3D0;
    border-radius: 999px; padding: 3px 12px;
  }
  .qc-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #10B981; animation: pulse 1.5s infinite; }

  .qc-addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  @media (max-width: 500px) { .qc-addr-grid { grid-template-columns: 1fr; } }

  /* ── Results redesign ───────────────────────────────────────────────── */
  @keyframes pricePop { 0% { transform: scale(0.92); opacity: 0; } 60% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 1; } }

  .qc-hero-card {
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #3B82F6 100%);
    border-radius: 18px; padding: 30px 28px; margin-bottom: 20px; color: #fff;
    box-shadow: 0 12px 32px rgba(37,99,235,0.28), 0 4px 8px rgba(37,99,235,0.15);
  }
  .qc-hero-card::before {
    content: '';
    position: absolute; top: -60px; right: -60px; width: 180px; height: 180px;
    border-radius: 50%; background: rgba(255,255,255,0.08);
  }
  .qc-hero-card::after {
    content: '';
    position: absolute; bottom: -80px; left: 30%; width: 220px; height: 220px;
    border-radius: 50%; background: rgba(255,255,255,0.06);
  }
  .qc-hero-kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.75); margin-bottom: 8px; position: relative; }
  .qc-hero-total { font-size: 44px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; position: relative; }
  .qc-hero-note { margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.8); position: relative; }

  .qc-spec-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .qc-spec-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: #fff; border: 1px solid #E5E7EB;
    border-radius: 999px; padding: 5px 14px; font-size: 12px; color: #4B5563;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .qc-spec-chip b { color: #111827; font-weight: 700; }

  .qc-sec-title {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.06em;
    margin: 0 0 14px;
  }
  .qc-sec-title::after { content: ''; flex: 1; height: 1px; background: #E5E7EB; }

  .qc-cost-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 4px; border-bottom: 1px dashed #E5E7EB; font-size: 14px;
  }
  .qc-cost-row:last-child { border-bottom: none; }
  .qc-cost-name { color: #4B5563; display: flex; align-items: center; gap: 8px; }
  .qc-cost-name .qc-cost-icon {
    width: 30px; height: 30px; border-radius: 8px; display: inline-flex;
    align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;
  }
  .qc-cost-value { font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
  .qc-cost-sub { display: block; font-size: 11px; color: #9CA3AF; font-weight: 400; margin-top: 1px; }

  .qc-total-row {
    display: flex; align-items: center; justify-content: space-between;
    background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 12px;
    padding: 16px 18px; margin-top: 6px;
  }
  .qc-total-label { font-size: 16px; font-weight: 700; color: #0C4A6E; }
  .qc-total-value { font-size: 26px; font-weight: 800; color: #0369A1; font-variant-numeric: tabular-nums; }

  .qc-profit-card {
    margin-top: 16px; border-radius: 12px; padding: 16px 18px; display: flex;
    align-items: center; justify-content: space-between; gap: 12px;
  }
  .qc-profit-label { font-size: 13px; color: #166534; }
  .qc-profit-label b { display: block; font-size: 14px; }
  .qc-profit-value { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .qc-margin-badge {
    border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 700;
    white-space: nowrap;
  }

  .qc-reprint-btn {
    margin-top: 18px; width: 100%; padding: 13px; font-size: 15px; font-weight: 600;
    border-radius: 12px; border: 1.5px solid #2563EB; background: #fff; color: #2563EB;
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .qc-reprint-btn:hover { background: #EFF6FF; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function QuoteCalculatorPage() {
  const [searchParams] = useSearchParams();

  // ── Ref to the Book Options card for the Adjust & recalculate scroll ───────
  const bookOptionsRef = useRef(null);

  // ── Options — try API first, fall back to local data ───────────────────────
  const [fullOptions, setFullOptions] = useState(FALLBACK_OPTIONS);
  const [optsLoading, setOptsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Book options from the shared progressive form ──────────────────────────
  const [bookComponents, setBookComponents] = useState(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [pageCount, setPageCount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [retailPrice, setRetailPrice] = useState('');

  // Shipping address for live Lulu shipping calculation.
  // Lulu requires recipient name, street, city, postcode, country, and
  // (for US/MX/CA/AU) a state — the old shape was missing name entirely.
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    street1: '',
    city: '',
    state_code: '',
    country_code: 'US',
    postcode: '',
    phone_number: '',
    email: '',
  });

  // ── Validation errors ──────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Quote result ───────────────────────────────────────────────────────────
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // ── Load options from API (with fallback) ──────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    api.get('/quotes/options', { signal: controller.signal })
      .then(({ data }) => {
        clearTimeout(timeout);
        setFullOptions(data);
      })
      .catch(() => {
        clearTimeout(timeout);
        setUsingFallback(true);
      })
      .finally(() => setOptsLoading(false));

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  // ── Validate form ──────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    const pc = parseInt(pageCount);
    if (!pageCount || isNaN(pc) || pc < 2) errs.pageCount = 'Page count must be at least 2.';
    if (pc > 9999) errs.pageCount = 'Page count cannot exceed 9,999.';
    if (quantity < 1) errs.quantity = 'Quantity must be at least 1.';
    if (quantity > 10000) errs.quantity = 'Quantity cannot exceed 10,000.';
    if (retailPrice && parseFloat(retailPrice) < 0) errs.retailPrice = 'Retail price cannot be negative.';
    if (!bookComponents?.trim) errs.bookOptions = 'Please select a trim size.';
    else if (!bookComponents?.ink) errs.bookOptions = 'Please select interior color.';
    else if (!bookComponents?.quality) errs.bookOptions = 'Please select print quality.';
    else if (!bookComponents?.binding) errs.bookOptions = 'Please select a binding type.';
    else if (!bookComponents?.paper) errs.bookOptions = 'Please select a paper type.';
    else if (!bookComponents?.coverFinish) errs.bookOptions = 'Please select a cover finish.';
    const a = shippingAddress || {};
    const countryCode = (a.country_code || 'US').toUpperCase().trim();
    const name = (a.name || '').trim();
    const street1 = (a.street1 || '').trim();
    const postcode = (a.postcode || '').trim();

    if (!name) errs.name = 'Recipient name is required.';
    if (!street1) errs.street1 = 'Street address is required.';
    if (!a.city || !(a.city + '').trim()) errs.city = 'City is required.';
    if (!postcode) errs.postcode = 'ZIP / postal code is required.';
    if (!countryCode) errs.country = 'Country code is required.';
    else if (countryCode.length !== 2) errs.country = 'Country code must be a 2-letter ISO code (e.g. US).';
    // Lulu requires a state/province for US, MX, CA and AU addresses
    if (['US', 'MX', 'CA', 'AU'].includes(countryCode) && !(a.state_code || '').trim()) {
      errs.state = 'State / province is required for ' + countryCode + ' addresses.';
    }
    const phone = (a.phone_number || '').trim();
    if (phone && !/^\+?[\d\s\-.\/()]{8,20}$/.test(phone)) errs.phone = 'Phone must be 8-20 digits/characters (e.g. 5551234567).';
    const email = (a.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please enter a valid email address.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleCalculate(e) {
    if (e) e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    const payload = {
      trim:        bookComponents.trim,
      ink:         bookComponents.ink,
      quality:     bookComponents.quality,
      binding:     bookComponents.binding,
      paper:       bookComponents.paper,
      coverFinish: bookComponents.coverFinish || 'MXX',
      pageCount:   parseInt(pageCount),
      quantity:    parseInt(quantity) || 1,
      shippingAddress: {
        name:          (shippingAddress.name || '').trim(),
        street1:       (shippingAddress.street1 || '').trim(),
        city:          (shippingAddress.city || '').trim(),
        state_code:    ((shippingAddress.state_code || '').trim() || undefined),
        country_code:  shippingAddress.country_code || 'US',
        postcode:      (shippingAddress.postcode || '').trim(),
        phone_number:  (shippingAddress.phone_number || '').trim() || undefined,
        email:         (shippingAddress.email || '').trim() || undefined,
      },
    };

    try {
      const r = await calculateQuote(payload);
      setResult({ ...r, retailPrice: parseFloat(retailPrice) || 0 });
    } catch (err) {
      setApiError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Derived result values ──────────────────────────────────────────────────
  const unitCost        = result?.unitPrintCost    || 0;
  const coverFinishLabel = result?.components?.labels?.coverFinish || result?.coverFinish || 'Matte';
  const shipCost      = result?.shippingCost     || 0;
  const fulfillFee    = result?.fulfillmentFee   || 0.75;
  const totalCost     = result?.totalCost        || 0;
  const totalTax      = result?.totalTax         || 0;
  const totalInclTax  = result?.totalCostInclTax || totalCost;
  const qty           = result?.quantity         || 1;
  const retailPriceVal = result?.retailPrice      || 0;
  const shipPerCopy   = qty > 0 ? shipCost : 0;
  const profitPerCopy = retailPriceVal > 0
    ? retailPriceVal - unitCost - shipPerCopy - fulfillFee
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: colors.fontFamily }}>
      <style>{css}</style>

      <PageHeader
        title="Print Quote Calculator"
        subtitle="Configure your book specifications and get an instant cost estimate with live Lulu shipping rates."
      />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {optsLoading && (
          <div style={{ textAlign: 'center', padding: '48px', color: colors.gray500 }}>
            <Spinner size={24} /> Loading options…
          </div>
        )}

        {/* ── Fallback banner ─────────────────────────────────────────── */}
        {usingFallback && !optsLoading && (
          <Alert variant="warning" title="Using Offline Options">
            The backend API is unavailable. Options are loaded from cached data. Shipping costs require a live Lulu connection.
          </Alert>
        )}

        {/* ── Form ────────────────────────────────────────────────────── */}
        {!optsLoading && (
          <form onSubmit={handleCalculate}>

            {/* STEP 1: Book Options */}
            <Card ref={bookOptionsRef} id="book-options" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Book Options</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Select your book's format and specifications</div>
                </div>
              </div>
              {fieldErrors.bookOptions && <Alert variant="error">{fieldErrors.bookOptions}</Alert>}
              <BookOptionsForm
                onChange={setBookComponents}
                fullOptions={fullOptions}
              />
            </Card>

            {/* STEP 2: Order Details */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Order Details</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Page count, quantity, and retail price</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <div>
                  <label className="qc-label-sm">Page Count *</label>
                  <input
                    type="number" min="2" max="9999"
                    className="qc-select-native"
                    value={pageCount}
                    onChange={e => { setPageCount(e.target.value); setFieldErrors(e2 => ({ ...e2, pageCount: undefined })); }}
                    placeholder="e.g. 250"
                    style={{ border: fieldErrors.pageCount ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.pageCount && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.pageCount}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">Quantity *</label>
                  <div className="qc-qty-row">
                    <button type="button" className="qc-qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                    <input type="number" min="1" max="10000" className="qc-qty-input" value={quantity}
                      onChange={e => { setQuantity(Math.max(1, parseInt(e.target.value) || 1)); setFieldErrors(e2 => ({ ...e2, quantity: undefined })); }} />
                    <button type="button" className="qc-qty-btn" onClick={() => setQuantity(q => Math.min(10000, q + 1))}>+</button>
                  </div>
                  {fieldErrors.quantity && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{fieldErrors.quantity}</p>}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="qc-label-sm">
                    Your Retail Price (USD){' '}
                    <span style={{ color: colors.gray500, fontWeight: 400 }}>— optional, for profit calculation</span>
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    className="qc-select-native"
                    value={retailPrice}
                    onChange={e => { setRetailPrice(e.target.value); setFieldErrors(e2 => ({ ...e2, retailPrice: undefined })); }}
                    placeholder="e.g. 24.99"
                    style={{ border: fieldErrors.retailPrice ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.retailPrice && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.retailPrice}</p>}
                </div>
              </div>
            </Card>

            {/* STEP 3: Shipping Destination */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Shipping Destination</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Enter the shipping address for live Lulu shipping rates</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: colors.gray500, marginBottom: 10 }}>
                Recipient name, street, city and postal code are required by Lulu for live shipping pricing.
              </div>
              <div className="qc-addr-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="qc-label-sm">Recipient Name *</label>
                  <input
                    type="text"
                    className="qc-select-native"
                    value={shippingAddress.name}
                    onChange={e => { setShippingAddress(a => ({ ...a, name: e.target.value })); setFieldErrors(e2 => ({ ...e2, name: undefined })); setResult(null); }}
                    placeholder="e.g. Jane Doe"
                    style={{ border: fieldErrors.name ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.name && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.name}</p>}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="qc-label-sm">Street Address *</label>
                  <input
                    type="text"
                    className="qc-select-native"
                    value={shippingAddress.street1}
                    onChange={e => { setShippingAddress(a => ({ ...a, street1: e.target.value })); setFieldErrors(e2 => ({ ...e2, street1: undefined })); setResult(null); }}
                    placeholder="e.g. 123 Main St"
                    style={{ border: fieldErrors.street1 ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.street1 && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.street1}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">Country Code *</label>
                  <input
                    type="text"
                    className="qc-select-native"
                    value={shippingAddress.country_code}
                    onChange={e => { setShippingAddress(a => ({ ...a, country_code: e.target.value.toUpperCase() })); setFieldErrors(e2 => ({ ...e2, country: undefined, state: undefined })); setResult(null); }}
                    placeholder="e.g. US, GB, CA, IN"
                    style={{ border: fieldErrors.country ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.country && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.country}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">State / Province *</label>
                  {shippingAddress.country_code === 'US' ? (
                    <select
                      className="qc-select-native"
                      value={shippingAddress.state_code}
                      onChange={e => { setShippingAddress(a => ({ ...a, state_code: e.target.value })); setFieldErrors(e2 => ({ ...e2, state: undefined })); setResult(null); }}
                      style={{ border: fieldErrors.state ? '1px solid #DC2626' : undefined }}
                    >
                      <option value="">Select state</option>
                      {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="qc-select-native"
                      value={shippingAddress.state_code}
                      onChange={e => { setShippingAddress(a => ({ ...a, state_code: e.target.value.toUpperCase() })); setFieldErrors(e2 => ({ ...e2, state: undefined })); setResult(null); }}
                      placeholder="e.g. TX, CA, ON"
                      style={{ border: fieldErrors.state ? '1px solid #DC2626' : undefined }}
                    />
                  )}
                  {fieldErrors.state && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.state}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">City *</label>
                  <input
                    type="text"
                    className="qc-select-native"
                    value={shippingAddress.city}
                    onChange={e => { setShippingAddress(a => ({ ...a, city: e.target.value })); setFieldErrors(e2 => ({ ...e2, city: undefined })); setResult(null); }}
                    placeholder="e.g. Austin"
                    style={{ border: fieldErrors.city ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.city && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.city}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">ZIP / Postal Code *</label>
                  <input
                    type="text"
                    className="qc-select-native"
                    value={shippingAddress.postcode}
                    onChange={e => { setShippingAddress(a => ({ ...a, postcode: e.target.value })); setFieldErrors(e2 => ({ ...e2, postcode: undefined })); setResult(null); }}
                    placeholder="e.g. 78701"
                    style={{ border: fieldErrors.postcode ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.postcode && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.postcode}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">Email (optional)</label>
                  <input
                    type="email"
                    className="qc-select-native"
                    value={shippingAddress.email}
                    onChange={e => { setShippingAddress(a => ({ ...a, email: e.target.value })); setFieldErrors(e2 => ({ ...e2, email: undefined })); setResult(null); }}
                    placeholder="e.g. jane@example.com"
                    style={{ border: fieldErrors.email ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.email && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="qc-label-sm">Phone (optional)</label>
                  <input
                    type="text"
                    className="qc-select-native"
                    value={shippingAddress.phone_number}
                    onChange={e => { setShippingAddress(a => ({ ...a, phone_number: e.target.value })); setFieldErrors(e2 => ({ ...e2, phone: undefined })); setResult(null); }}
                    placeholder="e.g. 5551234567"
                    style={{ border: fieldErrors.phone ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.phone && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12 }}>{fieldErrors.phone}</p>}
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, color: colors.gray500 }}>
                Shipping cost is calculated live by Lulu based on the destination address. No flat rates or hidden fees.
              </div>
            </Card>

            {/* ── Error ─────────────────────────────────────────────────── */}
            {apiError && (
              <div style={{ marginBottom: 20 }}>
                <Alert variant="error" title="Unable to Calculate Quote">
                  {apiError}
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

            {/* Address validation warnings from Lulu */}
            {(result.warnings && result.warnings.length > 0) && (
              <div style={{ marginBottom: 16 }}>
                {result.warnings.map((w, i) => (
                  <Alert key={i} variant="warning" title={w.type || 'Address notice'}>
                    {w.message || w}
                    {w.suggested_address && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#6B7280' }}>
                        Lulu suggests: {w.suggested_address.city ? `${w.suggested_address.city}, ` : ''}{w.suggested_address.state_code || ''} {w.suggested_address.postcode || ''} ({w.suggested_address.country_code || ''})
                      </div>
                    )}
                  </Alert>
                ))}
              </div>
            )}

            {/* Hero price card */}
            <div className="qc-hero-card" style={{ animation: 'pricePop 0.45s ease' }}>
              <div className="qc-hero-kicker">Estimated Total · incl. tax · {result.quantity || 1} {result.quantity === 1 ? 'copy' : 'copies'}</div>
              <div className="qc-hero-total">${totalInclTax.toFixed(2)}</div>
              <div className="qc-hero-note">
                {unitCost > 0
                  ? `$${unitCost.toFixed(2)} per copy printed + $${shipCost.toFixed(2)} shipping (${result.shippingLevel || 'MAIL'})`
                  : 'Live quote from Lulu · no flat rates or hidden fees'}
              </div>
            </div>

            {/* Book spec chips */}
            <div className="qc-spec-chips">
              {[
                ['📐', 'Trim', result.components?.labels?.trim || result.podPackageId],
                ['📖', 'Binding', result.components?.labels?.binding],
                ['🖨', 'Interior', `${result.components?.labels?.ink || ''} · ${result.components?.labels?.quality || ''}`],
                ['📄', 'Paper', result.components?.labels?.paper],
                ['🎨', 'Cover', coverFinishLabel],
              ].filter(([, , v]) => v).map(([icon, label, v], i) => (
                <span key={i} className="qc-spec-chip"><span>{icon}</span><span>{label}: <b>{v}</b></span></span>
              ))}
              <span className="qc-spec-chip"><span>📃</span><span><b>{result.pageCount}</b> pages × <b>{result.quantity}</b> copies</span></span>
            </div>

            {/* Itemized cost breakdown */}
            <Card style={{ marginBottom: 20 }}>
              <h3 className="qc-sec-title">Itemized Cost</h3>
              <div className="qc-cost-row">
                <div className="qc-cost-name">
                  <span className="qc-cost-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>🖨</span>
                  <div>Printing
                    <span className="qc-cost-sub">${unitCost.toFixed(2)} per copy × {result.quantity}</span>
                  </div>
                </div>
                <div className="qc-cost-value">${(result.totalPrintCost || unitCost).toFixed(2)}</div>
              </div>
              <div className="qc-cost-row">
                <div className="qc-cost-name">
                  <span className="qc-cost-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>🚚</span>
                  <div>Shipping
                    <span className="qc-cost-sub">Live {result.shippingLevel || 'MAIL'} rate to {result.shippingCountry || shippingAddress.country_code} {shippingAddress.postcode}</span>
                  </div>
                </div>
                <div className="qc-cost-value">${shipCost.toFixed(2)}</div>
              </div>
              <div className="qc-cost-row">
                <div className="qc-cost-name">
                  <span className="qc-cost-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>📦</span>
                  <div>Fulfillment Fee
                    <span className="qc-cost-sub">Lulu order processing</span>
                  </div>
                </div>
                <div className="qc-cost-value">${fulfillFee.toFixed(2)}</div>
              </div>

              <div className="qc-total-row">
                <div className="qc-total-label">Subtotal <span style={{ fontSize: 12, fontWeight: 400, color: '#0C4A6E', marginLeft: 6 }}>(excl. tax)</span></div>
                <div className="qc-total-value" style={{ fontSize: 20 }}>${totalCost.toFixed(2)}</div>
              </div>
              <div className="qc-cost-row" style={{ paddingTop: 12 }}>
                <div className="qc-cost-name">
                  <span className="qc-cost-icon" style={{ background: '#ECFEFF', color: '#0891B2' }}>🧾</span>
                  Estimated Tax
                </div>
                <div className="qc-cost-value">${totalTax.toFixed(2)}</div>
              </div>
              <div className="qc-total-row">
                <div className="qc-total-label">Estimated Total <span style={{ fontSize: 12, fontWeight: 400, color: '#0C4A6E', marginLeft: 6 }}>(incl. tax)</span></div>
                <div className="qc-total-value">${totalInclTax.toFixed(2)}</div>
              </div>

              {/* Profit insight */}
              {profitPerCopy !== null && (
                <div className="qc-profit-card" style={profitPerCopy >= 0 ? { background: '#F0FDF4', border: '1.5px solid #BBF7D0' } : { background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
                  <div className="qc-profit-label" style={profitPerCopy < 0 ? { color: '#991B1B' } : {}}>
                    <b>Profit per copy at ${retailPriceVal.toFixed(2)} retail</b>
                    {retailPriceVal > 0 && qty > 0 && (
                      <span style={{ fontSize: 12, opacity: 0.85 }}>
                        Retail − print − shipping − fulfillment
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="qc-profit-value" style={profitPerCopy >= 0 ? { color: '#15803D' } : { color: '#DC2626' }}>
                      ${profitPerCopy.toFixed(2)}
                    </div>
                    <span className="qc-margin-badge" style={profitPerCopy >= 0
                      ? { background: '#DCFCE7', color: '#166534' }
                      : { background: '#FEE2E2', color: '#991B1B' }}>
                      {retailPriceVal > 0 ? `${((profitPerCopy / retailPriceVal) * 100).toFixed(0)}% margin` : 'loss per copy'}
                    </span>
                  </div>
                </div>
              )}

              <button type="button" className="qc-reprint-btn" onClick={() => {
                setResult(null);
                setFieldErrors({});
                setApiError(null);
                // Scroll to the Book Options card so the user can reselect
                if (bookOptionsRef.current) {
                  bookOptionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}>
                Adjust options &amp; recalculate
              </button>
            </Card>

            {/* Shipping info */}
            <div style={{ padding: '14px 18px', background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE', fontSize: 13, color: '#1D4ED8' }}>
              <strong>🚢 Live Shipping:</strong> This quote uses Lulu's actual shipping rates based on your destination ({result.shippingCountry || shippingAddress.country_code}). No flat rates or hidden fees are applied.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
