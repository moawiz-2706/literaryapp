// ─────────────────────────────────────────────────────────────────────────────
// luluConstants.js
// Auto-generated from the official Lulu Product Specification Sheet.
// Source: https://assets.lulu.com/media/specs/lulu-print-api-spec-sheet.xlsx
// Total valid SKUs: 3277
//
// DO NOT EDIT MANUALLY. Regenerate with: python3 generate_constants.py
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// ── Human-readable labels ─────────────────────────────────────────────────────

const TRIM_LABELS = {
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
};

const INK_LABELS = {
  'BW':  'Black & White',
  'FC':  'Full Color',
};

const QUALITY_LABELS = {
  'STD': 'Standard',
  'PRE': 'Premium',
};

const BINDING_LABELS = {
  'PB': 'Perfect Bound (Paperback)',
  'CW': 'Case Wrap (Hardcover)',
  'CO': 'Coil Bound',
  'SS': 'Saddle Stitch (Stapled)',
  'LW': 'Linen Wrap (Hardcover)',
  'WO': 'Wire-O',
};

const PAPER_LABELS = {
  '060UW444': '60# Uncoated White (Standard)',
  '060UC444': '60# Uncoated Cream (Standard)',
  '070CW460': '70# Coated White (Thick)',
  '080CW444': '80# Coated White (Premium)',
  '100CW200': '100# Coated White (Heavy)',
};

const SHIPPING_LABELS = {
  'MAIL':          'Standard Mail (Slowest)',
  'PRIORITY_MAIL': 'Priority Mail',
  'GROUND':        'Ground (Courier)',
  'GROUND_HD':     'Ground Home Delivery',
  'GROUND_BUS':    'Ground Business',
  'EXPEDITED':     'Expedited (2-Day)',
  'EXPRESS':       'Express (Overnight)',
};

// ── Compatibility Matrix ──────────────────────────────────────────────────────
// Derived from the official Lulu Product Specification Sheet.
// Structure: COMPAT_TREE[trim][ink][quality][binding] = [validPapers]
//
// KEY RULES (from spec sheet):
//   1. 060UC444 (Cream paper) is ONLY available for BW ink — NEVER for FC
//   2. 100CW200 is ONLY available for WO (Wire-O) binding
//   3. WO binding only exists for 1100X0850.FC.PRE
//   4. LW binding only available for 6 specific trims
//   5. SS binding NOT available for FC.STD (only FC.PRE)
//   6. 0663X1025 only supports PRE quality

const COMPAT_TREE = {
  "0425X0687": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0500X0800": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0550X0850": {
    "BW": {
      "PRE": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0583X0827": {
    "BW": {
      "PRE": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0600X0900": {
    "BW": {
      "PRE": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0614X0921": {
    "BW": {
      "PRE": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0663X1025": {
    "BW": {
      "PRE": {
        "PB": [
          "070CW460"
        ],
        "SS": [
          "070CW460"
        ]
      }
    },
    "FC": {
      "PRE": {
        "PB": [
          "070CW460"
        ],
        "SS": [
          "070CW460"
        ]
      }
    }
  },
  "0700X1000": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0744X0968": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0750X0750": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0827X1169": {
    "BW": {
      "PRE": {
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
        ]
      },
      "STD": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "070CW460",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "070CW460",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0850X0850": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0850X1100": {
    "BW": {
      "PRE": {
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
        ]
      },
      "STD": {
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
          "080CW444"
        ],
        "SS": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "070CW460",
          "080CW444"
        ],
        "SS": [
          "060UW444",
          "070CW460",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "LW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "0900X0700": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "1100X0850": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ],
        "WO": [
          "100CW200"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  },
  "1169X0827": {
    "BW": {
      "PRE": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
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
        "PB": [
          "060UC444",
          "060UW444",
          "080CW444"
        ]
      }
    },
    "FC": {
      "PRE": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      },
      "STD": {
        "CO": [
          "060UW444",
          "080CW444"
        ],
        "CW": [
          "060UW444",
          "080CW444"
        ],
        "PB": [
          "060UW444",
          "080CW444"
        ]
      }
    }
  }
};

// ── Per-binding, per-ink valid papers ────────────────────────────────────────
// BINDING_INK_PAPERS[binding][ink] = [validPapers]
// Use this for quick paper filtering when binding or ink changes.

const BINDING_INK_PAPERS = {
  "CO": {
    "BW": [
      "060UC444",
      "060UW444",
      "080CW444"
    ],
    "FC": [
      "060UW444",
      "080CW444"
    ]
  },
  "CW": {
    "BW": [
      "060UC444",
      "060UW444",
      "080CW444"
    ],
    "FC": [
      "060UW444",
      "080CW444"
    ]
  },
  "LW": {
    "BW": [
      "060UC444",
      "060UW444",
      "080CW444"
    ],
    "FC": [
      "060UW444",
      "080CW444"
    ]
  },
  "PB": {
    "BW": [
      "060UC444",
      "060UW444",
      "070CW460",
      "080CW444"
    ],
    "FC": [
      "060UW444",
      "070CW460",
      "080CW444"
    ]
  },
  "SS": {
    "BW": [
      "060UC444",
      "060UW444",
      "070CW460",
      "080CW444"
    ],
    "FC": [
      "060UW444",
      "070CW460",
      "080CW444"
    ]
  },
  "WO": {
    "FC": [
      "100CW200"
    ]
  }
};

// ── Per-trim available bindings ───────────────────────────────────────────────
// TRIM_BINDINGS[trim] = [allBindingsForTrim]  (ink-independent)

const TRIM_BINDINGS = {
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

// ── Per-trim, per-ink available bindings ─────────────────────────────────────
// TRIM_INK_BINDINGS[trim][ink] = [validBindings]

const TRIM_INK_BINDINGS = {
  "0425X0687": {
    "BW": [
      "CO",
      "CW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "SS"
    ]
  },
  "0500X0800": {
    "BW": [
      "CO",
      "CW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "SS"
    ]
  },
  "0550X0850": {
    "BW": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ]
  },
  "0583X0827": {
    "BW": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ]
  },
  "0600X0900": {
    "BW": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ]
  },
  "0614X0921": {
    "BW": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ]
  },
  "0663X1025": {
    "BW": [
      "PB",
      "SS"
    ],
    "FC": [
      "PB",
      "SS"
    ]
  },
  "0700X1000": {
    "BW": [
      "CO",
      "CW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "SS"
    ]
  },
  "0744X0968": {
    "BW": [
      "CO",
      "CW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "SS"
    ]
  },
  "0750X0750": {
    "BW": [
      "CO",
      "CW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "SS"
    ]
  },
  "0827X1169": {
    "BW": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ]
  },
  "0850X0850": {
    "BW": [
      "CO",
      "CW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "SS"
    ]
  },
  "0850X1100": {
    "BW": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ],
    "FC": [
      "CO",
      "CW",
      "LW",
      "PB",
      "SS"
    ]
  },
  "0900X0700": {
    "BW": [
      "CO",
      "CW",
      "PB"
    ],
    "FC": [
      "CO",
      "CW",
      "PB"
    ]
  },
  "1100X0850": {
    "BW": [
      "CO",
      "CW",
      "PB"
    ],
    "FC": [
      "CO",
      "CW",
      "PB",
      "WO"
    ]
  },
  "1169X0827": {
    "BW": [
      "CO",
      "CW",
      "PB"
    ],
    "FC": [
      "CO",
      "CW",
      "PB"
    ]
  }
};

// ── Complete valid SKU set ────────────────────────────────────────────────────
// Use VALID_SKUS.has(sku) for O(1) validation before calling the Lulu API.

