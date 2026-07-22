/**
 * FilePreview.jsx
 *
 * Embedded PDF preview component using the browser's native PDF viewer.
 * Shows a preview of uploaded interior/cover PDFs in a controlled viewport.
 * Also displays validation results and expected cover dimensions.
 */

import { useState, useEffect } from 'react';
import api from '../api';

const css = `
  .fp-container {
    border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden;
    background: #fff; margin-top: 16px;
  }
  .fp-header {
    padding: 12px 16px; background: #F9FAFB; border-bottom: 1px solid #E5E7EB;
    display: flex; justify-content: space-between; align-items: center;
  }
  .fp-header h4 { margin: 0; font-size: 14px; font-weight: 600; color: #374151; }
  .fp-viewer {
    width: 100%; height: 500px; background: #F3F4F6;
  }
  .fp-viewer iframe { width: 100%; height: 100%; border: none; }
  .fp-viewer-placeholder {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 500px; color: #9CA3AF; gap: 8px;
  }
  .fp-viewer-placeholder svg { opacity: 0.4; }
  .fp-tabs {
    display: flex; border-bottom: 1px solid #E5E7EB; background: #FAFAFA;
  }
  .fp-tab {
    padding: 10px 16px; font-size: 13px; font-weight: 500; color: #6B7280;
    border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent;
    transition: all 0.15s;
  }
  .fp-tab:hover { color: #2563EB; }
  .fp-tab.active { color: #2563EB; border-bottom-color: #2563EB; font-weight: 600; }
  .fp-info {
    padding: 12px 16px; background: #F9FAFB; border-top: 1px solid #E5E7EB;
    display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #6B7280;
  }
  .fp-info-item { display: flex; align-items: center; gap: 6px; }
  .fp-info-item strong { color: #374151; }
  .fp-status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
  }
  .fp-status-validating { background: #EFF6FF; color: #2563EB; }
  .fp-status-valid { background: #F0FDF4; color: #16A34A; }
  .fp-status-error { background: #FEF2F2; color: #DC2626; }
  .fp-status-normalized { background: #FFFBEB; color: #D97706; }
  .fp-dimensions {
    padding: 12px 16px; background: #EFF6FF; border-top: 1px solid #BFDBFE;
    font-size: 12px; color: #1E40AF;
  }
  .fp-dimensions strong { color: #1D4ED8; }
  .fp-validate-btn {
    padding: 6px 14px; font-size: 12px; font-weight: 500;
    background: #2563EB; color: #fff; border: none; border-radius: 6px;
    cursor: pointer; transition: all 0.15s;
  }
  .fp-validate-btn:hover { background: #1D4ED8; }
  .fp-validate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .fp-errors {
    padding: 10px 16px; background: #FEF2F2; border-top: 1px solid #FECACA;
    font-size: 12px; color: #DC2626;
  }
`;

function StatusBadge({ status }) {
  const cls = {
    'VALIDATING': 'fp-status-validating',
    'NORMALIZING': 'fp-status-validating',
    'VALIDATED': 'fp-status-valid',
    'NORMALIZED': 'fp-status-normalized',
    'ERROR': 'fp-status-error',
    'REJECTED': 'fp-status-error'
  }[status] || 'fp-status-validating';
  return <span className={`fp-status-badge ${cls}`}>{status}</span>;
}

