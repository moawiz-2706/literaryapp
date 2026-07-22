import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import BookOptionsForm from '../components/BookOptionsForm';
import GuidelinesModal from '../components/GuidelinesModal';
import FilePreview from '../components/FilePreview';
import FormatInfoPanel from '../components/FormatInfoPanel';
import {
  colors, Button, Card, Alert, Badge, Spinner, Input, Select,
  PageHeader, FileUpload, statusBadge
} from '../components/UI';

const EMPTY_FORM = {
  title: '',
  retailPrice: '',
  pageCount: '',
  description: ''
};

// ── Fallback options data (same as QuoteCalculator) ─────────────────────────
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
      '060UC444': '60# Uncoated Cream (Standard)',
      '070CW460': '70# Coated White (Thick)',
      '080CW444': '80# Coated White (Premium)',
      '100CW200': '100# Coated White (Heavy)',
    },
  },
  compatTree: {},
  shippingRates: {
    usDomestic:    5.95,
    international: 14.95,
  },
};

function buildCompatTree() {
  const tree = {};
  const allTrims     = Object.keys(FALLBACK_OPTIONS.labels.trim);
  const allInks      = Object.keys(FALLBACK_OPTIONS.labels.ink);
  const allQualities = Object.keys(FALLBACK_OPTIONS.labels.quality);
  const allBindings  = Object.keys(FALLBACK_OPTIONS.labels.binding);

  const stdPapersBW = ['060UC444', '060UW444', '080CW444'];
  const stdPapersFC = ['060UW444', '080CW444'];

  for (const trim of allTrims) {
    tree[trim] = {};
    for (const ink of allInks) {
      tree[trim][ink] = {};
      for (const quality of allQualities) {
        tree[trim][ink][quality] = {};
        for (const binding of allBindings) {
          if (trim === '0663X1025' && quality === 'STD') continue;
          if (ink === 'FC' && quality === 'STD' && binding === 'SS') continue;
          if (binding === 'WO' && trim !== '1100X0850') continue;
          if (binding === 'WO' && (ink !== 'FC' || quality !== 'PRE')) continue;
          if (binding === 'LW' && !['0550X0850','0583X0827','0600X0900','0614X0921','0827X1169','0850X1100'].includes(trim)) continue;
          if (binding === 'WO' && ink === 'FC' && quality === 'PRE') {
            tree[trim][ink][quality][binding] = ['100CW200'];
          } else if (ink === 'BW') {
            tree[trim][ink][quality][binding] = stdPapersBW;
          } else {
            tree[trim][ink][quality][binding] = stdPapersFC;
          }
        }
      }
    }
  }
  return tree;
}

FALLBACK_OPTIONS.compatTree = buildCompatTree();

// ── Main Component ───────────────────────────────────────────────────────────

