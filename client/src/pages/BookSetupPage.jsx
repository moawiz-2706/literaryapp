import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { fetchFullOptions } from '../services/optionsService';
import BookOptionsForm from '../components/BookOptionsForm';
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

  // ── Book options (shared with Quote Calculator) ──────────────────────────
  const [options, setOptions] = useState(null);
  const [optsLoading, setOptsLoading] = useState(true);
  const [optsError, setOptsError] = useState(false);
  const [bookComponents, setBookComponents] = useState(null);

  // Load options on mount
  useEffect(() => {
    fetchFullOptions()
      .then(setOptions)
      .catch(() => setOptsError(true))
      .finally(() => setOptsLoading(false));
  }, []);

  // ── Flat shipping info ──────────────────────────────────────────────────
  const flatRateUS = options?.shippingRates?.usDomestic || 5.95;
  const flatRateIntl = options?.shippingRates?.international || 14.95;

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
          const { status, printCost, authorProfit, ghlProductId } = resp.data;
          if (status !== 'Validating') {
            setBooks(prev => prev.map(b =>
              b.id === book.id
                ? { ...b, status, print_cost: printCost, author_profit: authorProfit, ghl_product_id: ghlProductId }
                : b
            ));
            if (status === 'Ready') {
              setSuccessMsg(`"${book.title}" has been validated and is ready to sell. Attach the product to your order form.`);
            } else if (status === 'Error') {
              setError(`"${book.title}" failed validation. Please check your PDF files and try again.`);
            }
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
    if (!bookComponents?.podPackageId) errors.bookOptions = 'Please select all book options before uploading.';
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
      setSuccessMsg(`"${form.title}" uploaded. Validation is in progress and may take a few minutes.`);
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

      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

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
              { step: '1', title: 'Choose Book Options', desc: 'Select trim, binding, ink, quality, paper, and cover finish — same options as the Quote Calculator.' },
              { step: '2', title: 'Upload Your Book', desc: 'Upload your interior and cover PDFs. Literary App validates them automatically.' },
              { step: '3', title: 'Reader Buys', desc: 'When a reader places an order, the system automatically submits it for printing.' },
              { step: '4', title: 'Ships Direct', desc: 'We print and ship the book directly to your reader. Flat-rate shipping applied.' }
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
              <div>🇺🇸 US Domestic: <strong>${flatRateUS.toFixed(2)}</strong> (5–10 business days)</div>
              <div>🌍 International: <strong>${flatRateIntl.toFixed(2)}</strong> (10–21 business days)</div>
            </div>
            <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 6 }}>
              Shipping is a flat rate included in every order. No surprise charges based on weight or distance.
            </div>
          </div>
        </Card>

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

              {/* ── Book Options (Progressive Selection) ── */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.gray900 }}>Book Options</span>
                </div>
                {optsLoading && (
                  <div style={{ textAlign: 'center', padding: 24, color: colors.gray500 }}>
                    <Spinner size={20} /> <span style={{ fontSize: 13, marginLeft: 8 }}>Loading print options…</span>
                  </div>
                )}
                {optsError && (
                  <Alert variant="warning" style={{ marginBottom: 12 }}>
                    Could not load the latest print options. Using built-in defaults.
                  </Alert>
                )}
                {!optsLoading && (
                  <BookOptionsForm
                    labels={options?.labels}
                    onChange={setBookComponents}
                    initialComponents={bookComponents}
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
              </div>

              {/* ── Book Details ── */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.gray900 }}>Book Details</span>
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
                    type="number" min="24"
                    value={form.pageCount}
                    onChange={e => setForm(f => ({ ...f, pageCount: e.target.value }))}
                    error={formErrors.pageCount}
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

              {/* ── File Uploads ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2563EB', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.gray900 }}>Upload PDF Files</span>
                </div>
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

              <Alert variant="info" style={{ marginBottom: '16px' }}>
                Files will be uploaded to secure storage and validated by Literary App. Validation may take a few minutes. Do not close this page.
              </Alert>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <><Spinner size={16} color={colors.white} />&nbsp; Uploading...</>
                    : 'Upload Book'}
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
                      {statusBadge(book.status)}
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
                        <Spinner size={14} /> Validating files with Literary App...
                      </div>
                    )}
                    {book.status === 'Ready' && book.ghl_product_id && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: colors.success }}>
                        Product created. Attach it to your order form to start selling.
                      </div>
                    )}
                    {book.status === 'Error' && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: colors.error }}>
                        Validation failed. Remove this book and re-upload corrected PDF files.
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(book.id, book.title)}
                  >
                    Remove
                  </Button>
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
    </div>
  );
}