export default function FilePreview({ interiorFile, coverFile, podPackageId, pageCount }) {
  const [activeTab, setActiveTab] = useState('interior');
  const [previewId, setPreviewId] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  // Get PDF URLs from File objects
  const interiorUrl = interiorFile ? URL.createObjectURL(interiorFile) : null;
  const coverUrl = coverFile ? URL.createObjectURL(coverFile) : null;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (interiorUrl) URL.revokeObjectURL(interiorUrl);
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, []);

  // Poll for validation status
  useEffect(() => {
    if (!previewId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await api.get(`/preview/${previewId}/status`);
        setPreviewResult(resp.data);
        if (
          ['VALIDATED', 'NORMALIZED', 'ERROR', 'REJECTED'].includes(resp.data.interiorStatus) &&
          (!resp.data.coverStatus || ['VALIDATED', 'NORMALIZED', 'ERROR', 'REJECTED'].includes(resp.data.coverStatus))
        ) {
          clearInterval(interval);
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [previewId]);

  async function handleValidate() {
    if (!podPackageId || !interiorFile) return;

    setValidating(true);
    setError(null);
    setPreviewResult(null);

    const formData = new FormData();
    formData.append('interiorPdf', interiorFile);
    if (coverFile) formData.append('coverPdf', coverFile);
    formData.append('podPackageId', podPackageId);
    formData.append('pageCount', pageCount || '0');

    try {
      const resp = await api.post('/preview/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      setPreviewId(resp.data.previewId);
      setPreviewResult(resp.data);
    } catch (err) {
      setError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  }

  const coverDims = previewResult?.expectedCoverDimensions || null;
  const interiorStatus = previewResult?.interiorStatus || null;
  const coverStatus = previewResult?.coverStatus || null;
  const errors = previewResult?.errors || null;

  return (
    <div>
      <style>{css}</style>

      <div className="fp-container">
        <div className="fp-header">
          <h4>File Preview &amp; Validation</h4>
          <button
            className="fp-validate-btn"
            onClick={handleValidate}
            disabled={validating || !interiorFile || !podPackageId}
          >
            {validating ? 'Validating...' : previewId ? 'Re-validate' : 'Validate Files'}
          </button>
        </div>

        <div className="fp-tabs">
          <button
            className={`fp-tab ${activeTab === 'interior' ? 'active' : ''}`}
            onClick={() => setActiveTab('interior')}
          >
            Interior PDF {interiorStatus && <StatusBadge status={interiorStatus} />}
          </button>
          <button
            className={`fp-tab ${activeTab === 'cover' ? 'active' : ''}`}
            onClick={() => setActiveTab('cover')}
          >
            Cover PDF {coverStatus && <StatusBadge status={coverStatus} />}
          </button>
        </div>

        <div className="fp-viewer">
          {activeTab === 'interior' && interiorUrl ? (
            <iframe src={`${interiorUrl}#toolbar=1&navpanes=0`} title="Interior PDF Preview" />
          ) : activeTab === 'cover' && coverUrl ? (
            <iframe src={`${coverUrl}#toolbar=1&navpanes=0`} title="Cover PDF Preview" />
          ) : (
            <div className="fp-viewer-placeholder">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3 0h3m-6 0v3.75m6-3.75v3.75" />
              </svg>
              <span>{activeTab === 'interior' ? 'Upload interior PDF to preview' : 'Upload cover PDF to preview'}</span>
            </div>
          )}
        </div>

        {/* Expected Cover Dimensions */}
        {coverDims && (
          <div className="fp-dimensions">
            Expected Cover Dimensions: <strong>{coverDims.width} {coverDims.unit} wide</strong> &times; <strong>{coverDims.height} {coverDims.unit} tall</strong>
            {pageCount > 0 && ` · Page Count: ${pageCount}`}
          </div>
        )}

        {/* Validation Results */}
        {previewResult && (
          <div className="fp-info">
            <div className="fp-info-item">
              Interior: <StatusBadge status={interiorStatus || 'PENDING'} />
              {previewResult.interiorPageCount && (
                <span> · <strong>{previewResult.interiorPageCount} pages detected</strong></span>
              )}
            </div>
            {previewResult.coverStatus && (
              <div className="fp-info-item">
                Cover: <StatusBadge status={coverStatus} />
              </div>
            )}
          </div>
        )}

        {/* Validation Errors */}
        {errors && errors.length > 0 && (
          <div className="fp-errors">
            {errors.map((e, i) => (
              <div key={i} style={{ marginBottom: i < errors.length - 1 ? 4 : 0 }}>
                <strong>{e.type === 'interior' ? 'Interior PDF' : 'Cover PDF'}:</strong> {e.message}
              </div>
            ))}
          </div>
        )}

        {/* Local Error */}
        {error && !previewResult && (
          <div style={{ padding: '10px 16px', background: '#FEF2F2', borderTop: '1px solid #FECACA', fontSize: 12, color: '#DC2626' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
