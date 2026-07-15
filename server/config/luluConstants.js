// ─────────────────────────────────────────────────────────────────────────────
// server/config/luluConstants.js
//
// Single source of truth for all Lulu print option codes.
// Generated from the official Lulu Product Specification Sheet.
// New dotted POD Package ID format (live March 31 2026):
//   [Trim].[Ink].[Quality].[Binding].[Paper].[FinishLinenFoil]
//
// IMPORTANT RULES:
//   - BW and FC can each be paired with STD or PRE quality
//   - Wire-O (WO) binding only supports FC ink
//   - BW ink does NOT support Wire-O binding
//   - Paper 070CW460 only available for PB/SS bindings on certain trims
//   - Paper 100CW200 only available for WO binding on large format trims
//   - Linen/Foil options only apply to LW (Linen Wrap) binding
//   - For all other bindings the finish segment is always [G|M]XX
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const TRIM_SIZES = [
  { code: '0425X0687', label: '4.25" × 6.875"',  bookType: 'Pocketbook',          description: 'Small pocket-sized book' },
  { code: '0500X0800', label: '5" × 8"',          bookType: 'Novella',             description: 'Compact novel format' },
  { code: '0550X0850', label: '5.5" × 8.5"',      bookType: 'Digest',              description: 'Standard digest size' },
  { code: '0583X0827', label: '5.83" × 8.27"',    bookType: 'A5',                  description: 'European A5 standard' },
  { code: '0600X0900', label: '6" × 9"',          bookType: 'US Trade',            description: 'Most popular trade paperback' },
  { code: '0614X0921', label: '6.14" × 9.21"',    bookType: 'Royal',               description: 'UK Royal format' },
  { code: '0663X1025', label: '6.63" × 10.25"',   bookType: 'Comic',               description: 'Standard comic/graphic novel' },
  { code: '0700X1000', label: '7" × 10"',         bookType: 'Executive',           description: 'Executive / textbook format' },
  { code: '0744X0968', label: '7.44" × 9.68"',    bookType: 'Crown Quarto',        description: 'UK Crown Quarto format' },
  { code: '0750X0750', label: '7.5" × 7.5"',      bookType: 'Small Square',        description: "Square format — children's / photo" },
  { code: '0827X1169', label: '8.27" × 11.69"',   bookType: 'A4',                  description: 'European A4 standard' },
  { code: '0850X0850', label: '8.5" × 8.5"',      bookType: 'Square',              description: 'Large square — photo / art books' },
  { code: '0850X1100', label: '8.5" × 11"',       bookType: 'US Letter',           description: 'US Letter — workbooks / manuals' },
  { code: '0900X0700', label: '9" × 7"',          bookType: 'Landscape',           description: 'Landscape — photo / art books' },
  { code: '1100X0850', label: '11" × 8.5"',       bookType: 'US Letter Landscape', description: 'US Letter landscape' },
  { code: '1169X0827', label: '11.69" × 8.27"',   bookType: 'A4 Landscape',        description: 'A4 landscape' }
];

const INK_TYPES = [
  { code: 'BW', label: 'Black & White', description: 'Standard B&W interior printing' },
  { code: 'FC', label: 'Full Color',    description: 'Full color interior printing' }
];

// Quality is tied to ink: BW supports both STD and PRE; FC supports both STD and PRE.
// However, for simplicity and to avoid invalid combos, the recommended pairing is:
//   BW → STD (most common), BW → PRE (premium B&W)
//   FC → PRE (most common), FC → STD (standard color, fewer trims)
const PRINT_QUALITIES = [
  { code: 'STD', label: 'Standard', description: 'Standard print quality' },
  { code: 'PRE', label: 'Premium',  description: 'Premium print quality — recommended for full color' }
];

