import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { colors, Button, Card, Alert, Spinner, Input, Select, PageHeader, StatCard } from '../components/UI';

// ── Static option lists (mirrors server/routes/quotes.js) ────────────────────
// These are fetched from /quotes/options on mount; the constants below serve
// as the fallback in case the API is unreachable.

const DEFAULT_TRIM_SIZES = [
  { code: '0425X0687', label: '4.25" x 6.875" (Pocketbook)' },
  { code: '0500X0800', label: '5" x 8" (Novella)' },
  { code: '0550X0850', label: '5.5" x 8.5" (Digest)' },
  { code: '0583X0827', label: '5.83" x 8.27" (A5)' },
  { code: '0600X0900', label: '6" x 9" (US Trade)' },
  { code: '0614X0921', label: '6.14" x 9.21" (Royal)' },
  { code: '0663X1025', label: '6.63" x 10.25" (Comic)' },
  { code: '0700X1000', label: '7" x 10" (Executive)' },
  { code: '0744X0968', label: '7.44" x 9.68" (Crown Quarto)' },
  { code: '0750X0750', label: '7.5" x 7.5" (Small Square)' },
  { code: '0827X1169', label: '8.27" x 11.69" (A4)' },
  { code: '0850X0850', label: '8.5" x 8.5" (Square)' },
  { code: '0850X1100', label: '8.5" x 11" (US Letter)' },
  { code: '0900X0700', label: '9" x 7" (Landscape)' },
  { code: '1100X0850', label: '11" x 8.5" (US Letter Landscape)' },
  { code: '1169X0827', label: '11.69" x 8.27" (A4 Landscape)' }
];

const DEFAULT_INK_TYPES = [
  { code: 'BW', label: 'Black & White' },
  { code: 'FC', label: 'Full Color' }
];

const DEFAULT_PRINT_QUALITIES = [
  { code: 'STD', label: 'Standard' },
  { code: 'PRE', label: 'Premium' }
];

const DEFAULT_BINDING_TYPES = [
  { code: 'PB',  label: 'Perfect Bound (Paperback)' },
  { code: 'CW',  label: 'Case Wrap (Hardcover)' },
  { code: 'LW',  label: 'Linen Wrap (Hardcover)' },
  { code: 'CO',  label: 'Coil Bound' },
  { code: 'WO',  label: 'Wire-O Bound' },
  { code: 'SS',  label: 'Saddle Stitch (Stapled)' }
];

const DEFAULT_PAPER_TYPES = [
  { code: '060UW444', label: '60# Uncoated White (Standard)' },
  { code: '060UC444', label: '60# Uncoated Cream (Warm Tone)' },
  { code: '080CW444', label: '80# Coated White (Premium Color)' }
];

const DEFAULT_COVER_FINISHES = [
  { code: 'G', label: 'Gloss' },
  { code: 'M', label: 'Matte' }
];

const DEFAULT_LINEN_COLORS = [
  { code: 'X', label: 'None (N/A)' },
  { code: 'R', label: 'Red' },
  { code: 'N', label: 'Navy' },
  { code: 'B', label: 'Black' },
  { code: 'G', label: 'Gray' },
  { code: 'T', label: 'Tan' },
  { code: 'F', label: 'Forest' }
];

const DEFAULT_FOIL_COLORS = [
  { code: 'X', label: 'None (N/A)' },
  { code: 'G', label: 'Gold' },
  { code: 'B', label: 'Black' },
  { code: 'W', label: 'White' }
];

const DEFAULT_SHIPPING_OPTIONS = [
  { id: 'MAIL',          label: 'Mail (7–14 business days)' },
  { id: 'PRIORITY_MAIL', label: 'Priority Mail (5–10 business days)' },
  { id: 'GROUND',        label: 'Ground (5–7 business days)' },
  { id: 'GROUND_HD',     label: 'Ground Home Delivery (5–7 days)' },
  { id: 'GROUND_BUS',    label: 'Ground Business (5–7 days)' },
  { id: 'EXPEDITED',     label: 'Expedited (3–5 business days)' },
  { id: 'EXPRESS',       label: 'Express (1–2 business days)' }
];