const VALID_SKUS = new Set(["0425X0687.BW.PRE.CO.060UC444.GXX", "0425X0687.BW.PRE.CO.060UC444.MXX", "0425X0687.BW.PRE.CO.060UW444.GXX", "0425X0687.BW.PRE.CO.060UW444.MXX", "0425X0687.BW.PRE.CO.080CW444.GXX", "0425X0687.BW.PRE.CO.080CW444.MXX", "0425X0687.BW.PRE.CW.060UC444.GXX", "0425X0687.BW.PRE.CW.060UC444.MXX", "0425X0687.BW.PRE.CW.060UW444.GXX", "0425X0687.BW.PRE.CW.060UW444.MXX", "0425X0687.BW.PRE.CW.080CW444.GXX", "0425X0687.BW.PRE.CW.080CW444.MXX", "0425X0687.BW.PRE.PB.060UC444.GXX", "0425X0687.BW.PRE.PB.060UC444.MXX", "0425X0687.BW.PRE.PB.060UW444.GXX", "0425X0687.BW.PRE.PB.060UW444.MXX", "0425X0687.BW.PRE.PB.080CW444.GXX", "0425X0687.BW.PRE.PB.080CW444.MXX", "0425X0687.BW.PRE.SS.060UC444.GXX", "0425X0687.BW.PRE.SS.060UC444.MXX", "0425X0687.BW.PRE.SS.060UW444.GXX", "0425X0687.BW.PRE.SS.060UW444.MXX", "0425X0687.BW.PRE.SS.080CW444.GXX", "0425X0687.BW.PRE.SS.080CW444.MXX", "0425X0687.BW.STD.CO.060UC444.GXX", "0425X0687.BW.STD.CO.060UC444.MXX", "0425X0687.BW.STD.CO.060UW444.GXX", "0425X0687.BW.STD.CO.060UW444.MXX", "0425X0687.BW.STD.CO.080CW444.GXX", "0425X0687.BW.STD.CO.080CW444.MXX", "0425X0687.BW.STD.CW.060UC444.GXX", "0425X0687.BW.STD.CW.060UC444.MXX", "0425X0687.BW.STD.CW.060UW444.GXX", "0425X0687.BW.STD.CW.060UW444.MXX", "0425X0687.BW.STD.CW.080CW444.GXX", "0425X0687.BW.STD.CW.080CW444.MXX", "0425X0687.BW.STD.PB.060UC444.GXX", "0425X0687.BW.STD.PB.060UC444.MXX", "0425X0687.BW.STD.PB.060UW444.GXX", "0425X0687.BW.STD.PB.060UW444.MXX", "0425X0687.BW.STD.PB.080CW444.GXX", "0425X0687.BW.STD.PB.080CW444.MXX", "0425X0687.BW.STD.SS.060UC444.GXX", "0425X0687.BW.STD.SS.060UC444.MXX", "0425X0687.BW.STD.SS.060UW444.GXX", "0425X0687.BW.STD.SS.060UW444.MXX", "0425X0687.BW.STD.SS.080CW444.GXX", "0425X0687.BW.STD.SS.080CW444.MXX", "0425X0687.FC.PRE.CO.060UW444.GXX", "0425X0687.FC.PRE.CO.060UW444.MXX", "0425X0687.FC.PRE.CO.080CW444.GXX", "0425X0687.FC.PRE.CO.080CW444.MXX", "0425X0687.FC.PRE.CW.060UW444.GXX", "0425X0687.FC.PRE.CW.060UW444.MXX", "0425X0687.FC.PRE.CW.080CW444.GXX", "0425X0687.FC.PRE.CW.080CW444.MXX", "0425X0687.FC.PRE.PB.060UW444.GXX", "0425X0687.FC.PRE.PB.060UW444.MXX", "0425X0687.FC.PRE.PB.080CW444.GXX", "0425X0687.FC.PRE.PB.080CW444.MXX", "0425X0687.FC.PRE.SS.060UW444.GXX", "0425X0687.FC.PRE.SS.060UW444.MXX", "0425X0687.FC.PRE.SS.080CW444.GXX", "0425X0687.FC.PRE.SS.080CW444.MXX", "0425X0687.FC.STD.CO.060UW444.GXX", "0425X0687.FC.STD.CO.060UW444.MXX", "0425X0687.FC.STD.CO.080CW444.GXX", "0425X0687.FC.STD.CO.080CW444.MXX", "0425X0687.FC.STD.CW.060UW444.GXX", "0425X0687.FC.STD.CW.060UW444.MXX", "0425X0687.FC.STD.CW.080CW444.GXX", "0425X0687.FC.STD.CW.080CW444.MXX", "0425X0687.FC.STD.PB.060UW444.GXX", "0425X0687.FC.STD.PB.060UW444.MXX", "0425X0687.FC.STD.PB.080CW444.GXX", "0425X0687.FC.STD.PB.080CW444.MXX", "0500X0800.BW.PRE.CO.060UC444.GXX", "0500X0800.BW.PRE.CO.060UC444.MXX", "0500X0800.BW.PRE.CO.060UW444.GXX", "0500X0800.BW.PRE.CO.060UW444.MXX", "0500X0800.BW.PRE.CO.080CW444.GXX", "0500X0800.BW.PRE.CO.080CW444.MXX", "0500X0800.BW.PRE.CW.060UC444.GXX", "0500X0800.BW.PRE.CW.060UC444.MXX", "0500X0800.BW.PRE.CW.060UW444.GXX", "0500X0800.BW.PRE.CW.060UW444.MXX", "0500X0800.BW.PRE.CW.080CW444.GXX", "0500X0800.BW.PRE.CW.080CW444.MXX", "0500X0800.BW.PRE.PB.060UC444.GXX", "0500X0800.BW.PRE.PB.060UC444.MXX", "0500X0800.BW.PRE.PB.060UW444.GXX", "0500X0800.BW.PRE.PB.060UW444.MXX", "0500X0800.BW.PRE.PB.080CW444.GXX", "0500X0800.BW.PRE.PB.080CW444.MXX", "0500X0800.BW.PRE.SS.060UC444.GXX", "0500X0800.BW.PRE.SS.060UC444.MXX", "0500X0800.BW.PRE.SS.060UW444.GXX", "0500X0800.BW.PRE.SS.060UW444.MXX", "0500X0800.BW.PRE.SS.080CW444.GXX", "0500X0800.BW.PRE.SS.080CW444.MXX", "0500X0800.BW.STD.CO.060UC444.GXX", "0500X0800.BW.STD.CO.060UC444.MXX", "0500X0800.BW.STD.CO.060UW444.GXX", "0500X0800.BW.STD.CO.060UW444.MXX", "0500X0800.BW.STD.CO.080CW444.GXX", "0500X0800.BW.STD.CO.080CW444.MXX", "0500X0800.BW.STD.CW.060UC444.GXX", "0500X0800.BW.STD.CW.060UC444.MXX", "0500X0800.BW.STD.CW.060UW444.GXX", "0500X0800.BW.STD.CW.060UW444.MXX", "0500X0800.BW.STD.CW.080CW444.GXX", "0500X0800.BW.STD.CW.080CW444.MXX", "0500X0800.BW.STD.PB.060UC444.GXX", "0500X0800.BW.STD.PB.060UC444.MXX", "0500X0800.BW.STD.PB.060UW444.GXX", "0500X0800.BW.STD.PB.060UW444.MXX", "0500X0800.BW.STD.PB.080CW444.GXX", "0500X0800.BW.STD.PB.080CW444.MXX", "0500X0800.BW.STD.SS.060UC444.GXX", "0500X0800.BW.STD.SS.060UC444.MXX", "0500X0800.BW.STD.SS.060UW444.GXX", "0500X0800.BW.STD.SS.060UW444.MXX", "0500X0800.BW.STD.SS.080CW444.GXX", "0500X0800.BW.STD.SS.080CW444.MXX", "0500X0800.FC.PRE.CO.060UW444.GXX", "0500X0800.FC.PRE.CO.060UW444.MXX", "0500X0800.FC.PRE.CO.080CW444.GXX", "0500X0800.FC.PRE.CO.080CW444.MXX", "0500X0800.FC.PRE.CW.060UW444.GXX", "0500X0800.FC.PRE.CW.060UW444.MXX", "0500X0800.FC.PRE.CW.080CW444.GXX", "0500X0800.FC.PRE.CW.080CW444.MXX", "0500X0800.FC.PRE.PB.060UW444.GXX", "0500X0800.FC.PRE.PB.060UW444.MXX", "0500X0800.FC.PRE.PB.080CW444.GXX", "0500X0800.FC.PRE.PB.080CW444.MXX", "0500X0800.FC.PRE.SS.060UW444.GXX", "0500X0800.FC.PRE.SS.060UW444.MXX", "0500X0800.FC.PRE.SS.080CW444.GXX", "0500X0800.FC.PRE.SS.080CW444.MXX", "0500X0800.FC.STD.CO.060UW444.GXX", "0500X0800.FC.STD.CO.060UW444.MXX", "0500X0800.FC.STD.CO.080CW444.GXX", "0500X0800.FC.STD.CO.080CW444.MXX", "0500X0800.FC.STD.CW.060UW444.GXX", "0500X0800.FC.STD.CW.060UW444.MXX", "0500X0800.FC.STD.CW.080CW444.GXX", "0500X0800.FC.STD.CW.080CW444.MXX", "0500X0800.FC.STD.PB.060UW444.GXX", "0500X0800.FC.STD.PB.060UW444.MXX", "0500X0800.FC.STD.PB.080CW444.GXX", "0500X0800.FC.STD.PB.080CW444.MXX", "0550X0850.BW.PRE.CO.060UC444.GXX", "0550X0850.BW.PRE.CO.060UC444.MXX", "0550X0850.BW.PRE.CO.060UW444.GXX", "0550X0850.BW.PRE.CO.060UW444.MXX", "0550X0850.BW.PRE.CO.080CW444.GXX", "0550X0850.BW.PRE.CO.080CW444.MXX", "0550X0850.BW.PRE.CW.060UC444.GXX", "0550X0850.BW.PRE.CW.060UC444.MXX", "0550X0850.BW.PRE.CW.060UW444.GXX", "0550X0850.BW.PRE.CW.060UW444.MXX", "0550X0850.BW.PRE.CW.080CW444.GXX", "0550X0850.BW.PRE.CW.080CW444.MXX", "0550X0850.BW.PRE.LW.060UC444.GBB", "0550X0850.BW.PRE.LW.060UC444.GBG", "0550X0850.BW.PRE.LW.060UC444.GBW", "0550X0850.BW.PRE.LW.060UC444.GFB", "0550X0850.BW.PRE.LW.060UC444.GFG", "0550X0850.BW.PRE.LW.060UC444.GFW", "0550X0850.BW.PRE.LW.060UC444.GGB", "0550X0850.BW.PRE.LW.060UC444.GGG", "0550X0850.BW.PRE.LW.060UC444.GGW", "0550X0850.BW.PRE.LW.060UC444.GNB", "0550X0850.BW.PRE.LW.060UC444.GNG", "0550X0850.BW.PRE.LW.060UC444.GNW", "0550X0850.BW.PRE.LW.060UC444.GRB", "0550X0850.BW.PRE.LW.060UC444.GRG", "0550X0850.BW.PRE.LW.060UC444.GRW", "0550X0850.BW.PRE.LW.060UC444.GTB", "0550X0850.BW.PRE.LW.060UC444.GTG", "0550X0850.BW.PRE.LW.060UC444.GTW", "0550X0850.BW.PRE.LW.060UC444.MBB", "0550X0850.BW.PRE.LW.060UC444.MBG", "0550X0850.BW.PRE.LW.060UC444.MBW", "0550X0850.BW.PRE.LW.060UC444.MFB", "0550X0850.BW.PRE.LW.060UC444.MFG", "0550X0850.BW.PRE.LW.060UC444.MFW", "0550X0850.BW.PRE.LW.060UC444.MGB", "0550X0850.BW.PRE.LW.060UC444.MGG", "0550X0850.BW.PRE.LW.060UC444.MGW", "0550X0850.BW.PRE.LW.060UC444.MNB", "0550X0850.BW.PRE.LW.060UC444.MNG", "0550X0850.BW.PRE.LW.060UC444.MNW", "0550X0850.BW.PRE.LW.060UC444.MRB", "0550X0850.BW.PRE.LW.060UC444.MRG", "0550X0850.BW.PRE.LW.060UC444.MRW", "0550X0850.BW.PRE.LW.060UC444.MTB", "0550X0850.BW.PRE.LW.060UC444.MTG", "0550X0850.BW.PRE.LW.060UC444.MTW", "0550X0850.BW.PRE.LW.060UW444.GBB", "0550X0850.BW.PRE.LW.060UW444.GBG", "0550X0850.BW.PRE.LW.060UW444.GBW", "0550X0850.BW.PRE.LW.060UW444.GFB", "0550X0850.BW.PRE.LW.060UW444.GFG", "0550X0850.BW.PRE.LW.060UW444.GFW", "0550X0850.BW.PRE.LW.060UW444.GGB", "0550X0850.BW.PRE.LW.060UW444.GGG", "0550X0850.BW.PRE.LW.060UW444.GGW", "0550X0850.BW.PRE.LW.060UW444.GNB", "0550X0850.BW.PRE.LW.060UW444.GNG", "0550X0850.BW.PRE.LW.060UW444.GNW", "0550X0850.BW.PRE.LW.060UW444.GRB", "0550X0850.BW.PRE.LW.060UW444.GRG", "0550X0850.BW.PRE.LW.060UW444.GRW", "0550X0850.BW.PRE.LW.060UW444.GTB", "0550X0850.BW.PRE.LW.060UW444.GTG", "0550X0850.BW.PRE.LW.060UW444.GTW", "0550X0850.BW.PRE.LW.060UW444.MBB", "0550X0850.BW.PRE.LW.060UW444.MBG", "0550X0850.BW.PRE.LW.060UW444.MBW", "0550X0850.BW.PRE.LW.060UW444.MFB", "0550X0850.BW.PRE.LW.060UW444.MFG", "0550X0850.BW.PRE.LW.060UW444.MFW", "0550X0850.BW.PRE.LW.060UW444.MGB", "0550X0850.BW.PRE.LW.060UW444.MGG", "0550X0850.BW.PRE.LW.060UW444.MGW", "0550X0850.BW.PRE.LW.060UW444.MNB", "0550X0850.BW.PRE.LW.060UW444.MNG", "0550X0850.BW.PRE.LW.060UW444.MNW", "0550X0850.BW.PRE.LW.060UW444.MRB", "0550X0850.BW.PRE.LW.060UW444.MRG", "0550X0850.BW.PRE.LW.060UW444.MRW", "0550X0850.BW.PRE.LW.060UW444.MTB", "0550X0850.BW.PRE.LW.060UW444.MTG", "0550X0850.BW.PRE.LW.060UW444.MTW", "0550X0850.BW.PRE.LW.080CW444.GBB", "0550X0850.BW.PRE.LW.080CW444.GBG", "0550X0850.BW.PRE.LW.080CW444.GBW", "0550X0850.BW.PRE.LW.080CW444.GFB", "0550X0850.BW.PRE.LW.080CW444.GFG", "0550X0850.BW.PRE.LW.080CW444.GFW", "0550X0850.BW.PRE.LW.080CW444.GGB", "0550X0850.BW.PRE.LW.080CW444.GGG", "0550X0850.BW.PRE.LW.080CW444.GGW", "0550X0850.BW.PRE.LW.080CW444.GNB", "0550X0850.BW.PRE.LW.080CW444.GNG", "0550X0850.BW.PRE.LW.080CW444.GNW", "0550X0850.BW.PRE.LW.080CW444.GRB", "0550X0850.BW.PRE.LW.080CW444.GRG", "0550X0850.BW.PRE.LW.080CW444.GRW", "0550X0850.BW.PRE.LW.080CW444.GTB", "0550X0850.BW.PRE.LW.080CW444.GTG", "0550X0850.BW.PRE.LW.080CW444.GTW", "0550X0850.BW.PRE.LW.080CW444.MBB", "0550X0850.BW.PRE.LW.080CW444.MBG", "0550X0850.BW.PRE.LW.080CW444.MBW", "0550X0850.BW.PRE.LW.080CW444.MFB", "0550X0850.BW.PRE.LW.080CW444.MFG", "0550X0850.BW.PRE.LW.080CW444.MFW", "0550X0850.BW.PRE.LW.080CW444.MGB", "0550X0850.BW.PRE.LW.080CW444.MGG", "0550X0850.BW.PRE.LW.080CW444.MGW", "0550X0850.BW.PRE.LW.080CW444.MNB", "0550X0850.BW.PRE.LW.080CW444.MNG", "0550X0850.BW.PRE.LW.080CW444.MNW", "0550X0850.BW.PRE.LW.080CW444.MRB", "0550X0850.BW.PRE.LW.080CW444.MRG", "0550X0850.BW.PRE.LW.080CW444.MRW", "0550X0850.BW.PRE.LW.080CW444.MTB", "0550X0850.BW.PRE.LW.080CW444.MTG", "0550X0850.BW.PRE.LW.080CW444.MTW", "0550X0850.BW.PRE.PB.060UC444.GXX", "0550X0850.BW.PRE.PB.060UC444.MXX", "0550X0850.BW.PRE.PB.060UW444.GXX", "0550X0850.BW.PRE.PB.060UW444.MXX", "0550X0850.BW.PRE.PB.080CW444.GXX", "0550X0850.BW.PRE.PB.080CW444.MXX", "0550X0850.BW.PRE.SS.060UC444.GXX", "0550X0850.BW.PRE.SS.060UC444.MXX", "0550X0850.BW.PRE.SS.060UW444.GXX", "0550X0850.BW.PRE.SS.060UW444.MXX", "0550X0850.BW.PRE.SS.080CW444.GXX", "0550X0850.BW.PRE.SS.080CW444.MXX", "0550X0850.BW.STD.CO.060UC444.GXX", "0550X0850.BW.STD.CO.060UC444.MXX", "0550X0850.BW.STD.CO.060UW444.GXX", "0550X0850.BW.STD.CO.060UW444.MXX", "0550X0850.BW.STD.CO.080CW444.GXX", "0550X0850.BW.STD.CO.080CW444.MXX", "0550X0850.BW.STD.CW.060UC444.GXX", "0550X0850.BW.STD.CW.060UC444.MXX", "0550X0850.BW.STD.CW.060UW444.GXX", "0550X0850.BW.STD.CW.060UW444.MXX", "0550X0850.BW.STD.CW.080CW444.GXX", "0550X0850.BW.STD.CW.080CW444.MXX", "0550X0850.BW.STD.LW.060UC444.GBB", "0550X0850.BW.STD.LW.060UC444.GBG", "0550X0850.BW.STD.LW.060UC444.GBW", "0550X0850.BW.STD.LW.060UC444.GFB", "0550X0850.BW.STD.LW.060UC444.GFG", "0550X0850.BW.STD.LW.060UC444.GFW", "0550X0850.BW.STD.LW.060UC444.GGB", "0550X0850.BW.STD.LW.060UC444.GGG", "0550X0850.BW.STD.LW.060UC444.GGW", "0550X0850.BW.STD.LW.060UC444.GNB", "0550X0850.BW.STD.LW.060UC444.GNG", "0550X0850.BW.STD.LW.060UC444.GNW", "0550X0850.BW.STD.LW.060UC444.GRB", "0550X0850.BW.STD.LW.060UC444.GRG", "0550X0850.BW.STD.LW.060UC444.GRW", "0550X0850.BW.STD.LW.060UC444.GTB", "0550X0850.BW.STD.LW.060UC444.GTG", "0550X0850.BW.STD.LW.060UC444.GTW", "0550X0850.BW.STD.LW.060UC444.MBB", "0550X0850.BW.STD.LW.060UC444.MBG", "0550X0850.BW.STD.LW.060UC444.MBW", "0550X0850.BW.STD.LW.060UC444.MFB", "0550X0850.BW.STD.LW.060UC444.MFG", "0550X0850.BW.STD.LW.060UC444.MFW", "0550X0850.BW.STD.LW.060UC444.MGB", "0550X0850.BW.STD.LW.060UC444.MGG", "0550X0850.BW.STD.LW.060UC444.MGW", "0550X0850.BW.STD.LW.060UC444.MNB", "0550X0850.BW.STD.LW.060UC444.MNG", "0550X0850.BW.STD.LW.060UC444.MNW", "0550X0850.BW.STD.LW.060UC444.MRB", "0550X0850.BW.STD.LW.060UC444.MRG", "0550X0850.BW.STD.LW.060UC444.MRW", "0550X0850.BW.STD.LW.060UC444.MTB", "0550X0850.BW.STD.LW.060UC444.MTG", "0550X0850.BW.STD.LW.060UC444.MTW", "0550X0850.BW.STD.LW.060UW444.GBB", "0550X0850.BW.STD.LW.060UW444.GBG", "0550X0850.BW.STD.LW.060UW444.GBW", "0550X0850.BW.STD.LW.060UW444.GFB", "0550X0850.BW.STD.LW.060UW444.GFG", "0550X0850.BW.STD.LW.060UW444.GFW", "0550X0850.BW.STD.LW.060UW444.GGB", "0550X0850.BW.STD.LW.060UW444.GGG", "0550X0850.BW.STD.LW.060UW444.GGW", "0550X0850.BW.STD.LW.060UW444.GNB", "0550X0850.BW.STD.LW.060UW444.GNG", "0550X0850.BW.STD.LW.060UW444.GNW", "0550X0850.BW.STD.LW.060UW444.GRB", "0550X0850.BW.STD.LW.060UW444.GRG", "0550X0850.BW.STD.LW.060UW444.GRW", "0550X0850.BW.STD.LW.060UW444.GTB", "0550X0850.BW.STD.LW.060UW444.GTG", "0550X0850.BW.STD.LW.060UW444.GTW", "0550X0850.BW.STD.LW.060UW444.MBB", "0550X0850.BW.STD.LW.060UW444.MBG", "0550X0850.BW.STD.LW.060UW444.MBW", "0550X0850.BW.STD.LW.060UW444.MFB", "0550X0850.BW.STD.LW.060UW444.MFG", "0550X0850.BW.STD.LW.060UW444.MFW", "0550X0850.BW.STD.LW.060UW444.MGB", "0550X0850.BW.STD.LW.060UW444.MGG", "0550X0850.BW.STD.LW.060UW444.MGW", "0550X0850.BW.STD.LW.060UW444.MNB", "0550X0850.BW.STD.LW.060UW444.MNG", "0550X0850.BW.STD.LW.060UW444.MNW", "0550X0850.BW.STD.LW.060UW444.MRB", "0550X0850.BW.STD.LW.060UW444.MRG", "0550X0850.BW.STD.LW.060UW444.MRW", "0550X0850.BW.STD.LW.060UW444.MTB", "0550X0850.BW.STD.LW.060UW444.MTG", "0550X0850.BW.STD.LW.060UW444.MTW", "0550X0850.BW.STD.LW.080CW444.GBB", "0550X0850.BW.STD.LW.080CW444.GBG", "0550X0850.BW.STD.LW.080CW444.GBW", "0550X0850.BW.STD.LW.080CW444.GFB", "0550X0850.BW.STD.LW.080CW444.GFG", "0550X0850.BW.STD.LW.080CW444.GFW", "0550X0850.BW.STD.LW.080CW444.GGB", "0550X0850.BW.STD.LW.080CW444.GGG", "0550X0850.BW.STD.LW.080CW444.GGW", "0550X0850.BW.STD.LW.080CW444.GNB", "0550X0850.BW.STD.LW.080CW444.GNG", "0550X0850.BW.STD.LW.080CW444.GNW", "0550X0850.BW.STD.LW.080CW444.GRB", "0550X0850.BW.STD.LW.080CW444.GRG", "0550X0850.BW.STD.LW.080CW444.GRW", "0550X0850.BW.STD.LW.080CW444.GTB", "0550X0850.BW.STD.LW.080CW444.GTG", "0550X0850.BW.STD.LW.080CW444.GTW", "0550X0850.BW.STD.LW.080CW444.MBB", "0550X0850.BW.STD.LW.080CW444.MBG", "0550X0850.BW.STD.LW.080CW444.MBW", "0550X0850.BW.STD.LW.080CW444.MFB", "0550X0850.BW.STD.LW.080CW444.MFG", "0550X0850.BW.STD.LW.080CW444.MFW", "0550X0850.BW.STD.LW.080CW444.MGB", "0550X0850.BW.STD.LW.080CW444.MGG", "0550X0850.BW.STD.LW.080CW444.MGW", "0550X0850.BW.STD.LW.080CW444.MNB", "0550X0850.BW.STD.LW.080CW444.MNG", "0550X0850.BW.STD.LW.080CW444.MNW", "0550X0850.BW.STD.LW.080CW444.MRB", "0550X0850.BW.STD.LW.080CW444.MRG", "0550X0850.BW.STD.LW.080CW444.MRW", "0550X0850.BW.STD.LW.080CW444.MTB", "0550X0850.BW.STD.LW.080CW444.MTG", "0550X0850.BW.STD.LW.080CW444.MTW", "0550X0850.BW.STD.PB.060UC444.GXX", "0550X0850.BW.STD.PB.060UC444.MXX", "0550X0850.BW.STD.PB.060UW444.GXX", "0550X0850.BW.STD.PB.060UW444.MXX", "0550X0850.BW.STD.PB.080CW444.GXX", "0550X0850.BW.STD.PB.080CW444.MXX", "0550X0850.BW.STD.SS.060UC444.GXX", "0550X0850.BW.STD.SS.060UC444.MXX", "0550X0850.BW.STD.SS.060UW444.GXX", "0550X0850.BW.STD.SS.060UW444.MXX", "0550X0850.BW.STD.SS.080CW444.GXX", "0550X0850.BW.STD.SS.080CW444.MXX", "0550X0850.FC.PRE.CO.060UW444.GXX", "0550X0850.FC.PRE.CO.060UW444.MXX", "0550X0850.FC.PRE.CO.080CW444.GXX", "0550X0850.FC.PRE.CO.080CW444.MXX", "0550X0850.FC.PRE.CW.060UW444.GXX", "0550X0850.FC.PRE.CW.060UW444.MXX", "0550X0850.FC.PRE.CW.080CW444.GXX", "0550X0850.FC.PRE.CW.080CW444.MXX", "0550X0850.FC.PRE.LW.060UW444.GBB", "0550X0850.FC.PRE.LW.060UW444.GBG", "0550X0850.FC.PRE.LW.060UW444.GBW", "0550X0850.FC.PRE.LW.060UW444.GFB", "0550X0850.FC.PRE.LW.060UW444.GFG", "0550X0850.FC.PRE.LW.060UW444.GFW", "0550X0850.FC.PRE.LW.060UW444.GGB", "0550X0850.FC.PRE.LW.060UW444.GGG", "0550X0850.FC.PRE.LW.060UW444.GGW", "0550X0850.FC.PRE.LW.060UW444.GNB", "0550X0850.FC.PRE.LW.060UW444.GNG", "0550X0850.FC.PRE.LW.060UW444.GNW", "0550X0850.FC.PRE.LW.060UW444.GRB", "0550X0850.FC.PRE.LW.060UW444.GRG", "0550X0850.FC.PRE.LW.060UW444.GRW", "0550X0850.FC.PRE.LW.060UW444.GTB", "0550X0850.FC.PRE.LW.060UW444.GTG", "0550X0850.FC.PRE.LW.060UW444.GTW", "0550X0850.FC.PRE.LW.060UW444.MBB", "0550X0850.FC.PRE.LW.060UW444.MBG", "0550X0850.FC.PRE.LW.060UW444.MBW", "0550X0850.FC.PRE.LW.060UW444.MFB", "0550X0850.FC.PRE.LW.060UW444.MFG", "0550X0850.FC.PRE.LW.060UW444.MFW", "0550X0850.FC.PRE.LW.060UW444.MGB", "0550X0850.FC.PRE.LW.060UW444.MGG", "0550X0850.FC.PRE.LW.060UW444.MGW", "0550X0850.FC.PRE.LW.060UW444.MNB", "0550X0850.FC.PRE.LW.060UW444.MNG", "0550X0850.FC.PRE.LW.060UW444.MNW", "0550X0850.FC.PRE.LW.060UW444.MRB", "0550X0850.FC.PRE.LW.060UW444.MRG", "0550X0850.FC.PRE.LW.060UW444.MRW", "0550X0850.FC.PRE.LW.060UW444.MTB", "0550X0850.FC.PRE.LW.060UW444.MTG", "0550X0850.FC.PRE.LW.060UW444.MTW", "0550X0850.FC.PRE.LW.080CW444.GBB", "0550X0850.FC.PRE.LW.080CW444.GBG", "0550X0850.FC.PRE.LW.080CW444.GBW", "0550X0850.FC.PRE.LW.080CW444.GFB", "0550X0850.FC.PRE.LW.080CW444.GFG", "0550X0850.FC.PRE.LW.080CW444.GFW", "0550X0850.FC.PRE.LW.080CW444.GGB", "0550X0850.FC.PRE.LW.080CW444.GGG", "0550X0850.FC.PRE.LW.080CW444.GGW", "0550X0850.FC.PRE.LW.080CW444.GNB", "0550X0850.FC.PRE.LW.080CW444.GNG", "0550X0850.FC.PRE.LW.080CW444.GNW", "0550X0850.FC.PRE.LW.080CW444.GRB", "0550X0850.FC.PRE.LW.080CW444.GRG", "0550X0850.FC.PRE.LW.080CW444.GRW", "0550X0850.FC.PRE.LW.080CW444.GTB", "0550X0850.FC.PRE.LW.080CW444.GTG", "0550X0850.FC.PRE.LW.080CW444.GTW", "0550X0850.FC.PRE.LW.080CW444.MBB", "0550X0850.FC.PRE.LW.080CW444.MBG", "0550X0850.FC.PRE.LW.080CW444.MBW", "0550X0850.FC.PRE.LW.080CW444.MFB", "0550X0850.FC.PRE.LW.080CW444.MFG", "0550X0850.FC.PRE.LW.080CW444.MFW", "0550X0850.FC.PRE.LW.080CW444.MGB", "0550X0850.FC.PRE.LW.080CW444.MGG", "0550X0850.FC.PRE.LW.080CW444.MGW", "0550X0850.FC.PRE.LW.080CW444.MNB", "0550X0850.FC.PRE.LW.080CW444.MNG", "0550X0850.FC.PRE.LW.080CW444.MNW", "0550X0850.FC.PRE.LW.080CW444.MRB", "0550X0850.FC.PRE.LW.080CW444.MRG", "0550X0850.FC.PRE.LW.080CW444.MRW", "0550X0850.FC.PRE.LW.080CW444.MTB", "0550X0850.FC.PRE.LW.080CW444.MTG", "0550X0850.FC.PRE.LW.080CW444.MTW", "0550X0850.FC.PRE.PB.060UW444.GXX", "0550X0850.FC.PRE.PB.060UW444.MXX", "0550X0850.FC.PRE.PB.080CW444.GXX", "0550X0850.FC.PRE.PB.080CW444.MXX", "0550X0850.FC.PRE.SS.060UW444.GXX", "0550X0850.FC.PRE.SS.060UW444.MXX", "0550X0850.FC.PRE.SS.080CW444.GXX", "0550X0850.FC.PRE.SS.080CW444.MXX", "0550X0850.FC.STD.CO.060UW444.GXX", "0550X0850.FC.STD.CO.060UW444.MXX", "0550X0850.FC.STD.CO.080CW444.GXX", "0550X0850.FC.STD.CO.080CW444.MXX", "0550X0850.FC.STD.CW.060UW444.GXX", "0550X0850.FC.STD.CW.060UW444.MXX", "0550X0850.FC.STD.CW.080CW444.GXX", "0550X0850.FC.STD.CW.080CW444.MXX", "0550X0850.FC.STD.LW.060UW444.GBB", "0550X0850.FC.STD.LW.060UW444.GBG", "0550X0850.FC.STD.LW.060UW444.GBW", "0550X0850.FC.STD.LW.060UW444.GFB", "0550X0850.FC.STD.LW.060UW444.GFG", "0550X0850.FC.STD.LW.060UW444.GFW", "0550X0850.FC.STD.LW.060UW444.GGB", "0550X0850.FC.STD.LW.060UW444.GGG", "0550X0850.FC.STD.LW.060UW444.GGW", "0550X0850.FC.STD.LW.060UW444.GNB", "0550X0850.FC.STD.LW.060UW444.GNG", "0550X0850.FC.STD.LW.060UW444.GNW", "0550X0850.FC.STD.LW.060UW444.GRB", "0550X0850.FC.STD.LW.060UW444.GRG", "0550X0850.FC.STD.LW.060UW444.GRW", "0550X0850.FC.STD.LW.060UW444.GTB", "0550X0850.FC.STD.LW.060UW444.GTG", "0550X0850.FC.STD.LW.060UW444.GTW", "0550X0850.FC.STD.LW.060UW444.MBB", "0550X0850.FC.STD.LW.060UW444.MBG", "0550X0850.FC.STD.LW.060UW444.MBW", "0550X0850.FC.STD.LW.060UW444.MFB", "0550X0850.FC.STD.LW.060UW444.MFG", "0550X0850.FC.STD.LW.060UW444.MFW", "0550X0850.FC.STD.LW.060UW444.MGB", "0550X0850.FC.STD.LW.060UW444.MGG", "0550X0850.FC.STD.LW.060UW444.MGW", "0550X0850.FC.STD.LW.060UW444.MNB", "0550X0850.FC.STD.LW.060UW444.MNG", "0550X0850.FC.STD.LW.060UW444.MNW", "0550X0850.FC.STD.LW.060UW444.MRB", "0550X0850.FC.STD.LW.060UW444.MRG", "0550X0850.FC.STD.LW.060UW444.MRW", "0550X0850.FC.STD.LW.060UW444.MTB", "0550X0850.FC.STD.LW.060UW444.MTG", "0550X0850.FC.STD.LW.060UW444.MTW", "0550X0850.FC.STD.LW.080CW444.GBB", "0550X0850.FC.STD.LW.080CW444.GBG", "0550X0850.FC.STD.LW.080CW444.GBW", "0550X0850.FC.STD.LW.080CW444.GFB", "0550X0850.FC.STD.LW.080CW444.GFG", "0550X0850.FC.STD.LW.080CW444.GFW", "0550X0850.FC.STD.LW.080CW444.GGB", "0550X0850.FC.STD.LW.080CW444.GGG", "0550X0850.FC.STD.LW.080CW444.GGW", "0550X0850.FC.STD.LW.080CW444.GNB", "0550X0850.FC.STD.LW.080CW444.GNG", "0550X0850.FC.STD.LW.080CW444.GNW", "0550X0850.FC.STD.LW.080CW444.GRB", "0550X0850.FC.STD.LW.080CW444.GRG", "0550X0850.FC.STD.LW.080CW444.GRW", "0550X0850.FC.STD.LW.080CW444.GTB", "0550X0850.FC.STD.LW.080CW444.GTG", "0550X0850.FC.STD.LW.080CW444.GTW", "0550X0850.FC.STD.LW.080CW444.MBB", "0550X0850.FC.STD.LW.080CW444.MBG", "0550X0850.FC.STD.LW.080CW444.MBW", "0550X0850.FC.STD.LW.080CW444.MFB", "0550X0850.FC.STD.LW.080CW444.MFG", "0550X0850.FC.STD.LW.080CW444.MFW", "0550X0850.FC.STD.LW.080CW444.MGB", "0550X0850.FC.STD.LW.080CW444.MGG", "0550X0850.FC.STD.LW.080CW444.MGW", "0550X0850.FC.STD.LW.080CW444.MNB", "0550X0850.FC.STD.LW.080CW444.MNG", "0550X0850.FC.STD.LW.080CW444.MNW", "0550X0850.FC.STD.LW.080CW444.MRB", "0550X0850.FC.STD.LW.080CW444.MRG", "0550X0850.FC.STD.LW.080CW444.MRW", "0550X0850.FC.STD.LW.080CW444.MTB", "0550X0850.FC.STD.LW.080CW444.MTG", "0550X0850.FC.STD.LW.080CW444.MTW", "0550X0850.FC.STD.PB.060UW444.GXX", "0550X0850.FC.STD.PB.060UW444.MXX", "0550X0850.FC.STD.PB.080CW444.GXX", "0550X0850.FC.STD.PB.080CW444.MXX", "0583X0827.BW.PRE.CO.060UC444.GXX", "0583X0827.BW.PRE.CO.060UC444.MXX", "0583X0827.BW.PRE.CO.060UW444.GXX", "0583X0827.BW.PRE.CO.060UW444.MXX", "0583X0827.BW.PRE.CO.080CW444.GXX", "0583X0827.BW.PRE.CO.080CW444.MXX", "0583X0827.BW.PRE.CW.060UC444.GXX", "0583X0827.BW.PRE.CW.060UC444.MXX", "0583X0827.BW.PRE.CW.060UW444.GXX", "0583X0827.BW.PRE.CW.060UW444.MXX", "0583X0827.BW.PRE.CW.080CW444.GXX", "0583X0827.BW.PRE.CW.080CW444.MXX", "0583X0827.BW.PRE.LW.060UC444.GBB", "0583X0827.BW.PRE.LW.060UC444.GBG", "0583X0827.BW.PRE.LW.060UC444.GBW", "0583X0827.BW.PRE.LW.060UC444.GFB", "0583X0827.BW.PRE.LW.060UC444.GFG", "0583X0827.BW.PRE.LW.060UC444.GFW", "0583X0827.BW.PRE.LW.060UC444.GGB", "0583X0827.BW.PRE.LW.060UC444.GGG", "0583X0827.BW.PRE.LW.060UC444.GGW", "0583X0827.BW.PRE.LW.060UC444.GNB", "0583X0827.BW.PRE.LW.060UC444.GNG", "0583X0827.BW.PRE.LW.060UC444.GNW", "0583X0827.BW.PRE.LW.060UC444.GRB", "0583X0827.BW.PRE.LW.060UC444.GRG", "0583X0827.BW.PRE.LW.060UC444.GRW", "0583X0827.BW.PRE.LW.060UC444.GTB", "0583X0827.BW.PRE.LW.060UC444.GTG", "0583X0827.BW.PRE.LW.060UC444.GTW", "0583X0827.BW.PRE.LW.060UC444.MBB", "0583X0827.BW.PRE.LW.060UC444.MBG", "0583X0827.BW.PRE.LW.060UC444.MBW", "0583X0827.BW.PRE.LW.060UC444.MFB", "0583X0827.BW.PRE.LW.060UC444.MFG", "0583X0827.BW.PRE.LW.060UC444.MFW", "0583X0827.BW.PRE.LW.060UC444.MGB", "0583X0827.BW.PRE.LW.060UC444.MGG", "0583X0827.BW.PRE.LW.060UC444.MGW", "0583X0827.BW.PRE.LW.060UC444.MNB", "0583X0827.BW.PRE.LW.060UC444.MNG", "0583X0827.BW.PRE.LW.060UC444.MNW", "0583X0827.BW.PRE.LW.060UC444.MRB", "0583X0827.BW.PRE.LW.060UC444.MRG", "0583X0827.BW.PRE.LW.060UC444.MRW", "0583X0827.BW.PRE.LW.060UC444.MTB", "0583X0827.BW.PRE.LW.060UC444.MTG", "0583X0827.BW.PRE.LW.060UC444.MTW", "0583X0827.BW.PRE.LW.060UW444.GBB", "0583X0827.BW.PRE.LW.060UW444.GBG", "0583X0827.BW.PRE.LW.060UW444.GBW", "0583X0827.BW.PRE.LW.060UW444.GFB", "0583X0827.BW.PRE.LW.060UW444.GFG", "0583X0827.BW.PRE.LW.060UW444.GFW", "0583X0827.BW.PRE.LW.060UW444.GGB", "0583X0827.BW.PRE.LW.060UW444.GGG", "0583X0827.BW.PRE.LW.060UW444.GGW", "0583X0827.BW.PRE.LW.060UW444.GNB", "0583X0827.BW.PRE.LW.060UW444.GNG", "0583X0827.BW.PRE.LW.060UW444.GNW", "0583X0827.BW.PRE.LW.060UW444.GRB", "0583X0827.BW.PRE.LW.060UW444.GRG", "0583X0827.BW.PRE.LW.060UW444.GRW", "0583X0827.BW.PRE.LW.060UW444.GTB", "0583X0827.BW.PRE.LW.060UW444.GTG", "0583X0827.BW.PRE.LW.060UW444.GTW", "0583X0827.BW.PRE.LW.060UW444.MBB", "0583X0827.BW.PRE.LW.060UW444.MBG", "0583X0827.BW.PRE.LW.060UW444.MBW", "0583X0827.BW.PRE.LW.060UW444.MFB", "0583X0827.BW.PRE.LW.060UW444.MFG", "0583X0827.BW.PRE.LW.060UW444.MFW", "0583X0827.BW.PRE.LW.060UW444.MGB", "0583X0827.BW.PRE.LW.060UW444.MGG", "0583X0827.BW.PRE.LW.060UW444.MGW", "0583X0827.BW.PRE.LW.060UW444.MNB", "0583X0827.BW.PRE.LW.060UW444.MNG", "0583X0827.BW.PRE.LW.060UW444.MNW", "0583X0827.BW.PRE.LW.060UW444.MRB", "0583X0827.BW.PRE.LW.060UW444.MRG", "0583X0827.BW.PRE.LW.060UW444.MRW", "0583X0827.BW.PRE.LW.060UW444.MTB", "0583X0827.BW.PRE.LW.060UW444.MTG", "0583X0827.BW.PRE.LW.060UW444.MTW", "0583X0827.BW.PRE.LW.080CW444.GBB", "0583X0827.BW.PRE.LW.080CW444.GBG", "0583X0827.BW.PRE.LW.080CW444.GBW", "0583X0827.BW.PRE.LW.080CW444.GFB", "0583X0827.BW.PRE.LW.080CW444.GFG", "0583X0827.BW.PRE.LW.080CW444.GFW", "0583X0827.BW.PRE.LW.080CW444.GGB", "0583X0827.BW.PRE.LW.080CW444.GGG", "0583X0827.BW.PRE.LW.080CW444.GGW", "0583X0827.BW.PRE.LW.080CW444.GNB", "0583X0827.BW.PRE.LW.080CW444.GNG", "0583X0827.BW.PRE.LW.080CW444.GNW", "0583X0827.BW.PRE.LW.080CW444.GRB", "0583X0827.BW.PRE.LW.080CW444.GRG", "0583X0827.BW.PRE.LW.080CW444.GRW", "0583X0827.BW.PRE.LW.080CW444.GTB", "0583X0827.BW.PRE.LW.080CW444.GTG", "0583X0827.BW.PRE.LW.080CW444.GTW", "0583X0827.BW.PRE.LW.080CW444.MBB", "0583X0827.BW.PRE.LW.080CW444.MBG", "0583X0827.BW.PRE.LW.080CW444.MBW", "0583X0827.BW.PRE.LW.080CW444.MFB", "0583X0827.BW.PRE.LW.080CW444.MFG", "0583X0827.BW.PRE.LW.080CW444.MFW", "0583X0827.BW.PRE.LW.080CW444.MGB", "0583X0827.BW.PRE.LW.080CW444.MGG", "0583X0827.BW.PRE.LW.080CW444.MGW", "0583X0827.BW.PRE.LW.080CW444.MNB", "0583X0827.BW.PRE.LW.080CW444.MNG", "0583X0827.BW.PRE.LW.080CW444.MNW", "0583X0827.BW.PRE.LW.080CW444.MRB", "0583X0827.BW.PRE.LW.080CW444.MRG", "0583X0827.BW.PRE.LW.080CW444.MRW", "0583X0827.BW.PRE.LW.080CW444.MTB", "0583X0827.BW.PRE.LW.080CW444.MTG", "0583X0827.BW.PRE.LW.080CW444.MTW", "0583X0827.BW.PRE.PB.060UC444.GXX", "0583X0827.BW.PRE.PB.060UC444.MXX", "0583X0827.BW.PRE.PB.060UW444.GXX", "0583X0827.BW.PRE.PB.060UW444.MXX", "0583X0827.BW.PRE.PB.080CW444.GXX", "0583X0827.BW.PRE.PB.080CW444.MXX", "0583X0827.BW.PRE.SS.060UC444.GXX", "0583X0827.BW.PRE.SS.060UC444.MXX", "0583X0827.BW.PRE.SS.060UW444.GXX", "0583X0827.BW.PRE.SS.060UW444.MXX", "0583X0827.BW.PRE.SS.080CW444.GXX", "0583X0827.BW.PRE.SS.080CW444.MXX", "0583X0827.BW.STD.CO.060UC444.GXX", "0583X0827.BW.STD.CO.060UC444.MXX", "0583X0827.BW.STD.CO.060UW444.GXX", "0583X0827.BW.STD.CO.060UW444.MXX", "0583X0827.BW.STD.CO.080CW444.GXX", "0583X0827.BW.STD.CO.080CW444.MXX", "0583X0827.BW.STD.CW.060UC444.GXX", "0583X0827.BW.STD.CW.060UC444.MXX", "0583X0827.BW.STD.CW.060UW444.GXX", "0583X0827.BW.STD.CW.060UW444.MXX", "0583X0827.BW.STD.CW.080CW444.GXX", "0583X0827.BW.STD.CW.080CW444.MXX", "0583X0827.BW.STD.LW.060UC444.GBB", "0583X0827.BW.STD.LW.060UC444.GBG", "0583X0827.BW.STD.LW.060UC444.GBW", "0583X0827.BW.STD.LW.060UC444.GFB", "0583X0827.BW.STD.LW.060UC444.GFG", "0583X0827.BW.STD.LW.060UC444.GFW", "0583X0827.BW.STD.LW.060UC444.GGB", "0583X0827.BW.STD.LW.060UC444.GGG", "0583X0827.BW.STD.LW.060UC444.GGW", "0583X0827.BW.STD.LW.060UC444.GNB", "0583X0827.BW.STD.LW.060UC444.GNG", "0583X0827.BW.STD.LW.060UC444.GNW", "0583X0827.BW.STD.LW.060UC444.GRB", "0583X0827.BW.STD.LW.060UC444.GRG", "0583X0827.BW.STD.LW.060UC444.GRW", "0583X0827.BW.STD.LW.060UC444.GTB", "0583X0827.BW.STD.LW.060UC444.GTG", "0583X0827.BW.STD.LW.060UC444.GTW", "0583X0827.BW.STD.LW.060UC444.MBB", "0583X0827.BW.STD.LW.060UC444.MBG", "0583X0827.BW.STD.LW.060UC444.MBW", "0583X0827.BW.STD.LW.060UC444.MFB", "0583X0827.BW.STD.LW.060UC444.MFG", "0583X0827.BW.STD.LW.060UC444.MFW", "0583X0827.BW.STD.LW.060UC444.MGB", "0583X0827.BW.STD.LW.060UC444.MGG", "0583X0827.BW.STD.LW.060UC444.MGW", "0583X0827.BW.STD.LW.060UC444.MNB", "0583X0827.BW.STD.LW.060UC444.MNG", "0583X0827.BW.STD.LW.060UC444.MNW", "0583X0827.BW.STD.LW.060UC444.MRB", "0583X0827.BW.STD.LW.060UC444.MRG", "0583X0827.BW.STD.LW.060UC444.MRW", "0583X0827.BW.STD.LW.060UC444.MTB", "0583X0827.BW.STD.LW.060UC444.MTG", "0583X0827.BW.STD.LW.060UC444.MTW", "0583X0827.BW.STD.LW.060UW444.GBB", "0583X0827.BW.STD.LW.060UW444.GBG", "0583X0827.BW.STD.LW.060UW444.GBW", "0583X0827.BW.STD.LW.060UW444.GFB", "0583X0827.BW.STD.LW.060UW444.GFG", "0583X0827.BW.STD.LW.060UW444.GFW", "0583X0827.BW.STD.LW.060UW444.GGB", "0583X0827.BW.STD.LW.060UW444.GGG", "0583X0827.BW.STD.LW.060UW444.GGW", "0583X0827.BW.STD.LW.060UW444.GNB", "0583X0827.BW.STD.LW.060UW444.GNG", "0583X0827.BW.STD.LW.060UW444.GNW", "0583X0827.BW.STD.LW.060UW444.GRB", "0583X0827.BW.STD.LW.060UW444.GRG", "0583X0827.BW.STD.LW.060UW444.GRW", "0583X0827.BW.STD.LW.060UW444.GTB", "0583X0827.BW.STD.LW.060UW444.GTG", "0583X0827.BW.STD.LW.060UW444.GTW", "0583X0827.BW.STD.LW.060UW444.MBB", "0583X0827.BW.STD.LW.060UW444.MBG", "0583X0827.BW.STD.LW.060UW444.MBW", "0583X0827.BW.STD.LW.060UW444.MFB", "0583X0827.BW.STD.LW.060UW444.MFG", "0583X0827.BW.STD.LW.060UW444.MFW", "0583X0827.BW.STD.LW.060UW444.MGB", "0583X0827.BW.STD.LW.060UW444.MGG", "0583X0827.BW.STD.LW.060UW444.MGW", "0583X0827.BW.STD.LW.060UW444.MNB", "0583X0827.BW.STD.LW.060UW444.MNG", "0583X0827.BW.STD.LW.060UW444.MNW", "0583X0827.BW.STD.LW.060UW444.MRB", "0583X0827.BW.STD.LW.060UW444.MRG", "0583X0827.BW.STD.LW.060UW444.MRW", "0583X0827.BW.STD.LW.060UW444.MTB", "0583X0827.BW.STD.LW.060UW444.MTG", "0583X0827.BW.STD.LW.060UW444.MTW", "0583X0827.BW.STD.LW.080CW444.GBB", "0583X0827.BW.STD.LW.080CW444.GBG", "0583X0827.BW.STD.LW.080CW444.GBW", "0583X0827.BW.STD.LW.080CW444.GFB", "0583X0827.BW.STD.LW.080CW444.GFG", "0583X0827.BW.STD.LW.080CW444.GFW", "0583X0827.BW.STD.LW.080CW444.GGB", "0583X0827.BW.STD.LW.080CW444.GGG", "0583X0827.BW.STD.LW.080CW444.GGW", "0583X0827.BW.STD.LW.080CW444.GNB", "0583X0827.BW.STD.LW.080CW444.GNG", "0583X0827.BW.STD.LW.080CW444.GNW", "0583X0827.BW.STD.LW.080CW444.GRB", "0583X0827.BW.STD.LW.080CW444.GRG", "0583X0827.BW.STD.LW.080CW444.GRW", "0583X0827.BW.STD.LW.080CW444.GTB", "0583X0827.BW.STD.LW.080CW444.GTG", "0583X0827.BW.STD.LW.080CW444.GTW", "0583X0827.BW.STD.LW.080CW444.MBB", "0583X0827.BW.STD.LW.080CW444.MBG", "0583X0827.BW.STD.LW.080CW444.MBW", "0583X0827.BW.STD.LW.080CW444.MFB", "0583X0827.BW.STD.LW.080CW444.MFG", "0583X0827.BW.STD.LW.080CW444.MFW", "0583X0827.BW.STD.LW.080CW444.MGB", "0583X0827.BW.STD.LW.080CW444.MGG", "0583X0827.BW.STD.LW.080CW444.MGW", "0583X0827.BW.STD.LW.080CW444.MNB", "0583X0827.BW.STD.LW.080CW444.MNG", "0583X0827.BW.STD.LW.080CW444.MNW", "0583X0827.BW.STD.LW.080CW444.MRB", "0583X0827.BW.STD.LW.080CW444.MRG", "0583X0827.BW.STD.LW.080CW444.MRW", "0583X0827.BW.STD.LW.080CW444.MTB", "0583X0827.BW.STD.LW.080CW444.MTG", "0583X0827.BW.STD.LW.080CW444.MTW", "0583X0827.BW.STD.PB.060UC444.GXX", "0583X0827.BW.STD.PB.060UC444.MXX", "0583X0827.BW.STD.PB.060UW444.GXX", "0583X0827.BW.STD.PB.060UW444.MXX", "0583X0827.BW.STD.PB.080CW444.GXX", "0583X0827.BW.STD.PB.080CW444.MXX", "0583X0827.BW.STD.SS.060UC444.GXX", "0583X0827.BW.STD.SS.060UC444.MXX", "0583X0827.BW.STD.SS.060UW444.GXX", "0583X0827.BW.STD.SS.060UW444.MXX", "0583X0827.BW.STD.SS.080CW444.GXX", "0583X0827.BW.STD.SS.080CW444.MXX", "0583X0827.FC.PRE.CO.060UW444.GXX", "0583X0827.FC.PRE.CO.060UW444.MXX", "0583X0827.FC.PRE.CO.080CW444.GXX", "0583X0827.FC.PRE.CO.080CW444.MXX", "0583X0827.FC.PRE.CW.060UW444.GXX", "0583X0827.FC.PRE.CW.060UW444.MXX", "0583X0827.FC.PRE.CW.080CW444.GXX", "0583X0827.FC.PRE.CW.080CW444.MXX", "0583X0827.FC.PRE.LW.060UW444.GBB", "0583X0827.FC.PRE.LW.060UW444.GBG", "0583X0827.FC.PRE.LW.060UW444.GBW", "0583X0827.FC.PRE.LW.060UW444.GFB", "0583X0827.FC.PRE.LW.060UW444.GFG", "0583X0827.FC.PRE.LW.060UW444.GFW", "0583X0827.FC.PRE.LW.060UW444.GGB", "0583X0827.FC.PRE.LW.060UW444.GGG", "0583X0827.FC.PRE.LW.060UW444.GGW", "0583X0827.FC.PRE.LW.060UW444.GNB", "0583X0827.FC.PRE.LW.060UW444.GNG", "0583X0827.FC.PRE.LW.060UW444.GNW", "0583X0827.FC.PRE.LW.060UW444.GRB", "0583X0827.FC.PRE.LW.060UW444.GRG", "0583X0827.FC.PRE.LW.060UW444.GRW", "0583X0827.FC.PRE.LW.060UW444.GTB", "0583X0827.FC.PRE.LW.060UW444.GTG", "0583X0827.FC.PRE.LW.060UW444.GTW", "0583X0827.FC.PRE.LW.060UW444.MBB", "0583X0827.FC.PRE.LW.060UW444.MBG", "0583X0827.FC.PRE.LW.060UW444.MBW", "0583X0827.FC.PRE.LW.060UW444.MFB", "0583X0827.FC.PRE.LW.060UW444.MFG", "0583X0827.FC.PRE.LW.060UW444.MFW", "0583X0827.FC.PRE.LW.060UW444.MGB", "0583X0827.FC.PRE.LW.060UW444.MGG", "0583X0827.FC.PRE.LW.060UW444.MGW", "0583X0827.FC.PRE.LW.060UW444.MNB", "0583X0827.FC.PRE.LW.060UW444.MNG", "0583X0827.FC.PRE.LW.060UW444.MNW", "0583X0827.FC.PRE.LW.060UW444.MRB", "0583X0827.FC.PRE.LW.060UW444.MRG", "0583X0827.FC.PRE.LW.060UW444.MRW", "0583X0827.FC.PRE.LW.060UW444.MTB", "0583X0827.FC.PRE.LW.060UW444.MTG", "0583X0827.FC.PRE.LW.060UW444.MTW", "0583X0827.FC.PRE.LW.080CW444.GBB", "0583X0827.FC.PRE.LW.080CW444.GBG", "0583X0827.FC.PRE.LW.080CW444.GBW", "0583X0827.FC.PRE.LW.080CW444.GFB", "0583X0827.FC.PRE.LW.080CW444.GFG", "0583X0827.FC.PRE.LW.080CW444.GFW", "0583X0827.FC.PRE.LW.080CW444.GGB", "0583X0827.FC.PRE.LW.080CW444.GGG", "0583X0827.FC.PRE.LW.080CW444.GGW", "0583X0827.FC.PRE.LW.080CW444.GNB", "0583X0827.FC.PRE.LW.080CW444.GNG", "0583X0827.FC.PRE.LW.080CW444.GNW", "0583X0827.FC.PRE.LW.080CW444.GRB", "0583X0827.FC.PRE.LW.080CW444.GRG", "0583X0827.FC.PRE.LW.080CW444.GRW", "0583X0827.FC.PRE.LW.080CW444.GTB", "0583X0827.FC.PRE.LW.080CW444.GTG", "0583X0827.FC.PRE.LW.080CW444.GTW", "0583X0827.FC.PRE.LW.080CW444.MBB", "0583X0827.FC.PRE.LW.080CW444.MBG", "0583X0827.FC.PRE.LW.080CW444.MBW", "0583X0827.FC.PRE.LW.080CW444.MFB", "0583X0827.FC.PRE.LW.080CW444.MFG", "0583X0827.FC.PRE.LW.080CW444.MFW", "0583X0827.FC.PRE.LW.080CW444.MGB", "0583X0827.FC.PRE.LW.080CW444.MGG", "0583X0827.FC.PRE.LW.080CW444.MGW", "0583X0827.FC.PRE.LW.080CW444.MNB", "0583X0827.FC.PRE.LW.080CW444.MNG", "0583X0827.FC.PRE.LW.080CW444.MNW", "0583X0827.FC.PRE.LW.080CW444.MRB", "0583X0827.FC.PRE.LW.080CW444.MRG", "0583X0827.FC.PRE.LW.080CW444.MRW", "0583X0827.FC.PRE.LW.080CW444.MTB", "0583X0827.FC.PRE.LW.080CW444.MTG", "0583X0827.FC.PRE.LW.080CW444.MTW", "0583X0827.FC.PRE.PB.060UW444.GXX", "0583X0827.FC.PRE.PB.060UW444.MXX", "0583X0827.FC.PRE.PB.080CW444.GXX", "0583X0827.FC.PRE.PB.080CW444.MXX", "0583X0827.FC.PRE.SS.060UW444.GXX", "0583X0827.FC.PRE.SS.060UW444.MXX", "0583X0827.FC.PRE.SS.080CW444.GXX", "0583X0827.FC.PRE.SS.080CW444.MXX", "0583X0827.FC.STD.CO.060UW444.GXX", "0583X0827.FC.STD.CO.060UW444.MXX", "0583X0827.FC.STD.CO.080CW444.GXX", "0583X0827.FC.STD.CO.080CW444.MXX", "0583X0827.FC.STD.CW.060UW444.GXX", "0583X0827.FC.STD.CW.060UW444.MXX", "0583X0827.FC.STD.CW.080CW444.GXX", "0583X0827.FC.STD.CW.080CW444.MXX", "0583X0827.FC.STD.LW.060UW444.GBB", "0583X0827.FC.STD.LW.060UW444.GBG", "0583X0827.FC.STD.LW.060UW444.GBW", "0583X0827.FC.STD.LW.060UW444.GFB", "0583X0827.FC.STD.LW.060UW444.GFG", "0583X0827.FC.STD.LW.060UW444.GFW", "0583X0827.FC.STD.LW.060UW444.GGB", "0583X0827.FC.STD.LW.060UW444.GGG", "0583X0827.FC.STD.LW.060UW444.GGW", "0583X0827.FC.STD.LW.060UW444.GNB", "0583X0827.FC.STD.LW.060UW444.GNG", "0583X0827.FC.STD.LW.060UW444.GNW", "0583X0827.FC.STD.LW.060UW444.GRB", "0583X0827.FC.STD.LW.060UW444.GRG", "0583X0827.FC.STD.LW.060UW444.GRW", "0583X0827.FC.STD.LW.060UW444.GTB", "0583X0827.FC.STD.LW.060UW444.GTG", "0583X0827.FC.STD.LW.060UW444.GTW", "0583X0827.FC.STD.LW.060UW444.MBB", "0583X0827.FC.STD.LW.060UW444.MBG", "0583X0827.FC.STD.LW.060UW444.MBW", "0583X0827.FC.STD.LW.060UW444.MFB", "0583X0827.FC.STD.LW.060UW444.MFG", "0583X0827.FC.STD.LW.060UW444.MFW", "0583X0827.FC.STD.LW.060UW444.MGB", "0583X0827.FC.STD.LW.060UW444.MGG", "0583X0827.FC.STD.LW.060UW444.MGW", "0583X0827.FC.STD.LW.060UW444.MNB", "0583X0827.FC.STD.LW.060UW444.MNG", "0583X0827.FC.STD.LW.060UW444.MNW", "0583X0827.FC.STD.LW.060UW444.MRB", "0583X0827.FC.STD.LW.060UW444.MRG", "0583X0827.FC.STD.LW.060UW444.MRW", "0583X0827.FC.STD.LW.060UW444.MTB", "0583X0827.FC.STD.LW.060UW444.MTG", "0583X0827.FC.STD.LW.060UW444.MTW", "0583X0827.FC.STD.LW.080CW444.GBB", "0583X0827.FC.STD.LW.080CW444.GBG", "0583X0827.FC.STD.LW.080CW444.GBW", "0583X0827.FC.STD.LW.080CW444.GFB", "0583X0827.FC.STD.LW.080CW444.GFG", "0583X0827.FC.STD.LW.080CW444.GFW", "0583X0827.FC.STD.LW.080CW444.GGB", "0583X0827.FC.STD.LW.080CW444.GGG", "0583X0827.FC.STD.LW.080CW444.GGW", "0583X0827.FC.STD.LW.080CW444.GNB", "0583X0827.FC.STD.LW.080CW444.GNG", "0583X0827.FC.STD.LW.080CW444.GNW", "0583X0827.FC.STD.LW.080CW444.GRB", "0583X0827.FC.STD.LW.080CW444.GRG", "0583X0827.FC.STD.LW.080CW444.GRW", "0583X0827.FC.STD.LW.080CW444.GTB", "0583X0827.FC.STD.LW.080CW444.GTG", "0583X0827.FC.STD.LW.080CW444.GTW", "0583X0827.FC.STD.LW.080CW444.MBB", "0583X0827.FC.STD.LW.080CW444.MBG", "0583X0827.FC.STD.LW.080CW444.MBW", "0583X0827.FC.STD.LW.080CW444.MFB", "0583X0827.FC.STD.LW.080CW444.MFG", "0583X0827.FC.STD.LW.080CW444.MFW", "0583X0827.FC.STD.LW.080CW444.MGB", "0583X0827.FC.STD.LW.080CW444.MGG", "0583X0827.FC.STD.LW.080CW444.MGW", "0583X0827.FC.STD.LW.080CW444.MNB", "0583X0827.FC.STD.LW.080CW444.MNG", "0583X0827.FC.STD.LW.080CW444.MNW", "0583X0827.FC.STD.LW.080CW444.MRB", "0583X0827.FC.STD.LW.080CW444.MRG", "0583X0827.FC.STD.LW.080CW444.MRW", "0583X0827.FC.STD.LW.080CW444.MTB", "0583X0827.FC.STD.LW.080CW444.MTG", "0583X0827.FC.STD.LW.080CW444.MTW", "0583X0827.FC.STD.PB.060UW444.GXX", "0583X0827.FC.STD.PB.060UW444.MXX", "0583X0827.FC.STD.PB.080CW444.GXX", "0583X0827.FC.STD.PB.080CW444.MXX", "0600X0900.BW.PRE.CO.060UC444.GXX", "0600X0900.BW.PRE.CO.060UC444.MXX", "0600X0900.BW.PRE.CO.060UW444.GXX", "0600X0900.BW.PRE.CO.060UW444.MXX", "0600X0900.BW.PRE.CO.080CW444.GXX", "0600X0900.BW.PRE.CO.080CW444.MXX", "0600X0900.BW.PRE.CW.060UC444.GXX", "0600X0900.BW.PRE.CW.060UC444.MXX", "0600X0900.BW.PRE.CW.060UW444.GXX", "0600X0900.BW.PRE.CW.060UW444.MXX", "0600X0900.BW.PRE.CW.080CW444.GXX", "0600X0900.BW.PRE.CW.080CW444.MXX", "0600X0900.BW.PRE.LW.060UC444.GBB", "0600X0900.BW.PRE.LW.060UC444.GBG", "0600X0900.BW.PRE.LW.060UC444.GBW", "0600X0900.BW.PRE.LW.060UC444.GFB", "0600X0900.BW.PRE.LW.060UC444.GFG", "0600X0900.BW.PRE.LW.060UC444.GFW", "0600X0900.BW.PRE.LW.060UC444.GGB", "0600X0900.BW.PRE.LW.060UC444.GGG", "0600X0900.BW.PRE.LW.060UC444.GGW", "0600X0900.BW.PRE.LW.060UC444.GNB", "0600X0900.BW.PRE.LW.060UC444.GNG", "0600X0900.BW.PRE.LW.060UC444.GNW", "0600X0900.BW.PRE.LW.060UC444.GRB", "0600X0900.BW.PRE.LW.060UC444.GRG", "0600X0900.BW.PRE.LW.060UC444.GRW", "0600X0900.BW.PRE.LW.060UC444.GTB", "0600X0900.BW.PRE.LW.060UC444.GTG", "0600X0900.BW.PRE.LW.060UC444.GTW", "0600X0900.BW.PRE.LW.060UC444.MBB", "0600X0900.BW.PRE.LW.060UC444.MBG", "0600X0900.BW.PRE.LW.060UC444.MBW", "0600X0900.BW.PRE.LW.060UC444.MFB", "0600X0900.BW.PRE.LW.060UC444.MFG", "0600X0900.BW.PRE.LW.060UC444.MFW", "0600X0900.BW.PRE.LW.060UC444.MGB", "0600X0900.BW.PRE.LW.060UC444.MGG", "0600X0900.BW.PRE.LW.060UC444.MGW", "0600X0900.BW.PRE.LW.060UC444.MNB", "0600X0900.BW.PRE.LW.060UC444.MNG", "0600X0900.BW.PRE.LW.060UC444.MNW", "0600X0900.BW.PRE.LW.060UC444.MRB", "0600X0900.BW.PRE.LW.060UC444.MRG", "0600X0900.BW.PRE.LW.060UC444.MRW", "0600X0900.BW.PRE.LW.060UC444.MTB", "0600X0900.BW.PRE.LW.060UC444.MTG", "0600X0900.BW.PRE.LW.060UC444.MTW", "0600X0900.BW.PRE.LW.060UW444.GBB", "0600X0900.BW.PRE.LW.060UW444.GBG", "0600X0900.BW.PRE.LW.060UW444.GBW", "0600X0900.BW.PRE.LW.060UW444.GFB", "0600X0900.BW.PRE.LW.060UW444.GFG", "0600X0900.BW.PRE.LW.060UW444.GFW", "0600X0900.BW.PRE.LW.060UW444.GGB", "0600X0900.BW.PRE.LW.060UW444.GGG", "0600X0900.BW.PRE.LW.060UW444.GGW", "0600X0900.BW.PRE.LW.060UW444.GNB", "0600X0900.BW.PRE.LW.060UW444.GNG", "0600X0900.BW.PRE.LW.060UW444.GNW", "0600X0900.BW.PRE.LW.060UW444.GRB", "0600X0900.BW.PRE.LW.060UW444.GRG", "0600X0900.BW.PRE.LW.060UW444.GRW", "0600X0900.BW.PRE.LW.060UW444.GTB", "0600X0900.BW.PRE.LW.060UW444.GTG", "0600X0900.BW.PRE.LW.060UW444.GTW", "0600X0900.BW.PRE.LW.060UW444.MBB", "0600X0900.BW.PRE.LW.060UW444.MBG", "0600X0900.BW.PRE.LW.060UW444.MBW", "0600X0900.BW.PRE.LW.060UW444.MFB", "0600X0900.BW.PRE.LW.060UW444.MFG", "0600X0900.BW.PRE.LW.060UW444.MFW", "0600X0900.BW.PRE.LW.060UW444.MGB", "0600X0900.BW.PRE.LW.060UW444.MGG", "0600X0900.BW.PRE.LW.060UW444.MGW", "0600X0900.BW.PRE.LW.060UW444.MNB", "0600X0900.BW.PRE.LW.060UW444.MNG", "0600X0900.BW.PRE.LW.060UW444.MNW", "0600X0900.BW.PRE.LW.060UW444.MRB", "0600X0900.BW.PRE.LW.060UW444.MRG", "0600X0900.BW.PRE.LW.060UW444.MRW", "0600X0900.BW.PRE.LW.060UW444.MTB", "0600X0900.BW.PRE.LW.060UW444.MTG", "0600X0900.BW.PRE.LW.060UW444.MTW", "0600X0900.BW.PRE.LW.080CW444.GBB", "0600X0900.BW.PRE.LW.080CW444.GBG", "0600X0900.BW.PRE.LW.080CW444.GBW", "0600X0900.BW.PRE.LW.080CW444.GFB", "0600X0900.BW.PRE.LW.080CW444.GFG", "0600X0900.BW.PRE.LW.080CW444.GFW", "0600X0900.BW.PRE.LW.080CW444.GGB", "0600X0900.BW.PRE.LW.080CW444.GGG", "0600X0900.BW.PRE.LW.080CW444.GGW", "0600X0900.BW.PRE.LW.080CW444.GNB", "0600X0900.BW.PRE.LW.080CW444.GNG", "0600X0900.BW.PRE.LW.080CW444.GNW", "0600X0900.BW.PRE.LW.080CW444.GRB", "0600X0900.BW.PRE.LW.080CW444.GRG", "0600X0900.BW.PRE.LW.080CW444.GRW", "0600X0900.BW.PRE.LW.080CW444.GTB", "0600X0900.BW.PRE.LW.080CW444.GTG", "0600X0900.BW.PRE.LW.080CW444.GTW", "0600X0900.BW.PRE.LW.080CW444.MBB", "0600X0900.BW.PRE.LW.080CW444.MBG", "0600X0900.BW.PRE.LW.080CW444.MBW", "0600X0900.BW.PRE.LW.080CW444.MFB", "0600X0900.BW.PRE.LW.080CW444.MFG", "0600X0900.BW.PRE.LW.080CW444.MFW", "0600X0900.BW.PRE.LW.080CW444.MGB", "0600X0900.BW.PRE.LW.080CW444.MGG", "0600X0900.BW.PRE.LW.080CW444.MGW", "0600X0900.BW.PRE.LW.080CW444.MNB", "0600X0900.BW.PRE.LW.080CW444.MNG", "0600X0900.BW.PRE.LW.080CW444.MNW", "0600X0900.BW.PRE.LW.080CW444.MRB", "0600X0900.BW.PRE.LW.080CW444.MRG", "0600X0900.BW.PRE.LW.080CW444.MRW", "0600X0900.BW.PRE.LW.080CW444.MTB", "0600X0900.BW.PRE.LW.080CW444.MTG", "0600X0900.BW.PRE.LW.080CW444.MTW", "0600X0900.BW.PRE.PB.060UC444.GXX", "0600X0900.BW.PRE.PB.060UC444.MXX", "0600X0900.BW.PRE.PB.060UW444.GXX", "0600X0900.BW.PRE.PB.060UW444.MXX", "0600X0900.BW.PRE.PB.080CW444.GXX", "0600X0900.BW.PRE.PB.080CW444.MXX", "0600X0900.BW.PRE.SS.060UC444.GXX", "0600X0900.BW.PRE.SS.060UC444.MXX", "0600X0900.BW.PRE.SS.060UW444.GXX", "0600X0900.BW.PRE.SS.060UW444.MXX", "0600X0900.BW.PRE.SS.080CW444.GXX", "0600X0900.BW.PRE.SS.080CW444.MXX", "0600X0900.BW.STD.CO.060UC444.GXX", "0600X0900.BW.STD.CO.060UC444.MXX", "0600X0900.BW.STD.CO.060UW444.GXX", "0600X0900.BW.STD.CO.060UW444.MXX", "0600X0900.BW.STD.CO.080CW444.GXX", "0600X0900.BW.STD.CO.080CW444.MXX", "0600X0900.BW.STD.CW.060UC444.GXX", "0600X0900.BW.STD.CW.060UC444.MXX", "0600X0900.BW.STD.CW.060UW444.GXX", "0600X0900.BW.STD.CW.060UW444.MXX", "0600X0900.BW.STD.CW.080CW444.GXX", "0600X0900.BW.STD.CW.080CW444.MXX", "0600X0900.BW.STD.LW.060UC444.GBB", "0600X0900.BW.STD.LW.060UC444.GBG", "0600X0900.BW.STD.LW.060UC444.GBW", "0600X0900.BW.STD.LW.060UC444.GFB", "0600X0900.BW.STD.LW.060UC444.GFG", "0600X0900.BW.STD.LW.060UC444.GFW", "0600X0900.BW.STD.LW.060UC444.GGB", "0600X0900.BW.STD.LW.060UC444.GGG", "0600X0900.BW.STD.LW.060UC444.GGW", "0600X0900.BW.STD.LW.060UC444.GNB", "0600X0900.BW.STD.LW.060UC444.GNG", "0600X0900.BW.STD.LW.060UC444.GNW", "0600X0900.BW.STD.LW.060UC444.GRB", "0600X0900.BW.STD.LW.060UC444.GRG", "0600X0900.BW.STD.LW.060UC444.GRW", "0600X0900.BW.STD.LW.060UC444.GTB", "0600X0900.BW.STD.LW.060UC444.GTG", "0600X0900.BW.STD.LW.060UC444.GTW", "0600X0900.BW.STD.LW.060UC444.MBB", "0600X0900.BW.STD.LW.060UC444.MBG", "0600X0900.BW.STD.LW.060UC444.MBW", "0600X0900.BW.STD.LW.060UC444.MFB", "0600X0900.BW.STD.LW.060UC444.MFG", "0600X0900.BW.STD.LW.060UC444.MFW", "0600X0900.BW.STD.LW.060UC444.MGB", "0600X0900.BW.STD.LW.060UC444.MGG", "0600X0900.BW.STD.LW.060UC444.MGW", "0600X0900.BW.STD.LW.060UC444.MNB", "0600X0900.BW.STD.LW.060UC444.MNG", "0600X0900.BW.STD.LW.060UC444.MNW", "0600X0900.BW.STD.LW.060UC444.MRB", "0600X0900.BW.STD.LW.060UC444.MRG", "0600X0900.BW.STD.LW.060UC444.MRW", "0600X0900.BW.STD.LW.060UC444.MTB", "0600X0900.BW.STD.LW.060UC444.MTG", "0600X0900.BW.STD.LW.060UC444.MTW", "0600X0900.BW.STD.LW.060UW444.GBB", "0600X0900.BW.STD.LW.060UW444.GBG", "0600X0900.BW.STD.LW.060UW444.GBW", "0600X0900.BW.STD.LW.060UW444.GFB", "0600X0900.BW.STD.LW.060UW444.GFG", "0600X0900.BW.STD.LW.060UW444.GFW", "0600X0900.BW.STD.LW.060UW444.GGB", "0600X0900.BW.STD.LW.060UW444.GGG", "0600X0900.BW.STD.LW.060UW444.GGW", "0600X0900.BW.STD.LW.060UW444.GNB", "0600X0900.BW.STD.LW.060UW444.GNG", "0600X0900.BW.STD.LW.060UW444.GNW", "0600X0900.BW.STD.LW.060UW444.GRB", "0600X0900.BW.STD.LW.060UW444.GRG", "0600X0900.BW.STD.LW.060UW444.GRW", "0600X0900.BW.STD.LW.060UW444.GTB", "0600X0900.BW.STD.LW.060UW444.GTG", "0600X0900.BW.STD.LW.060UW444.GTW", "0600X0900.BW.STD.LW.060UW444.MBB", "0600X0900.BW.STD.LW.060UW444.MBG", "0600X0900.BW.STD.LW.060UW444.MBW", "0600X0900.BW.STD.LW.060UW444.MFB", "0600X0900.BW.STD.LW.060UW444.MFG", "0600X0900.BW.STD.LW.060UW444.MFW", "0600X0900.BW.STD.LW.060UW444.MGB", "0600X0900.BW.STD.LW.060UW444.MGG", "0600X0900.BW.STD.LW.060UW444.MGW", "0600X0900.BW.STD.LW.060UW444.MNB", "0600X0900.BW.STD.LW.060UW444.MNG", "0600X0900.BW.STD.LW.060UW444.MNW", "0600X0900.BW.STD.LW.060UW444.MRB", "0600X0900.BW.STD.LW.060UW444.MRG", "0600X0900.BW.STD.LW.060UW444.MRW", "0600X0900.BW.STD.LW.060UW444.MTB", "0600X0900.BW.STD.LW.060UW444.MTG", "0600X0900.BW.STD.LW.060UW444.MTW", "0600X0900.BW.STD.LW.080CW444.GBB", "0600X0900.BW.STD.LW.080CW444.GBG", "0600X0900.BW.STD.LW.080CW444.GBW", "0600X0900.BW.STD.LW.080CW444.GFB", "0600X0900.BW.STD.LW.080CW444.GFG", "0600X0900.BW.STD.LW.080CW444.GFW", "0600X0900.BW.STD.LW.080CW444.GGB", "0600X0900.BW.STD.LW.080CW444.GGG", "0600X0900.BW.STD.LW.080CW444.GGW", "0600X0900.BW.STD.LW.080CW444.GNB", "0600X0900.BW.STD.LW.080CW444.GNG", "0600X0900.BW.STD.LW.080CW444.GNW", "0600X0900.BW.STD.LW.080CW444.GRB", "0600X0900.BW.STD.LW.080CW444.GRG", "0600X0900.BW.STD.LW.080CW444.GRW", "0600X0900.BW.STD.LW.080CW444.GTB", "0600X0900.BW.STD.LW.080CW444.GTG", "0600X0900.BW.STD.LW.080CW444.GTW", "0600X0900.BW.STD.LW.080CW444.MBB", "0600X0900.BW.STD.LW.080CW444.MBG", "0600X0900.BW.STD.LW.080CW444.MBW", "0600X0900.BW.STD.LW.080CW444.MFB", "0600X0900.BW.STD.LW.080CW444.MFG", "0600X0900.BW.STD.LW.080CW444.MFW", "0600X0900.BW.STD.LW.080CW444.MGB", "0600X0900.BW.STD.LW.080CW444.MGG", "0600X0900.BW.STD.LW.080CW444.MGW", "0600X0900.BW.STD.LW.080CW444.MNB", "0600X0900.BW.STD.LW.080CW444.MNG", "0600X0900.BW.STD.LW.080CW444.MNW", "0600X0900.BW.STD.LW.080CW444.MRB", "0600X0900.BW.STD.LW.080CW444.MRG", "0600X0900.BW.STD.LW.080CW444.MRW", "0600X0900.BW.STD.LW.080CW444.MTB", "0600X0900.BW.STD.LW.080CW444.MTG", "0600X0900.BW.STD.LW.080CW444.MTW", "0600X0900.BW.STD.PB.060UC444.GXX", "0600X0900.BW.STD.PB.060UC444.MXX", "0600X0900.BW.STD.PB.060UW444.GXX", "0600X0900.BW.STD.PB.060UW444.MXX", "0600X0900.BW.STD.PB.080CW444.GXX", "0600X0900.BW.STD.PB.080CW444.MXX", "0600X0900.BW.STD.SS.060UC444.GXX", "0600X0900.BW.STD.SS.060UC444.MXX", "0600X0900.BW.STD.SS.060UW444.GXX", "0600X0900.BW.STD.SS.060UW444.MXX", "0600X0900.BW.STD.SS.080CW444.GXX", "0600X0900.BW.STD.SS.080CW444.MXX", "0600X0900.FC.PRE.CO.060UW444.GXX", "0600X0900.FC.PRE.CO.060UW444.MXX", "0600X0900.FC.PRE.CO.080CW444.GXX", "0600X0900.FC.PRE.CO.080CW444.MXX", "0600X0900.FC.PRE.CW.060UW444.GXX", "0600X0900.FC.PRE.CW.060UW444.MXX", "0600X0900.FC.PRE.CW.080CW444.GXX", "0600X0900.FC.PRE.CW.080CW444.MXX", "0600X0900.FC.PRE.LW.060UW444.GBB", "0600X0900.FC.PRE.LW.060UW444.GBG", "0600X0900.FC.PRE.LW.060UW444.GBW", "0600X0900.FC.PRE.LW.060UW444.GFB", "0600X0900.FC.PRE.LW.060UW444.GFG", "0600X0900.FC.PRE.LW.060UW444.GFW", "0600X0900.FC.PRE.LW.060UW444.GGB", "0600X0900.FC.PRE.LW.060UW444.GGG", "0600X0900.FC.PRE.LW.060UW444.GGW", "0600X0900.FC.PRE.LW.060UW444.GNB", "0600X0900.FC.PRE.LW.060UW444.GNG", "0600X0900.FC.PRE.LW.060UW444.GNW", "0600X0900.FC.PRE.LW.060UW444.GRB", "0600X0900.FC.PRE.LW.060UW444.GRG", "0600X0900.FC.PRE.LW.060UW444.GRW", "0600X0900.FC.PRE.LW.060UW444.GTB", "0600X0900.FC.PRE.LW.060UW444.GTG", "0600X0900.FC.PRE.LW.060UW444.GTW", "0600X0900.FC.PRE.LW.060UW444.MBB", "0600X0900.FC.PRE.LW.060UW444.MBG", "0600X0900.FC.PRE.LW.060UW444.MBW", "0600X0900.FC.PRE.LW.060UW444.MFB", "0600X0900.FC.PRE.LW.060UW444.MFG", "0600X0900.FC.PRE.LW.060UW444.MFW", "0600X0900.FC.PRE.LW.060UW444.MGB", "0600X0900.FC.PRE.LW.060UW444.MGG", "0600X0900.FC.PRE.LW.060UW444.MGW", "0600X0900.FC.PRE.LW.060UW444.MNB", "0600X0900.FC.PRE.LW.060UW444.MNG", "0600X0900.FC.PRE.LW.060UW444.MNW", "0600X0900.FC.PRE.LW.060UW444.MRB", "0600X0900.FC.PRE.LW.060UW444.MRG", "0600X0900.FC.PRE.LW.060UW444.MRW", "0600X0900.FC.PRE.LW.060UW444.MTB", "0600X0900.FC.PRE.LW.060UW444.MTG", "0600X0900.FC.PRE.LW.060UW444.MTW", "0600X0900.FC.PRE.LW.080CW444.GBB", "0600X0900.FC.PRE.LW.080CW444.GBG", "0600X0900.FC.PRE.LW.080CW444.GBW", "0600X0900.FC.PRE.LW.080CW444.GFB", "0600X0900.FC.PRE.LW.080CW444.GFG", "0600X0900.FC.PRE.LW.080CW444.GFW", "0600X0900.FC.PRE.LW.080CW444.GGB", "0600X0900.FC.PRE.LW.080CW444.GGG", "0600X0900.FC.PRE.LW.080CW444.GGW", "0600X0900.FC.PRE.LW.080CW444.GNB", "0600X0900.FC.PRE.LW.080CW444.GNG", "0600X0900.FC.PRE.LW.080CW444.GNW", "0600X0900.FC.PRE.LW.080CW444.GRB", "0600X0900.FC.PRE.LW.080CW444.GRG", "0600X0900.FC.PRE.LW.080CW444.GRW", "0600X0900.FC.PRE.LW.080CW444.GTB", "0600X0900.FC.PRE.LW.080CW444.GTG", "0600X0900.FC.PRE.LW.080CW444.GTW", "0600X0900.FC.PRE.LW.080CW444.MBB", "0600X0900.FC.PRE.LW.080CW444.MBG", "0600X0900.FC.PRE.LW.080CW444.MBW", "0600X0900.FC.PRE.LW.080CW444.MFB", "0600X0900.FC.PRE.LW.080CW444.MFG", "0600X0900.FC.PRE.LW.080CW444.MFW", "0600X0900.FC.PRE.LW.080CW444.MGB", "0600X0900.FC.PRE.LW.080CW444.MGG", "0600X0900.FC.PRE.LW.080CW444.MGW", "0600X0900.FC.PRE.LW.080CW444.MNB", "0600X0900.FC.PRE.LW.080CW444.MNG", "0600X0900.FC.PRE.LW.080CW444.MNW", "0600X0900.FC.PRE.LW.080CW444.MRB", "0600X0900.FC.PRE.LW.080CW444.MRG", "0600X0900.FC.PRE.LW.080CW444.MRW", "0600X0900.FC.PRE.LW.080CW444.MTB", "0600X0900.FC.PRE.LW.080CW444.MTG", "0600X0900.FC.PRE.LW.080CW444.MTW", "0600X0900.FC.PRE.PB.060UW444.GXX", "0600X0900.FC.PRE.PB.060UW444.MXX", "0600X0900.FC.PRE.PB.080CW444.GXX", "0600X0900.FC.PRE.PB.080CW444.MXX", "0600X0900.FC.PRE.SS.060UW444.GXX", "0600X0900.FC.PRE.SS.060UW444.MXX", "0600X0900.FC.PRE.SS.080CW444.GXX", "0600X0900.FC.PRE.SS.080CW444.MXX", "0600X0900.FC.STD.CO.060UW444.GXX", "0600X0900.FC.STD.CO.060UW444.MXX", "0600X0900.FC.STD.CO.080CW444.GXX", "0600X0900.FC.STD.CO.080CW444.MXX", "0600X0900.FC.STD.CW.060UW444.GXX", "0600X0900.FC.STD.CW.060UW444.MXX", "0600X0900.FC.STD.CW.080CW444.GXX", "0600X0900.FC.STD.CW.080CW444.MXX", "0600X0900.FC.STD.LW.060UW444.GBB", "0600X0900.FC.STD.LW.060UW444.GBG", "0600X0900.FC.STD.LW.060UW444.GBW", "0600X0900.FC.STD.LW.060UW444.GFB", "0600X0900.FC.STD.LW.060UW444.GFG", "0600X0900.FC.STD.LW.060UW444.GFW", "0600X0900.FC.STD.LW.060UW444.GGB", "0600X0900.FC.STD.LW.060UW444.GGG", "0600X0900.FC.STD.LW.060UW444.GGW", "0600X0900.FC.STD.LW.060UW444.GNB", "0600X0900.FC.STD.LW.060UW444.GNG", "0600X0900.FC.STD.LW.060UW444.GNW", "0600X0900.FC.STD.LW.060UW444.GRB", "0600X0900.FC.STD.LW.060UW444.GRG", "0600X0900.FC.STD.LW.060UW444.GRW", "0600X0900.FC.STD.LW.060UW444.GTB", "0600X0900.FC.STD.LW.060UW444.GTG", "0600X0900.FC.STD.LW.060UW444.GTW", "0600X0900.FC.STD.LW.060UW444.MBB", "0600X0900.FC.STD.LW.060UW444.MBG", "0600X0900.FC.STD.LW.060UW444.MBW", "0600X0900.FC.STD.LW.060UW444.MFB", "0600X0900.FC.STD.LW.060UW444.MFG", "0600X0900.FC.STD.LW.060UW444.MFW", "0600X0900.FC.STD.LW.060UW444.MGB", "0600X0900.FC.STD.LW.060UW444.MGG", "0600X0900.FC.STD.LW.060UW444.MGW", "0600X0900.FC.STD.LW.060UW444.MNB", "0600X0900.FC.STD.LW.060UW444.MNG", "0600X0900.FC.STD.LW.060UW444.MNW", "0600X0900.FC.STD.LW.060UW444.MRB", "0600X0900.FC.STD.LW.060UW444.MRG", "0600X0900.FC.STD.LW.060UW444.MRW", "0600X0900.FC.STD.LW.060UW444.MTB", "0600X0900.FC.STD.LW.060UW444.MTG", "0600X0900.FC.STD.LW.060UW444.MTW", "0600X0900.FC.STD.LW.080CW444.GBB", "0600X0900.FC.STD.LW.080CW444.GBG", "0600X0900.FC.STD.LW.080CW444.GBW", "0600X0900.FC.STD.LW.080CW444.GFB", "0600X0900.FC.STD.LW.080CW444.GFG", "0600X0900.FC.STD.LW.080CW444.GFW", "0600X0900.FC.STD.LW.080CW444.GGB", "0600X0900.FC.STD.LW.080CW444.GGG", "0600X0900.FC.STD.LW.080CW444.GGW", "0600X0900.FC.STD.LW.080CW444.GNB", "0600X0900.FC.STD.LW.080CW444.GNG", "0600X0900.FC.STD.LW.080CW444.GNW", "0600X0900.FC.STD.LW.080CW444.GRB", "0600X0900.FC.STD.LW.080CW444.GRG", "0600X0900.FC.STD.LW.080CW444.GRW", "0600X0900.FC.STD.LW.080CW444.GTB", "0600X0900.FC.STD.LW.080CW444.GTG", "0600X0900.FC.STD.LW.080CW444.GTW", "0600X0900.FC.STD.LW.080CW444.MBB", "0600X0900.FC.STD.LW.080CW444.MBG", "0600X0900.FC.STD.LW.080CW444.MBW", "0600X0900.FC.STD.LW.080CW444.MFB", "0600X0900.FC.STD.LW.080CW444.MFG", "0600X0900.FC.STD.LW.080CW444.MFW", "0600X0900.FC.STD.LW.080CW444.MGB", "0600X0900.FC.STD.LW.080CW444.MGG", "0600X0900.FC.STD.LW.080CW444.MGW", "0600X0900.FC.STD.LW.080CW444.MNB", "0600X0900.FC.STD.LW.080CW444.MNG", "0600X0900.FC.STD.LW.080CW444.MNW", "0600X0900.FC.STD.LW.080CW444.MRB", "0600X0900.FC.STD.LW.080CW444.MRG", "0600X0900.FC.STD.LW.080CW444.MRW", "0600X0900.FC.STD.LW.080CW444.MTB", "0600X0900.FC.STD.LW.080CW444.MTG", "0600X0900.FC.STD.LW.080CW444.MTW", "0600X0900.FC.STD.PB.060UW444.GXX", "0600X0900.FC.STD.PB.060UW444.MXX", "0600X0900.FC.STD.PB.080CW444.GXX", "0600X0900.FC.STD.PB.080CW444.MXX", "0614X0921.BW.PRE.CO.060UC444.GXX", "0614X0921.BW.PRE.CO.060UC444.MXX", "0614X0921.BW.PRE.CO.060UW444.GXX", "0614X0921.BW.PRE.CO.060UW444.MXX", "0614X0921.BW.PRE.CO.080CW444.GXX", "0614X0921.BW.PRE.CO.080CW444.MXX", "0614X0921.BW.PRE.CW.060UC444.GXX", "0614X0921.BW.PRE.CW.060UC444.MXX", "0614X0921.BW.PRE.CW.060UW444.GXX", "0614X0921.BW.PRE.CW.060UW444.MXX", "0614X0921.BW.PRE.CW.080CW444.GXX", "0614X0921.BW.PRE.CW.080CW444.MXX", "0614X0921.BW.PRE.LW.060UC444.GBB", "0614X0921.BW.PRE.LW.060UC444.GBG", "0614X0921.BW.PRE.LW.060UC444.GBW", "0614X0921.BW.PRE.LW.060UC444.GFB", "0614X0921.BW.PRE.LW.060UC444.GFG", "0614X0921.BW.PRE.LW.060UC444.GFW", "0614X0921.BW.PRE.LW.060UC444.GGB", "0614X0921.BW.PRE.LW.060UC444.GGG", "0614X0921.BW.PRE.LW.060UC444.GGW", "0614X0921.BW.PRE.LW.060UC444.GNB", "0614X0921.BW.PRE.LW.060UC444.GNG", "0614X0921.BW.PRE.LW.060UC444.GNW", "0614X0921.BW.PRE.LW.060UC444.GRB", "0614X0921.BW.PRE.LW.060UC444.GRG", "0614X0921.BW.PRE.LW.060UC444.GRW", "0614X0921.BW.PRE.LW.060UC444.GTB", "0614X0921.BW.PRE.LW.060UC444.GTG", "0614X0921.BW.PRE.LW.060UC444.GTW", "0614X0921.BW.PRE.LW.060UC444.MBB", "0614X0921.BW.PRE.LW.060UC444.MBG", "0614X0921.BW.PRE.LW.060UC444.MBW", "0614X0921.BW.PRE.LW.060UC444.MFB", "0614X0921.BW.PRE.LW.060UC444.MFG", "0614X0921.BW.PRE.LW.060UC444.MFW", "0614X0921.BW.PRE.LW.060UC444.MGB", "0614X0921.BW.PRE.LW.060UC444.MGG", "0614X0921.BW.PRE.LW.060UC444.MGW", "0614X0921.BW.PRE.LW.060UC444.MNB", "0614X0921.BW.PRE.LW.060UC444.MNG", "0614X0921.BW.PRE.LW.060UC444.MNW", "0614X0921.BW.PRE.LW.060UC444.MRB", "0614X0921.BW.PRE.LW.060UC444.MRG", "0614X0921.BW.PRE.LW.060UC444.MRW", "0614X0921.BW.PRE.LW.060UC444.MTB", "0614X0921.BW.PRE.LW.060UC444.MTG", "0614X0921.BW.PRE.LW.060UC444.MTW", "0614X0921.BW.PRE.LW.060UW444.GBB", "0614X0921.BW.PRE.LW.060UW444.GBG", "0614X0921.BW.PRE.LW.060UW444.GBW", "0614X0921.BW.PRE.LW.060UW444.GFB", "0614X0921.BW.PRE.LW.060UW444.GFG", "0614X0921.BW.PRE.LW.060UW444.GFW", "0614X0921.BW.PRE.LW.060UW444.GGB", "0614X0921.BW.PRE.LW.060UW444.GGG", "0614X0921.BW.PRE.LW.060UW444.GGW", "0614X0921.BW.PRE.LW.060UW444.GNB", "0614X0921.BW.PRE.LW.060UW444.GNG", "0614X0921.BW.PRE.LW.060UW444.GNW", "0614X0921.BW.PRE.LW.060UW444.GRB", "0614X0921.BW.PRE.LW.060UW444.GRG", "0614X0921.BW.PRE.LW.060UW444.GRW", "0614X0921.BW.PRE.LW.060UW444.GTB", "0614X0921.BW.PRE.LW.060UW444.GTG", "0614X0921.BW.PRE.LW.060UW444.GTW", "0614X0921.BW.PRE.LW.060UW444.MBB", "0614X0921.BW.PRE.LW.060UW444.MBG", "0614X0921.BW.PRE.LW.060UW444.MBW", "0614X0921.BW.PRE.LW.060UW444.MFB", "0614X0921.BW.PRE.LW.060UW444.MFG", "0614X0921.BW.PRE.LW.060UW444.MFW", "0614X0921.BW.PRE.LW.060UW444.MGB", "0614X0921.BW.PRE.LW.060UW444.MGG", "0614X0921.BW.PRE.LW.060UW444.MGW", "0614X0921.BW.PRE.LW.060UW444.MNB", "0614X0921.BW.PRE.LW.060UW444.MNG", "0614X0921.BW.PRE.LW.060UW444.MNW", "0614X0921.BW.PRE.LW.060UW444.MRB", "0614X0921.BW.PRE.LW.060UW444.MRG", "0614X0921.BW.PRE.LW.060UW444.MRW", "0614X0921.BW.PRE.LW.060UW444.MTB", "0614X0921.BW.PRE.LW.060UW444.MTG", "0614X0921.BW.PRE.LW.060UW444.MTW", "0614X0921.BW.PRE.LW.080CW444.GBB", "0614X0921.BW.PRE.LW.080CW444.GBG", "0614X0921.BW.PRE.LW.080CW444.GBW", "0614X0921.BW.PRE.LW.080CW444.GFB", "0614X0921.BW.PRE.LW.080CW444.GFG", "0614X0921.BW.PRE.LW.080CW444.GFW", "0614X0921.BW.PRE.LW.080CW444.GGB", "0614X0921.BW.PRE.LW.080CW444.GGG", "0614X0921.BW.PRE.LW.080CW444.GGW", "0614X0921.BW.PRE.LW.080CW444.GNB", "0614X0921.BW.PRE.LW.080CW444.GNG", "0614X0921.BW.PRE.LW.080CW444.GNW", "0614X0921.BW.PRE.LW.080CW444.GRB", "0614X0921.BW.PRE.LW.080CW444.GRG", "0614X0921.BW.PRE.LW.080CW444.GRW", "0614X0921.BW.PRE.LW.080CW444.GTB", "0614X0921.BW.PRE.LW.080CW444.GTG", "0614X0921.BW.PRE.LW.080CW444.GTW", "0614X0921.BW.PRE.LW.080CW444.MBB", "0614X0921.BW.PRE.LW.080CW444.MBG", "0614X0921.BW.PRE.LW.080CW444.MBW", "0614X0921.BW.PRE.LW.080CW444.MFB", "0614X0921.BW.PRE.LW.080CW444.MFG", "0614X0921.BW.PRE.LW.080CW444.MFW", "0614X0921.BW.PRE.LW.080CW444.MGB", "0614X0921.BW.PRE.LW.080CW444.MGG", "0614X0921.BW.PRE.LW.080CW444.MGW", "0614X0921.BW.PRE.LW.080CW444.MNB", "0614X0921.BW.PRE.LW.080CW444.MNG", "0614X0921.BW.PRE.LW.080CW444.MNW", "0614X0921.BW.PRE.LW.080CW444.MRB", "0614X0921.BW.PRE.LW.080CW444.MRG", "0614X0921.BW.PRE.LW.080CW444.MRW", "0614X0921.BW.PRE.LW.080CW444.MTB", "0614X0921.BW.PRE.LW.080CW444.MTG", "0614X0921.BW.PRE.LW.080CW444.MTW", "0614X0921.BW.PRE.PB.060UC444.GXX", "0614X0921.BW.PRE.PB.060UC444.MXX", "0614X0921.BW.PRE.PB.060UW444.GXX", "0614X0921.BW.PRE.PB.060UW444.MXX", "0614X0921.BW.PRE.PB.080CW444.GXX", "0614X0921.BW.PRE.PB.080CW444.MXX", "0614X0921.BW.PRE.SS.060UC444.GXX", "0614X0921.BW.PRE.SS.060UC444.MXX", "0614X0921.BW.PRE.SS.060UW444.GXX", "0614X0921.BW.PRE.SS.060UW444.MXX", "0614X0921.BW.PRE.SS.080CW444.GXX", "0614X0921.BW.PRE.SS.080CW444.MXX", "0614X0921.BW.STD.CO.060UC444.GXX", "0614X0921.BW.STD.CO.060UC444.MXX", "0614X0921.BW.STD.CO.060UW444.GXX", "0614X0921.BW.STD.CO.060UW444.MXX", "0614X0921.BW.STD.CO.080CW444.GXX", "0614X0921.BW.STD.CO.080CW444.MXX", "0614X0921.BW.STD.CW.060UC444.GXX", "0614X0921.BW.STD.CW.060UC444.MXX", "0614X0921.BW.STD.CW.060UW444.GXX", "0614X0921.BW.STD.CW.060UW444.MXX", "0614X0921.BW.STD.CW.080CW444.GXX", "0614X0921.BW.STD.CW.080CW444.MXX", "0614X0921.BW.STD.LW.060UC444.GBB", "0614X0921.BW.STD.LW.060UC444.GBG", "0614X0921.BW.STD.LW.060UC444.GBW", "0614X0921.BW.STD.LW.060UC444.GFB", "0614X0921.BW.STD.LW.060UC444.GFG", "0614X0921.BW.STD.LW.060UC444.GFW", "0614X0921.BW.STD.LW.060UC444.GGB", "0614X0921.BW.STD.LW.060UC444.GGG", "0614X0921.BW.STD.LW.060UC444.GGW", "0614X0921.BW.STD.LW.060UC444.GNB", "0614X0921.BW.STD.LW.060UC444.GNG", "0614X0921.BW.STD.LW.060UC444.GNW", "0614X0921.BW.STD.LW.060UC444.GRB", "0614X0921.BW.STD.LW.060UC444.GRG", "0614X0921.BW.STD.LW.060UC444.GRW", "0614X0921.BW.STD.LW.060UC444.GTB", "0614X0921.BW.STD.LW.060UC444.GTG", "0614X0921.BW.STD.LW.060UC444.GTW", "0614X0921.BW.STD.LW.060UC444.MBB", "0614X0921.BW.STD.LW.060UC444.MBG", "0614X0921.BW.STD.LW.060UC444.MBW", "0614X0921.BW.STD.LW.060UC444.MFB", "0614X0921.BW.STD.LW.060UC444.MFG", "0614X0921.BW.STD.LW.060UC444.MFW", "0614X0921.BW.STD.LW.060UC444.MGB", "0614X0921.BW.STD.LW.060UC444.MGG", "0614X0921.BW.STD.LW.060UC444.MGW", "0614X0921.BW.STD.LW.060UC444.MNB", "0614X0921.BW.STD.LW.060UC444.MNG", "0614X0921.BW.STD.LW.060UC444.MNW", "0614X0921.BW.STD.LW.060UC444.MRB", "0614X0921.BW.STD.LW.060UC444.MRG", "0614X0921.BW.STD.LW.060UC444.MRW", "0614X0921.BW.STD.LW.060UC444.MTB", "0614X0921.BW.STD.LW.060UC444.MTG", "0614X0921.BW.STD.LW.060UC444.MTW", "0614X0921.BW.STD.LW.060UW444.GBB", "0614X0921.BW.STD.LW.060UW444.GBG", "0614X0921.BW.STD.LW.060UW444.GBW", "0614X0921.BW.STD.LW.060UW444.GFB", "0614X0921.BW.STD.LW.060UW444.GFG", "0614X0921.BW.STD.LW.060UW444.GFW", "0614X0921.BW.STD.LW.060UW444.GGB", "0614X0921.BW.STD.LW.060UW444.GGG", "0614X0921.BW.STD.LW.060UW444.GGW", "0614X0921.BW.STD.LW.060UW444.GNB", "0614X0921.BW.STD.LW.060UW444.GNG", "0614X0921.BW.STD.LW.060UW444.GNW", "0614X0921.BW.STD.LW.060UW444.GRB", "0614X0921.BW.STD.LW.060UW444.GRG", "0614X0921.BW.STD.LW.060UW444.GRW", "0614X0921.BW.STD.LW.060UW444.GTB", "0614X0921.BW.STD.LW.060UW444.GTG", "0614X0921.BW.STD.LW.060UW444.GTW", "0614X0921.BW.STD.LW.060UW444.MBB", "0614X0921.BW.STD.LW.060UW444.MBG", "0614X0921.BW.STD.LW.060UW444.MBW", "0614X0921.BW.STD.LW.060UW444.MFB", "0614X0921.BW.STD.LW.060UW444.MFG", "0614X0921.BW.STD.LW.060UW444.MFW", "0614X0921.BW.STD.LW.060UW444.MGB", "0614X0921.BW.STD.LW.060UW444.MGG", "0614X0921.BW.STD.LW.060UW444.MGW", "0614X0921.BW.STD.LW.060UW444.MNB", "0614X0921.BW.STD.LW.060UW444.MNG", "0614X0921.BW.STD.LW.060UW444.MNW", "0614X0921.BW.STD.LW.060UW444.MRB", "0614X0921.BW.STD.LW.060UW444.MRG", "0614X0921.BW.STD.LW.060UW444.MRW", "0614X0921.BW.STD.LW.060UW444.MTB", "0614X0921.BW.STD.LW.060UW444.MTG", "0614X0921.BW.STD.LW.060UW444.MTW", "0614X0921.BW.STD.LW.080CW444.GBB", "0614X0921.BW.STD.LW.080CW444.GBG", "0614X0921.BW.STD.LW.080CW444.GBW", "0614X0921.BW.STD.LW.080CW444.GFB", "0614X0921.BW.STD.LW.080CW444.GFG", "0614X0921.BW.STD.LW.080CW444.GFW", "0614X0921.BW.STD.LW.080CW444.GGB", "0614X0921.BW.STD.LW.080CW444.GGG", "0614X0921.BW.STD.LW.080CW444.GGW", "0614X0921.BW.STD.LW.080CW444.GNB", "0614X0921.BW.STD.LW.080CW444.GNG", "0614X0921.BW.STD.LW.080CW444.GNW", "0614X0921.BW.STD.LW.080CW444.GRB", "0614X0921.BW.STD.LW.080CW444.GRG", "0614X0921.BW.STD.LW.080CW444.GRW", "0614X0921.BW.STD.LW.080CW444.GTB", "0614X0921.BW.STD.LW.080CW444.GTG", "0614X0921.BW.STD.LW.080CW444.GTW", "0614X0921.BW.STD.LW.080CW444.MBB", "0614X0921.BW.STD.LW.080CW444.MBG", "0614X0921.BW.STD.LW.080CW444.MBW", "0614X0921.BW.STD.LW.080CW444.MFB", "0614X0921.BW.STD.LW.080CW444.MFG", "0614X0921.BW.STD.LW.080CW444.MFW", "0614X0921.BW.STD.LW.080CW444.MGB", "0614X0921.BW.STD.LW.080CW444.MGG", "0614X0921.BW.STD.LW.080CW444.MGW", "0614X0921.BW.STD.LW.080CW444.MNB", "0614X0921.BW.STD.LW.080CW444.MNG", "0614X0921.BW.STD.LW.080CW444.MNW", "0614X0921.BW.STD.LW.080CW444.MRB", "0614X0921.BW.STD.LW.080CW444.MRG", "0614X0921.BW.STD.LW.080CW444.MRW", "0614X0921.BW.STD.LW.080CW444.MTB", "0614X0921.BW.STD.LW.080CW444.MTG", "0614X0921.BW.STD.LW.080CW444.MTW", "0614X0921.BW.STD.PB.060UC444.GXX", "0614X0921.BW.STD.PB.060UC444.MXX", "0614X0921.BW.STD.PB.060UW444.GXX", "0614X0921.BW.STD.PB.060UW444.MXX", "0614X0921.BW.STD.PB.080CW444.GXX", "0614X0921.BW.STD.PB.080CW444.MXX", "0614X0921.BW.STD.SS.060UC444.GXX", "0614X0921.BW.STD.SS.060UC444.MXX", "0614X0921.BW.STD.SS.060UW444.GXX", "0614X0921.BW.STD.SS.060UW444.MXX", "0614X0921.BW.STD.SS.080CW444.GXX", "0614X0921.BW.STD.SS.080CW444.MXX", "0614X0921.FC.PRE.CO.060UW444.GXX", "0614X0921.FC.PRE.CO.060UW444.MXX", "0614X0921.FC.PRE.CO.080CW444.GXX", "0614X0921.FC.PRE.CO.080CW444.MXX", "0614X0921.FC.PRE.CW.060UW444.GXX", "0614X0921.FC.PRE.CW.060UW444.MXX", "0614X0921.FC.PRE.CW.080CW444.GXX", "0614X0921.FC.PRE.CW.080CW444.MXX", "0614X0921.FC.PRE.LW.060UW444.GBB", "0614X0921.FC.PRE.LW.060UW444.GBG", "0614X0921.FC.PRE.LW.060UW444.GBW", "0614X0921.FC.PRE.LW.060UW444.GFB", "0614X0921.FC.PRE.LW.060UW444.GFG", "0614X0921.FC.PRE.LW.060UW444.GFW", "0614X0921.FC.PRE.LW.060UW444.GGB", "0614X0921.FC.PRE.LW.060UW444.GGG", "0614X0921.FC.PRE.LW.060UW444.GGW", "0614X0921.FC.PRE.LW.060UW444.GNB", "0614X0921.FC.PRE.LW.060UW444.GNG", "0614X0921.FC.PRE.LW.060UW444.GNW", "0614X0921.FC.PRE.LW.060UW444.GRB", "0614X0921.FC.PRE.LW.060UW444.GRG", "0614X0921.FC.PRE.LW.060UW444.GRW", "0614X0921.FC.PRE.LW.060UW444.GTB", "0614X0921.FC.PRE.LW.060UW444.GTG", "0614X0921.FC.PRE.LW.060UW444.GTW", "0614X0921.FC.PRE.LW.060UW444.MBB", "0614X0921.FC.PRE.LW.060UW444.MBG", "0614X0921.FC.PRE.LW.060UW444.MBW", "0614X0921.FC.PRE.LW.060UW444.MFB", "0614X0921.FC.PRE.LW.060UW444.MFG", "0614X0921.FC.PRE.LW.060UW444.MFW", "0614X0921.FC.PRE.LW.060UW444.MGB", "0614X0921.FC.PRE.LW.060UW444.MGG", "0614X0921.FC.PRE.LW.060UW444.MGW", "0614X0921.FC.PRE.LW.060UW444.MNB", "0614X0921.FC.PRE.LW.060UW444.MNG", "0614X0921.FC.PRE.LW.060UW444.MNW", "0614X0921.FC.PRE.LW.060UW444.MRB", "0614X0921.FC.PRE.LW.060UW444.MRG", "0614X0921.FC.PRE.LW.060UW444.MRW", "0614X0921.FC.PRE.LW.060UW444.MTB", "0614X0921.FC.PRE.LW.060UW444.MTG", "0614X0921.FC.PRE.LW.060UW444.MTW", "0614X0921.FC.PRE.LW.080CW444.GBB", "0614X0921.FC.PRE.LW.080CW444.GBG", "0614X0921.FC.PRE.LW.080CW444.GBW", "0614X0921.FC.PRE.LW.080CW444.GFB", "0614X0921.FC.PRE.LW.080CW444.GFG", "0614X0921.FC.PRE.LW.080CW444.GFW", "0614X0921.FC.PRE.LW.080CW444.GGB", "0614X0921.FC.PRE.LW.080CW444.GGG", "0614X0921.FC.PRE.LW.080CW444.GGW", "0614X0921.FC.PRE.LW.080CW444.GNB", "0614X0921.FC.PRE.LW.080CW444.GNG", "0614X0921.FC.PRE.LW.080CW444.GNW", "0614X0921.FC.PRE.LW.080CW444.GRB", "0614X0921.FC.PRE.LW.080CW444.GRG", "0614X0921.FC.PRE.LW.080CW444.GRW", "0614X0921.FC.PRE.LW.080CW444.GTB", "0614X0921.FC.PRE.LW.080CW444.GTG", "0614X0921.FC.PRE.LW.080CW444.GTW", "0614X0921.FC.PRE.LW.080CW444.MBB", "0614X0921.FC.PRE.LW.080CW444.MBG", "0614X0921.FC.PRE.LW.080CW444.MBW", "0614X0921.FC.PRE.LW.080CW444.MFB", "0614X0921.FC.PRE.LW.080CW444.MFG", "0614X0921.FC.PRE.LW.080CW444.MFW", "0614X0921.FC.PRE.LW.080CW444.MGB", "0614X0921.FC.PRE.LW.080CW444.MGG", "0614X0921.FC.PRE.LW.080CW444.MGW", "0614X0921.FC.PRE.LW.080CW444.MNB", "0614X0921.FC.PRE.LW.080CW444.MNG", "0614X0921.FC.PRE.LW.080CW444.MNW", "0614X0921.FC.PRE.LW.080CW444.MRB", "0614X0921.FC.PRE.LW.080CW444.MRG", "0614X0921.FC.PRE.LW.080CW444.MRW", "0614X0921.FC.PRE.LW.080CW444.MTB", "0614X0921.FC.PRE.LW.080CW444.MTG", "0614X0921.FC.PRE.LW.080CW444.MTW", "0614X0921.FC.PRE.PB.060UW444.GXX", "0614X0921.FC.PRE.PB.060UW444.MXX", "0614X0921.FC.PRE.PB.080CW444.GXX", "0614X0921.FC.PRE.PB.080CW444.MXX", "0614X0921.FC.PRE.SS.060UW444.GXX", "0614X0921.FC.PRE.SS.060UW444.MXX", "0614X0921.FC.PRE.SS.080CW444.GXX", "0614X0921.FC.PRE.SS.080CW444.MXX", "0614X0921.FC.STD.CO.060UW444.GXX", "0614X0921.FC.STD.CO.060UW444.MXX", "0614X0921.FC.STD.CO.080CW444.GXX", "0614X0921.FC.STD.CO.080CW444.MXX", "0614X0921.FC.STD.CW.060UW444.GXX", "0614X0921.FC.STD.CW.060UW444.MXX", "0614X0921.FC.STD.CW.080CW444.GXX", "0614X0921.FC.STD.CW.080CW444.MXX", "0614X0921.FC.STD.LW.060UW444.GBB", "0614X0921.FC.STD.LW.060UW444.GBG", "0614X0921.FC.STD.LW.060UW444.GBW", "0614X0921.FC.STD.LW.060UW444.GFB", "0614X0921.FC.STD.LW.060UW444.GFG", "0614X0921.FC.STD.LW.060UW444.GFW", "0614X0921.FC.STD.LW.060UW444.GGB", "0614X0921.FC.STD.LW.060UW444.GGG", "0614X0921.FC.STD.LW.060UW444.GGW", "0614X0921.FC.STD.LW.060UW444.GNB", "0614X0921.FC.STD.LW.060UW444.GNG", "0614X0921.FC.STD.LW.060UW444.GNW", "0614X0921.FC.STD.LW.060UW444.GRB", "0614X0921.FC.STD.LW.060UW444.GRG", "0614X0921.FC.STD.LW.060UW444.GRW", "0614X0921.FC.STD.LW.060UW444.GTB", "0614X0921.FC.STD.LW.060UW444.GTG", "0614X0921.FC.STD.LW.060UW444.GTW", "0614X0921.FC.STD.LW.060UW444.MBB", "0614X0921.FC.STD.LW.060UW444.MBG", "0614X0921.FC.STD.LW.060UW444.MBW", "0614X0921.FC.STD.LW.060UW444.MFB", "0614X0921.FC.STD.LW.060UW444.MFG", "0614X0921.FC.STD.LW.060UW444.MFW", "0614X0921.FC.STD.LW.060UW444.MGB", "0614X0921.FC.STD.LW.060UW444.MGG", "0614X0921.FC.STD.LW.060UW444.MGW", "0614X0921.FC.STD.LW.060UW444.MNB", "0614X0921.FC.STD.LW.060UW444.MNG", "0614X0921.FC.STD.LW.060UW444.MNW", "0614X0921.FC.STD.LW.060UW444.MRB", "0614X0921.FC.STD.LW.060UW444.MRG", "0614X0921.FC.STD.LW.060UW444.MRW", "0614X0921.FC.STD.LW.060UW444.MTB", "0614X0921.FC.STD.LW.060UW444.MTG", "0614X0921.FC.STD.LW.060UW444.MTW", "0614X0921.FC.STD.LW.080CW444.GBB", "0614X0921.FC.STD.LW.080CW444.GBG", "0614X0921.FC.STD.LW.080CW444.GBW", "0614X0921.FC.STD.LW.080CW444.GFB", "0614X0921.FC.STD.LW.080CW444.GFG", "0614X0921.FC.STD.LW.080CW444.GFW", "0614X0921.FC.STD.LW.080CW444.GGB", "0614X0921.FC.STD.LW.080CW444.GGG", "0614X0921.FC.STD.LW.080CW444.GGW", "0614X0921.FC.STD.LW.080CW444.GNB", "0614X0921.FC.STD.LW.080CW444.GNG", "0614X0921.FC.STD.LW.080CW444.GNW", "0614X0921.FC.STD.LW.080CW444.GRB", "0614X0921.FC.STD.LW.080CW444.GRG", "0614X0921.FC.STD.LW.080CW444.GRW", "0614X0921.FC.STD.LW.080CW444.GTB", "0614X0921.FC.STD.LW.080CW444.GTG", "0614X0921.FC.STD.LW.080CW444.GTW", "0614X0921.FC.STD.LW.080CW444.MBB", "0614X0921.FC.STD.LW.080CW444.MBG", "0614X0921.FC.STD.LW.080CW444.MBW", "0614X0921.FC.STD.LW.080CW444.MFB", "0614X0921.FC.STD.LW.080CW444.MFG", "0614X0921.FC.STD.LW.080CW444.MFW", "0614X0921.FC.STD.LW.080CW444.MGB", "0614X0921.FC.STD.LW.080CW444.MGG", "0614X0921.FC.STD.LW.080CW444.MGW", "0614X0921.FC.STD.LW.080CW444.MNB", "0614X0921.FC.STD.LW.080CW444.MNG", "0614X0921.FC.STD.LW.080CW444.MNW", "0614X0921.FC.STD.LW.080CW444.MRB", "0614X0921.FC.STD.LW.080CW444.MRG", "0614X0921.FC.STD.LW.080CW444.MRW", "0614X0921.FC.STD.LW.080CW444.MTB", "0614X0921.FC.STD.LW.080CW444.MTG", "0614X0921.FC.STD.LW.080CW444.MTW", "0614X0921.FC.STD.PB.060UW444.GXX", "0614X0921.FC.STD.PB.060UW444.MXX", "0614X0921.FC.STD.PB.080CW444.GXX", "0614X0921.FC.STD.PB.080CW444.MXX", "0663X1025.BW.PRE.PB.070CW460.GIX", "0663X1025.BW.PRE.PB.070CW460.MIX", "0663X1025.BW.PRE.SS.070CW460.GIX", "0663X1025.BW.PRE.SS.070CW460.MIX", "0663X1025.FC.PRE.PB.070CW460.GIX", "0663X1025.FC.PRE.PB.070CW460.MIX", "0663X1025.FC.PRE.SS.070CW460.GIX", "0663X1025.FC.PRE.SS.070CW460.MIX", "0700X1000.BW.PRE.CO.060UC444.GXX", "0700X1000.BW.PRE.CO.060UC444.MXX", "0700X1000.BW.PRE.CO.060UW444.GXX", "0700X1000.BW.PRE.CO.060UW444.MXX", "0700X1000.BW.PRE.CO.080CW444.GXX", "0700X1000.BW.PRE.CO.080CW444.MXX", "0700X1000.BW.PRE.CW.060UC444.GXX", "0700X1000.BW.PRE.CW.060UC444.MXX", "0700X1000.BW.PRE.CW.060UW444.GXX", "0700X1000.BW.PRE.CW.060UW444.MXX", "0700X1000.BW.PRE.CW.080CW444.GXX", "0700X1000.BW.PRE.CW.080CW444.MXX", "0700X1000.BW.PRE.PB.060UC444.GXX", "0700X1000.BW.PRE.PB.060UC444.MXX", "0700X1000.BW.PRE.PB.060UW444.GXX", "0700X1000.BW.PRE.PB.060UW444.MXX", "0700X1000.BW.PRE.PB.080CW444.GXX", "0700X1000.BW.PRE.PB.080CW444.MXX", "0700X1000.BW.PRE.SS.060UC444.GXX", "0700X1000.BW.PRE.SS.060UC444.MXX", "0700X1000.BW.PRE.SS.060UW444.GXX", "0700X1000.BW.PRE.SS.060UW444.MXX", "0700X1000.BW.PRE.SS.080CW444.GXX", "0700X1000.BW.PRE.SS.080CW444.MXX", "0700X1000.BW.STD.CO.060UC444.GXX", "0700X1000.BW.STD.CO.060UC444.MXX", "0700X1000.BW.STD.CO.060UW444.GXX", "0700X1000.BW.STD.CO.060UW444.MXX", "0700X1000.BW.STD.CO.080CW444.GXX", "0700X1000.BW.STD.CO.080CW444.MXX", "0700X1000.BW.STD.CW.060UC444.GXX", "0700X1000.BW.STD.CW.060UC444.MXX", "0700X1000.BW.STD.CW.060UW444.GXX", "0700X1000.BW.STD.CW.060UW444.MXX", "0700X1000.BW.STD.CW.080CW444.GXX", "0700X1000.BW.STD.CW.080CW444.MXX", "0700X1000.BW.STD.PB.060UC444.GXX", "0700X1000.BW.STD.PB.060UC444.MXX", "0700X1000.BW.STD.PB.060UW444.GXX", "0700X1000.BW.STD.PB.060UW444.MXX", "0700X1000.BW.STD.PB.080CW444.GXX", "0700X1000.BW.STD.PB.080CW444.MXX", "0700X1000.BW.STD.SS.060UC444.GXX", "0700X1000.BW.STD.SS.060UC444.MXX", "0700X1000.BW.STD.SS.060UW444.GXX", "0700X1000.BW.STD.SS.060UW444.MXX", "0700X1000.BW.STD.SS.080CW444.GXX", "0700X1000.BW.STD.SS.080CW444.MXX", "0700X1000.FC.PRE.CO.060UW444.GXX", "0700X1000.FC.PRE.CO.060UW444.MXX", "0700X1000.FC.PRE.CO.080CW444.GXX", "0700X1000.FC.PRE.CO.080CW444.MXX", "0700X1000.FC.PRE.CW.060UW444.GXX", "0700X1000.FC.PRE.CW.060UW444.MXX", "0700X1000.FC.PRE.CW.080CW444.GXX", "0700X1000.FC.PRE.CW.080CW444.MXX", "0700X1000.FC.PRE.PB.060UW444.GXX", "0700X1000.FC.PRE.PB.060UW444.MXX", "0700X1000.FC.PRE.PB.080CW444.GXX", "0700X1000.FC.PRE.PB.080CW444.MXX", "0700X1000.FC.PRE.SS.060UW444.GXX", "0700X1000.FC.PRE.SS.060UW444.MXX", "0700X1000.FC.PRE.SS.080CW444.GXX", "0700X1000.FC.PRE.SS.080CW444.MXX", "0700X1000.FC.STD.CO.060UW444.GXX", "0700X1000.FC.STD.CO.060UW444.MXX", "0700X1000.FC.STD.CO.080CW444.GXX", "0700X1000.FC.STD.CO.080CW444.MXX", "0700X1000.FC.STD.CW.060UW444.GXX", "0700X1000.FC.STD.CW.060UW444.MXX", "0700X1000.FC.STD.CW.080CW444.GXX", "0700X1000.FC.STD.CW.080CW444.MXX", "0700X1000.FC.STD.PB.060UW444.GXX", "0700X1000.FC.STD.PB.060UW444.MXX", "0700X1000.FC.STD.PB.080CW444.GXX", "0700X1000.FC.STD.PB.080CW444.MXX", "0744X0968.BW.PRE.CO.060UC444.GXX", "0744X0968.BW.PRE.CO.060UC444.MXX", "0744X0968.BW.PRE.CO.060UW444.GXX", "0744X0968.BW.PRE.CO.060UW444.MXX", "0744X0968.BW.PRE.CO.080CW444.GXX", "0744X0968.BW.PRE.CO.080CW444.MXX", "0744X0968.BW.PRE.CW.060UC444.GXX", "0744X0968.BW.PRE.CW.060UC444.MXX", "0744X0968.BW.PRE.CW.060UW444.GXX", "0744X0968.BW.PRE.CW.060UW444.MXX", "0744X0968.BW.PRE.CW.080CW444.GXX", "0744X0968.BW.PRE.CW.080CW444.MXX", "0744X0968.BW.PRE.PB.060UC444.GXX", "0744X0968.BW.PRE.PB.060UC444.MXX", "0744X0968.BW.PRE.PB.060UW444.GXX", "0744X0968.BW.PRE.PB.060UW444.MXX", "0744X0968.BW.PRE.PB.080CW444.GXX", "0744X0968.BW.PRE.PB.080CW444.MXX", "0744X0968.BW.PRE.SS.060UC444.GXX", "0744X0968.BW.PRE.SS.060UC444.MXX", "0744X0968.BW.PRE.SS.060UW444.GXX", "0744X0968.BW.PRE.SS.060UW444.MXX", "0744X0968.BW.PRE.SS.080CW444.GXX", "0744X0968.BW.PRE.SS.080CW444.MXX", "0744X0968.BW.STD.CO.060UC444.GXX", "0744X0968.BW.STD.CO.060UC444.MXX", "0744X0968.BW.STD.CO.060UW444.GXX", "0744X0968.BW.STD.CO.060UW444.MXX", "0744X0968.BW.STD.CO.080CW444.GXX", "0744X0968.BW.STD.CO.080CW444.MXX", "0744X0968.BW.STD.CW.060UC444.GXX", "0744X0968.BW.STD.CW.060UC444.MXX", "0744X0968.BW.STD.CW.060UW444.GXX", "0744X0968.BW.STD.CW.060UW444.MXX", "0744X0968.BW.STD.CW.080CW444.GXX", "0744X0968.BW.STD.CW.080CW444.MXX", "0744X0968.BW.STD.PB.060UC444.GXX", "0744X0968.BW.STD.PB.060UC444.MXX", "0744X0968.BW.STD.PB.060UW444.GXX", "0744X0968.BW.STD.PB.060UW444.MXX", "0744X0968.BW.STD.PB.080CW444.GXX", "0744X0968.BW.STD.PB.080CW444.MXX", "0744X0968.BW.STD.SS.060UC444.GXX", "0744X0968.BW.STD.SS.060UC444.MXX", "0744X0968.BW.STD.SS.060UW444.GXX", "0744X0968.BW.STD.SS.060UW444.MXX", "0744X0968.BW.STD.SS.080CW444.GXX", "0744X0968.BW.STD.SS.080CW444.MXX", "0744X0968.FC.PRE.CO.060UW444.GXX", "0744X0968.FC.PRE.CO.060UW444.MXX", "0744X0968.FC.PRE.CO.080CW444.GXX", "0744X0968.FC.PRE.CO.080CW444.MXX", "0744X0968.FC.PRE.CW.060UW444.GXX", "0744X0968.FC.PRE.CW.060UW444.MXX", "0744X0968.FC.PRE.CW.080CW444.GXX", "0744X0968.FC.PRE.CW.080CW444.MXX", "0744X0968.FC.PRE.PB.060UW444.GXX", "0744X0968.FC.PRE.PB.060UW444.MXX", "0744X0968.FC.PRE.PB.080CW444.GXX", "0744X0968.FC.PRE.PB.080CW444.MXX", "0744X0968.FC.PRE.SS.060UW444.GXX", "0744X0968.FC.PRE.SS.060UW444.MXX", "0744X0968.FC.PRE.SS.080CW444.GXX", "0744X0968.FC.PRE.SS.080CW444.MXX", "0744X0968.FC.STD.CO.060UW444.GXX", "0744X0968.FC.STD.CO.060UW444.MXX", "0744X0968.FC.STD.CO.080CW444.GXX", "0744X0968.FC.STD.CO.080CW444.MXX", "0744X0968.FC.STD.CW.060UW444.GXX", "0744X0968.FC.STD.CW.060UW444.MXX", "0744X0968.FC.STD.CW.080CW444.GXX", "0744X0968.FC.STD.CW.080CW444.MXX", "0744X0968.FC.STD.PB.060UW444.GXX", "0744X0968.FC.STD.PB.060UW444.MXX", "0744X0968.FC.STD.PB.080CW444.GXX", "0744X0968.FC.STD.PB.080CW444.MXX", "0750X0750.BW.PRE.CO.060UC444.GXX", "0750X0750.BW.PRE.CO.060UC444.MXX", "0750X0750.BW.PRE.CO.060UW444.GXX", "0750X0750.BW.PRE.CO.060UW444.MXX", "0750X0750.BW.PRE.CO.080CW444.GXX", "0750X0750.BW.PRE.CO.080CW444.MXX", "0750X0750.BW.PRE.CW.060UC444.GXX", "0750X0750.BW.PRE.CW.060UC444.MXX", "0750X0750.BW.PRE.CW.060UW444.GXX", "0750X0750.BW.PRE.CW.060UW444.MXX", "0750X0750.BW.PRE.CW.080CW444.GXX", "0750X0750.BW.PRE.CW.080CW444.MXX", "0750X0750.BW.PRE.PB.060UC444.GXX", "0750X0750.BW.PRE.PB.060UC444.MXX", "0750X0750.BW.PRE.PB.060UW444.GXX", "0750X0750.BW.PRE.PB.060UW444.MXX", "0750X0750.BW.PRE.PB.080CW444.GXX", "0750X0750.BW.PRE.PB.080CW444.MXX", "0750X0750.BW.PRE.SS.060UC444.GXX", "0750X0750.BW.PRE.SS.060UC444.MXX", "0750X0750.BW.PRE.SS.060UW444.GXX", "0750X0750.BW.PRE.SS.060UW444.MXX", "0750X0750.BW.PRE.SS.080CW444.GXX", "0750X0750.BW.PRE.SS.080CW444.MXX", "0750X0750.BW.STD.CO.060UC444.GXX", "0750X0750.BW.STD.CO.060UC444.MXX", "0750X0750.BW.STD.CO.060UW444.GXX", "0750X0750.BW.STD.CO.060UW444.MXX", "0750X0750.BW.STD.CO.080CW444.GXX", "0750X0750.BW.STD.CO.080CW444.MXX", "0750X0750.BW.STD.CW.060UC444.GXX", "0750X0750.BW.STD.CW.060UC444.MXX", "0750X0750.BW.STD.CW.060UW444.GXX", "0750X0750.BW.STD.CW.060UW444.MXX", "0750X0750.BW.STD.CW.080CW444.GXX", "0750X0750.BW.STD.CW.080CW444.MXX", "0750X0750.BW.STD.PB.060UC444.GXX", "0750X0750.BW.STD.PB.060UC444.MXX", "0750X0750.BW.STD.PB.060UW444.GXX", "0750X0750.BW.STD.PB.060UW444.MXX", "0750X0750.BW.STD.PB.080CW444.GXX", "0750X0750.BW.STD.PB.080CW444.MXX", "0750X0750.BW.STD.SS.060UC444.GXX", "0750X0750.BW.STD.SS.060UC444.MXX", "0750X0750.BW.STD.SS.060UW444.GXX", "0750X0750.BW.STD.SS.060UW444.MXX", "0750X0750.BW.STD.SS.080CW444.GXX", "0750X0750.BW.STD.SS.080CW444.MXX", "0750X0750.FC.PRE.CO.060UW444.GXX", "0750X0750.FC.PRE.CO.060UW444.MXX", "0750X0750.FC.PRE.CO.080CW444.GXX", "0750X0750.FC.PRE.CO.080CW444.MXX", "0750X0750.FC.PRE.CW.060UW444.GXX", "0750X0750.FC.PRE.CW.060UW444.MXX", "0750X0750.FC.PRE.CW.080CW444.GXX", "0750X0750.FC.PRE.CW.080CW444.MXX", "0750X0750.FC.PRE.PB.060UW444.GXX", "0750X0750.FC.PRE.PB.060UW444.MXX", "0750X0750.FC.PRE.PB.080CW444.GXX", "0750X0750.FC.PRE.PB.080CW444.MXX", "0750X0750.FC.PRE.SS.060UW444.GXX", "0750X0750.FC.PRE.SS.060UW444.MXX", "0750X0750.FC.PRE.SS.080CW444.GXX", "0750X0750.FC.PRE.SS.080CW444.MXX", "0750X0750.FC.STD.CO.060UW444.GXX", "0750X0750.FC.STD.CO.060UW444.MXX", "0750X0750.FC.STD.CO.080CW444.GXX", "0750X0750.FC.STD.CO.080CW444.MXX", "0750X0750.FC.STD.CW.060UW444.GXX", "0750X0750.FC.STD.CW.060UW444.MXX", "0750X0750.FC.STD.CW.080CW444.GXX", "0750X0750.FC.STD.CW.080CW444.MXX", "0750X0750.FC.STD.PB.060UW444.GXX", "0750X0750.FC.STD.PB.060UW444.MXX", "0750X0750.FC.STD.PB.080CW444.GXX", "0750X0750.FC.STD.PB.080CW444.MXX", "0827X1169.BW.PRE.CO.060UC444.GXX", "0827X1169.BW.PRE.CO.060UC444.MXX", "0827X1169.BW.PRE.CO.060UW444.GXX", "0827X1169.BW.PRE.CO.060UW444.MXX", "0827X1169.BW.PRE.CO.080CW444.GXX", "0827X1169.BW.PRE.CO.080CW444.MXX", "0827X1169.BW.PRE.CW.060UC444.GXX", "0827X1169.BW.PRE.CW.060UC444.MXX", "0827X1169.BW.PRE.CW.060UW444.GXX", "0827X1169.BW.PRE.CW.060UW444.MXX", "0827X1169.BW.PRE.CW.080CW444.GXX", "0827X1169.BW.PRE.CW.080CW444.MXX", "0827X1169.BW.PRE.LW.060UC444.GBB", "0827X1169.BW.PRE.LW.060UC444.GBG", "0827X1169.BW.PRE.LW.060UC444.GBW", "0827X1169.BW.PRE.LW.060UC444.GFB", "0827X1169.BW.PRE.LW.060UC444.GFG", "0827X1169.BW.PRE.LW.060UC444.GFW", "0827X1169.BW.PRE.LW.060UC444.GGB", "0827X1169.BW.PRE.LW.060UC444.GGG", "0827X1169.BW.PRE.LW.060UC444.GGW", "0827X1169.BW.PRE.LW.060UC444.GNB", "0827X1169.BW.PRE.LW.060UC444.GNG", "0827X1169.BW.PRE.LW.060UC444.GNW", "0827X1169.BW.PRE.LW.060UC444.GRB", "0827X1169.BW.PRE.LW.060UC444.GRG", "0827X1169.BW.PRE.LW.060UC444.GRW", "0827X1169.BW.PRE.LW.060UC444.GTB", "0827X1169.BW.PRE.LW.060UC444.GTG", "0827X1169.BW.PRE.LW.060UC444.GTW", "0827X1169.BW.PRE.LW.060UC444.MBB", "0827X1169.BW.PRE.LW.060UC444.MBG", "0827X1169.BW.PRE.LW.060UC444.MBW", "0827X1169.BW.PRE.LW.060UC444.MFB", "0827X1169.BW.PRE.LW.060UC444.MFG", "0827X1169.BW.PRE.LW.060UC444.MFW", "0827X1169.BW.PRE.LW.060UC444.MGB", "0827X1169.BW.PRE.LW.060UC444.MGG", "0827X1169.BW.PRE.LW.060UC444.MGW", "0827X1169.BW.PRE.LW.060UC444.MNB", "0827X1169.BW.PRE.LW.060UC444.MNG", "0827X1169.BW.PRE.LW.060UC444.MNW", "0827X1169.BW.PRE.LW.060UC444.MRB", "0827X1169.BW.PRE.LW.060UC444.MRG", "0827X1169.BW.PRE.LW.060UC444.MRW", "0827X1169.BW.PRE.LW.060UC444.MTB", "0827X1169.BW.PRE.LW.060UC444.MTG", "0827X1169.BW.PRE.LW.060UC444.MTW", "0827X1169.BW.PRE.LW.060UW444.GBB", "0827X1169.BW.PRE.LW.060UW444.GBG", "0827X1169.BW.PRE.LW.060UW444.GBW", "0827X1169.BW.PRE.LW.060UW444.GFB", "0827X1169.BW.PRE.LW.060UW444.GFG", "0827X1169.BW.PRE.LW.060UW444.GFW", "0827X1169.BW.PRE.LW.060UW444.GGB", "0827X1169.BW.PRE.LW.060UW444.GGG", "0827X1169.BW.PRE.LW.060UW444.GGW", "0827X1169.BW.PRE.LW.060UW444.GNB", "0827X1169.BW.PRE.LW.060UW444.GNG", "0827X1169.BW.PRE.LW.060UW444.GNW", "0827X1169.BW.PRE.LW.060UW444.GRB", "0827X1169.BW.PRE.LW.060UW444.GRG", "0827X1169.BW.PRE.LW.060UW444.GRW", "0827X1169.BW.PRE.LW.060UW444.GTB", "0827X1169.BW.PRE.LW.060UW444.GTG", "0827X1169.BW.PRE.LW.060UW444.GTW", "0827X1169.BW.PRE.LW.060UW444.MBB", "0827X1169.BW.PRE.LW.060UW444.MBG", "0827X1169.BW.PRE.LW.060UW444.MBW", "0827X1169.BW.PRE.LW.060UW444.MFB", "0827X1169.BW.PRE.LW.060UW444.MFG", "0827X1169.BW.PRE.LW.060UW444.MFW", "0827X1169.BW.PRE.LW.060UW444.MGB", "0827X1169.BW.PRE.LW.060UW444.MGG", "0827X1169.BW.PRE.LW.060UW444.MGW", "0827X1169.BW.PRE.LW.060UW444.MNB", "0827X1169.BW.PRE.LW.060UW444.MNG", "0827X1169.BW.PRE.LW.060UW444.MNW", "0827X1169.BW.PRE.LW.060UW444.MRB", "0827X1169.BW.PRE.LW.060UW444.MRG", "0827X1169.BW.PRE.LW.060UW444.MRW", "0827X1169.BW.PRE.LW.060UW444.MTB", "0827X1169.BW.PRE.LW.060UW444.MTG", "0827X1169.BW.PRE.LW.060UW444.MTW", "0827X1169.BW.PRE.LW.080CW444.GBB", "0827X1169.BW.PRE.LW.080CW444.GBG", "0827X1169.BW.PRE.LW.080CW444.GBW", "0827X1169.BW.PRE.LW.080CW444.GFB", "0827X1169.BW.PRE.LW.080CW444.GFG", "0827X1169.BW.PRE.LW.080CW444.GFW", "0827X1169.BW.PRE.LW.080CW444.GGB", "0827X1169.BW.PRE.LW.080CW444.GGG", "0827X1169.BW.PRE.LW.080CW444.GGW", "0827X1169.BW.PRE.LW.080CW444.GNB", "0827X1169.BW.PRE.LW.080CW444.GNG", "0827X1169.BW.PRE.LW.080CW444.GNW", "0827X1169.BW.PRE.LW.080CW444.GRB", "0827X1169.BW.PRE.LW.080CW444.GRG", "0827X1169.BW.PRE.LW.080CW444.GRW", "0827X1169.BW.PRE.LW.080CW444.GTB", "0827X1169.BW.PRE.LW.080CW444.GTG", "0827X1169.BW.PRE.LW.080CW444.GTW", "0827X1169.BW.PRE.LW.080CW444.MBB", "0827X1169.BW.PRE.LW.080CW444.MBG", "0827X1169.BW.PRE.LW.080CW444.MBW", "0827X1169.BW.PRE.LW.080CW444.MFB", "0827X1169.BW.PRE.LW.080CW444.MFG", "0827X1169.BW.PRE.LW.080CW444.MFW", "0827X1169.BW.PRE.LW.080CW444.MGB", "0827X1169.BW.PRE.LW.080CW444.MGG", "0827X1169.BW.PRE.LW.080CW444.MGW", "0827X1169.BW.PRE.LW.080CW444.MNB", "0827X1169.BW.PRE.LW.080CW444.MNG", "0827X1169.BW.PRE.LW.080CW444.MNW", "0827X1169.BW.PRE.LW.080CW444.MRB", "0827X1169.BW.PRE.LW.080CW444.MRG", "0827X1169.BW.PRE.LW.080CW444.MRW", "0827X1169.BW.PRE.LW.080CW444.MTB", "0827X1169.BW.PRE.LW.080CW444.MTG", "0827X1169.BW.PRE.LW.080CW444.MTW", "0827X1169.BW.PRE.PB.060UC444.GXX", "0827X1169.BW.PRE.PB.060UC444.MXX", "0827X1169.BW.PRE.PB.060UW444.GXX", "0827X1169.BW.PRE.PB.060UW444.MXX", "0827X1169.BW.PRE.PB.070CW460.GIX", "0827X1169.BW.PRE.PB.070CW460.MIX", "0827X1169.BW.PRE.PB.080CW444.GXX", "0827X1169.BW.PRE.PB.080CW444.MXX", "0827X1169.BW.PRE.SS.060UC444.GXX", "0827X1169.BW.PRE.SS.060UC444.MXX", "0827X1169.BW.PRE.SS.060UW444.GXX", "0827X1169.BW.PRE.SS.060UW444.MXX", "0827X1169.BW.PRE.SS.070CW460.GIX", "0827X1169.BW.PRE.SS.070CW460.MIX", "0827X1169.BW.PRE.SS.080CW444.GXX", "0827X1169.BW.PRE.SS.080CW444.MXX", "0827X1169.BW.STD.CO.060UC444.GXX", "0827X1169.BW.STD.CO.060UC444.MXX", "0827X1169.BW.STD.CO.060UW444.GXX", "0827X1169.BW.STD.CO.060UW444.MXX", "0827X1169.BW.STD.CO.080CW444.GXX", "0827X1169.BW.STD.CO.080CW444.MXX", "0827X1169.BW.STD.CW.060UC444.GXX", "0827X1169.BW.STD.CW.060UC444.MXX", "0827X1169.BW.STD.CW.060UW444.GXX", "0827X1169.BW.STD.CW.060UW444.MXX", "0827X1169.BW.STD.CW.080CW444.GXX", "0827X1169.BW.STD.CW.080CW444.MXX", "0827X1169.BW.STD.LW.060UC444.GBB", "0827X1169.BW.STD.LW.060UC444.GBG", "0827X1169.BW.STD.LW.060UC444.GBW", "0827X1169.BW.STD.LW.060UC444.GFB", "0827X1169.BW.STD.LW.060UC444.GFG", "0827X1169.BW.STD.LW.060UC444.GFW", "0827X1169.BW.STD.LW.060UC444.GGB", "0827X1169.BW.STD.LW.060UC444.GGG", "0827X1169.BW.STD.LW.060UC444.GGW", "0827X1169.BW.STD.LW.060UC444.GNB", "0827X1169.BW.STD.LW.060UC444.GNG", "0827X1169.BW.STD.LW.060UC444.GNW", "0827X1169.BW.STD.LW.060UC444.GRB", "0827X1169.BW.STD.LW.060UC444.GRG", "0827X1169.BW.STD.LW.060UC444.GRW", "0827X1169.BW.STD.LW.060UC444.GTB", "0827X1169.BW.STD.LW.060UC444.GTG", "0827X1169.BW.STD.LW.060UC444.GTW", "0827X1169.BW.STD.LW.060UC444.MBB", "0827X1169.BW.STD.LW.060UC444.MBG", "0827X1169.BW.STD.LW.060UC444.MBW", "0827X1169.BW.STD.LW.060UC444.MFB", "0827X1169.BW.STD.LW.060UC444.MFG", "0827X1169.BW.STD.LW.060UC444.MFW", "0827X1169.BW.STD.LW.060UC444.MGB", "0827X1169.BW.STD.LW.060UC444.MGG", "0827X1169.BW.STD.LW.060UC444.MGW", "0827X1169.BW.STD.LW.060UC444.MNB", "0827X1169.BW.STD.LW.060UC444.MNG", "0827X1169.BW.STD.LW.060UC444.MNW", "0827X1169.BW.STD.LW.060UC444.MRB", "0827X1169.BW.STD.LW.060UC444.MRG", "0827X1169.BW.STD.LW.060UC444.MRW", "0827X1169.BW.STD.LW.060UC444.MTB", "0827X1169.BW.STD.LW.060UC444.MTG", "0827X1169.BW.STD.LW.060UC444.MTW", "0827X1169.BW.STD.LW.060UW444.GBB", "0827X1169.BW.STD.LW.060UW444.GBG", "0827X1169.BW.STD.LW.060UW444.GBW", "0827X1169.BW.STD.LW.060UW444.GFB", "0827X1169.BW.STD.LW.060UW444.GFG", "0827X1169.BW.STD.LW.060UW444.GFW", "0827X1169.BW.STD.LW.060UW444.GGB", "0827X1169.BW.STD.LW.060UW444.GGG", "0827X1169.BW.STD.LW.060UW444.GGW", "0827X1169.BW.STD.LW.060UW444.GNB", "0827X1169.BW.STD.LW.060UW444.GNG", "0827X1169.BW.STD.LW.060UW444.GNW", "0827X1169.BW.STD.LW.060UW444.GRB", "0827X1169.BW.STD.LW.060UW444.GRG", "0827X1169.BW.STD.LW.060UW444.GRW", "0827X1169.BW.STD.LW.060UW444.GTB", "0827X1169.BW.STD.LW.060UW444.GTG", "0827X1169.BW.STD.LW.060UW444.GTW", "0827X1169.BW.STD.LW.060UW444.MBB", "0827X1169.BW.STD.LW.060UW444.MBG", "0827X1169.BW.STD.LW.060UW444.MBW", "0827X1169.BW.STD.LW.060UW444.MFB", "0827X1169.BW.STD.LW.060UW444.MFG", "0827X1169.BW.STD.LW.060UW444.MFW", "0827X1169.BW.STD.LW.060UW444.MGB", "0827X1169.BW.STD.LW.060UW444.MGG", "0827X1169.BW.STD.LW.060UW444.MGW", "0827X1169.BW.STD.LW.060UW444.MNB", "0827X1169.BW.STD.LW.060UW444.MNG", "0827X1169.BW.STD.LW.060UW444.MNW", "0827X1169.BW.STD.LW.060UW444.MRB", "0827X1169.BW.STD.LW.060UW444.MRG", "0827X1169.BW.STD.LW.060UW444.MRW", "0827X1169.BW.STD.LW.060UW444.MTB", "0827X1169.BW.STD.LW.060UW444.MTG", "0827X1169.BW.STD.LW.060UW444.MTW", "0827X1169.BW.STD.LW.080CW444.GBB", "0827X1169.BW.STD.LW.080CW444.GBG", "0827X1169.BW.STD.LW.080CW444.GBW", "0827X1169.BW.STD.LW.080CW444.GFB", "0827X1169.BW.STD.LW.080CW444.GFG", "0827X1169.BW.STD.LW.080CW444.GFW", "0827X1169.BW.STD.LW.080CW444.GGB", "0827X1169.BW.STD.LW.080CW444.GGG", "0827X1169.BW.STD.LW.080CW444.GGW", "0827X1169.BW.STD.LW.080CW444.GNB", "0827X1169.BW.STD.LW.080CW444.GNG", "0827X1169.BW.STD.LW.080CW444.GNW", "0827X1169.BW.STD.LW.080CW444.GRB", "0827X1169.BW.STD.LW.080CW444.GRG", "0827X1169.BW.STD.LW.080CW444.GRW", "0827X1169.BW.STD.LW.080CW444.GTB", "0827X1169.BW.STD.LW.080CW444.GTG", "0827X1169.BW.STD.LW.080CW444.GTW", "0827X1169.BW.STD.LW.080CW444.MBB", "0827X1169.BW.STD.LW.080CW444.MBG", "0827X1169.BW.STD.LW.080CW444.MBW", "0827X1169.BW.STD.LW.080CW444.MFB", "0827X1169.BW.STD.LW.080CW444.MFG", "0827X1169.BW.STD.LW.080CW444.MFW", "0827X1169.BW.STD.LW.080CW444.MGB", "0827X1169.BW.STD.LW.080CW444.MGG", "0827X1169.BW.STD.LW.080CW444.MGW", "0827X1169.BW.STD.LW.080CW444.MNB", "0827X1169.BW.STD.LW.080CW444.MNG", "0827X1169.BW.STD.LW.080CW444.MNW", "0827X1169.BW.STD.LW.080CW444.MRB", "0827X1169.BW.STD.LW.080CW444.MRG", "0827X1169.BW.STD.LW.080CW444.MRW", "0827X1169.BW.STD.LW.080CW444.MTB", "0827X1169.BW.STD.LW.080CW444.MTG", "0827X1169.BW.STD.LW.080CW444.MTW", "0827X1169.BW.STD.PB.060UC444.GXX", "0827X1169.BW.STD.PB.060UC444.MXX", "0827X1169.BW.STD.PB.060UW444.GXX", "0827X1169.BW.STD.PB.060UW444.MXX", "0827X1169.BW.STD.PB.080CW444.GXX", "0827X1169.BW.STD.PB.080CW444.MXX", "0827X1169.BW.STD.SS.060UC444.GXX", "0827X1169.BW.STD.SS.060UC444.MXX", "0827X1169.BW.STD.SS.060UW444.GXX", "0827X1169.BW.STD.SS.060UW444.MXX", "0827X1169.BW.STD.SS.080CW444.GXX", "0827X1169.BW.STD.SS.080CW444.MXX", "0827X1169.FC.PRE.CO.060UW444.GXX", "0827X1169.FC.PRE.CO.060UW444.MXX", "0827X1169.FC.PRE.CO.080CW444.GXX", "0827X1169.FC.PRE.CO.080CW444.MXX", "0827X1169.FC.PRE.CW.060UW444.GXX", "0827X1169.FC.PRE.CW.060UW444.MXX", "0827X1169.FC.PRE.CW.080CW444.GXX", "0827X1169.FC.PRE.CW.080CW444.MXX", "0827X1169.FC.PRE.LW.060UW444.GBB", "0827X1169.FC.PRE.LW.060UW444.GBG", "0827X1169.FC.PRE.LW.060UW444.GBW", "0827X1169.FC.PRE.LW.060UW444.GFB", "0827X1169.FC.PRE.LW.060UW444.GFG", "0827X1169.FC.PRE.LW.060UW444.GFW", "0827X1169.FC.PRE.LW.060UW444.GGB", "0827X1169.FC.PRE.LW.060UW444.GGG", "0827X1169.FC.PRE.LW.060UW444.GGW", "0827X1169.FC.PRE.LW.060UW444.GNB", "0827X1169.FC.PRE.LW.060UW444.GNG", "0827X1169.FC.PRE.LW.060UW444.GNW", "0827X1169.FC.PRE.LW.060UW444.GRB", "0827X1169.FC.PRE.LW.060UW444.GRG", "0827X1169.FC.PRE.LW.060UW444.GRW", "0827X1169.FC.PRE.LW.060UW444.GTB", "0827X1169.FC.PRE.LW.060UW444.GTG", "0827X1169.FC.PRE.LW.060UW444.GTW", "0827X1169.FC.PRE.LW.060UW444.MBB", "0827X1169.FC.PRE.LW.060UW444.MBG", "0827X1169.FC.PRE.LW.060UW444.MBW", "0827X1169.FC.PRE.LW.060UW444.MFB", "0827X1169.FC.PRE.LW.060UW444.MFG", "0827X1169.FC.PRE.LW.060UW444.MFW", "0827X1169.FC.PRE.LW.060UW444.MGB", "0827X1169.FC.PRE.LW.060UW444.MGG", "0827X1169.FC.PRE.LW.060UW444.MGW", "0827X1169.FC.PRE.LW.060UW444.MNB", "0827X1169.FC.PRE.LW.060UW444.MNG", "0827X1169.FC.PRE.LW.060UW444.MNW", "0827X1169.FC.PRE.LW.060UW444.MRB", "0827X1169.FC.PRE.LW.060UW444.MRG", "0827X1169.FC.PRE.LW.060UW444.MRW", "0827X1169.FC.PRE.LW.060UW444.MTB", "0827X1169.FC.PRE.LW.060UW444.MTG", "0827X1169.FC.PRE.LW.060UW444.MTW", "0827X1169.FC.PRE.LW.080CW444.GBB", "0827X1169.FC.PRE.LW.080CW444.GBG", "0827X1169.FC.PRE.LW.080CW444.GBW", "0827X1169.FC.PRE.LW.080CW444.GFB", "0827X1169.FC.PRE.LW.080CW444.GFG", "0827X1169.FC.PRE.LW.080CW444.GFW", "0827X1169.FC.PRE.LW.080CW444.GGB", "0827X1169.FC.PRE.LW.080CW444.GGG", "0827X1169.FC.PRE.LW.080CW444.GGW", "0827X1169.FC.PRE.LW.080CW444.GNB", "0827X1169.FC.PRE.LW.080CW444.GNG", "0827X1169.FC.PRE.LW.080CW444.GNW", "0827X1169.FC.PRE.LW.080CW444.GRB", "0827X1169.FC.PRE.LW.080CW444.GRG", "0827X1169.FC.PRE.LW.080CW444.GRW", "0827X1169.FC.PRE.LW.080CW444.GTB", "0827X1169.FC.PRE.LW.080CW444.GTG", "0827X1169.FC.PRE.LW.080CW444.GTW", "0827X1169.FC.PRE.LW.080CW444.MBB", "0827X1169.FC.PRE.LW.080CW444.MBG", "0827X1169.FC.PRE.LW.080CW444.MBW", "0827X1169.FC.PRE.LW.080CW444.MFB", "0827X1169.FC.PRE.LW.080CW444.MFG", "0827X1169.FC.PRE.LW.080CW444.MFW", "0827X1169.FC.PRE.LW.080CW444.MGB", "0827X1169.FC.PRE.LW.080CW444.MGG", "0827X1169.FC.PRE.LW.080CW444.MGW", "0827X1169.FC.PRE.LW.080CW444.MNB", "0827X1169.FC.PRE.LW.080CW444.MNG", "0827X1169.FC.PRE.LW.080CW444.MNW", "0827X1169.FC.PRE.LW.080CW444.MRB", "0827X1169.FC.PRE.LW.080CW444.MRG", "0827X1169.FC.PRE.LW.080CW444.MRW", "0827X1169.FC.PRE.LW.080CW444.MTB", "0827X1169.FC.PRE.LW.080CW444.MTG", "0827X1169.FC.PRE.LW.080CW444.MTW", "0827X1169.FC.PRE.PB.060UW444.GXX", "0827X1169.FC.PRE.PB.060UW444.MXX", "0827X1169.FC.PRE.PB.070CW460.GIX", "0827X1169.FC.PRE.PB.070CW460.MIX", "0827X1169.FC.PRE.PB.080CW444.GXX", "0827X1169.FC.PRE.PB.080CW444.MXX", "0827X1169.FC.PRE.SS.060UW444.GXX", "0827X1169.FC.PRE.SS.060UW444.MXX", "0827X1169.FC.PRE.SS.070CW460.GIX", "0827X1169.FC.PRE.SS.070CW460.MIX", "0827X1169.FC.PRE.SS.080CW444.GXX", "0827X1169.FC.PRE.SS.080CW444.MXX", "0827X1169.FC.STD.CO.060UW444.GXX", "0827X1169.FC.STD.CO.060UW444.MXX", "0827X1169.FC.STD.CO.080CW444.GXX", "0827X1169.FC.STD.CO.080CW444.MXX", "0827X1169.FC.STD.CW.060UW444.GXX", "0827X1169.FC.STD.CW.060UW444.MXX", "0827X1169.FC.STD.CW.080CW444.GXX", "0827X1169.FC.STD.CW.080CW444.MXX", "0827X1169.FC.STD.LW.060UW444.GBB", "0827X1169.FC.STD.LW.060UW444.GBG", "0827X1169.FC.STD.LW.060UW444.GBW", "0827X1169.FC.STD.LW.060UW444.GFB", "0827X1169.FC.STD.LW.060UW444.GFG", "0827X1169.FC.STD.LW.060UW444.GFW", "0827X1169.FC.STD.LW.060UW444.GGB", "0827X1169.FC.STD.LW.060UW444.GGG", "0827X1169.FC.STD.LW.060UW444.GGW", "0827X1169.FC.STD.LW.060UW444.GNB", "0827X1169.FC.STD.LW.060UW444.GNG", "0827X1169.FC.STD.LW.060UW444.GNW", "0827X1169.FC.STD.LW.060UW444.GRB", "0827X1169.FC.STD.LW.060UW444.GRG", "0827X1169.FC.STD.LW.060UW444.GRW", "0827X1169.FC.STD.LW.060UW444.GTB", "0827X1169.FC.STD.LW.060UW444.GTG", "0827X1169.FC.STD.LW.060UW444.GTW", "0827X1169.FC.STD.LW.060UW444.MBB", "0827X1169.FC.STD.LW.060UW444.MBG", "0827X1169.FC.STD.LW.060UW444.MBW", "0827X1169.FC.STD.LW.060UW444.MFB", "0827X1169.FC.STD.LW.060UW444.MFG", "0827X1169.FC.STD.LW.060UW444.MFW", "0827X1169.FC.STD.LW.060UW444.MGB", "0827X1169.FC.STD.LW.060UW444.MGG", "0827X1169.FC.STD.LW.060UW444.MGW", "0827X1169.FC.STD.LW.060UW444.MNB", "0827X1169.FC.STD.LW.060UW444.MNG", "0827X1169.FC.STD.LW.060UW444.MNW", "0827X1169.FC.STD.LW.060UW444.MRB", "0827X1169.FC.STD.LW.060UW444.MRG", "0827X1169.FC.STD.LW.060UW444.MRW", "0827X1169.FC.STD.LW.060UW444.MTB", "0827X1169.FC.STD.LW.060UW444.MTG", "0827X1169.FC.STD.LW.060UW444.MTW", "0827X1169.FC.STD.LW.080CW444.GBB", "0827X1169.FC.STD.LW.080CW444.GBG", "0827X1169.FC.STD.LW.080CW444.GBW", "0827X1169.FC.STD.LW.080CW444.GFB", "0827X1169.FC.STD.LW.080CW444.GFG", "0827X1169.FC.STD.LW.080CW444.GFW", "0827X1169.FC.STD.LW.080CW444.GGB", "0827X1169.FC.STD.LW.080CW444.GGG", "0827X1169.FC.STD.LW.080CW444.GGW", "0827X1169.FC.STD.LW.080CW444.GNB", "0827X1169.FC.STD.LW.080CW444.GNG", "0827X1169.FC.STD.LW.080CW444.GNW", "0827X1169.FC.STD.LW.080CW444.GRB", "0827X1169.FC.STD.LW.080CW444.GRG", "0827X1169.FC.STD.LW.080CW444.GRW", "0827X1169.FC.STD.LW.080CW444.GTB", "0827X1169.FC.STD.LW.080CW444.GTG", "0827X1169.FC.STD.LW.080CW444.GTW", "0827X1169.FC.STD.LW.080CW444.MBB", "0827X1169.FC.STD.LW.080CW444.MBG", "0827X1169.FC.STD.LW.080CW444.MBW", "0827X1169.FC.STD.LW.080CW444.MFB", "0827X1169.FC.STD.LW.080CW444.MFG", "0827X1169.FC.STD.LW.080CW444.MFW", "0827X1169.FC.STD.LW.080CW444.MGB", "0827X1169.FC.STD.LW.080CW444.MGG", "0827X1169.FC.STD.LW.080CW444.MGW", "0827X1169.FC.STD.LW.080CW444.MNB", "0827X1169.FC.STD.LW.080CW444.MNG", "0827X1169.FC.STD.LW.080CW444.MNW", "0827X1169.FC.STD.LW.080CW444.MRB", "0827X1169.FC.STD.LW.080CW444.MRG", "0827X1169.FC.STD.LW.080CW444.MRW", "0827X1169.FC.STD.LW.080CW444.MTB", "0827X1169.FC.STD.LW.080CW444.MTG", "0827X1169.FC.STD.LW.080CW444.MTW", "0827X1169.FC.STD.PB.060UW444.GXX", "0827X1169.FC.STD.PB.060UW444.MXX", "0827X1169.FC.STD.PB.080CW444.GXX", "0827X1169.FC.STD.PB.080CW444.MXX", "0850X0850.BW.PRE.CO.060UC444.GXX", "0850X0850.BW.PRE.CO.060UC444.MXX", "0850X0850.BW.PRE.CO.060UW444.GXX", "0850X0850.BW.PRE.CO.060UW444.MXX", "0850X0850.BW.PRE.CO.080CW444.GXX", "0850X0850.BW.PRE.CO.080CW444.MXX", "0850X0850.BW.PRE.CW.060UC444.GXX", "0850X0850.BW.PRE.CW.060UC444.MXX", "0850X0850.BW.PRE.CW.060UW444.GXX", "0850X0850.BW.PRE.CW.060UW444.MXX", "0850X0850.BW.PRE.CW.080CW444.GXX", "0850X0850.BW.PRE.CW.080CW444.MXX", "0850X0850.BW.PRE.PB.060UC444.GXX", "0850X0850.BW.PRE.PB.060UC444.MXX", "0850X0850.BW.PRE.PB.060UW444.GXX", "0850X0850.BW.PRE.PB.060UW444.MXX", "0850X0850.BW.PRE.PB.080CW444.GXX", "0850X0850.BW.PRE.PB.080CW444.MXX", "0850X0850.BW.PRE.SS.060UC444.GXX", "0850X0850.BW.PRE.SS.060UC444.MXX", "0850X0850.BW.PRE.SS.060UW444.GXX", "0850X0850.BW.PRE.SS.060UW444.MXX", "0850X0850.BW.PRE.SS.080CW444.GXX", "0850X0850.BW.PRE.SS.080CW444.MXX", "0850X0850.BW.STD.CO.060UC444.GXX", "0850X0850.BW.STD.CO.060UC444.MXX", "0850X0850.BW.STD.CO.060UW444.GXX", "0850X0850.BW.STD.CO.060UW444.MXX", "0850X0850.BW.STD.CO.080CW444.GXX", "0850X0850.BW.STD.CO.080CW444.MXX", "0850X0850.BW.STD.CW.060UC444.GXX", "0850X0850.BW.STD.CW.060UC444.MXX", "0850X0850.BW.STD.CW.060UW444.GXX", "0850X0850.BW.STD.CW.060UW444.MXX", "0850X0850.BW.STD.CW.080CW444.GXX", "0850X0850.BW.STD.CW.080CW444.MXX", "0850X0850.BW.STD.PB.060UC444.GXX", "0850X0850.BW.STD.PB.060UC444.MXX", "0850X0850.BW.STD.PB.060UW444.GXX", "0850X0850.BW.STD.PB.060UW444.MXX", "0850X0850.BW.STD.PB.080CW444.GXX", "0850X0850.BW.STD.PB.080CW444.MXX", "0850X0850.BW.STD.SS.060UC444.GXX", "0850X0850.BW.STD.SS.060UC444.MXX", "0850X0850.BW.STD.SS.060UW444.GXX", "0850X0850.BW.STD.SS.060UW444.MXX", "0850X0850.BW.STD.SS.080CW444.GXX", "0850X0850.BW.STD.SS.080CW444.MXX", "0850X0850.FC.PRE.CO.060UW444.GXX", "0850X0850.FC.PRE.CO.060UW444.MXX", "0850X0850.FC.PRE.CO.080CW444.GXX", "0850X0850.FC.PRE.CO.080CW444.MXX", "0850X0850.FC.PRE.CW.060UW444.GXX", "0850X0850.FC.PRE.CW.060UW444.MXX", "0850X0850.FC.PRE.CW.080CW444.GXX", "0850X0850.FC.PRE.CW.080CW444.MXX", "0850X0850.FC.PRE.PB.060UW444.GXX", "0850X0850.FC.PRE.PB.060UW444.MXX", "0850X0850.FC.PRE.PB.080CW444.GXX", "0850X0850.FC.PRE.PB.080CW444.MXX", "0850X0850.FC.PRE.SS.060UW444.GXX", "0850X0850.FC.PRE.SS.060UW444.MXX", "0850X0850.FC.PRE.SS.080CW444.GXX", "0850X0850.FC.PRE.SS.080CW444.MXX", "0850X0850.FC.STD.CO.060UW444.GXX", "0850X0850.FC.STD.CO.060UW444.MXX", "0850X0850.FC.STD.CO.080CW444.GXX", "0850X0850.FC.STD.CO.080CW444.MXX", "0850X0850.FC.STD.CW.060UW444.GXX", "0850X0850.FC.STD.CW.060UW444.MXX", "0850X0850.FC.STD.CW.080CW444.GXX", "0850X0850.FC.STD.CW.080CW444.MXX", "0850X0850.FC.STD.PB.060UW444.GXX", "0850X0850.FC.STD.PB.060UW444.MXX", "0850X0850.FC.STD.PB.080CW444.GXX", "0850X0850.FC.STD.PB.080CW444.MXX", "0850X1100.BW.PRE.CO.060UC444.GXX", "0850X1100.BW.PRE.CO.060UC444.MXX", "0850X1100.BW.PRE.CO.060UW444.GXX", "0850X1100.BW.PRE.CO.060UW444.MXX", "0850X1100.BW.PRE.CO.080CW444.GXX", "0850X1100.BW.PRE.CO.080CW444.MXX", "0850X1100.BW.PRE.CW.060UC444.GXX", "0850X1100.BW.PRE.CW.060UC444.MXX", "0850X1100.BW.PRE.CW.060UW444.GXX", "0850X1100.BW.PRE.CW.060UW444.MXX", "0850X1100.BW.PRE.CW.080CW444.GXX", "0850X1100.BW.PRE.CW.080CW444.MXX", "0850X1100.BW.PRE.LW.060UC444.GBB", "0850X1100.BW.PRE.LW.060UC444.GBG", "0850X1100.BW.PRE.LW.060UC444.GBW", "0850X1100.BW.PRE.LW.060UC444.GFB", "0850X1100.BW.PRE.LW.060UC444.GFG", "0850X1100.BW.PRE.LW.060UC444.GFW", "0850X1100.BW.PRE.LW.060UC444.GGB", "0850X1100.BW.PRE.LW.060UC444.GGG", "0850X1100.BW.PRE.LW.060UC444.GGW", "0850X1100.BW.PRE.LW.060UC444.GNB", "0850X1100.BW.PRE.LW.060UC444.GNG", "0850X1100.BW.PRE.LW.060UC444.GNW", "0850X1100.BW.PRE.LW.060UC444.GRB", "0850X1100.BW.PRE.LW.060UC444.GRG", "0850X1100.BW.PRE.LW.060UC444.GRW", "0850X1100.BW.PRE.LW.060UC444.GTB", "0850X1100.BW.PRE.LW.060UC444.GTG", "0850X1100.BW.PRE.LW.060UC444.GTW", "0850X1100.BW.PRE.LW.060UC444.MBB", "0850X1100.BW.PRE.LW.060UC444.MBG", "0850X1100.BW.PRE.LW.060UC444.MBW", "0850X1100.BW.PRE.LW.060UC444.MFB", "0850X1100.BW.PRE.LW.060UC444.MFG", "0850X1100.BW.PRE.LW.060UC444.MFW", "0850X1100.BW.PRE.LW.060UC444.MGB", "0850X1100.BW.PRE.LW.060UC444.MGG", "0850X1100.BW.PRE.LW.060UC444.MGW", "0850X1100.BW.PRE.LW.060UC444.MNB", "0850X1100.BW.PRE.LW.060UC444.MNG", "0850X1100.BW.PRE.LW.060UC444.MNW", "0850X1100.BW.PRE.LW.060UC444.MRB", "0850X1100.BW.PRE.LW.060UC444.MRG", "0850X1100.BW.PRE.LW.060UC444.MRW", "0850X1100.BW.PRE.LW.060UC444.MTB", "0850X1100.BW.PRE.LW.060UC444.MTG", "0850X1100.BW.PRE.LW.060UC444.MTW", "0850X1100.BW.PRE.LW.060UW444.GBB", "0850X1100.BW.PRE.LW.060UW444.GBG", "0850X1100.BW.PRE.LW.060UW444.GBW", "0850X1100.BW.PRE.LW.060UW444.GFB", "0850X1100.BW.PRE.LW.060UW444.GFG", "0850X1100.BW.PRE.LW.060UW444.GFW", "0850X1100.BW.PRE.LW.060UW444.GGB", "0850X1100.BW.PRE.LW.060UW444.GGG", "0850X1100.BW.PRE.LW.060UW444.GGW", "0850X1100.BW.PRE.LW.060UW444.GNB", "0850X1100.BW.PRE.LW.060UW444.GNG", "0850X1100.BW.PRE.LW.060UW444.GNW", "0850X1100.BW.PRE.LW.060UW444.GRB", "0850X1100.BW.PRE.LW.060UW444.GRG", "0850X1100.BW.PRE.LW.060UW444.GRW", "0850X1100.BW.PRE.LW.060UW444.GTB", "0850X1100.BW.PRE.LW.060UW444.GTG", "0850X1100.BW.PRE.LW.060UW444.GTW", "0850X1100.BW.PRE.LW.060UW444.MBB", "0850X1100.BW.PRE.LW.060UW444.MBG", "0850X1100.BW.PRE.LW.060UW444.MBW", "0850X1100.BW.PRE.LW.060UW444.MFB", "0850X1100.BW.PRE.LW.060UW444.MFG", "0850X1100.BW.PRE.LW.060UW444.MFW", "0850X1100.BW.PRE.LW.060UW444.MGB", "0850X1100.BW.PRE.LW.060UW444.MGG", "0850X1100.BW.PRE.LW.060UW444.MGW", "0850X1100.BW.PRE.LW.060UW444.MNB", "0850X1100.BW.PRE.LW.060UW444.MNG", "0850X1100.BW.PRE.LW.060UW444.MNW", "0850X1100.BW.PRE.LW.060UW444.MRB", "0850X1100.BW.PRE.LW.060UW444.MRG", "0850X1100.BW.PRE.LW.060UW444.MRW", "0850X1100.BW.PRE.LW.060UW444.MTB", "0850X1100.BW.PRE.LW.060UW444.MTG", "0850X1100.BW.PRE.LW.060UW444.MTW", "0850X1100.BW.PRE.LW.080CW444.GBB", "0850X1100.BW.PRE.LW.080CW444.GBG", "0850X1100.BW.PRE.LW.080CW444.GBW", "0850X1100.BW.PRE.LW.080CW444.GFB", "0850X1100.BW.PRE.LW.080CW444.GFG", "0850X1100.BW.PRE.LW.080CW444.GFW", "0850X1100.BW.PRE.LW.080CW444.GGB", "0850X1100.BW.PRE.LW.080CW444.GGG", "0850X1100.BW.PRE.LW.080CW444.GGW", "0850X1100.BW.PRE.LW.080CW444.GNB", "0850X1100.BW.PRE.LW.080CW444.GNG", "0850X1100.BW.PRE.LW.080CW444.GNW", "0850X1100.BW.PRE.LW.080CW444.GRB", "0850X1100.BW.PRE.LW.080CW444.GRG", "0850X1100.BW.PRE.LW.080CW444.GRW", "0850X1100.BW.PRE.LW.080CW444.GTB", "0850X1100.BW.PRE.LW.080CW444.GTG", "0850X1100.BW.PRE.LW.080CW444.GTW", "0850X1100.BW.PRE.LW.080CW444.MBB", "0850X1100.BW.PRE.LW.080CW444.MBG", "0850X1100.BW.PRE.LW.080CW444.MBW", "0850X1100.BW.PRE.LW.080CW444.MFB", "0850X1100.BW.PRE.LW.080CW444.MFG", "0850X1100.BW.PRE.LW.080CW444.MFW", "0850X1100.BW.PRE.LW.080CW444.MGB", "0850X1100.BW.PRE.LW.080CW444.MGG", "0850X1100.BW.PRE.LW.080CW444.MGW", "0850X1100.BW.PRE.LW.080CW444.MNB", "0850X1100.BW.PRE.LW.080CW444.MNG", "0850X1100.BW.PRE.LW.080CW444.MNW", "0850X1100.BW.PRE.LW.080CW444.MRB", "0850X1100.BW.PRE.LW.080CW444.MRG", "0850X1100.BW.PRE.LW.080CW444.MRW", "0850X1100.BW.PRE.LW.080CW444.MTB", "0850X1100.BW.PRE.LW.080CW444.MTG", "0850X1100.BW.PRE.LW.080CW444.MTW", "0850X1100.BW.PRE.PB.060UC444.GXX", "0850X1100.BW.PRE.PB.060UC444.MXX", "0850X1100.BW.PRE.PB.060UW444.GXX", "0850X1100.BW.PRE.PB.060UW444.MXX", "0850X1100.BW.PRE.PB.070CW460.GIX", "0850X1100.BW.PRE.PB.070CW460.MIX", "0850X1100.BW.PRE.PB.080CW444.GXX", "0850X1100.BW.PRE.PB.080CW444.MXX", "0850X1100.BW.PRE.SS.060UC444.GXX", "0850X1100.BW.PRE.SS.060UC444.MXX", "0850X1100.BW.PRE.SS.060UW444.GXX", "0850X1100.BW.PRE.SS.060UW444.MXX", "0850X1100.BW.PRE.SS.070CW460.GIX", "0850X1100.BW.PRE.SS.070CW460.MIX", "0850X1100.BW.PRE.SS.080CW444.GXX", "0850X1100.BW.PRE.SS.080CW444.MXX", "0850X1100.BW.STD.CO.060UC444.GXX", "0850X1100.BW.STD.CO.060UC444.MXX", "0850X1100.BW.STD.CO.060UW444.GXX", "0850X1100.BW.STD.CO.060UW444.MXX", "0850X1100.BW.STD.CO.080CW444.GXX", "0850X1100.BW.STD.CO.080CW444.MXX", "0850X1100.BW.STD.CW.060UC444.GXX", "0850X1100.BW.STD.CW.060UC444.MXX", "0850X1100.BW.STD.CW.060UW444.GXX", "0850X1100.BW.STD.CW.060UW444.MXX", "0850X1100.BW.STD.CW.080CW444.GXX", "0850X1100.BW.STD.CW.080CW444.MXX", "0850X1100.BW.STD.LW.060UC444.GBB", "0850X1100.BW.STD.LW.060UC444.GBG", "0850X1100.BW.STD.LW.060UC444.GBW", "0850X1100.BW.STD.LW.060UC444.GFB", "0850X1100.BW.STD.LW.060UC444.GFG", "0850X1100.BW.STD.LW.060UC444.GFW", "0850X1100.BW.STD.LW.060UC444.GGB", "0850X1100.BW.STD.LW.060UC444.GGG", "0850X1100.BW.STD.LW.060UC444.GGW", "0850X1100.BW.STD.LW.060UC444.GNB", "0850X1100.BW.STD.LW.060UC444.GNG", "0850X1100.BW.STD.LW.060UC444.GNW", "0850X1100.BW.STD.LW.060UC444.GRB", "0850X1100.BW.STD.LW.060UC444.GRG", "0850X1100.BW.STD.LW.060UC444.GRW", "0850X1100.BW.STD.LW.060UC444.GTB", "0850X1100.BW.STD.LW.060UC444.GTG", "0850X1100.BW.STD.LW.060UC444.GTW", "0850X1100.BW.STD.LW.060UC444.MBB", "0850X1100.BW.STD.LW.060UC444.MBG", "0850X1100.BW.STD.LW.060UC444.MBW", "0850X1100.BW.STD.LW.060UC444.MFB", "0850X1100.BW.STD.LW.060UC444.MFG", "0850X1100.BW.STD.LW.060UC444.MFW", "0850X1100.BW.STD.LW.060UC444.MGB", "0850X1100.BW.STD.LW.060UC444.MGG", "0850X1100.BW.STD.LW.060UC444.MGW", "0850X1100.BW.STD.LW.060UC444.MNB", "0850X1100.BW.STD.LW.060UC444.MNG", "0850X1100.BW.STD.LW.060UC444.MNW", "0850X1100.BW.STD.LW.060UC444.MRB", "0850X1100.BW.STD.LW.060UC444.MRG", "0850X1100.BW.STD.LW.060UC444.MRW", "0850X1100.BW.STD.LW.060UC444.MTB", "0850X1100.BW.STD.LW.060UC444.MTG", "0850X1100.BW.STD.LW.060UC444.MTW", "0850X1100.BW.STD.LW.060UW444.GBB", "0850X1100.BW.STD.LW.060UW444.GBG", "0850X1100.BW.STD.LW.060UW444.GBW", "0850X1100.BW.STD.LW.060UW444.GFB", "0850X1100.BW.STD.LW.060UW444.GFG", "0850X1100.BW.STD.LW.060UW444.GFW", "0850X1100.BW.STD.LW.060UW444.GGB", "0850X1100.BW.STD.LW.060UW444.GGG", "0850X1100.BW.STD.LW.060UW444.GGW", "0850X1100.BW.STD.LW.060UW444.GNB", "0850X1100.BW.STD.LW.060UW444.GNG", "0850X1100.BW.STD.LW.060UW444.GNW", "0850X1100.BW.STD.LW.060UW444.GRB", "0850X1100.BW.STD.LW.060UW444.GRG", "0850X1100.BW.STD.LW.060UW444.GRW", "0850X1100.BW.STD.LW.060UW444.GTB", "0850X1100.BW.STD.LW.060UW444.GTG", "0850X1100.BW.STD.LW.060UW444.GTW", "0850X1100.BW.STD.LW.060UW444.MBB", "0850X1100.BW.STD.LW.060UW444.MBG", "0850X1100.BW.STD.LW.060UW444.MBW", "0850X1100.BW.STD.LW.060UW444.MFB", "0850X1100.BW.STD.LW.060UW444.MFG", "0850X1100.BW.STD.LW.060UW444.MFW", "0850X1100.BW.STD.LW.060UW444.MGB", "0850X1100.BW.STD.LW.060UW444.MGG", "0850X1100.BW.STD.LW.060UW444.MGW", "0850X1100.BW.STD.LW.060UW444.MNB", "0850X1100.BW.STD.LW.060UW444.MNG", "0850X1100.BW.STD.LW.060UW444.MNW", "0850X1100.BW.STD.LW.060UW444.MRB", "0850X1100.BW.STD.LW.060UW444.MRG", "0850X1100.BW.STD.LW.060UW444.MRW", "0850X1100.BW.STD.LW.060UW444.MTB", "0850X1100.BW.STD.LW.060UW444.MTG", "0850X1100.BW.STD.LW.060UW444.MTW", "0850X1100.BW.STD.LW.080CW444.GBB", "0850X1100.BW.STD.LW.080CW444.GBG", "0850X1100.BW.STD.LW.080CW444.GBW", "0850X1100.BW.STD.LW.080CW444.GFB", "0850X1100.BW.STD.LW.080CW444.GFG", "0850X1100.BW.STD.LW.080CW444.GFW", "0850X1100.BW.STD.LW.080CW444.GGB", "0850X1100.BW.STD.LW.080CW444.GGG", "0850X1100.BW.STD.LW.080CW444.GGW", "0850X1100.BW.STD.LW.080CW444.GNB", "0850X1100.BW.STD.LW.080CW444.GNG", "0850X1100.BW.STD.LW.080CW444.GNW", "0850X1100.BW.STD.LW.080CW444.GRB", "0850X1100.BW.STD.LW.080CW444.GRG", "0850X1100.BW.STD.LW.080CW444.GRW", "0850X1100.BW.STD.LW.080CW444.GTB", "0850X1100.BW.STD.LW.080CW444.GTG", "0850X1100.BW.STD.LW.080CW444.GTW", "0850X1100.BW.STD.LW.080CW444.MBB", "0850X1100.BW.STD.LW.080CW444.MBG", "0850X1100.BW.STD.LW.080CW444.MBW", "0850X1100.BW.STD.LW.080CW444.MFB", "0850X1100.BW.STD.LW.080CW444.MFG", "0850X1100.BW.STD.LW.080CW444.MFW", "0850X1100.BW.STD.LW.080CW444.MGB", "0850X1100.BW.STD.LW.080CW444.MGG", "0850X1100.BW.STD.LW.080CW444.MGW", "0850X1100.BW.STD.LW.080CW444.MNB", "0850X1100.BW.STD.LW.080CW444.MNG", "0850X1100.BW.STD.LW.080CW444.MNW", "0850X1100.BW.STD.LW.080CW444.MRB", "0850X1100.BW.STD.LW.080CW444.MRG", "0850X1100.BW.STD.LW.080CW444.MRW", "0850X1100.BW.STD.LW.080CW444.MTB", "0850X1100.BW.STD.LW.080CW444.MTG", "0850X1100.BW.STD.LW.080CW444.MTW", "0850X1100.BW.STD.PB.060UC444.GXX", "0850X1100.BW.STD.PB.060UC444.MXX", "0850X1100.BW.STD.PB.060UW444.GXX", "0850X1100.BW.STD.PB.060UW444.MXX", "0850X1100.BW.STD.PB.080CW444.GXX", "0850X1100.BW.STD.PB.080CW444.MXX", "0850X1100.BW.STD.SS.060UC444.GXX", "0850X1100.BW.STD.SS.060UC444.MXX", "0850X1100.BW.STD.SS.060UW444.GXX", "0850X1100.BW.STD.SS.060UW444.MXX", "0850X1100.BW.STD.SS.080CW444.GXX", "0850X1100.BW.STD.SS.080CW444.MXX", "0850X1100.FC.PRE.CO.060UW444.GXX", "0850X1100.FC.PRE.CO.060UW444.MXX", "0850X1100.FC.PRE.CO.080CW444.GXX", "0850X1100.FC.PRE.CO.080CW444.MXX", "0850X1100.FC.PRE.CW.060UW444.GXX", "0850X1100.FC.PRE.CW.060UW444.MXX", "0850X1100.FC.PRE.CW.080CW444.GXX", "0850X1100.FC.PRE.CW.080CW444.MXX", "0850X1100.FC.PRE.LW.060UW444.GBB", "0850X1100.FC.PRE.LW.060UW444.GBG", "0850X1100.FC.PRE.LW.060UW444.GBW", "0850X1100.FC.PRE.LW.060UW444.GFB", "0850X1100.FC.PRE.LW.060UW444.GFG", "0850X1100.FC.PRE.LW.060UW444.GFW", "0850X1100.FC.PRE.LW.060UW444.GGB", "0850X1100.FC.PRE.LW.060UW444.GGG", "0850X1100.FC.PRE.LW.060UW444.GGW", "0850X1100.FC.PRE.LW.060UW444.GNB", "0850X1100.FC.PRE.LW.060UW444.GNG", "0850X1100.FC.PRE.LW.060UW444.GNW", "0850X1100.FC.PRE.LW.060UW444.GRB", "0850X1100.FC.PRE.LW.060UW444.GRG", "0850X1100.FC.PRE.LW.060UW444.GRW", "0850X1100.FC.PRE.LW.060UW444.GTB", "0850X1100.FC.PRE.LW.060UW444.GTG", "0850X1100.FC.PRE.LW.060UW444.GTW", "0850X1100.FC.PRE.LW.060UW444.MBB", "0850X1100.FC.PRE.LW.060UW444.MBG", "0850X1100.FC.PRE.LW.060UW444.MBW", "0850X1100.FC.PRE.LW.060UW444.MFB", "0850X1100.FC.PRE.LW.060UW444.MFG", "0850X1100.FC.PRE.LW.060UW444.MFW", "0850X1100.FC.PRE.LW.060UW444.MGB", "0850X1100.FC.PRE.LW.060UW444.MGG", "0850X1100.FC.PRE.LW.060UW444.MGW", "0850X1100.FC.PRE.LW.060UW444.MNB", "0850X1100.FC.PRE.LW.060UW444.MNG", "0850X1100.FC.PRE.LW.060UW444.MNW", "0850X1100.FC.PRE.LW.060UW444.MRB", "0850X1100.FC.PRE.LW.060UW444.MRG", "0850X1100.FC.PRE.LW.060UW444.MRW", "0850X1100.FC.PRE.LW.060UW444.MTB", "0850X1100.FC.PRE.LW.060UW444.MTG", "0850X1100.FC.PRE.LW.060UW444.MTW", "0850X1100.FC.PRE.LW.080CW444.GBB", "0850X1100.FC.PRE.LW.080CW444.GBG", "0850X1100.FC.PRE.LW.080CW444.GBW", "0850X1100.FC.PRE.LW.080CW444.GFB", "0850X1100.FC.PRE.LW.080CW444.GFG", "0850X1100.FC.PRE.LW.080CW444.GFW", "0850X1100.FC.PRE.LW.080CW444.GGB", "0850X1100.FC.PRE.LW.080CW444.GGG", "0850X1100.FC.PRE.LW.080CW444.GGW", "0850X1100.FC.PRE.LW.080CW444.GNB", "0850X1100.FC.PRE.LW.080CW444.GNG", "0850X1100.FC.PRE.LW.080CW444.GNW", "0850X1100.FC.PRE.LW.080CW444.GRB", "0850X1100.FC.PRE.LW.080CW444.GRG", "0850X1100.FC.PRE.LW.080CW444.GRW", "0850X1100.FC.PRE.LW.080CW444.GTB", "0850X1100.FC.PRE.LW.080CW444.GTG", "0850X1100.FC.PRE.LW.080CW444.GTW", "0850X1100.FC.PRE.LW.080CW444.MBB", "0850X1100.FC.PRE.LW.080CW444.MBG", "0850X1100.FC.PRE.LW.080CW444.MBW", "0850X1100.FC.PRE.LW.080CW444.MFB", "0850X1100.FC.PRE.LW.080CW444.MFG", "0850X1100.FC.PRE.LW.080CW444.MFW", "0850X1100.FC.PRE.LW.080CW444.MGB", "0850X1100.FC.PRE.LW.080CW444.MGG", "0850X1100.FC.PRE.LW.080CW444.MGW", "0850X1100.FC.PRE.LW.080CW444.MNB", "0850X1100.FC.PRE.LW.080CW444.MNG", "0850X1100.FC.PRE.LW.080CW444.MNW", "0850X1100.FC.PRE.LW.080CW444.MRB", "0850X1100.FC.PRE.LW.080CW444.MRG", "0850X1100.FC.PRE.LW.080CW444.MRW", "0850X1100.FC.PRE.LW.080CW444.MTB", "0850X1100.FC.PRE.LW.080CW444.MTG", "0850X1100.FC.PRE.LW.080CW444.MTW", "0850X1100.FC.PRE.PB.060UW444.GXX", "0850X1100.FC.PRE.PB.060UW444.MXX", "0850X1100.FC.PRE.PB.070CW460.GIX", "0850X1100.FC.PRE.PB.070CW460.MIX", "0850X1100.FC.PRE.PB.080CW444.GXX", "0850X1100.FC.PRE.PB.080CW444.MXX", "0850X1100.FC.PRE.SS.060UW444.GXX", "0850X1100.FC.PRE.SS.060UW444.MXX", "0850X1100.FC.PRE.SS.070CW460.GIX", "0850X1100.FC.PRE.SS.070CW460.MIX", "0850X1100.FC.PRE.SS.080CW444.GXX", "0850X1100.FC.PRE.SS.080CW444.MXX", "0850X1100.FC.STD.CO.060UW444.GXX", "0850X1100.FC.STD.CO.060UW444.MXX", "0850X1100.FC.STD.CO.080CW444.GXX", "0850X1100.FC.STD.CO.080CW444.MXX", "0850X1100.FC.STD.CW.060UW444.GXX", "0850X1100.FC.STD.CW.060UW444.MXX", "0850X1100.FC.STD.CW.080CW444.GXX", "0850X1100.FC.STD.CW.080CW444.MXX", "0850X1100.FC.STD.LW.060UW444.GBB", "0850X1100.FC.STD.LW.060UW444.GBG", "0850X1100.FC.STD.LW.060UW444.GBW", "0850X1100.FC.STD.LW.060UW444.GFB", "0850X1100.FC.STD.LW.060UW444.GFG", "0850X1100.FC.STD.LW.060UW444.GFW", "0850X1100.FC.STD.LW.060UW444.GGB", "0850X1100.FC.STD.LW.060UW444.GGG", "0850X1100.FC.STD.LW.060UW444.GGW", "0850X1100.FC.STD.LW.060UW444.GNB", "0850X1100.FC.STD.LW.060UW444.GNG", "0850X1100.FC.STD.LW.060UW444.GNW", "0850X1100.FC.STD.LW.060UW444.GRB", "0850X1100.FC.STD.LW.060UW444.GRG", "0850X1100.FC.STD.LW.060UW444.GRW", "0850X1100.FC.STD.LW.060UW444.GTB", "0850X1100.FC.STD.LW.060UW444.GTG", "0850X1100.FC.STD.LW.060UW444.GTW", "0850X1100.FC.STD.LW.060UW444.MBB", "0850X1100.FC.STD.LW.060UW444.MBG", "0850X1100.FC.STD.LW.060UW444.MBW", "0850X1100.FC.STD.LW.060UW444.MFB", "0850X1100.FC.STD.LW.060UW444.MFG", "0850X1100.FC.STD.LW.060UW444.MFW", "0850X1100.FC.STD.LW.060UW444.MGB", "0850X1100.FC.STD.LW.060UW444.MGG", "0850X1100.FC.STD.LW.060UW444.MGW", "0850X1100.FC.STD.LW.060UW444.MNB", "0850X1100.FC.STD.LW.060UW444.MNG", "0850X1100.FC.STD.LW.060UW444.MNW", "0850X1100.FC.STD.LW.060UW444.MRB", "0850X1100.FC.STD.LW.060UW444.MRG", "0850X1100.FC.STD.LW.060UW444.MRW", "0850X1100.FC.STD.LW.060UW444.MTB", "0850X1100.FC.STD.LW.060UW444.MTG", "0850X1100.FC.STD.LW.060UW444.MTW", "0850X1100.FC.STD.LW.080CW444.GBB", "0850X1100.FC.STD.LW.080CW444.GBG", "0850X1100.FC.STD.LW.080CW444.GBW", "0850X1100.FC.STD.LW.080CW444.GFB", "0850X1100.FC.STD.LW.080CW444.GFG", "0850X1100.FC.STD.LW.080CW444.GFW", "0850X1100.FC.STD.LW.080CW444.GGB", "0850X1100.FC.STD.LW.080CW444.GGG", "0850X1100.FC.STD.LW.080CW444.GGW", "0850X1100.FC.STD.LW.080CW444.GNB", "0850X1100.FC.STD.LW.080CW444.GNG", "0850X1100.FC.STD.LW.080CW444.GNW", "0850X1100.FC.STD.LW.080CW444.GRB", "0850X1100.FC.STD.LW.080CW444.GRG", "0850X1100.FC.STD.LW.080CW444.GRW", "0850X1100.FC.STD.LW.080CW444.GTB", "0850X1100.FC.STD.LW.080CW444.GTG", "0850X1100.FC.STD.LW.080CW444.GTW", "0850X1100.FC.STD.LW.080CW444.MBB", "0850X1100.FC.STD.LW.080CW444.MBG", "0850X1100.FC.STD.LW.080CW444.MBW", "0850X1100.FC.STD.LW.080CW444.MFB", "0850X1100.FC.STD.LW.080CW444.MFG", "0850X1100.FC.STD.LW.080CW444.MFW", "0850X1100.FC.STD.LW.080CW444.MGB", "0850X1100.FC.STD.LW.080CW444.MGG", "0850X1100.FC.STD.LW.080CW444.MGW", "0850X1100.FC.STD.LW.080CW444.MNB", "0850X1100.FC.STD.LW.080CW444.MNG", "0850X1100.FC.STD.LW.080CW444.MNW", "0850X1100.FC.STD.LW.080CW444.MRB", "0850X1100.FC.STD.LW.080CW444.MRG", "0850X1100.FC.STD.LW.080CW444.MRW", "0850X1100.FC.STD.LW.080CW444.MTB", "0850X1100.FC.STD.LW.080CW444.MTG", "0850X1100.FC.STD.LW.080CW444.MTW", "0850X1100.FC.STD.PB.060UW444.GXX", "0850X1100.FC.STD.PB.060UW444.MXX", "0850X1100.FC.STD.PB.080CW444.GXX", "0850X1100.FC.STD.PB.080CW444.MXX", "0900X0700.BW.PRE.CO.060UC444.GXX", "0900X0700.BW.PRE.CO.060UC444.MXX", "0900X0700.BW.PRE.CO.060UW444.GXX", "0900X0700.BW.PRE.CO.060UW444.MXX", "0900X0700.BW.PRE.CO.080CW444.GXX", "0900X0700.BW.PRE.CO.080CW444.MXX", "0900X0700.BW.PRE.CW.060UC444.GXX", "0900X0700.BW.PRE.CW.060UC444.MXX", "0900X0700.BW.PRE.CW.060UW444.GXX", "0900X0700.BW.PRE.CW.060UW444.MXX", "0900X0700.BW.PRE.CW.080CW444.GXX", "0900X0700.BW.PRE.CW.080CW444.MXX", "0900X0700.BW.PRE.PB.060UC444.GXX", "0900X0700.BW.PRE.PB.060UC444.MXX", "0900X0700.BW.PRE.PB.060UW444.GXX", "0900X0700.BW.PRE.PB.060UW444.MXX", "0900X0700.BW.PRE.PB.080CW444.GXX", "0900X0700.BW.PRE.PB.080CW444.MXX", "0900X0700.BW.STD.CO.060UC444.GXX", "0900X0700.BW.STD.CO.060UC444.MXX", "0900X0700.BW.STD.CO.060UW444.GXX", "0900X0700.BW.STD.CO.060UW444.MXX", "0900X0700.BW.STD.CO.080CW444.GXX", "0900X0700.BW.STD.CO.080CW444.MXX", "0900X0700.BW.STD.CW.060UC444.GXX", "0900X0700.BW.STD.CW.060UC444.MXX", "0900X0700.BW.STD.CW.060UW444.GXX", "0900X0700.BW.STD.CW.060UW444.MXX", "0900X0700.BW.STD.CW.080CW444.GXX", "0900X0700.BW.STD.CW.080CW444.MXX", "0900X0700.BW.STD.PB.060UC444.GXX", "0900X0700.BW.STD.PB.060UC444.MXX", "0900X0700.BW.STD.PB.060UW444.GXX", "0900X0700.BW.STD.PB.060UW444.MXX", "0900X0700.BW.STD.PB.080CW444.GXX", "0900X0700.BW.STD.PB.080CW444.MXX", "0900X0700.FC.PRE.CO.060UW444.GXX", "0900X0700.FC.PRE.CO.060UW444.MXX", "0900X0700.FC.PRE.CO.080CW444.GXX", "0900X0700.FC.PRE.CO.080CW444.MXX", "0900X0700.FC.PRE.CW.060UW444.GXX", "0900X0700.FC.PRE.CW.060UW444.MXX", "0900X0700.FC.PRE.CW.080CW444.GXX", "0900X0700.FC.PRE.CW.080CW444.MXX", "0900X0700.FC.PRE.PB.060UW444.GXX", "0900X0700.FC.PRE.PB.060UW444.MXX", "0900X0700.FC.PRE.PB.080CW444.GXX", "0900X0700.FC.PRE.PB.080CW444.MXX", "0900X0700.FC.STD.CO.060UW444.GXX", "0900X0700.FC.STD.CO.060UW444.MXX", "0900X0700.FC.STD.CO.080CW444.GXX", "0900X0700.FC.STD.CO.080CW444.MXX", "0900X0700.FC.STD.CW.060UW444.GXX", "0900X0700.FC.STD.CW.060UW444.MXX", "0900X0700.FC.STD.CW.080CW444.GXX", "0900X0700.FC.STD.CW.080CW444.MXX", "0900X0700.FC.STD.PB.060UW444.GXX", "0900X0700.FC.STD.PB.060UW444.MXX", "0900X0700.FC.STD.PB.080CW444.GXX", "0900X0700.FC.STD.PB.080CW444.MXX", "1100X0850.BW.PRE.CO.060UC444.GXX", "1100X0850.BW.PRE.CO.060UC444.MXX", "1100X0850.BW.PRE.CO.060UW444.GXX", "1100X0850.BW.PRE.CO.060UW444.MXX", "1100X0850.BW.PRE.CO.080CW444.GXX", "1100X0850.BW.PRE.CO.080CW444.MXX", "1100X0850.BW.PRE.CW.060UC444.GXX", "1100X0850.BW.PRE.CW.060UC444.MXX", "1100X0850.BW.PRE.CW.060UW444.GXX", "1100X0850.BW.PRE.CW.060UW444.MXX", "1100X0850.BW.PRE.CW.080CW444.GXX", "1100X0850.BW.PRE.CW.080CW444.MXX", "1100X0850.BW.PRE.PB.060UC444.GXX", "1100X0850.BW.PRE.PB.060UC444.MXX", "1100X0850.BW.PRE.PB.060UW444.GXX", "1100X0850.BW.PRE.PB.060UW444.MXX", "1100X0850.BW.PRE.PB.080CW444.GXX", "1100X0850.BW.PRE.PB.080CW444.MXX", "1100X0850.BW.STD.CO.060UC444.GXX", "1100X0850.BW.STD.CO.060UC444.MXX", "1100X0850.BW.STD.CO.060UW444.GXX", "1100X0850.BW.STD.CO.060UW444.MXX", "1100X0850.BW.STD.CO.080CW444.GXX", "1100X0850.BW.STD.CO.080CW444.MXX", "1100X0850.BW.STD.CW.060UC444.GXX", "1100X0850.BW.STD.CW.060UC444.MXX", "1100X0850.BW.STD.CW.060UW444.GXX", "1100X0850.BW.STD.CW.060UW444.MXX", "1100X0850.BW.STD.CW.080CW444.GXX", "1100X0850.BW.STD.CW.080CW444.MXX", "1100X0850.BW.STD.PB.060UC444.GXX", "1100X0850.BW.STD.PB.060UC444.MXX", "1100X0850.BW.STD.PB.060UW444.GXX", "1100X0850.BW.STD.PB.060UW444.MXX", "1100X0850.BW.STD.PB.080CW444.GXX", "1100X0850.BW.STD.PB.080CW444.MXX", "1100X0850.FC.PRE.CO.060UW444.GXX", "1100X0850.FC.PRE.CO.060UW444.MXX", "1100X0850.FC.PRE.CO.080CW444.GXX", "1100X0850.FC.PRE.CO.080CW444.MXX", "1100X0850.FC.PRE.CW.060UW444.GXX", "1100X0850.FC.PRE.CW.060UW444.MXX", "1100X0850.FC.PRE.CW.080CW444.GXX", "1100X0850.FC.PRE.CW.080CW444.MXX", "1100X0850.FC.PRE.PB.060UW444.GXX", "1100X0850.FC.PRE.PB.060UW444.MXX", "1100X0850.FC.PRE.PB.080CW444.GXX", "1100X0850.FC.PRE.PB.080CW444.MXX", "1100X0850.FC.PRE.WO.100CW200.GXX", "1100X0850.FC.STD.CO.060UW444.GXX", "1100X0850.FC.STD.CO.060UW444.MXX", "1100X0850.FC.STD.CO.080CW444.GXX", "1100X0850.FC.STD.CO.080CW444.MXX", "1100X0850.FC.STD.CW.060UW444.GXX", "1100X0850.FC.STD.CW.060UW444.MXX", "1100X0850.FC.STD.CW.080CW444.GXX", "1100X0850.FC.STD.CW.080CW444.MXX", "1100X0850.FC.STD.PB.060UW444.GXX", "1100X0850.FC.STD.PB.060UW444.MXX", "1100X0850.FC.STD.PB.080CW444.GXX", "1100X0850.FC.STD.PB.080CW444.MXX", "1169X0827.BW.PRE.CO.060UC444.GXX", "1169X0827.BW.PRE.CO.060UC444.MXX", "1169X0827.BW.PRE.CO.060UW444.GXX", "1169X0827.BW.PRE.CO.060UW444.MXX", "1169X0827.BW.PRE.CO.080CW444.GXX", "1169X0827.BW.PRE.CO.080CW444.MXX", "1169X0827.BW.PRE.CW.060UC444.GXX", "1169X0827.BW.PRE.CW.060UC444.MXX", "1169X0827.BW.PRE.CW.060UW444.GXX", "1169X0827.BW.PRE.CW.060UW444.MXX", "1169X0827.BW.PRE.CW.080CW444.GXX", "1169X0827.BW.PRE.CW.080CW444.MXX", "1169X0827.BW.PRE.PB.060UC444.GXX", "1169X0827.BW.PRE.PB.060UC444.MXX", "1169X0827.BW.PRE.PB.060UW444.GXX", "1169X0827.BW.PRE.PB.060UW444.MXX", "1169X0827.BW.PRE.PB.080CW444.GXX", "1169X0827.BW.PRE.PB.080CW444.MXX", "1169X0827.BW.STD.CO.060UC444.GXX", "1169X0827.BW.STD.CO.060UC444.MXX", "1169X0827.BW.STD.CO.060UW444.GXX", "1169X0827.BW.STD.CO.060UW444.MXX", "1169X0827.BW.STD.CO.080CW444.GXX", "1169X0827.BW.STD.CO.080CW444.MXX", "1169X0827.BW.STD.CW.060UC444.GXX", "1169X0827.BW.STD.CW.060UC444.MXX", "1169X0827.BW.STD.CW.060UW444.GXX", "1169X0827.BW.STD.CW.060UW444.MXX", "1169X0827.BW.STD.CW.080CW444.GXX", "1169X0827.BW.STD.CW.080CW444.MXX", "1169X0827.BW.STD.PB.060UC444.GXX", "1169X0827.BW.STD.PB.060UC444.MXX", "1169X0827.BW.STD.PB.060UW444.GXX", "1169X0827.BW.STD.PB.060UW444.MXX", "1169X0827.BW.STD.PB.080CW444.GXX", "1169X0827.BW.STD.PB.080CW444.MXX", "1169X0827.FC.PRE.CO.060UW444.GXX", "1169X0827.FC.PRE.CO.060UW444.MXX", "1169X0827.FC.PRE.CO.080CW444.GXX", "1169X0827.FC.PRE.CO.080CW444.MXX", "1169X0827.FC.PRE.CW.060UW444.GXX", "1169X0827.FC.PRE.CW.060UW444.MXX", "1169X0827.FC.PRE.CW.080CW444.GXX", "1169X0827.FC.PRE.CW.080CW444.MXX", "1169X0827.FC.PRE.PB.060UW444.GXX", "1169X0827.FC.PRE.PB.060UW444.MXX", "1169X0827.FC.PRE.PB.080CW444.GXX", "1169X0827.FC.PRE.PB.080CW444.MXX", "1169X0827.FC.STD.CO.060UW444.GXX", "1169X0827.FC.STD.CO.060UW444.MXX", "1169X0827.FC.STD.CO.080CW444.GXX", "1169X0827.FC.STD.CO.080CW444.MXX", "1169X0827.FC.STD.CW.060UW444.GXX", "1169X0827.FC.STD.CW.060UW444.MXX", "1169X0827.FC.STD.CW.080CW444.GXX", "1169X0827.FC.STD.CW.080CW444.MXX", "1169X0827.FC.STD.PB.060UW444.GXX", "1169X0827.FC.STD.PB.060UW444.MXX", "1169X0827.FC.STD.PB.080CW444.GXX", "1169X0827.FC.STD.PB.080CW444.MXX"]);

