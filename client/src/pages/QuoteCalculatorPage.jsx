import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { colors, Button, Card, Alert, Spinner, Input, Select, PageHeader, StatCard } from '../components/UI';

const POD_PACKAGES = [
  { id: '0600X0900BWSTDPB060UW444MXX', label: '6x9 Black & White Paperback' },
  { id: '0600X0900FCSTDPB080CW444MXX', label: '6x9 Full Color Paperback' },
  { id: '0600X0900BWSTDHC060UW444MXX', label: '6x9 Black & White Hardcover' },
  { id: '0850X1100BWSTDPB060UW444MXX', label: '8.5x11 Black & White Paperback' },
  { id: '0500X0800BWSTDPB060UW444MXX', label: '5x8 Black & White Paperback' }
];

const SHIPPING_OPTIONS = [
  { id: 'MAIL', label: 'Standard Mail (7-14 days)', flatRate: 5.95 },
  { id: 'GROUND', label: 'Ground Shipping (5-7 days)', flatRate: 8.95 },
  { id: 'EXPEDITED', label: 'Expedited (3-5 days)', flatRate: 14.95 },
  { id: 'EXPRESS', label: 'Express (1-2 days)', flatRate: 24.95 }
];

export default function QuoteCalculatorPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');

  const [form, setForm] = useState({
    podPackageId: POD_PACKAGES[0].id,
    pageCount: '',
    retailPrice: '',
    shippingLevel: 'MAIL'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleCalculate(e) {
    e.preventDefault();
    if (!form.pageCount || parseInt(form.pageCount) < 24) {
      setError('Page count must be at least 24.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await api.post('/quotes/calculate', {
        podPackageId: form.podPackageId,
        pageCount: parseInt(form.pageCount),
        shippingLevel: form.shippingLevel
      });
      setResult({ ...resp.data, retailPrice: parseFloat(form.retailPrice) || 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const shippingOption = SHIPPING_OPTIONS.find(s => s.id === form.shippingLevel);
  const flatRate = shippingOption?.flatRate || 5.95;
  const previewProfit = result
    ? Math.max(0, (result.retailPrice || 0) - result.printCost - flatRate)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: colors.gray50, fontFamily: colors.fontFamily }}>
      <PageHeader
        title="Print Quote Calculator"
        subtitle="Calculate the print cost and your royalty for any book format before uploading."
      />
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        {error && <div style={{ marginBottom: '20px' }}><Alert variant="error" title="Error">{error}</Alert></div>}

        <Card style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: '600', color: colors.gray900 }}>Book Details</h2>
          <form onSubmit={handleCalculate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Select label="Print Format" value={form.podPackageId}
                  onChange={e => setForm(f => ({ ...f, podPackageId: e.target.value }))}>
                  {POD_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </div>
              <Input label="Page Count" type="number" min="24" value={form.pageCount}
                onChange={e => setForm(f => ({ ...f, pageCount: e.target.value }))}
                placeholder="250" hint="Minimum 24 pages" />
              <Input label="Your Retail Price (USD)" type="number" step="0.01" min="0" value={form.retailPrice}
                onChange={e => setForm(f => ({ ...f, retailPrice: e.target.value }))}
                placeholder="24.99" hint="What you charge readers" />
              <div style={{ gridColumn: '1 / -1' }}>
                <Select label="Shipping Method" value={form.shippingLevel}
                  onChange={e => setForm(f => ({ ...f, shippingLevel: e.target.value }))}>
                  {SHIPPING_OPTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.label} (flat rate ${s.flatRate.toFixed(2)})</option>
                  ))}
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <><Spinner size={16} color={colors.white} />&nbsp; Calculating...</> : 'Calculate Quote'}
            </Button>
          </form>
        </Card>

        {result && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <StatCard label="Print Cost" value={`$${result.printCost.toFixed(2)}`} sub="Charged by Lulu" color={colors.error} />
              <StatCard label="Flat-Rate Shipping" value={`$${flatRate.toFixed(2)}`} sub="Charged to reader" color={colors.warning} />
              <StatCard label="Your Retail Price" value={result.retailPrice > 0 ? `$${result.retailPrice.toFixed(2)}` : 'Not set'} sub="What readers pay" color={colors.primary} />
              <StatCard label="Your Profit" value={previewProfit !== null && result.retailPrice > 0 ? `$${previewProfit.toFixed(2)}` : '--'} sub="Per book sold" color={colors.success} />
            </div>

            <Card>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: colors.gray900 }}>Royalty Breakdown</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <tbody>
                  {[
                    ['Reader pays (retail)', `$${result.retailPrice.toFixed(2)}`],
                    ['Lulu print cost', `-$${result.printCost.toFixed(2)}`],
                    ['Flat-rate shipping charged', `-$${flatRate.toFixed(2)}`],
                    ['Your profit per book', `$${previewProfit.toFixed(2)}`]
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: i < 3 ? `1px solid ${colors.gray100}` : 'none' }}>
                      <td style={{ padding: '10px 0', color: colors.gray700 }}>{label}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: i === 3 ? '700' : '400', color: i === 3 ? colors.success : colors.gray900 }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Alert variant="info" style={{ marginTop: '16px' }}>
                The flat-rate shipping amount is what you charge readers. Lulu's actual shipping cost is ${result.actualShippingCost?.toFixed(2) || '0.00'}, which is covered by LiteraryApp's fulfillment fee.
              </Alert>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
