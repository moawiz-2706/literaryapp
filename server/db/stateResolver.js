// ── State / Province Name → 2-Letter Code Resolver ───────────────────────────
//
// Shared across every order entry point (GHL workflow action, quote calculator,
// sample orders, direct order creation). Converts full state/province names —
// including common typographical variants — to the 2-letter codes Lulu requires.
//
// Scenario 1: GHL sends the full state name ("Alabama")   → "AL"
// Scenario 2: GHL sends the 2-letter code ("AL")          → "AL" (passes through)
// Scenario 3: GHL sends a misspelled full name ("Alamaba" → typo of ALABAMA)
//                                                     → "AL" (fuzzy US-only match)
// Scenario 4: GHL sends an unresolvable value             → passes through
//                                                     unchanged so the validator
//                                                     can report it exactly.

// Complete name → code map. Special full-length codes (NT, WA, LDN, ACT) are
// handled country-aware in resolveStateCode below.
const NAME_TO_CODE = {
  // United States — all 50 states + DC
  'UNITED STATES': null, 'US': null, 'USA': null,
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
  'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
  'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
  'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
  'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MASSACHUSET': 'MA',
  'MICHIGAN': 'MI', 'MINNESOTA': 'MN',
  'MISSISSIPPI': 'MS', 'MISSISSIPI': 'MS', 'MISSISIPPI': 'MS',
  'MISSOURI': 'MO', 'MISSOURRI': 'MO',
  'MONTANA': 'MT', 'NEBRASKA': 'NE',
  'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK', 'OREGON': 'OR',
  'PENNSYLVANIA': 'PA', 'PENNSLYVANIA': 'PA',
  'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD',
  'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
  'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
  'WISCONSIN': 'WI', 'WYOMING': 'WY',
  'DISTRICT OF COLUMBIA': 'DC', 'WASHINGTON DC': 'DC', 'DC': 'DC',
  // Common US typo aliases (user-reported: "Alamaba" → AL)
  'ALAMABA': 'AL', 'ALAMABMA': 'AL', 'ALABANNA': 'AL', 'ALASKAN': 'AK',
  // Canada
  'ALBERTA': 'AB', 'BRITISH COLUMBIA': 'BC', 'MANITOBA': 'MB',
  'NEW BRUNSWICK': 'NB', 'NEWFOUNDLAND': 'NL', 'NEWFOUNDLAND AND LABRADOR': 'NL',
  'NOVA SCOTIA': 'NS', 'ONTARIO': 'ON', 'PRINCE EDWARD ISLAND': 'PE',
  'QUEBEC': 'QC', 'SASKATCHEWAN': 'SK', 'YUKON': 'YT',
  'NORTHWEST TERRITORIES': 'NT', 'NUNAVUT': 'NU',
  // Australia
  'AUSTRALIAN CAPITAL TERRITORY': 'ACT', 'NEW SOUTH WALES': 'NSW',
  'NORTHERN TERRITORY': 'NT', 'QUEENSLAND': 'QLD', 'SOUTH AUSTRALIA': 'SA',
  'TASMANIA': 'TAS', 'VICTORIA': 'VIC', 'WESTERN AUSTRALIA': 'WA',
  // United Kingdom regions
  'ENGLAND': 'ENG', 'SCOTLAND': 'SCT', 'WALES': 'WLS',
  'NORTHERN IRELAND': 'NIR', 'LONDON': 'LDN',
};

// Codes valid for each country — used to keep short codes as-is when they are
// valid for the declared country, and to disambiguate shared codes:
//   NT = Canada's Northwest Territories (CA) or Australia's Northern Territory (AU)
//   WA = US state Washington (US) or Australia's Western Australia (AU)
const CODES_BY_COUNTRY = {
  US: new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL',
    'IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
    'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX',
    'UT','VT','VA','WA','WV','WI','WY','DC']),
  CA: new Set(['AB','BC','MB','NB','NL','NS','ON','PE','QC','SK','YT','NT','NU']),
  AU: new Set(['ACT','NSW','NT','QLD','SA','TAS','VIC','WA']),
  GB: new Set(['ENG','SCT','WLS','NIR','LDN']),
  MX: new Set(),
};