// ── Validation helper ─────────────────────────────────────────────────────────

/**
 * Build a pod_package_id from its 6 components.
 * Returns the dotted SKU string, e.g. "0600X0900.BW.STD.PB.060UW444.MXX"
 */
function buildPodPackageId({ trim, ink, quality, binding, paper, coverFinish = 'MXX' }) {
  return `${trim}.${ink}.${quality}.${binding}.${paper}.${coverFinish}`;
}

/**
 * Validate a pod_package_id against the spec sheet.
 * Returns { valid: true } or { valid: false, reason: string }
 */
function validatePodPackageId(podPackageId) {
  if (!podPackageId || typeof podPackageId !== 'string') {
    return { valid: false, reason: 'pod_package_id must be a non-empty string' };
  }
  const parts = podPackageId.split('.');
  if (parts.length !== 6) {
    return { valid: false, reason: `pod_package_id must have 6 dot-separated parts, got ${parts.length}` };
  }
  const [trim, ink, quality, binding, paper, finish] = parts;

  // Check trim
  if (!COMPAT_TREE[trim]) {
    return { valid: false, reason: `Unknown trim size: ${trim}. Valid trims: ${Object.keys(COMPAT_TREE).join(', ')}` };
  }
  // Check ink
  if (!COMPAT_TREE[trim][ink]) {
    return { valid: false, reason: `Ink '${ink}' not available for trim ${trim}. Valid inks: ${Object.keys(COMPAT_TREE[trim]).join(', ')}` };
  }
  // Check quality
  if (!COMPAT_TREE[trim][ink][quality]) {
    return { valid: false, reason: `Quality '${quality}' not available for ${trim}.${ink}. Valid qualities: ${Object.keys(COMPAT_TREE[trim][ink]).join(', ')}` };
  }
  // Check binding
  if (!COMPAT_TREE[trim][ink][quality][binding]) {
    return { valid: false, reason: `Binding '${binding}' not available for ${trim}.${ink}.${quality}. Valid bindings: ${Object.keys(COMPAT_TREE[trim][ink][quality]).join(', ')}` };
  }
  // Check paper
  const validPapers = COMPAT_TREE[trim][ink][quality][binding];
  if (!validPapers.includes(paper)) {
    return { valid: false, reason: `Paper '${paper}' not available for ${trim}.${ink}.${quality}.${binding}. Valid papers: ${validPapers.join(', ')}` };
  }
  // Full SKU check
  if (!VALID_SKUS.has(podPackageId)) {
    return { valid: false, reason: `Pod package '${podPackageId}' does not exist in the Lulu catalog` };
  }
  return { valid: true };
}

