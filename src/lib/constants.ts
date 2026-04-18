export const HONDA_BIKE_MODELS = [
    'CD70',
    'DREAM',
    'PRIDOR',
    'CG 125',
    'CG125S.SE',
    'CG125GOLD',
    'CB125F.SE',
    'CB150F',
    'CG150 2-Tone'
] as const;

export type HondaBikeModel = typeof HONDA_BIKE_MODELS[number];

// Purchase price from Honda (book price)
export const BIKE_BOOK_PRICES: Record<string, number> = {
    'CD70': 152000,
    'CG 125': 227000,
    'PRIDOR': 202000,
    'CG125S.SE': 273000,
    'CG125GOLD': 282000,
    'CB150F': 478000,
    'CG150 2-Tone': 438000,
    'CB125F.SE': 376000,
    'DREAM': 160000,
};

// Standard selling price to customer
export const BIKE_STANDARD_PRICES: Record<string, number> = {
    'CD70': 160000,
    'DREAM': 171000,
    'PRIDOR': 212000,
    'CG 125': 238500,
    'CG125GOLD': 297000,
    'CG125S.SE': 287000,
    'CB125F.SE': 397000,
    'CB150F': 504000,
    'CG150 2-Tone': 460000,
};

// Unit margin = standard price - book price
export const BIKE_UNIT_MARGINS: Record<string, number> = {
    'CD70': 8000,
    'DREAM': 8000,
    'PRIDOR': 8000,
    'CG 125': 11000,
    'CG125S.SE': 11000,
    'CG125GOLD': 11000,
    'CB125F.SE': 20000,
    'CB150F': 20000,
    'CG150 2-Tone': 20000,
};

// Registration fee charged to customer
export const BIKE_REGISTRATION_CHARGED: Record<string, number> = {
    'CD70': 8000,
    'DREAM': 8000,
    'PRIDOR': 8000,
    'CG 125': 9000,
    'CG125S.SE': 8000,
    'CG125GOLD': 8000,
    'CB125F.SE': 8000,
    'CB150F': 8000,
    'CG150 2-Tone': 8000,
};

// Actual registration cost paid to government (per model, fallback to default)
export const REGISTRATION_ACTUAL_COST = 6500; // default
export const REGISTRATION_ACTUAL_COST_BY_MODEL: Record<string, number> = {
    'CG 125': 7000,
    'CG125S.SE': 7000,
};

// Password to unlock margin section on dashboard
export const MARGIN_PASSWORD = '786';

export const BIKE_COLORS = [
    'Red',
    'Black',
    'Blue',
    'Silver',
    'White'
] as const;

export type BikeColor = typeof BIKE_COLORS[number];