/**
 * Convert a full state/province name to its 2-letter code (fuzzy, typo-tolerant
 * for the US), or pass a code/value through unchanged.
 *
 * @param {string} value        Raw state value from GHL or any entry point.
 * @param {string} countryCode  2-letter ISO country code (defaults to 'US').
 * @returns {string} The 2-letter code when resolvable; otherwise the original
 *                   value (uppercased) so downstream validation reports it.
 */
function resolveStateCode(value, countryCode) {
  if (!value) return value;
  const upper = value.trim().toUpperCase();
  if (!upper) return upper;
  const cc = ((countryCode || 'US').toUpperCase() || 'US');

  // Already a valid short code for the declared country — pass through.
  if (upper.length <= 3 && CODES_BY_COUNTRY[cc] && CODES_BY_COUNTRY[cc].has(upper)) {
    return upper;
  }
  // Shared codes disambiguated by country (NT, WA).
  if (upper.length <= 3 && CODES_BY_COUNTRY[cc] && CODES_BY_COUNTRY[cc].size > 0
      && (cc === 'CA' || cc === 'AU' || cc === 'US') && upper === 'NT') {
    return upper;
  }

  // Exact full-name lookup (null entries = country names, pass through).
  if (Object.prototype.hasOwnProperty.call(NAME_TO_CODE, upper)) {
    const mapped = NAME_TO_CODE[upper];
    if (mapped) return mapped;
    return upper; // country name like 'UNITED STATES'
  }

  // Fuzzy (typo-tolerant) match — US only, contained-name check against the
  // canonical 50 names. Keeps 'Alamaba' → 'AL' working without risking a wrong
  // match for other countries (their names are longer and more distinct).
  // Guard: never absorb a value that is already a valid 2-letter US code
  // (e.g. Canadian 'ON' must not become OHIO).
  if (cc === 'US' && upper.length > 3 && !CODES_BY_COUNTRY.US.has(upper)) {
    const canonical = ['ALABAMA','ALASKA','ARIZONA','ARKANSAS','CALIFORNIA','COLORADO',
      'CONNECTICUT','DELAWARE','FLORIDA','GEORGIA','HAWAII','IDAHO','ILLINOIS',
      'INDIANA','IOWA','KANSAS','KENTUCKY','LOUISIANA','MAINE','MARYLAND',
      'MASSACHUSETTS','MICHIGAN','MINNESOTA','MISSISSIPPI','MISSOURI','MONTANA',
      'NEBRASKA','NEVADA','NEW HAMPSHIRE','NEW JERSEY','NEW MEXICO','NEW YORK',
      'NORTH CAROLINA','NORTH DAKOTA','OHIO','OKLAHOMA','OREGON','PENNSYLVANIA',
      'RHODE ISLAND','SOUTH CAROLINA','SOUTH DAKOTA','TENNESSEE','TEXAS','UTAH',
      'VERMONT','VIRGINIA','WASHINGTON','WEST VIRGINIA','WISCONSIN','WYOMING',
      'DISTRICT OF COLUMBIA'];
    for (const name of canonical) {
      if (name.length >= 5 && (name.includes(upper) || upper.includes(name))
          && Math.abs(name.length - upper.length) <= 3) {
        const code = NAME_TO_CODE[name];
        if (code) {
          console.warn(`[stateResolver] Resolved state typo "${value}" → "${code}" (${name})`);
          return code;
        }
      }
    }
  }

  // Unknown value: pass through uppercase so Lulu validation reports it rather
  // than silently converting to a wrong code.
  return upper;
}

module.exports = { resolveStateCode, NAME_TO_CODE, CODES_BY_COUNTRY };
