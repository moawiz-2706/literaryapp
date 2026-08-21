/**
 * GuidelinesModal.jsx
 *
 * Comprehensive modal popup showing print formatting guidelines.
 * Organized into tabbed sections for easy navigation.
 */

import { useState } from 'react';

const css = `
  @keyframes guidelinesFadeIn {
    from { opacity: 0; transform: translateY(-20px) scale(0.97); }
    to { opacity: 1; transform: none; }
  }
  @keyframes guidelinesOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .gl-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: guidelinesOverlayIn 0.2s ease;
  }
  .gl-modal {
    background: #fff; border-radius: 16px; width: 100%; max-width: 720px;
    max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    animation: guidelinesFadeIn 0.25s ease;
  }
  .gl-header {
    padding: 20px 24px; border-bottom: 1px solid #E5E7EB;
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%);
  }
  .gl-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
  .gl-header p { margin: 4px 0 0; font-size: 13px; color: #6B7280; }
  .gl-close {
    width: 32px; height: 32px; border-radius: 8px; border: none;
    background: #F3F4F6; cursor: pointer; font-size: 18px; color: #6B7280;
    display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .gl-close:hover { background: #E5E7EB; color: #111827; }
  .gl-tabs {
    display: flex; gap: 0; border-bottom: 1px solid #E5E7EB; padding: 0 24px;
    overflow-x: auto; background: #FAFAFA; flex-shrink: 0;
  }
  .gl-tab {
    padding: 12px 16px; font-size: 13px; font-weight: 500; color: #6B7280;
    border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent;
    white-space: nowrap; transition: all 0.15s;
  }
  .gl-tab:hover { color: #2563EB; }
  .gl-tab.active { color: #2563EB; border-bottom-color: #2563EB; font-weight: 600; }
  .gl-body {
    padding: 24px; overflow-y: auto; flex: 1;
    font-size: 14px; line-height: 1.7; color: #374151;
  }
  .gl-section { display: none; }
  .gl-section.active { display: block; }
  .gl-section h3 {
    font-size: 16px; font-weight: 700; color: #111827;
    margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6;
  }
  .gl-section h4 {
    font-size: 14px; font-weight: 600; color: #1F2937; margin: 20px 0 8px;
  }
  .gl-section p { margin: 0 0 10px; }
  .gl-section ul, .gl-section ol { margin: 0 0 12px; padding-left: 20px; }
  .gl-section li { margin-bottom: 6px; }
  .gl-section code {
    background: #F3F4F6; padding: 2px 6px; border-radius: 4px;
    font-size: 13px; font-family: 'SF Mono', Monaco, monospace; color: #DC2626;
  }
  .gl-tip {
    background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px;
    padding: 12px 16px; margin: 12px 0; font-size: 13px; color: #1E40AF;
  }
  .gl-tip strong { color: #1D4ED8; }
  .gl-warning {
    background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px;
    padding: 12px 16px; margin: 12px 0; font-size: 13px; color: #92400E;
  }
  .gl-table {
    width: 100%; border-collapse: collapse; margin: 12px 0;
    font-size: 13px;
  }
  .gl-table th {
    background: #F9FAFB; padding: 8px 12px; text-align: left;
    font-weight: 600; color: #374151; border-bottom: 2px solid #E5E7EB;
  }
  .gl-table td {
    padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #4B5563;
  }
  .gl-formula {
    background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px;
    padding: 14px 18px; margin: 12px 0; font-family: 'SF Mono', Monaco, monospace;
    font-size: 14px; color: #111827; text-align: center;
  }
  .gl-source {
    text-align: center; padding: 16px 24px; border-top: 1px solid #F3F4F6;
    font-size: 12px; color: #9CA3AF; background: #FAFAFA; flex-shrink: 0;
  }
`;

const TABS = [
  { id: 'file-specs', label: 'File Specifications' },
  { id: 'trim-sizes', label: 'Trim Sizes' },
  { id: 'spine', label: 'Spine & Cover' },
  { id: 'bleed', label: 'Bleed & Safety' },
  { id: 'color', label: 'Color & Resolution' },
  { id: 'tools', label: 'Tools & Tips' }
];