const BINDING_TYPES = [
  { code: 'PB', label: 'Perfect Bound',   description: 'Glued spine — standard paperback',       icon: 'book-open' },
  { code: 'CW', label: 'Case Wrap',       description: 'Hardcover — printed cover wrap',          icon: 'book' },
  { code: 'LW', label: 'Linen Wrap',      description: 'Hardcover — linen cloth with foil stamp', icon: 'award' },
  { code: 'CO', label: 'Coil Bound',      description: 'Plastic coil — lays flat when open',      icon: 'rotate-cw' },
  { code: 'WO', label: 'Wire-O Bound',    description: 'Metal wire — professional notebooks',     icon: 'paperclip' },
  { code: 'SS', label: 'Saddle Stitch',   description: 'Stapled — magazines & booklets',          icon: 'scissors' }
];

const PAPER_TYPES = [
  { code: '060UW444', label: '60# Uncoated White', description: 'Standard white — ideal for text-heavy books' },
  { code: '060UC444', label: '60# Uncoated Cream', description: 'Warm cream tone — classic novel feel' },
  { code: '080CW444', label: '80# Coated White',   description: 'Bright coated — best for images and color' },
  { code: '070CW460', label: '70# Coated White',   description: 'Mid-weight coated — magazines & comics' },
  { code: '100CW200', label: '100# Coated White',  description: 'Heavy coated — Wire-O large format only' }
];

const COVER_FINISHES = [
  { code: 'G', label: 'Gloss', description: 'Shiny finish — vibrant colors' },
  { code: 'M', label: 'Matte', description: 'Flat finish — elegant, reduced glare' }
];

const LINEN_COLORS = [
  { code: 'X', label: 'None',   description: 'No linen (not applicable)' },
  { code: 'R', label: 'Red',    description: 'Red linen cloth' },
  { code: 'N', label: 'Navy',   description: 'Navy blue linen cloth' },
  { code: 'B', label: 'Black',  description: 'Black linen cloth' },
  { code: 'G', label: 'Gray',   description: 'Gray linen cloth' },
  { code: 'T', label: 'Tan',    description: 'Tan linen cloth' },
  { code: 'F', label: 'Forest', description: 'Forest green linen cloth' }
];

const FOIL_COLORS = [
  { code: 'X', label: 'None',  description: 'No foil stamp' },
  { code: 'G', label: 'Gold',  description: 'Gold foil stamp' },
  { code: 'B', label: 'Black', description: 'Black foil stamp' },
  { code: 'W', label: 'White', description: 'White foil stamp' }
];

const SHIPPING_OPTIONS = [
  { id: 'MAIL',          label: 'Standard Mail',        days: '7–14 business days', description: 'Economy postal service' },
  { id: 'PRIORITY_MAIL', label: 'Priority Mail',        days: '5–10 business days', description: 'Priority postal service' },
  { id: 'GROUND',        label: 'Ground',               days: '5–7 business days',  description: 'Courier ground transport' },
  { id: 'GROUND_HD',     label: 'Ground Home Delivery', days: '5–7 business days',  description: 'Residential ground delivery' },
  { id: 'GROUND_BUS',    label: 'Ground Business',      days: '5–7 business days',  description: 'Business address ground delivery' },
  { id: 'EXPEDITED',     label: 'Expedited',            days: '3–5 business days',  description: '2nd-day air or equivalent' },
  { id: 'EXPRESS',       label: 'Express',              days: '1–2 business days',  description: 'Overnight / fastest available' }
];

// ── Compatibility Matrix ──────────────────────────────────────────────────────
// Derived from the Lulu Product Specification Sheet (3,277 SKUs).
// Use these to filter available options based on current selections.