export default function BookSetupPage() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [interiorFile, setInteriorFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Guidelines modal
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Expanded validation error for book list items
  const [expandedErrorId, setExpandedErrorId] = useState(null);

  // ── Book options (shared with Quote Calculator) ──────────────────────────
  const [fullOptions, setFullOptions] = useState(FALLBACK_OPTIONS);
  const [optsLoading, setOptsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [bookComponents, setBookComponents] = useState(null);

  // Load options on mount
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

  // ── Flat shipping info ──────────────────────────────────────────────────
  const flatRateUS = fullOptions?.shippingRates?.usDomestic || 5.95;
  const flatRateIntl = fullOptions?.shippingRates?.international || 14.95;

  // Load books on mount
  const loadBooks = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const resp = await api.get(`/books?locationId=${locationId}`);
      setBooks(resp.data.books || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  // Poll validation status for books that are still validating
  useEffect(() => {
    const validating = books.filter(b => b.status === 'Validating');
    if (!validating.length) return;
    const intervals = validating.map(book => {
      return setInterval(async () => {
        try {
          const resp = await api.get(`/books/${book.id}/validation-status`);
          const { status, printCost, authorProfit, ghlProductId, validationDetails } = resp.data;
          if (status !== 'Validating') {
            setBooks(prev => prev.map(b =>
              b.id === book.id
                ? { ...b, status, print_cost: printCost, author_profit: authorProfit, ghl_product_id: ghlProductId, validation_details: validationDetails }
                : b
            ));
            if (status === 'Ready') {
              setSuccessMsg(`"${book.title}" has been validated and is ready to sell.`);
            }
            // Don't show global error toast for individual book errors — show inline
          }
        } catch (_) {}
      }, 15000);
    });
    return () => intervals.forEach(clearInterval);
  }, [books]);

  // ── Form Validation ───────────────────────────────────────────────────────
  function validateForm() {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Book title is required';
    if (!bookComponents?.podPackageId) errors.bookOptions = 'Please select all book options.';
    if (!form.retailPrice || isNaN(form.retailPrice) || parseFloat(form.retailPrice) <= 0)
      errors.retailPrice = 'Enter a valid retail price';
    if (!form.pageCount || isNaN(form.pageCount) || parseInt(form.pageCount) < 24)
      errors.pageCount = 'Page count must be at least 24';
    if (!interiorFile) errors.interiorFile = 'Interior PDF is required';
    if (!coverFile) errors.coverFile = 'Cover PDF is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit Book ────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.append('locationId', locationId);
    formData.append('title', form.title);
    formData.append('podPackageId', bookComponents.podPackageId);
    formData.append('retailPrice', form.retailPrice);
    formData.append('pageCount', form.pageCount);
    formData.append('description', form.description);
    formData.append('interiorPdf', interiorFile);
    formData.append('coverPdf', coverFile);
    formData.append('trim', bookComponents.trim);
    formData.append('binding', bookComponents.binding);
    formData.append('ink', bookComponents.ink);
    formData.append('quality', bookComponents.quality);
    formData.append('paper', bookComponents.paper);
    formData.append('coverFinish', bookComponents.coverFinish || 'MXX');

    try {
      const resp = await api.post('/books/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });
      setBooks(prev => [...prev, {
        id: resp.data.bookId,
        book_number: resp.data.bookNumber,
        title: form.title,
        status: 'Validating',
        pod_package_id: bookComponents.podPackageId,
        retail_price: parseFloat(form.retailPrice),
        page_count: parseInt(form.pageCount)
      }]);
      setSuccessMsg(`"${form.title}" uploaded. Validation is in progress.`);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setBookComponents(null);
      setInteriorFile(null);
      setCoverFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete Book ────────────────────────────────────────────────────────────
  async function handleDelete(bookId, bookTitle) {
    if (!window.confirm(`Remove "${bookTitle}" from your print catalog?`)) return;
    try {
      await api.delete(`/books/${bookId}?locationId=${locationId}`);
      setBooks(prev => prev.filter(b => b.id !== bookId));
    } catch (err) {
      setError('Could not delete book. Please try again.');
    }
  }

  // ── Sample Order & Approval ────────────────────────────────────────────────
  const [sampleOrdering, setSampleOrdering] = useState(null); // bookId currently ordering
  const [sampleApproving, setSampleApproving] = useState(null); // bookId currently approving
  const [showShippingForm, setShowShippingForm] = useState(null); // bookId with open shipping form
  const [shippingForm, setShippingForm] = useState({
    street1: '', street2: '', city: '', state_code: '', country_code: 'US',
    postcode: '', phone_number: ''
  });
  const [sampleStatusMap, setSampleStatusMap] = useState({}); // bookId -> { sampleStatus, luluTracking, ... }

  // Poll sample status for books that have a sample ordered
  useEffect(() => {
    const hasSample = books.filter(b => b.sample_print_job_id || (sampleStatusMap[b.id]?.sampleStatus && sampleStatusMap[b.id]?.sampleStatus !== 'delivered'));
    if (!hasSample.length) return;
    const intervals = hasSample.map(book => {
      return setInterval(async () => {
        try {
          const resp = await api.get(`/samples/${book.id}/status`);
          setSampleStatusMap(prev => ({ ...prev, [book.id]: resp.data }));
          // Update book status display based on sample status
          const s = resp.data.sampleStatus;
          if (s === 'shipped' || s === 'delivered') {
            setBooks(prev => prev.map(b =>
              b.id === book.id ? { ...b, _sampleDisplayStatus: s === 'shipped' ? 'Sample Shipped' : 'Sample Delivered' } : b
            ));
          }
        } catch (_) {}
      }, 30000);
    });
    return () => intervals.forEach(clearInterval);
  }, [books, sampleStatusMap]);

  async function handleOrderSample(bookId) {
    setSampleOrdering(bookId);
    setError(null);
    try {
      const resp = await api.post('/samples/order', {
        locationId,
        bookId,
        shippingAddress: shippingForm,
        shippingLevel: 'MAIL'
      });
      setSampleStatusMap(prev => ({ ...prev, [bookId]: resp.data }));
      setBooks(prev => prev.map(b =>
        b.id === bookId ? { ...b, sample_print_job_id: resp.data.luluPrintJobId, sample_status: resp.data.sampleStatus, _sampleDisplayStatus: 'Sample Ordered' } : b
      ));
      setShowShippingForm(null);
      setSuccessMsg(`Sample copy ordered for "${books.find(b => b.id === bookId)?.title}". Cost: $${resp.data.costBreakdown.totalSampleCost.toFixed(2)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSampleOrdering(null);
    }
  }

  async function handleApproveProduct(bookId) {
    if (!window.confirm('Are you sure you want to approve this product? It will be activated in your subaccount and ready for customers to order.')) return;
    setSampleApproving(bookId);
    setError(null);
    try {
      const resp = await api.post('/samples/approve', { locationId, bookId });
      setBooks(prev => prev.map(b =>
        b.id === bookId ? { ...b, _sampleDisplayStatus: 'Approved', product_approved: true } : b
      ));
      setSuccessMsg(`Product "${resp.data.productTitle}" approved and activated!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSampleApproving(null);
    }
  }

  function getBookDisplayStatus(book) {
    // If sample has been ordered, show sample status
    if (book._sampleDisplayStatus) return book._sampleDisplayStatus;
    if (sampleStatusMap[book.id]) {
      const s = sampleStatusMap[book.id].sampleStatus;
      if (s === 'ordered') return 'Sample Ordered';
      if (s === 'shipped') return 'Sample Shipped';
      if (s === 'delivered') return 'Sample Delivered';
    }
    return book.status;
  }

  // ── Extract binding from podPackageId for format info ─────────────────────
  const bindingFromPod = bookComponents?.podPackageId
    ? bookComponents.podPackageId.split('.')[3]
    : null;

  // Extract trim from podPackageId
  const trimFromPod = bookComponents?.podPackageId
    ? bookComponents.podPackageId.split('.')[0].slice(1)
    : null;

  const pageCountNum = parseInt(form.pageCount) || 0;

  if (!locationId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert variant="error" title="Configuration Error">
          This page must be opened from within your account. No location ID was detected.
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.gray50, fontFamily: colors.fontFamily }}>
      <PageHeader
        title="Set Up On-Demand Printing"
        subtitle="Upload your books. Each book becomes a product you can attach to your order forms."
        action={!showForm && (
          <Button onClick={() => { setShowForm(true); setError(null); setSuccessMsg(null); }}>
            + Add New Book
          </Button>
        )}
      />

      <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>

        {/* Notifications */}
        {successMsg && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="success">{successMsg}</Alert>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: '20px' }}>
            <Alert variant="error" title="Error">{error}</Alert>
          </div>
        )}

        {/* ── How It Works ── */}
        <Card style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '600', color: colors.gray900 }}>
            How On-Demand Printing Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { step: '1', title: 'Choose Book Options', desc: 'Select trim, binding, ink, quality, paper, and cover finish.' },
              { step: '2', title: 'Upload Your Book', desc: 'Upload interior and cover PDFs. Validate with Lulu before submitting.' },
              { step: '3', title: 'Reader Buys', desc: 'When a reader places an order, the system submits it for printing.' },
              { step: '4', title: 'Ships Direct', desc: 'We print and ship directly to your reader. Flat-rate shipping applied.' }
            ].map(item => (
              <div key={item.step} style={{
                background: colors.gray50, borderRadius: '8px', padding: '16px',
                borderLeft: `3px solid ${colors.primary}`
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: colors.primary, marginBottom: '4px' }}>
                  STEP {item.step}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.gray900, marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '13px', color: colors.gray500 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {/* ── Flat Shipping Info ── */}
          <div style={{ marginTop: 20, padding: '14px 16px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', marginBottom: 6 }}>Flat-Rate Shipping</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, color: '#1D4ED8' }}>
              <div>US Domestic: <strong>${flatRateUS.toFixed(2)}</strong> (5–10 business days)</div>
              <div>International: <strong>${flatRateIntl.toFixed(2)}</strong> (10–21 business days)</div>
            </div>
          </div>
        </Card>

        {/* ── Guidelines Button (always visible) ── */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGuidelines(true)}
          >
            Formatting Guidelines
          </Button>
        </div>

        {/* ── Add Book Form ── */}
        {showForm && (
          <Card style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.gray900 }}>
                Add a New Book
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormErrors({}); setError(null); }}>
                Cancel
              </Button>
            </div>
            <form onSubmit={handleSubmit}>

              {/* ── Step 1: Book Options ── */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: colors.gray900 }}>Book Options</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGuidelines(true)}
                    style={{
                      fontSize: 12, color: '#2563EB', background: 'none', border: 'none',
                      cursor: 'pointer', textDecoration: 'underline', fontFamily: colors.fontFamily
                    }}
                  >
                    Need help? View formatting guide
                  </button>
                </div>

                {optsLoading && (
                  <div style={{ textAlign: 'center', padding: 24, color: colors.gray500 }}>
                    <Spinner size={20} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Loading print options…</span>
                  </div>
                )}
                {usingFallback && !optsLoading && (
                  <Alert variant="info" style={{ marginBottom: 12 }}>
                    Using built-in options — all trim sizes, bindings, ink types, and paper options are available.
                  </Alert>
                )}
                {!optsLoading && (
                  <BookOptionsForm
                    fullOptions={fullOptions}
                    onChange={setBookComponents}
                    initialComponents={bookComponents}
                    compact
                  />
                )}
                {formErrors.bookOptions && (
                  <p style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>{formErrors.bookOptions}</p>
                )}
                {bookComponents?.podPackageId && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#F0FDF4', borderRadius: 6, fontSize: 12, color: '#16A34A' }}>
                    Selected: <strong>{bookComponents.podPackageId}</strong>
                  </div>
                )}

                {/* ── Format Info Panel (shows when options + page count selected) ── */}
                {bookComponents?.trim && pageCountNum > 0 && (
                  <FormatInfoPanel
                    trim={bookComponents.trim}
                    binding={bindingFromPod}
                    pageCount={pageCountNum}
                  />
                )}
              </div>

              {/* ── Step 2: Book Details ── */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: colors.gray900 }}>Book Details</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input
                      label="Book Title"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      error={formErrors.title}
                      placeholder="My Amazing Book"
                    />
                  </div>
                  <Input
                    label="Page Count"
                    type="number" min="24" step="2"
                    value={form.pageCount}
                    onChange={e => setForm(f => ({ ...f, pageCount: e.target.value }))}
                    error={formErrors.pageCount}
                    hint="Must be an even number. Lulu will detect the actual count during validation."
                    placeholder="250"
                  />
                  <Input
                    label="Retail Price (USD)"
                    type="number" step="0.01" min="0.01"
                    value={form.retailPrice}
                    onChange={e => setForm(f => ({ ...f, retailPrice: e.target.value }))}
                    error={formErrors.retailPrice}
                    placeholder="24.99"
                  />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input
                      label="Description (optional)"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="A brief description of your book"
                    />
                  </div>
                </div>
              </div>

              {/* ── Step 3: File Upload & Preview ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: colors.gray900 }}>Upload &amp; Preview PDF Files</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <FileUpload
                    label="Interior PDF"
                    accept=".pdf"
                    file={interiorFile}
                    onChange={e => setInteriorFile(e.target.files[0])}
                    error={formErrors.interiorFile}
                  />
                  <FileUpload
                    label="Cover PDF"
                    accept=".pdf"
                    file={coverFile}
                    onChange={e => setCoverFile(e.target.files[0])}
                    error={formErrors.coverFile}
                  />
                </div>

                {/* ── Preview Section (shows when files are uploaded) ── */}
                {(interiorFile || coverFile) && (
                  <FilePreview
                    interiorFile={interiorFile}
                    coverFile={coverFile}
                    podPackageId={bookComponents?.podPackageId}
                    pageCount={pageCountNum}
                  />
                )}

                <Alert variant="info" style={{ marginTop: '16px', marginBottom: '16px' }}>
                  Preview your PDFs above before submitting. When ready, click "Upload Book" to validate with Lulu and create the product.
                </Alert>
              </div>

              {/* ── Submit ── */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <><Spinner size={16} color={colors.white} />&nbsp; Uploading...</>
                    : 'Upload & Validate Book'}
                </Button>
                <Button variant="secondary" onClick={() => { setShowForm(false); setFormErrors({}); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Book List ── */}
        {books.length > 0 && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.gray900 }}>
                Your Books ({books.length})
              </h2>
              {!showForm && (
                <Button size="sm" onClick={() => { setShowForm(true); setError(null); setSuccessMsg(null); }}>
                  + Add Book
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {books.map(book => (
                <div key={book.id} style={{
                  border: `1px solid ${colors.gray200}`, borderRadius: '8px', padding: '16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  flexWrap: 'wrap', gap: '12px'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: colors.gray900 }}>
                        {book.title}
                      </span>
                      {statusBadge(getBookDisplayStatus(book))}
                    </div>
                    <div style={{ fontSize: '13px', color: colors.gray500 }}>
                      {book.pod_package_id}
                      {book.retail_price > 0 && ` · $${parseFloat(book.retail_price).toFixed(2)} retail`}
                      {book.print_cost > 0 && ` · $${parseFloat(book.print_cost).toFixed(2)} print cost`}
                      {book.author_profit > 0 && ` · $${parseFloat(book.author_profit).toFixed(2)} profit`}
                    </div>
                    {book.status === 'Validating' && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        marginTop: '8px', fontSize: '13px', color: colors.primary
                      }}>
                        <Spinner size={14} /> Validating files with Lulu...
                      </div>
                    )}
                    {book.status === 'Ready' && book.ghl_product_id && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: colors.gray500 }}>
                        Product created in GHL. Order a sample to review, then approve to activate.
                      </div>
                    )}

                    {/* Sample tracking info */}
                    {sampleStatusMap[book.id] && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: colors.gray700 }}>
                        {sampleStatusMap[book.id].sampleStatus === 'shipped' && sampleStatusMap[book.id].luluTracking && (
                          <div style={{ marginTop: '4px' }}>
                            <a href={sampleStatusMap[book.id].luluTracking} target="_blank" rel="noopener noreferrer"
                              style={{ color: colors.primary, textDecoration: 'underline', fontSize: '12px' }}>
                              View Tracking
                            </a>
                          </div>
                        )}
                        {sampleStatusMap[book.id].sampleCost > 0 && (
                          <div style={{ marginTop: '2px' }}>Sample cost: ${parseFloat(sampleStatusMap[book.id].sampleCost).toFixed(2)}</div>
                        )}
                      </div>
                    )}

                    {/* Shipping address form (shown when user clicks Order Sample) */}
                    {showShippingForm === book.id && (
                      <div style={{
                        marginTop: '12px', padding: '12px', background: colors.gray50,
                        borderRadius: '8px', border: `1px solid ${colors.gray200}`
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: colors.gray900 }}>
                          Shipping Address for Sample
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input type="text" placeholder="Street Address" value={shippingForm.street1}
                            onChange={e => setShippingForm(f => ({ ...f, street1: e.target.value }))}
                            style={{ gridCol: '1 / -1', padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                          <input type="text" placeholder="Apt/Suite (optional)" value={shippingForm.street2}
                            onChange={e => setShippingForm(f => ({ ...f, street2: e.target.value }))}
                            style={{ padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                          <input type="text" placeholder="State" value={shippingForm.state_code}
                            onChange={e => setShippingForm(f => ({ ...f, state_code: e.target.value }))}
                            style={{ padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                          <input type="text" placeholder="City" value={shippingForm.city}
                            onChange={e => setShippingForm(f => ({ ...f, city: e.target.value }))}
                            style={{ padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                          <input type="text" placeholder="ZIP Code" value={shippingForm.postcode}
                            onChange={e => setShippingForm(f => ({ ...f, postcode: e.target.value }))}
                            style={{ padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                          <input type="text" placeholder="Country Code" value={shippingForm.country_code}
                            onChange={e => setShippingForm(f => ({ ...f, country_code: e.target.value }))}
                            style={{ padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                          <input type="text" placeholder="Phone Number" value={shippingForm.phone_number}
                            onChange={e => setShippingForm(f => ({ ...f, phone_number: e.target.value }))}
                            style={{ gridCol: '1 / -1', padding: '8px 12px', border: `1px solid ${colors.gray200}`, borderRadius: '6px', fontSize: '13px' }} />
                        </div>
                      </div>
                    )}
                    {book.status === 'Error' && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedErrorId(expandedErrorId === book.id ? null : book.id)}
                            style={{
                              fontSize: 12, color: '#DC2626', background: 'none',
                              border: '1px solid #FECACA', borderRadius: 6,
                              padding: '3px 10px', cursor: 'pointer', fontFamily: colors.fontFamily,
                              fontWeight: 500
                            }}
                          >
                            {expandedErrorId === book.id ? 'Hide Details' : 'View Error Details'}
                          </button>
                        </div>
                        {expandedErrorId === book.id && book.validation_details && (
                          <div style={{
                            marginTop: 8, padding: 12, background: '#FEF2F2',
                            borderRadius: 8, border: '1px solid #FECACA', fontSize: 13, color: '#991B1B'
                          }}>
                            {(book.validation_details.errors || []).map((fileErr, idx) => (
                              <div key={idx} style={{ marginBottom: idx < (book.validation_details.errors?.length || 0) - 1 ? 10 : 0 }}>
                                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                                  {fileErr.fileType} PDF — Validation Failed
                                </div>
                                {fileErr.errors.map((e, i) => {
                                  if (e.type === 'dimension_mismatch') {
                                    return (
                                      <div key={i} style={{ marginBottom: 8 }}>
                                        <div style={{ marginBottom: 4 }}><strong>Problem:</strong> {e.summary}</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 6 }}>
                                          <span style={{ color: '#B91C1C', fontWeight: 600 }}>Your file:</span>
                                          <span>{e.yourDimensions}</span>
                                          <span style={{ color: '#047857', fontWeight: 600 }}>Required:</span>
                                          <span>{e.requiredDimensions}</span>
                                        </div>
                                        <div style={{
                                          background: '#FFFBEB', border: '1px solid #FDE68A',
                                          borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#92400E'
                                        }}>
                                          <strong>Fix:</strong> {e.suggestion || e.message}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={i} style={{ marginBottom: 6 }}>
                                      <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: 6, border: '1px solid #FECACA' }}>
                                        {e.message || JSON.stringify(e)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                            <div style={{ marginTop: 10, fontSize: 12, color: '#DC2626' }}>
                              <strong>Next steps:</strong> Fix your PDF files based on the details above, then remove this book and re-upload.
                            </div>
                          </div>
                        )}
                        {/* Fallback if no structured details */}
                        {expandedErrorId === book.id && !book.validation_details && (
                          <div style={{
                            marginTop: 8, padding: 12, background: '#FEF2F2',
                            borderRadius: 8, border: '1px solid #FECACA', fontSize: 12, color: '#991B1B'
                          }}>
                            {book.validation_error || 'Validation failed. Check your PDF files and try again.'}
                            <div style={{ marginTop: 8, color: '#B91C1C' }}>
                              <strong>Next steps:</strong> Fix your PDF files, then remove this book and re-upload.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Order Sample - only for Ready books */}
                    {book.status === 'Ready' && !sampleStatusMap[book.id]?.sampleStatus && showShippingForm !== book.id && (
                      <Button variant="ghost" size="sm" onClick={() => setShowShippingForm(book.id)}>
                        Order Sample
                      </Button>
                    )}
                    {showShippingForm === book.id && (
                      <>
                        <Button
                          size="sm"
                          disabled={sampleOrdering === book.id || !shippingForm.street1 || !shippingForm.city}
                          onClick={() => handleOrderSample(book.id)}
                        >
                          {sampleOrdering === book.id ? 'Ordering...' : 'Confirm Order'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowShippingForm(null)}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {/* Approve & Publish - only after sample is delivered or skipped */}
                    {book.status === 'Ready' && !book.product_approved && (
                      sampleStatusMap[book.id]?.sampleStatus === 'delivered' ? (
                        <Button
                          variant="success"
                          size="sm"
                          disabled={sampleApproving === book.id}
                          onClick={() => handleApproveProduct(book.id)}
                        >
                          {sampleApproving === book.id ? 'Approving...' : 'Approve & Publish'}
                        </Button>
                      ) : !sampleStatusMap[book.id]?.sampleStatus ? (
                        <Button variant="ghost" size="sm" onClick={() => handleApproveProduct(book.id)} title="Skip sample and publish directly">
                          Skip & Publish
                        </Button>
                      ) : null
                    )}
                    {book._sampleDisplayStatus === 'Approved' && (
                      <Badge variant="success">Approved</Badge>
                    )}
                    {/* Remove */}
                    <Button variant="secondary" size="sm" onClick={() => handleDelete(book.id, book.title)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {books.length === 0 && !showForm && (
          <Card style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: colors.gray500, fontSize: '15px', margin: '0 0 16px' }}>
              No books added yet. Click below to upload your first title.
            </p>
            <Button onClick={() => setShowForm(true)}>+ Add Your First Book</Button>
          </Card>
        )}

      </div>

      {/* ── Guidelines Modal ── */}
      {showGuidelines && <GuidelinesModal onClose={() => setShowGuidelines(false)} />}
    </div>
  );
}
