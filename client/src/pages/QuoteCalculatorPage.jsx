import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { fetchFullOptions, calculateQuote } from '../services/optionsService';
import BookOptionsForm from '../components/BookOptionsForm';
import { colors, Button, Card, Alert, Spinner, PageHeader } from '../components/UI';

// ─────────────────────────────────────────────────────────────────────────────
// Styles (only Quote Calculator specific styles — BookOptionsForm has its own)
// ─────────────────────────────────────────────────────────────────────────────
const css = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.5; } }

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

  .qc-flat-shipping-card {
    background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px;
    padding: 16px; display: flex; align-items: center; justify-content: space-between;
  }
  .qc-flat-shipping-card .qc-shipping-label { font-size: 14px; font-weight: 600; color: #1E40AF; }
  .qc-flat-shipping-card .qc-shipping-rate { font-size: 22px; font-weight: 700; color: #1E40AF; font-family: monospace; }
  .qc-flat-shipping-card .qc-shipping-desc { font-size: 12px; color: #3B82F6; margin-top: 2px; }

  .qc-shipping-toggle {
    display: flex; gap: 8px; margin-bottom: 12px;
  }
  .qc-shipping-toggle button {
    flex: 1; padding: 10px; font-size: 13px; font-weight: 600;
    border-radius: 8px; border: 2px solid #E5E7EB; background: #fff;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .qc-shipping-toggle button.qc-active {
    border-color: #2563EB; background: #EFF6FF; color: #2563EB;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function QuoteCalculatorPage() {
  const [searchParams] = useSearchParams();

  // ── Options loaded from API ────────────────────────────────────────────────
  const [options, setOptions] = useState(null);
  const [optsLoading, setOptsLoading] = useState(true);
  const [optsError, setOptsError] = useState(false);

  // ── Book options from the shared progressive form ──────────────────────────
  const [bookComponents, setBookComponents] = useState(null);

  // ── Form state (order details only — book options handled by BookOptionsForm) ──
  const [pageCount, setPageCount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [retailPrice, setRetailPrice] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [isInternational, setIsInternational] = useState(false);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [street1, setStreet1] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [postcode, setPostcode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // ── Validation errors ──────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Quote result ───────────────────────────────────────────────────────────
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // ── Load options from API ──────────────────────────────────────────────────
  useEffect(() => {
    fetchFullOptions()
      .then(setOptions)
      .catch(() => {
        setOptsError(true);
      })
      .finally(() => setOptsLoading(false));
  }, []);

  // ── Derived: flat shipping rate based on country ───────────────────────────
  const flatShippingRate = isInternational
    ? (options?.shippingRates?.international || 14.95)
    : (options?.shippingRates?.usDomestic || 5.95);
  const flatShippingLabel = isInternational ? 'International Shipping' : 'US Domestic Shipping';
  const flatShippingDesc = isInternational ? '10–21 business days' : '5–10 business days';

  // ── Validate form ──────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    const pc = parseInt(pageCount);
    if (!pageCount || isNaN(pc) || pc < 2) errs.pageCount = 'Page count must be at least 2.';
    if (pc > 9999) errs.pageCount = 'Page count cannot exceed 9,999.';
    if (quantity < 1) errs.quantity = 'Quantity must be at least 1.';
    if (quantity > 10000) errs.quantity = 'Quantity cannot exceed 10,000.';
    if (retailPrice && parseFloat(retailPrice) < 0) errs.retailPrice = 'Retail price cannot be negative.';
    if (!bookComponents?.podPackageId) errs.bookOptions = 'Please select all book options.';
    if (useCustomAddress) {
      if (!street1.trim()) errs.street1 = 'Street address is required.';
      if (!city.trim()) errs.city = 'City is required.';
      if (!postcode.trim()) errs.postcode = 'Postcode is required.';
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
      trim:        bookComponents.trim,
      ink:         bookComponents.ink,
      quality:     bookComponents.quality,
      binding:     bookComponents.binding,
      paper:       bookComponents.paper,
      coverFinish: bookComponents.coverFinish || 'MXX',
      pageCount:   parseInt(pageCount),
      quantity:    parseInt(quantity) || 1,
      countryCode: isInternational ? 'GB' : 'US',
    };

    if (useCustomAddress && street1 && city && postcode) {
      payload.shippingAddress = {
        street1,
        city,
        state_code: stateCode,
        country_code: isInternational ? 'GB' : countryCode.toUpperCase() || 'US',
        postcode,
        phone_number: phoneNumber,
      };
    }

    try {
      const r = await calculateQuote(payload);
      setResult({ ...r, retailPrice: parseFloat(retailPrice) || 0 });
    } catch (err) {
      if (err.luluError?.suggestion) setSuggestion(err.luluError.suggestion);
      setApiError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Derived result values ──────────────────────────────────────────────────
  const unitCost      = result?.unitPrintCost    || 0;
  const shipCost      = result?.shippingCost     || flatShippingRate;
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
        subtitle="Configure your book specifications and get an instant cost estimate with flat-rate shipping."
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

            {/* ── STEP 1-6: Book Options (Progressive Selection) ─────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Book Options</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Select your trim, binding, ink, quality, paper, and cover finish</div>
                </div>
              </div>
              <BookOptionsForm
                labels={options?.labels}
                onChange={setBookComponents}
                initialComponents={bookComponents}
              />
              {fieldErrors.bookOptions && (
                <p style={{ fontSize: 12, color: '#DC2626', marginTop: 12 }}>{fieldErrors.bookOptions}</p>
              )}
            </Card>

            {/* ── STEP 2: Order Details ──────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Order Details</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Page count, quantity, and your retail price</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div>
                  <label className="qc-label-sm">Page Count</label>
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
                  <label className="qc-label-sm">Quantity</label>
                  <div className="qc-qty-row" style={{ marginBottom: 16 }}>
                    <button type="button" className="qc-qty-btn"
                      onClick={() => { setQuantity(Math.max(1, quantity - 1)); setFieldErrors(e => ({ ...e, quantity: undefined })); }}>−</button>
                    <input
                      type="number" min="1" max="10000"
                      className="qc-qty-input"
                      value={quantity}
                      onChange={e => { setQuantity(Math.max(1, parseInt(e.target.value) || 1)); setFieldErrors(e2 => ({ ...e2, quantity: undefined })); }}
                    />
                    <button type="button" className="qc-qty-btn"
                      onClick={() => { setQuantity(Math.min(10000, quantity + 1)); setFieldErrors(e => ({ ...e, quantity: undefined })); }}>+</button>
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
                    value={retailPrice}
                    onChange={e => { setRetailPrice(e.target.value); setFieldErrors(e2 => ({ ...e2, retailPrice: undefined })); }}
                    placeholder="e.g. 24.99"
                    style={{ border: fieldErrors.retailPrice ? '1px solid #DC2626' : undefined }}
                  />
                  {fieldErrors.retailPrice && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.retailPrice}</p>}
                </div>
              </div>
            </Card>

            {/* ── STEP 3: Flat Shipping ──────────────────────────────────── */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Shipping Destination</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>Choose US domestic or international flat-rate shipping</div>
                </div>
              </div>

              {/* US / International toggle */}
              <div className="qc-shipping-toggle">
                <button
                  type="button"
                  className={!isInternational ? 'qc-active' : ''}
                  onClick={() => { setIsInternational(false); setResult(null); }}
                >
                  🇺🇸 US Domestic — $5.95
                </button>
                <button
                  type="button"
                  className={isInternational ? 'qc-active' : ''}
                  onClick={() => { setIsInternational(true); setResult(null); }}
                >
                  🌍 International — $14.95
                </button>
              </div>

              {/* Flat rate display card */}
              <div className="qc-flat-shipping-card">
                <div>
                  <div className="qc-shipping-label">{flatShippingLabel}</div>
                  <div className="qc-shipping-desc">{flatShippingDesc} · Flat rate, no surprises</div>
                </div>
                <div className="qc-shipping-rate">${flatShippingRate.toFixed(2)}</div>
              </div>

              {/* Optional shipping address for region-specific tax */}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: colors.gray700 }}>
                  <input
                    type="checkbox"
                    checked={useCustomAddress}
                    onChange={e => setUseCustomAddress(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  Enter a shipping address for accurate regional tax calculation
                </label>
              </div>

              {useCustomAddress && (
                <div style={{ marginTop: 16, padding: '16px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  <div className="qc-addr-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="qc-label-sm">Street Address</label>
                      <input type="text" className="qc-select-native" value={street1}
                        onChange={e => { setStreet1(e.target.value); setFieldErrors(e2 => ({ ...e2, street1: undefined })); }} placeholder="123 Main St"
                        style={{ border: fieldErrors.street1 ? '1px solid #DC2626' : undefined }} />
                      {fieldErrors.street1 && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.street1}</p>}
                    </div>
                    <div>
                      <label className="qc-label-sm">City</label>
                      <input type="text" className="qc-select-native" value={city}
                        onChange={e => { setCity(e.target.value); setFieldErrors(e2 => ({ ...e2, city: undefined })); }} placeholder="Austin"
                        style={{ border: fieldErrors.city ? '1px solid #DC2626' : undefined }} />
                    </div>
                    <div>
                      <label className="qc-label-sm">State / Province</label>
                      <input type="text" className="qc-select-native" value={stateCode}
                        onChange={e => setStateCode(e.target.value)} placeholder="TX" />
                    </div>
                    <div>
                      <label className="qc-label-sm">Postcode / ZIP</label>
                      <input type="text" className="qc-select-native" value={postcode}
                        onChange={e => { setPostcode(e.target.value); setFieldErrors(e2 => ({ ...e2, postcode: undefined })); }} placeholder="78701"
                        style={{ border: fieldErrors.postcode ? '1px solid #DC2626' : undefined }} />
                      {fieldErrors.postcode && <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 12 }}>{fieldErrors.postcode}</p>}
                    </div>
                    <div>
                      <label className="qc-label-sm">Phone Number</label>
                      <input type="text" className="qc-select-native" value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)} placeholder="5125550100" />
                    </div>
                  </div>
                </div>
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
                        onClick={() => {
                          if (suggestion.components) {
                            setBookComponents({
                              trim:        suggestion.components.trim,
                              binding:     suggestion.components.binding,
                              ink:         suggestion.components.ink,
                              quality:     suggestion.components.quality,
                              paper:       suggestion.components.paper,
                              coverFinish: suggestion.components.coverFinish,
                              podPackageId: suggestion.podPackageId,
                            });
                          }
                          setApiError(null);
                          setSuggestion(null);
                        }}
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
                { label: 'Flat Shipping',      value: `$${shipCost.toFixed(2)}`,   sub: `${qty} ${qty===1?'copy':'copies'}`, color: '#D97706' },
                { label: 'Fulfillment',        value: `$${fulfillFee.toFixed(2)}`, sub: 'Per order',         color: '#6B7280' },
                { label: 'Total (excl. tax)',  value: `$${totalCost.toFixed(2)}`,  sub: 'Before tax',        color: '#2563EB' },
                ...(retailPriceVal > 0 && profitPerCopy !== null ? [{
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
                ['Cover Finish',       result.components?.components?.coverFinish || result.coverFinish || 'Matte', false],
                ['Page Count',         result.pageCount,                                          false],
                ['Quantity',           result.quantity,                                           false],
                ['Shipping',           `${flatShippingLabel} — $${shipCost.toFixed(2)}`,          false],
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
            {retailPriceVal > 0 && profitPerCopy !== null && (
              <Card style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: colors.gray900 }}>
                  Royalty Breakdown (per copy)
                </h3>
                {[
                  ['Reader pays (retail)',        `$${retailPriceVal.toFixed(2)}`,       '#111827'],
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
                  Profit estimate uses flat-rate shipping (${shipCost.toFixed(2)}). The fulfillment fee is charged once per order regardless of quantity.
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