/**
 * Auto-correct a pod_package_id by finding the closest valid SKU.
 * If the exact SKU is invalid, it tries to find a valid paper for the
 * given (trim, ink, quality, binding) combination.
 * Returns the corrected SKU string, or null if no valid combo exists.
 */
function autoCorrectPodPackageId({ trim, ink, quality, binding, paper, coverFinish = 'MXX' }) {
  const tree = COMPAT_TREE;
  if (!tree[trim]) return null;
  if (!tree[trim][ink]) {
    // Try the other ink
    ink = ink === 'FC' ? 'BW' : 'FC';
    if (!tree[trim][ink]) return null;
  }
  if (!tree[trim][ink][quality]) {
    // Try the other quality
    quality = quality === 'PRE' ? 'STD' : 'PRE';
    if (!tree[trim][ink][quality]) return null;
  }
  if (!tree[trim][ink][quality][binding]) {
    // Try PB as fallback binding
    binding = 'PB';
    if (!tree[trim][ink][quality][binding]) {
      // Try first available binding
      const bindings = Object.keys(tree[trim][ink][quality]);
      if (!bindings.length) return null;
      binding = bindings[0];
    }
  }
  const validPapers = tree[trim][ink][quality][binding];
  if (!validPapers.includes(paper)) {
    // Pick first valid paper (prefer white over cream)
    paper = validPapers.includes('060UW444') ? '060UW444' : validPapers[0];
  }
  const candidate = `${trim}.${ink}.${quality}.${binding}.${paper}.${coverFinish}`;
  return VALID_SKUS.has(candidate) ? candidate : null;
}

module.exports = {
  TRIM_LABELS,
  INK_LABELS,
  QUALITY_LABELS,
  BINDING_LABELS,
  PAPER_LABELS,
  SHIPPING_LABELS,
  COMPAT_TREE,
  BINDING_INK_PAPERS,
  TRIM_BINDINGS,
  TRIM_INK_BINDINGS,
  VALID_SKUS,
  buildPodPackageId,
  validatePodPackageId,
  autoCorrectPodPackageId,
};