// Which bindings are available for each trim size
const TRIM_BINDING_COMPAT = {
  "0425X0687": [
    "CO",
    "CW",
    "PB",
    "SS"
  ],
  "0500X0800": [
    "CO",
    "CW",
    "PB",
    "SS"
  ],
  "0550X0850": [
    "CO",
    "CW",
    "LW",
    "PB",
    "SS"
  ],
  "0583X0827": [
    "CO",
    "CW",
    "LW",
    "PB",
    "SS"
  ],
  "0600X0900": [
    "CO",
    "CW",
    "LW",
    "PB",
    "SS"
  ],
  "0614X0921": [
    "CO",
    "CW",
    "LW",
    "PB",
    "SS"
  ],
  "0663X1025": [
    "PB",
    "SS"
  ],
  "0700X1000": [
    "CO",
    "CW",
    "PB",
    "SS"
  ],
  "0744X0968": [
    "CO",
    "CW",
    "PB",
    "SS"
  ],
  "0750X0750": [
    "CO",
    "CW",
    "PB",
    "SS"
  ],
  "0827X1169": [
    "CO",
    "CW",
    "LW",
    "PB",
    "SS"
  ],
  "0850X0850": [
    "CO",
    "CW",
    "PB",
    "SS"
  ],
  "0850X1100": [
    "CO",
    "CW",
    "LW",
    "PB",
    "SS"
  ],
  "0900X0700": [
    "CO",
    "CW",
    "PB"
  ],
  "1100X0850": [
    "CO",
    "CW",
    "PB",
    "WO"
  ],
  "1169X0827": [
    "CO",
    "CW",
    "PB"
  ]
};

// Which paper types are available for each binding
const BINDING_PAPER_COMPAT = {
  "CO": [
    "060UC444",
    "060UW444",
    "080CW444"
  ],
  "CW": [
    "060UC444",
    "060UW444",
    "080CW444"
  ],
  "LW": [
    "060UC444",
    "060UW444",
    "080CW444"
  ],
  "PB": [
    "060UC444",
    "060UW444",
    "070CW460",
    "080CW444"
  ],
  "SS": [
    "060UC444",
    "060UW444",
    "070CW460",
    "080CW444"
  ],
  "WO": [
    "100CW200"
  ]
};

// Which ink types are available for each binding
const BINDING_INK_COMPAT = {
  "CO": [
    "BW",
    "FC"
  ],
  "CW": [
    "BW",
    "FC"
  ],
  "LW": [
    "BW",
    "FC"
  ],
  "PB": [
    "BW",
    "FC"
  ],
  "SS": [
    "BW",
    "FC"
  ],
  "WO": [
    "FC"
  ]
};

// Which quality levels are available for each ink type
const INK_QUALITY_COMPAT = {
  "BW": [
    "PRE",
    "STD"
  ],
  "FC": [
    "PRE",
    "STD"
  ]
};

// ── Helper: Build POD Package ID ──────────────────────────────────────────────
function buildPodPackageId({ trim, ink, quality, binding, paper, finish, linen = 'X', foil = 'X' }) {
  // For non-Linen Wrap bindings, linen and foil must always be X
  const resolvedLinen = binding === 'LW' ? (linen || 'X') : 'X';
  const resolvedFoil  = binding === 'LW' ? (foil  || 'X') : 'X';
  return `${trim}.${ink}.${quality}.${binding}.${paper}.${finish}${resolvedLinen}${resolvedFoil}`;
}

// ── Helper: Validate a combination against the compat matrix ─────────────────
function validateCombination({ trim, ink, quality, binding, paper }) {
  const errors = [];
  if (trim && binding && !TRIM_BINDING_COMPAT[trim]?.includes(binding)) {
    errors.push(`Binding "${binding}" is not available for trim size "${trim}".`);
  }
  if (binding && paper && !BINDING_PAPER_COMPAT[binding]?.includes(paper)) {
    errors.push(`Paper "${paper}" is not available for binding "${binding}".`);
  }
  if (binding && ink && !BINDING_INK_COMPAT[binding]?.includes(ink)) {
    errors.push(`Ink type "${ink}" is not available for binding "${binding}".`);
  }
  if (ink && quality && !INK_QUALITY_COMPAT[ink]?.includes(quality)) {
    errors.push(`Quality "${quality}" is not available for ink type "${ink}".`);
  }
  return errors;
}

module.exports = {
  TRIM_SIZES,
  INK_TYPES,
  PRINT_QUALITIES,
  BINDING_TYPES,
  PAPER_TYPES,
  COVER_FINISHES,
  LINEN_COLORS,
  FOIL_COLORS,
  SHIPPING_OPTIONS,
  TRIM_BINDING_COMPAT,
  BINDING_PAPER_COMPAT,
  BINDING_INK_COMPAT,
  INK_QUALITY_COMPAT,
  buildPodPackageId,
  validateCombination
};
