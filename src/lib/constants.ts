export const HONDA_BIKE_MODELS = [
    'CD70',
    'DREAM',
    'PRIDOR',
    'CG 125',
    'CG125S.SE',
    'CB125F.SE',
    'CB150F',
    'CG150 2-Tone'
] as const;

export type HondaBikeModel = typeof HONDA_BIKE_MODELS[number];

// Purchase price from Honda (book price)
export const BIKE_BOOK_PRICES: Record<string, number> = {
    'CD70': 152000,
    'CG 125': 226765,
    'PRIDOR': 201158,
    'CG125S.SE': 281406,
    'CB150F': 477118,
    'CG150 2-Tone': 437880,
    'CB125F.SE': 375781,
    'DREAM': 160000,
};

// Standard selling price to customer
export const BIKE_STANDARD_PRICES: Record<string, number> = {
    'CD70': 160000,
    'DREAM': 168000,
    'PRIDOR': 210000,
    'CG 125': 238500,
    'CG125S.SE': 292000,
    'CB125F.SE': 386000,
    'CB150F': 488000,
    'CG150 2-Tone': 448000,
};

// Unit margin = standard price - book price
export const BIKE_UNIT_MARGINS: Record<string, number> = {
    'CD70': 8000,
    'DREAM': 8000,
    'PRIDOR': 8000,
    'CG 125': 11000,
    'CG125S.SE': 10000,
    'CB125F.SE': 10000,
    'CB150F': 10000,
    'CG150 2-Tone': 10000,
};

// Registration fee charged to customer
export const BIKE_REGISTRATION_CHARGED: Record<string, number> = {
    'CD70': 8000,
    'DREAM': 8000,
    'PRIDOR': 8000,
    'CG 125': 9000,
    'CG125S.SE': 8000,
    'CB125F.SE': 8000,
    'CB150F': 8000,
    'CG150 2-Tone': 8000,
};

// Actual registration cost paid to government
export const REGISTRATION_ACTUAL_COST = 6500;

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