// ── Styles ────────────────────────────────────────────────────────────────────
const sectionTitle = {
  margin: '0 0 16px',
  fontSize: '15px',
  fontWeight: '600',
  color: colors.gray900,
  borderBottom: `1px solid ${colors.gray100}`,
  paddingBottom: '10px'
};

const fieldGroup = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' };
const fullWidth  = { gridColumn: '1 / -1' };

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuoteCalculatorPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');

  // ── Options loaded from API ──────────────────────────────────────────────
  const [options, setOptions] = useState({
    trimSizes:       DEFAULT_TRIM_SIZES,
    inkTypes:        DEFAULT_INK_TYPES,
    printQualities:  DEFAULT_PRINT_QUALITIES,
    bindingTypes:    DEFAULT_BINDING_TYPES,
    paperTypes:      DEFAULT_PAPER_TYPES,
    coverFinishes:   DEFAULT_COVER_FINISHES,
    linenColors:     DEFAULT_LINEN_COLORS,
    foilColors:      DEFAULT_FOIL_COLORS,
    shippingOptions: DEFAULT_SHIPPING_OPTIONS
  });

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Book specification
    trim:     '0600X0900',
    ink:      'BW',
    quality:  'STD',
    binding:  'PB',
    paper:    '060UW444',
    finish:   'M',
    linen:    'X',
    foil:     'X',

    // Order details
    pageCount:   '',
    quantity:    '1',
    retailPrice: '',

    // Shipping
    shippingLevel: 'MAIL',

    // Optional shipping address for accurate tax/shipping calculation
    useCustomAddress: false,
    street1:      '',
    city:         '',
    stateCode:    '',
    countryCode:  'US',
    postcode:     '',
    phoneNumber:  ''
  });

  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [optionsError, setOptionsError] = useState(null);

  // ── Load options from API on mount ───────────────────────────────────────
  useEffect(() => {
    api.get('/quotes/options')
      .then(resp => setOptions(resp.data))
      .catch(() => setOptionsError('Could not load print options from server; using defaults.'));
  }, []);

  // ── Derived: show linen/foil only for Linen Wrap binding ────────────────
  const showLinenFoil = form.binding === 'LW';

  // ── Derived: computed POD Package ID preview ─────────────────────────────
  const podPreview = `${form.trim}.${form.ink}.${form.quality}.${form.binding}.${form.paper}.${form.finish}${form.linen}${form.foil}`;

  // ── Handle form submission ───────────────────────────────────────────────
  async function handleCalculate(e) {
    e.preventDefault();
    const pageCountInt = parseInt(form.pageCount);
    if (!form.pageCount || pageCountInt < 2) {
      setError('Page count must be at least 2.');
      return;
    }
    if (parseInt(form.quantity) < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      // Individual components (backend will build the POD package ID)
      trim:     form.trim,
      ink:      form.ink,
      quality:  form.quality,
      binding:  form.binding,
      paper:    form.paper,
      finish:   form.finish,
      linen:    form.linen,
      foil:     form.foil,

      pageCount:     pageCountInt,
      quantity:      parseInt(form.quantity) || 1,
      shippingLevel: form.shippingLevel
    };

    // Attach shipping address if the user opted in
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
      const resp = await api.post('/quotes/calculate', payload);
      setResult({ ...resp.data, retailPrice: parseFloat(form.retailPrice) || 0 });
    } catch (err) {
      // api.js interceptor already extracts the error message
      setError(err.message || 'An error occurred while calculating the quote.');
    } finally {
      setLoading(false);
    }
  }

  // ── Derived result values ────────────────────────────────────────────────
  const unitPrintCost  = result?.unitPrintCost  || 0;
  const shippingCost   = result?.shippingCost   || 0;
  const fulfillmentFee = result?.fulfillmentFee || 0.75;
  const retailPrice    = result?.retailPrice    || 0;
  const quantity       = result?.quantity       || 1;
  const previewProfit  = retailPrice > 0
    ? Math.max(0, retailPrice - unitPrintCost - (shippingCost / quantity) - fulfillmentFee)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: colors.gray50, fontFamily: colors.fontFamily }}>
      <PageHeader
        title="Print Quote Calculator"
        subtitle="Configure every print option and get an accurate cost estimate directly from Lulu."
      />

      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

        {optionsError && (
          <div style={{ marginBottom: '16px' }}>
            <Alert variant="warning" title="Options Notice">{optionsError}</Alert>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Calculation Error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleCalculate}>

          {/* ── Section 1: Book Size ─────────────────────────────────── */}
          <Card style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitle}>Book Size (Trim)</h2>
            <div style={fieldGroup}>
              <div style={fullWidth}>
                <Select
                  label="Trim Size"
                  value={form.trim}
                  onChange={e => setForm(f => ({ ...f, trim: e.target.value }))}
                >
                  {options.trimSizes.map(t => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* ── Section 2: Print Options ─────────────────────────────── */}
          <Card style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitle}>Print Options</h2>
            <div style={fieldGroup}>
              <Select
                label="Interior Color"
                value={form.ink}
                onChange={e => setForm(f => ({ ...f, ink: e.target.value }))}
              >
                {options.inkTypes.map(i => (
                  <option key={i.code} value={i.code}>{i.label}</option>
                ))}
              </Select>

              <Select
                label="Print Quality"
                value={form.quality}
                onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}
              >
                {options.printQualities.map(q => (
                  <option key={q.code} value={q.code}>{q.label}</option>
                ))}
              </Select>

              <Select
                label="Binding Type"
                value={form.binding}
                onChange={e => setForm(f => ({
                  ...f,
                  binding: e.target.value,
                  // Reset linen/foil when switching away from Linen Wrap
                  linen: e.target.value === 'LW' ? f.linen : 'X',
                  foil:  e.target.value === 'LW' ? f.foil  : 'X'
                }))}
              >
                {options.bindingTypes.map(b => (
                  <option key={b.code} value={b.code}>{b.label}</option>
                ))}
              </Select>

              <Select
                label="Interior Paper"
                value={form.paper}
                onChange={e => setForm(f => ({ ...f, paper: e.target.value }))}
              >
                {options.paperTypes.map(p => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </Select>

              <Select
                label="Cover Finish"
                value={form.finish}
                onChange={e => setForm(f => ({ ...f, finish: e.target.value }))}
              >
                {options.coverFinishes.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </Select>

              {/* Linen & Foil — only for Linen Wrap binding */}
              {showLinenFoil && (
                <>
                  <Select
                    label="Linen Color (Linen Wrap)"
                    value={form.linen}
                    onChange={e => setForm(f => ({ ...f, linen: e.target.value }))}
                  >
                    {options.linenColors.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </Select>

                  <Select
                    label="Foil Color (Linen Wrap)"
                    value={form.foil}
                    onChange={e => setForm(f => ({ ...f, foil: e.target.value }))}
                  >
                    {options.foilColors.map(f => (
                      <option key={f.code} value={f.code}>{f.label}</option>
                    ))}
                  </Select>
                </>
              )}
            </div>

            {/* POD Package ID preview */}
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: colors.gray50,
              borderRadius: '6px',
              fontSize: '13px',
              color: colors.gray600
            }}>
              <strong>POD Package ID:</strong>{' '}
              <code style={{ fontFamily: 'monospace', color: colors.gray900 }}>{podPreview}</code>
            </div>
          </Card>

          {/* ── Section 3: Order Details ──────────────────────────────── */}
          <Card style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitle}>Order Details</h2>
            <div style={fieldGroup}>
              <Input
                label="Page Count"
                type="number"
                min="2"
                value={form.pageCount}
                onChange={e => setForm(f => ({ ...f, pageCount: e.target.value }))}
                placeholder="250"
                hint="Minimum 2 pages"
              />
              <Input
                label="Quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="1"
                hint="Number of copies"
              />
              <div style={fullWidth}>
                <Input
                  label="Your Retail Price (USD)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.retailPrice}
                  onChange={e => setForm(f => ({ ...f, retailPrice: e.target.value }))}
                  placeholder="24.99"
                  hint="What you charge readers — used to calculate your profit"
                />
              </div>
            </div>
          </Card>

          {/* ── Section 4: Shipping ───────────────────────────────────── */}
          <Card style={{ marginBottom: '20px' }}>
            <h2 style={sectionTitle}>Shipping</h2>
            <div style={fieldGroup}>
              <div style={fullWidth}>
                <Select
                  label="Shipping Method"
                  value={form.shippingLevel}
                  onChange={e => setForm(f => ({ ...f, shippingLevel: e.target.value }))}
                >
                  {options.shippingOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Optional shipping address toggle */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: colors.gray700 }}>
                <input
                  type="checkbox"
                  checked={form.useCustomAddress}
                  onChange={e => setForm(f => ({ ...f, useCustomAddress: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                Enter a shipping address for accurate tax and shipping cost calculation
              </label>
            </div>

            {form.useCustomAddress && (
              <div style={{ ...fieldGroup, marginTop: '16px' }}>
                <div style={fullWidth}>
                  <Input
                    label="Street Address"
                    type="text"
                    value={form.street1}
                    onChange={e => setForm(f => ({ ...f, street1: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>
                <Input
                  label="City"
                  type="text"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Austin"
                />
                <Input
                  label="State / Province Code"
                  type="text"
                  value={form.stateCode}
                  onChange={e => setForm(f => ({ ...f, stateCode: e.target.value }))}
                  placeholder="TX"
                  hint="Required for US, CA, AU and others"
                />
                <Input
                  label="Country Code"
                  type="text"
                  value={form.countryCode}
                  onChange={e => setForm(f => ({ ...f, countryCode: e.target.value.toUpperCase() }))}
                  placeholder="US"
                  hint="ISO 3166-1 alpha-2 (e.g. US, GB, DE)"
                />
                <Input
                  label="Postcode / ZIP"
                  type="text"
                  value={form.postcode}
                  onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))}
                  placeholder="78701"
                />
                <Input
                  label="Phone Number"
                  type="text"
                  value={form.phoneNumber}
                  onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="5125550100"
                  hint="Required by shipping carriers"
                />
              </div>
            )}

            {!form.useCustomAddress && (
              <p style={{ marginTop: '10px', fontSize: '13px', color: colors.gray500 }}>
                Using a default US address (Austin, TX) for the estimate. Enable the address fields above for region-specific shipping and tax rates.
              </p>
            )}
          </Card>

          <Button type="submit" disabled={loading} style={{ width: '100%', marginBottom: '24px' }}>
            {loading
              ? <><Spinner size={16} color={colors.white} />&nbsp; Calculating...</>
              : 'Get Quote from Lulu'}
          </Button>
        </form>

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <StatCard
                label="Unit Print Cost"
                value={`$${result.unitPrintCost.toFixed(2)}`}
                sub="Per copy, excl. tax"
                color={colors.error}
              />
              <StatCard
                label="Shipping Cost"
                value={`$${result.shippingCost.toFixed(2)}`}
                sub={`For ${result.quantity} ${result.quantity === 1 ? 'copy' : 'copies'}`}
                color={colors.warning}
              />
              <StatCard
                label="Fulfillment Fee"
                value={`$${result.fulfillmentFee.toFixed(2)}`}
                sub="Per order"
                color={colors.gray600}
              />
              <StatCard
                label="Total Lulu Cost"
                value={`$${result.totalCost.toFixed(2)}`}
                sub="Excl. tax"
                color={colors.primary}
              />
              {retailPrice > 0 && (
                <StatCard
                  label="Your Profit"
                  value={previewProfit !== null ? `$${previewProfit.toFixed(2)}` : '--'}
                  sub="Per copy sold"
                  color={colors.success}
                />
              )}
            </div>

            <Card style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: colors.gray900 }}>
                Cost Breakdown
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  {[
                    ['POD Package ID',      result.podPackageId,                                       false],
                    ['Page Count',          result.pageCount,                                           false],
                    ['Quantity',            result.quantity,                                            false],
                    ['Shipping Method',     result.shippingLevel,                                       false],
                    ['Unit Print Cost',     `$${result.unitPrintCost.toFixed(2)}`,                     false],
                    ['Total Print Cost',    `$${result.totalPrintCost.toFixed(2)}`,                    false],
                    ['Shipping Cost',       `$${result.shippingCost.toFixed(2)}`,                      false],
                    ['Fulfillment Fee',     `$${result.fulfillmentFee.toFixed(2)}`,                    false],
                    ['Total (excl. tax)',   `$${result.totalCost.toFixed(2)}`,                         false],
                    ['Est. Tax',            `$${(result.totalTax || 0).toFixed(2)}`,                   false],
                    ['Total (incl. tax)',   `$${(result.totalCostInclTax || result.totalCost).toFixed(2)}`, true]
                  ].map(([label, value, bold], i, arr) => (
                    <tr key={i} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${colors.gray100}` : 'none' }}>
                      <td style={{ padding: '9px 0', color: colors.gray600, fontSize: '13px' }}>{label}</td>
                      <td style={{
                        padding: '9px 0',
                        textAlign: 'right',
                        fontWeight: bold ? '700' : '400',
                        color: bold ? colors.gray900 : colors.gray800,
                        fontFamily: typeof value === 'string' && value.startsWith('$') ? 'monospace' : 'inherit',
                        fontSize: '13px'
                      }}>
                        {typeof value === 'string' && value.includes('.') ? value : String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Volume discounts */}
              {result.discounts && result.discounts.length > 0 && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px', fontSize: '13px' }}>
                  <strong style={{ color: colors.success }}>Volume Discounts Applied:</strong>
                  {result.discounts.map((d, i) => (
                    <div key={i} style={{ color: colors.success }}>
                      {d.description}: -${parseFloat(d.amount).toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Royalty breakdown — only shown when retail price is set */}
            {retailPrice > 0 && (
              <Card>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: colors.gray900 }}>
                  Royalty Breakdown (per copy)
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <tbody>
                    {[
                      ['Reader pays (retail)',         `$${retailPrice.toFixed(2)}`],
                      ['Print cost (unit)',            `-$${result.unitPrintCost.toFixed(2)}`],
                      ['Shipping (per copy est.)',     `-$${(result.shippingCost / result.quantity).toFixed(2)}`],
                      ['Fulfillment fee (per order)',  `-$${result.fulfillmentFee.toFixed(2)}`],
                      ['Your profit per copy',         `$${previewProfit.toFixed(2)}`]
                    ].map(([label, value], i) => (
                      <tr key={i} style={{ borderBottom: i < 4 ? `1px solid ${colors.gray100}` : 'none' }}>
                        <td style={{ padding: '10px 0', color: colors.gray700 }}>{label}</td>
                        <td style={{
                          padding: '10px 0',
                          textAlign: 'right',
                          fontWeight: i === 4 ? '700' : '400',
                          color: i === 4 ? colors.success : colors.gray900,
                          fontFamily: 'monospace'
                        }}>
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Alert variant="info" style={{ marginTop: '16px' }}>
                  Profit estimate is per copy and excludes taxes. Actual shipping cost may vary by destination.
                  The fulfillment fee is charged once per order regardless of quantity.
                </Alert>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
