import api from '../api';

/**
 * Fetch the full options data (labels, compatibility tree, shipping rates).
 * @returns {Promise<object>}
 */
export async function fetchFullOptions() {
  const { data } = await api.get('/quotes/options');
  return data;
}

/**
 * Fetch available options at the next step based on current selections.
 * @param {object} selections - { trim?, ink?, quality?, binding? }
 * @returns {Promise<object>} - { availableInks, availableQualities, availableBindings, availablePapers, availableCoverFinishes, labels }
 */
export async function fetchAvailableOptions(selections) {
  const params = {};
  if (selections.trim) params.trim = selections.trim;
  if (selections.ink) params.ink = selections.ink;
  if (selections.quality) params.quality = selections.quality;
  if (selections.binding) params.binding = selections.binding;
  const { data } = await api.get('/quotes/options/available', { params });
  return data;
}

/**
 * Calculate a print quote with flat shipping.
 * @param {object} params
 * @param {string} params.trim - e.g. "0600X0900"
 * @param {string} params.ink - "BW" | "FC"
 * @param {string} params.quality - "STD" | "PRE"
 * @param {string} params.binding - "PB" | "CW" | "CO" | "SS" | "LW" | "WO"
 * @param {string} params.paper - e.g. "060UW444"
 * @param {string} [params.coverFinish] - e.g. "MXX" | "GXX" | "MNG" (default "MXX")
 * @param {number} params.pageCount - Minimum 2
 * @param {number} [params.quantity] - Default 1
 * @param {string} [params.countryCode] - Default "US"
 * @returns {Promise<object>} Quote result with flat shipping
 */
export async function calculateQuote(params) {
  const { data } = await api.post('/quotes/calculate', params);
  return data;
}

/**
 * Build a pod_package_id from individual components.
 * @param {object} components - { trim, ink, quality, binding, paper, coverFinish? }
 * @returns {string} The constructed pod_package_id
 */
export function buildPodPackageId(components) {
  const { trim, ink, quality, binding, paper, coverFinish = 'MXX' } = components;
  return `${trim}.${ink}.${quality}.${binding}.${paper}.${coverFinish}`;
}