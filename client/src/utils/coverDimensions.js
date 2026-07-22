/**
 * coverDimensions.js
 *
 * Client-side helper to calculate spine width and expected cover dimensions
 * based on Lulu's official formulas and tables.
 */

// ── Paperback Spine Width ─────────────────────────────────────────────────────
export function calculatePaperbackSpineWidth(pageCount) {
  if (pageCount < 32) return null;
  const inches = (pageCount / 444) + 0.06;
  const mm = (pageCount / 17.48) + 1.524;
  return { inches: inches.toFixed(3), mm: mm.toFixed(3) };
}

// ── Hardcover Spine Width (table-based) ───────────────────────────────────────
export function calculateHardcoverSpineWidth(pageCount) {
  const table = [
    { min: 0, max: 23, inches: null, mm: null },
    { min: 24, max: 84, inches: 0.25, mm: 6 },
    { min: 85, max: 140, inches: 0.5, mm: 13 },
    { min: 141, max: 168, inches: 0.625, mm: 16 },
    { min: 169, max: 194, inches: 0.688, mm: 17 },
    { min: 195, max: 222, inches: 0.75, mm: 19 },
    { min: 223, max: 250, inches: 0.813, mm: 21 },
    { min: 251, max: 278, inches: 0.875, mm: 22 },
    { min: 279, max: 306, inches: 0.938, mm: 24 },
    { min: 307, max: 334, inches: 1.0, mm: 25 },
    { min: 335, max: 360, inches: 1.063, mm: 27 },
    { min: 361, max: 388, inches: 1.125, mm: 29 },
    { min: 389, max: 416, inches: 1.188, mm: 30 },
    { min: 417, max: 444, inches: 1.25, mm: 32 },
    { min: 445, max: 472, inches: 1.313, mm: 33 },
    { min: 473, max: 500, inches: 1.375, mm: 35 },
    { min: 501, max: 528, inches: 1.438, mm: 37 },
    { min: 529, max: 556, inches: 1.5, mm: 38 },
    { min: 557, max: 582, inches: 1.563, mm: 40 },
    { min: 583, max: 610, inches: 1.625, mm: 41 },
    { min: 611, max: 638, inches: 1.688, mm: 43 },
    { min: 639, max: 666, inches: 1.75, mm: 44 },
    { min: 667, max: 694, inches: 1.813, mm: 46 },
    { min: 695, max: 722, inches: 1.875, mm: 48 },
    { min: 723, max: 750, inches: 1.938, mm: 49 },
    { min: 751, max: 778, inches: 2.0, mm: 51 },
    { min: 779, max: 799, inches: 2.063, mm: 52 },
    { min: 800, max: 10000, inches: 2.125, mm: 54 },
  ];

  const row = table.find(r => pageCount >= r.min && pageCount <= r.max);
  if (!row) return null;
  return {
    inches: row.inches ? `${row.inches} in` : 'N/A (need more pages)',
    mm: row.mm ? `${row.mm} mm` : 'N/A (need more pages)'
  };
}

// ── Gutter Margin ─────────────────────────────────────────────────────────────
export function getGutterMargin(pageCount) {
  if (pageCount <= 60) return { extra: '0 in', total: '0.5 in (13 mm)' };
  if (pageCount <= 150) return { extra: '0.125 in', total: '0.625 in (16 mm)' };
  if (pageCount <= 400) return { extra: '0.5 in', total: '1 in (25 mm)' };
  if (pageCount <= 600) return { extra: '0.625 in', total: '1.125 in (29 mm)' };
  return { extra: '0.75 in', total: '1.25 in (32 mm)' };
}

// ── Binding Type Helper ───────────────────────────────────────────────────────
export function isBindingNeedingSpine(binding) {
  return ['PB', 'CW', 'LW'].includes(binding);
}

export function getSpineFormula(binding, pageCount) {
  if (!isBindingNeedingSpine(binding)) return null;
  if (binding === 'PB') return calculatePaperbackSpineWidth(pageCount);
  if (binding === 'CW' || binding === 'LW') return calculateHardcoverSpineWidth(pageCount);
  return null;
}

// ── Trim Size Info ────────────────────────────────────────────────────────────
export const TRIM_SIZES = {
  '0425X0687': { name: 'Pocketbook', width: '4.25"', height: '6.875"', bleedW: '4.5"', bleedH: '7.125"', widthMm: '108mm', heightMm: '175mm' },
  '0500X0800': { name: 'Novella', width: '5"', height: '8"', bleedW: '5.25"', bleedH: '8.25"', widthMm: '127mm', heightMm: '203mm' },
  '0550X0850': { name: 'Digest', width: '5.5"', height: '8.5"', bleedW: '5.75"', bleedH: '8.75"', widthMm: '140mm', heightMm: '216mm' },
  '0583X0827': { name: 'A5', width: '5.83"', height: '8.27"', bleedW: '6.08"', bleedH: '8.52"', widthMm: '148mm', heightMm: '210mm' },
  '0600X0900': { name: 'US Trade', width: '6"', height: '9"', bleedW: '6.25"', bleedH: '9.25"', widthMm: '152mm', heightMm: '229mm', popular: true },
  '0614X0921': { name: 'Royal', width: '6.14"', height: '9.21"', bleedW: '6.39"', bleedH: '9.46"', widthMm: '156mm', heightMm: '234mm' },
  '0663X1025': { name: 'Comic Book', width: '6.63"', height: '10.25"', bleedW: '6.88"', bleedH: '10.5"', widthMm: '168mm', heightMm: '260mm' },
  '0700X1000': { name: 'Executive', width: '7"', height: '10"', bleedW: '7.25"', bleedH: '10.25"', widthMm: '178mm', heightMm: '254mm' },
  '0744X0968': { name: 'Crown Quarto', width: '7.44"', height: '9.68"', bleedW: '7.69"', bleedH: '9.93"', widthMm: '189mm', heightMm: '246mm' },
  '0750X0750': { name: 'Small Square', width: '7.5"', height: '7.5"', bleedW: '7.75"', bleedH: '7.75"', widthMm: '191mm', heightMm: '191mm' },
  '0827X1169': { name: 'A4', width: '8.27"', height: '11.69"', bleedW: '8.52"', bleedH: '11.94"', widthMm: '210mm', heightMm: '297mm' },
  '0850X0850': { name: 'Square', width: '8.5"', height: '8.5"', bleedW: '8.75"', bleedH: '8.75"', widthMm: '216mm', heightMm: '216mm' },
  '0850X1100': { name: 'US Letter', width: '8.5"', height: '11"', bleedW: '8.75"', bleedH: '11.25"', widthMm: '216mm', heightMm: '279mm' },
  '0900X0700': { name: 'Small Landscape', width: '9"', height: '7"', bleedW: '9.25"', bleedH: '7.25"', widthMm: '229mm', heightMm: '178mm' },
  '1100X0850': { name: 'US Letter Landscape', width: '11"', height: '8.5"', bleedW: '11.25"', bleedH: '8.75"', widthMm: '279mm', heightMm: '216mm' },
};

// ── Get file dimension requirements ───────────────────────────────────────────
export function getFileDimensions(trimId) {
  const trim = TRIM_SIZES[trimId];
  if (!trim) return null;
  return {
    trimName: trim.name,
    trimSize: `${trim.width} × ${trim.height}`,
    withBleed: `${trim.bleedW} × ${trim.bleedH}`,
    withBleedMm: `${trim.widthMm} × ${trim.heightMm}`,
    bleedRequired: '0.125 in (3.175 mm) on all sides',
    safetyMargin: '0.5 in (12.7 mm)',
  };
}
