/**
 * podPackageId.js
 *
 * Shared client-side validation for Lulu pod_package_id SKUs.
 *
 * A valid pod_package_id has the form:
 *   {TRIM}.{INK}.{QUALITY}.{BINDING}.{PAPER}.{COVER_FINISH}
 * e.g. "0600X0900.BW.STD.PB.060UW444.MXX"
 *
 * Every component must be non-empty. A SKU such as
 * "0600X0900.BW....MXX" (empty middle components, mid-selection) is INVALID
 * and must never be sent to the Lulu API — the validate-interior /
 * validate-cover / cover-dimensions endpoints reject it with 400:
 *   { "pod_package_id": ["Invalid pod_package_id: ..."] }
 */

const TRIM_RE = /^\d{4}X\d{4}$/;   // e.g. 0600X0900
const INK_RE = /^(BW|FC)$/;
const QUALITY_RE = /^(STD|PRE)$/;
const BINDING_RE = /^(PB|CW|LW|CO|WO|SS)$/;
const PAPER_RE = /^\d{3}(UC|UW|CW)\d{3}$/; // e.g. 060UW444, 080CW444
const FINISH_RE = /^[A-Z]{3}$/;             // e.g. MXX, GXX, GBB

/**
 * Validate a pod_package_id string without needing the full SKU catalog.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function isValidPodPackageId(podPackageId) {
  if (!podPackageId || typeof podPackageId !== 'string') {
    return { valid: false, reason: 'pod_package_id must be a non-empty string' };
  }
  const parts = podPackageId.trim().split('.');
  if (parts.length !== 6) {
    return {
      valid: false,
      reason: `pod_package_id must have 6 dot-separated parts, got ${parts.length}. A value like "0600X0900.BW....MXX" means some options are still unselected.`,
    };
  }
  const [trim, ink, quality, binding, paper, finish] = parts;
  if (!TRIM_RE.test(trim))
    return { valid: false, reason: `Invalid trim size component: "${trim}"` };
  if (trim === '' || ink === '' || quality === '' || binding === '' || paper === '' || finish === '') {
    return {
      valid: false,
      reason: 'Some book options are still unselected — please complete the full options wizard (Size, Ink, Quality, Binding, Paper, Cover Finish) before validating.',
    };
  }
  if (!INK_RE.test(ink))
    return { valid: false, reason: `Invalid ink component: "${ink}"` };
  if (!QUALITY_RE.test(quality))
    return { valid: false, reason: `Invalid quality component: "${quality}"` };
  if (!BINDING_RE.test(binding))
    return { valid: false, reason: `Invalid binding component: "${binding}"` };
  if (!PAPER_RE.test(paper))
    return { valid: false, reason: `Invalid paper component: "${paper}"` };
  if (!FINISH_RE.test(finish))
    return { valid: false, reason: `Invalid cover finish component: "${finish}"` };
  return { valid: true };
}

/**
 * True only when ALL six option components are present and well-formed.
 * Use this to gate the Validate / Submit buttons.
 */
export function isFullySelected(components) {
  if (!components) return false;
  const complete = !!(
    components.trim &&
    components.ink &&
    components.quality &&
    components.binding &&
    components.paper &&
    components.coverFinish
  );
  return complete && isValidPodPackageId(components.podPackageId).valid;
}

/**
 * Build pod_package_id from its components (client copy of the server helper).
 */
export function buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish = 'MXX' }) {
  return `${trim}.${ink}.${quality}.${binding}.${paper}.${coverFinish}`;
}
