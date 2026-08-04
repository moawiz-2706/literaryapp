/**
 * FormatInfoPanel.jsx
 *
 * Shows real-time formatting information based on selected trim size,
 * binding type, and page count. Displays expected file dimensions,
 * spine width, and gutter margin recommendations.
 */

import {
  getFileDimensions, getSpineFormula, getGutterMargin,
  isBindingNeedingSpine
} from '../utils/coverDimensions';

const css = `
  .fip-panel {
    background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%);
    border: 1px solid #BFDBFE; border-radius: 10px;
    padding: 14px 18px; margin-top: 12px;
    font-size: 13px; color: #1E40AF;
  }
  .fip-row {
    display: flex; align-items: center; gap: 10px;
    padding: 4px 0;
  }
  .fip-row + .fip-row { border-top: 1px solid rgba(59,130,246,0.1); }
  .fip-label { font-weight: 500; color: #374151; min-width: 140px; }
  .fip-value { font-weight: 600; color: #1D4ED8; }
  .fip-note { font-size: 11px; color: #6B7280; font-weight: 400; }
`;

export default function FormatInfoPanel({ trim, binding, pageCount }) {
  if (!trim) return null;

  const fileDims = getFileDimensions(trim);
  const spineData = getSpineFormula(binding, pageCount);
  const needsSpine = isBindingNeedingSpine(binding);
  const gutter = pageCount > 0 ? getGutterMargin(pageCount) : null;

  if (!fileDims) return null;

  return (
    <div className="fip-panel">
      <style>{css}</style>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        File Format Requirements
      </div>

      {/* File Dimensions */}
      <div className="fip-row">
        <span className="fip-label">Trim Size:</span>
        <span className="fip-value">{fileDims.trimName} ({fileDims.trimSize})</span>
      </div>
      <div className="fip-row">
        <span className="fip-label">Interior File (no bleed):</span>
        <span className="fip-value">{fileDims.trimSize}</span>
        <span className="fip-note">· System adds bleed automatically</span>
      </div>
      <div className="fip-row">
        <span className="fip-label">Interior File (with bleed):</span>
        <span className="fip-value">{fileDims.withBleed}</span>
        <span className="fip-note">· If graphics extend to edge</span>
      </div>

      {/* Spine Width */}
      {needsSpine && pageCount > 0 && spineData && (
        <>
          <div className="fip-row">
            <span className="fip-label">Spine Width:</span>
            <span className="fip-value">{spineData.inches} ({spineData.mm})</span>
          </div>
        </>
      )}

      {/* No spine needed */}
      {needsSpine && pageCount > 0 && !spineData && (
        <div className="fip-row">
          <span className="fip-label">Spine Width:</span>
          <span className="fip-value" style={{ color: '#D97706' }}>
            Need more pages
          </span>
        </div>
      )}

      {/* Gutter */}
      {needsSpine && gutter && pageCount > 60 && (
        <div className="fip-row">
          <span className="fip-label">Gutter Margin:</span>
          <span className="fip-value">{gutter.total}</span>
          <span className="fip-note">· Add {gutter.extra} to inside edge</span>
        </div>
      )}

      {/* Bleed reminder */}
      <div className="fip-row">
        <span className="fip-label">Bleed:</span>
        <span className="fip-value">{fileDims.bleedRequired}</span>
      </div>
      <div className="fip-row">
        <span className="fip-label">Safety Margin:</span>
        <span className="fip-value">{fileDims.safetyMargin}</span>
        <span className="fip-note">· Keep content inside this</span>
      </div>
    </div>
  );
}