export default function GuidelinesModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('file-specs');

  return (
    <div className="gl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gl-modal">
        <style>{css}</style>

        <div className="gl-header">
          <div>
            <h2>Formatting Guidelines</h2>
            <p>Official specifications from the Print Provider Book Creation Guide</p>
          </div>
          <button className="gl-close" onClick={onClose}>&times;</button>
        </div>

        <div className="gl-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`gl-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="gl-body">

          {/* ── File Specifications ── */}
          <div className={`gl-section ${activeTab === 'file-specs' ? 'active' : ''}`}>
            <h3>Interior File Specifications</h3>
            <h4>General Requirements</h4>
            <ul>
              <li><strong>Format:</strong> Single-page layout PDF (NOT spreads)</li>
              <li><strong>Minimum pages:</strong> 24 pages for paperback; 24 for hardcover</li>
              <li><strong>Page count must be even</strong> for perfect bound books</li>
              <li><strong>File size limit:</strong> 200 MB</li>
              <li><strong>No security/password protection</strong> on the PDF</li>
            </ul>

            <h4>Fonts & Layers</h4>
            <ul>
              <li>All fonts must be <strong>embedded</strong> in the PDF</li>
              <li>All transparent layers must be <strong>flattened</strong></li>
              <li>Do NOT include trim, bleed, or margin guide lines in the final file</li>
            </ul>

            <h4>Image Resolution</h4>
            <ul>
              <li>Embedded images must be <strong>300 PPI minimum</strong></li>
              <li>Must not exceed <strong>600 PPI resolution</strong></li>
              <li>Use <strong>150 PPI minimum</strong> for simple graphics</li>
              <li><strong>72 PPI</strong> is acceptable only for purely digital/screen-only graphics</li>
            </ul>

            <div className="gl-tip">
              <strong>Tip:</strong> Use the Adobe Job Options provided by your print provider when exporting from Adobe products to ensure print-ready settings are applied automatically.
            </div>

            <h3>Cover File Specifications</h3>
            <ul>
              <li><strong>Format:</strong> Single-page integrated spread PDF (back cover + spine + front cover as ONE page)</li>
              <li>Same image resolution requirements as interior (300–600 PPI)</li>
              <li>All fonts embedded, transparent layers flattened</li>
              <li>No security/password protection</li>
              <li>Magazine & Comic Book covers: require a two-page cover file (can print inside front/back)</li>
            </ul>

            <div className="gl-warning">
              <strong>Important:</strong> The cover must be a single spread page containing the back cover, spine, and front cover laid out horizontally. Do NOT upload separate front and back cover files.
            </div>
          </div>

          {/* ── Trim Sizes ── */}
          <div className={`gl-section ${activeTab === 'trim-sizes' ? 'active' : ''}`}>
            <h3>Available Trim Sizes</h3>
            <p>Your interior file must be sized to match the trim size you select. If your file includes bleed, use the "With Bleed" dimensions.</p>

            <table className="gl-table">
              <thead>
                <tr><th>Trim Name</th><th>Trim Size</th><th>With Bleed</th></tr>
              </thead>
              <tbody>
                <tr><td>Pocketbook</td><td>4.25&Prime; &times; 6.875&Prime;</td><td>4.5&Prime; &times; 7.125&Prime;</td></tr>
                <tr><td>Novella</td><td>5&Prime; &times; 8&Prime;</td><td>5.25&Prime; &times; 8.25&Prime;</td></tr>
                <tr><td>Digest</td><td>5.5&Prime; &times; 8.5&Prime;</td><td>5.75&Prime; &times; 8.75&Prime;</td></tr>
                <tr><td>A5</td><td>5.83&Prime; &times; 8.27&Prime;</td><td>6.08&Prime; &times; 8.52&Prime;</td></tr>
                <tr><td>Royal</td><td>6.14&Prime; &times; 9.21&Prime;</td><td>6.39&Prime; &times; 9.46&Prime;</td></tr>
                <tr><td><strong>US Trade (Popular)</strong></td><td><strong>6&Prime; &times; 9&Prime;</strong></td><td><strong>6.25&Prime; &times; 9.25&Prime;</strong></td></tr>
                <tr><td>Comic Book</td><td>6.63&Prime; &times; 10.25&Prime;</td><td>6.88&Prime; &times; 10.5&Prime;</td></tr>
                <tr><td>Executive</td><td>7&Prime; &times; 10&Prime;</td><td>7.25&Prime; &times; 10.25&Prime;</td></tr>
                <tr><td>Crown Quarto</td><td>7.44&Prime; &times; 9.68&Prime;</td><td>7.69&Prime; &times; 9.93&Prime;</td></tr>
                <tr><td>Small Square</td><td>7.5&Prime; &times; 7.5&Prime;</td><td>7.75&Prime; &times; 7.75&Prime;</td></tr>
                <tr><td>A4</td><td>8.27&Prime; &times; 11.69&Prime;</td><td>8.52&Prime; &times; 11.94&Prime;</td></tr>
                <tr><td>Square</td><td>8.5&Prime; &times; 8.5&Prime;</td><td>8.75&Prime; &times; 8.75&Prime;</td></tr>
                <tr><td>US Letter</td><td>8.5&Prime; &times; 11&Prime;</td><td>8.75&Prime; &times; 11.25&Prime;</td></tr>
                <tr><td>Small Landscape</td><td>9&Prime; &times; 7&Prime;</td><td>9.25&Prime; &times; 7.25&Prime;</td></tr>
                <tr><td>US Letter Landscape</td><td>11&Prime; &times; 8.5&Prime;</td><td>11.25&Prime; &times; 8.75&Prime;</td></tr>
              </tbody>
            </table>

            <div className="gl-tip">
              <strong>6&Prime; &times; 9&Prime; (US Trade)</strong> is the most popular trim size for trade paperbacks and is recommended for most books.
            </div>
          </div>

          {/* ── Spine & Cover ── */}
          <div className={`gl-section ${activeTab === 'spine' ? 'active' : ''}`}>
            <h3>Spine Width & Cover Layout</h3>

            <h4>Paperback Spine Width Formula</h4>
            <div className="gl-formula">
              Spine Width (inches) = (Number of Pages &divide; 444) + 0.06 in
            </div>
            <div className="gl-formula">
              Spine Width (mm) = (Number of Pages &divide; 17.48) + 1.524 mm
            </div>

            <h4>Hardcover Spine Width Reference</h4>
            <table className="gl-table">
              <thead><tr><th>Page Count</th><th>Spine Width</th></tr></thead>
              <tbody>
                <tr><td>24–84</td><td>0.25 in (6 mm)</td></tr>
                <tr><td>85–140</td><td>0.5 in (13 mm)</td></tr>
                <tr><td>141–194</td><td>0.625–0.688 in (16–17 mm)</td></tr>
                <tr><td>195–306</td><td>0.75–0.938 in (19–24 mm)</td></tr>
                <tr><td>307–444</td><td>1–1.25 in (25–32 mm)</td></tr>
                <tr><td>445–610</td><td>1.313–1.625 in (33–41 mm)</td></tr>
                <tr><td>611–800</td><td>1.688–2.125 in (43–54 mm)</td></tr>
              </tbody>
            </table>

            <h4>Designing for the Spine</h4>
            <ol>
              <li>Do <strong>not</strong> include text that fills the entire spine width — leave at least <strong>0.125 in</strong> between spine text and the edge</li>
              <li>If your book is <strong>80 pages or fewer</strong>, do not include spine text (low page count causes placement shift)</li>
              <li>Keep the spine the <strong>same color/graphic</strong> as the rest of the cover</li>
            </ol>

            <h4>Gutter Margins (Books Over 60 Pages)</h4>
            <table className="gl-table">
              <thead><tr><th>Page Count</th><th>Additional Gutter</th><th>Total Inside Margin</th></tr></thead>
              <tbody>
                <tr><td>Less than 60</td><td>0 in</td><td>0.5 in (13 mm)</td></tr>
                <tr><td>61 to 150</td><td>0.125 in</td><td>0.625 in (16 mm)</td></tr>
                <tr><td>151 to 400</td><td>0.5 in</td><td>1 in (25 mm)</td></tr>
                <tr><td>400 to 600</td><td>0.625 in</td><td>1.125 in (29 mm)</td></tr>
                <tr><td>Over 600</td><td>0.75 in</td><td>1.25 in (32 mm)</td></tr>
              </tbody>
            </table>

            <div className="gl-tip">
              <strong>Note:</strong> Coil Bound and Saddle Stitch books do NOT require a gutter. Only add gutter to the page margin on the side facing the spine.
            </div>

            <h4>Trimming Variance</h4>
            <p>There is a <strong>0.125 in trimming tolerance</strong> toward the front and back cover. Templates include a <strong>0.5 in safety margin</strong> to help avoid spine text alignment issues and cut-off content.</p>
          </div>

          {/* ── Bleed & Safety ── */}
          <div className={`gl-section ${activeTab === 'bleed' ? 'active' : ''}`}>
            <h3>Bleed & Safety Margins</h3>

            <h4>What is Bleed?</h4>
            <p>Bleed is the extra area of paper that gets trimmed away after printing. It ensures that background colors or images that extend to the edge of the page print cleanly without white borders.</p>

            <h4>Bleed Requirements</h4>
            <ul>
              <li>The print provider requires a <strong>0.125 in (3.175 mm)</strong> bleed margin on <strong>ALL sides</strong></li>
              <li>This is <strong>mandatory</strong> for all files</li>
              <li>Interior pages are printed oversized, then trimmed to the uniform trim size</li>
            </ul>

            <h4>How to Prepare Your File</h4>
            <div className="gl-tip">
              <strong>If your file does NOT have graphics extending to the edge:</strong><br />
              Prepare your file at the final trim size. The printing system will automatically add the 0.125 in bleed margin.
            </div>
            <div className="gl-warning">
              <strong>If your file HAS graphics/fills extending to the edge:</strong><br />
              You MUST use the "With Bleed" dimensions from the trim size table above. Extend your background/images 0.125 in beyond the trim edge on all sides.
            </div>

            <h4>Safety Margin</h4>
            <ul>
              <li>Keep all important content (text, logos, page numbers) at least <strong>0.5 in (12.7 mm)</strong> from the trim edge</li>
              <li>The gutter (inside edge near the spine) should have a wider margin than the outer edges</li>
              <li>For books over 60 pages, add additional gutter as shown in the Spine tab</li>
            </ul>
          </div>

          {/* ── Color & Resolution ── */}
          <div className={`gl-section ${activeTab === 'color' ? 'active' : ''}`}>
            <h3>Color & Resolution Guidelines</h3>

            <h4>Color Space</h4>
            <ul>
              <li><strong>RGB</strong> is additive (Red, Green, Blue) — used for screens</li>
              <li><strong>CMYK</strong> is subtractive (Cyan, Magenta, Yellow, Black) — used for print</li>
            </ul>

            <h4>Color Setup Recommendations</h4>
            <ol>
              <li>Start from scratch → set up your document as an <strong>RGB file</strong></li>
              <li>Use <strong>sRGB color space</strong> in your RGB document color profile</li>
              <li>Apply sRGB to any RGB images/links before making your print-ready PDF</li>
              <li>If your file is already converted to CMYK, keep it CMYK — do not switch back to RGB</li>
              <li>Solid blacks should print at <strong>100% K</strong> with no other colors added</li>
            </ol>

            <h4>Technical Color Limits</h4>
            <ul>
              <li><strong>TAC (Total Area Coverage)</strong> should never exceed 270%</li>
              <li>Tint variation is difficult to control in light colors (20% or less)</li>
              <li>Gamma value of grayscale images should be between <strong>2.2 and 2.4</strong></li>
              <li>Black & white images should have color space set to <strong>grayscale</strong></li>
            </ul>

            <h4>Ink & Paper Recommendations</h4>
            <table className="gl-table">
              <thead><tr><th>Use Case</th><th>Recommended Ink</th><th>Recommended Paper</th></tr></thead>
              <tbody>
                <tr><td>Novels, memoirs, text-heavy (few/no graphics)</td><td>Standard Black & White</td><td>60# Uncoated White or Cream</td></tr>
                <tr><td>Grayscale images, moderate graphics</td><td>Premium Black & White</td><td>80# Coated White</td></tr>
                <tr><td>Color photos, illustrations, children's books</td><td>Standard or Premium Color</td><td>60# Uncoated White or 80# Coated White</td></tr>
                <tr><td>Professional photo books, art prints</td><td>Premium Color</td><td>80# Coated White</td></tr>
              </tbody>
            </table>
          </div>

          {/* ── Tools & Tips ── */}
          <div className={`gl-section ${activeTab === 'tools' ? 'active' : ''}`}>
            <h3>Tools & Export Settings</h3>

            <h4>PDF Job Options</h4>
            <p>Your print provider offers Adobe Job Options files that apply the correct printer settings automatically.</p>

            <h4>Adobe InDesign</h4>
            <ol>
              <li>Go to: File &gt; Adobe PDF Presets &gt; Define</li>
              <li>Click Load and select the <code>.joboptions</code> file</li>
              <li>Export your file, select the print-ready settings from the "Adobe PDF Preset" drop-down list</li>
            </ol>

            <h4>Adobe Photoshop</h4>
            <ol>
              <li>Go to: Edit &gt; Adobe PDF Presets</li>
              <li>Click Load and select the <code>.joboptions</code> file</li>
              <li>Use "Save as Photoshop PDF" and select the joboptions settings</li>
            </ol>

            <h4>Adobe Acrobat Distiller</h4>
            <ol>
              <li>Go to: Settings &gt; Add Adobe PDF Settings</li>
              <li>Navigate to the <code>.joboptions</code> file and click OK</li>
              <li>Select the new settings from the "Default Settings" drop-down before importing your PostScript file</li>
            </ol>

            <h4>Microsoft Word</h4>
            <ul>
              <li>Use the <strong>Styles</strong> feature to define consistent text appearance throughout</li>
              <li>Use <strong>Page Breaks</strong> to control content placement between pages</li>
              <li>Avoid inline formatting with hard returns or paragraph breaks — this causes content shifts during export</li>
              <li>Export as PDF from Word's "Save As" &gt; PDF option</li>
            </ul>

            <h4>Proofing</h4>
            <div className="gl-tip">
              <strong>Strongly recommended:</strong> Purchase a single proof copy of your book before ordering in bulk. This lets you review the actual printed quality, colors, and binding before committing.
            </div>
          </div>

        </div>

        <div className="gl-source">
          Source: Print Provider Book Creation Guide — {new Date().getFullYear()} Edition
        </div>
      </div>
    </div>
  );
}
