export const HONDA_BIKE_MODELS = [
    'CD70',
    'DREAM',
    'PRIDOR',
    'CG 125',
    'CG125S.SE',
    'CG125GOLD',
    'CB125F.SE',
    'CB150F',
    'CB150FSE',
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
    'CB150F': 474000,
    'CB150FSE': 478000,
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
    'CB150F': 500000,
    'CB150FSE': 504000,
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
    'CB150FSE': 20000,
    'CG150 2-Tone': 20000,
};


// Actual registration cost paid to government
export const REGISTRATION_ACTUAL_COST = 6000; // default (CD70, DREAM, PRIDOR)
export const REGISTRATION_ACTUAL_COST_BY_MODEL: Record<string, number> = {
    'CG 125':       6500,
    'CG125S.SE':    6500,
    'CG125GOLD':    6500,
    'CB125F.SE':    6500,
    'CB150F':       6500,
    'CB150FSE':     6500,
    'CG150 2-Tone': 6500,
};

// Models where Khata stock is sometimes given to non-dealers at plain
// unit/book price. For these, margin must be measured directly against the
// book price with NO base margin added — selling at exactly book price means
// zero profit. (For every other model, Khata margin = base margin + (price
// − retail standard price), which assumes a dealer paying near retail.)
export const KHATA_BOOK_PRICE_MODELS: string[] = ['PRIDOR', 'CB150F', 'CG150 2-Tone', 'CG125S.SE'];

export function getKhataMargin(model: string, pricePerUnit: number): { referencePrice: number; baseMargin: number; margin: number } {
    if (KHATA_BOOK_PRICE_MODELS.includes(model)) {
        const bookPrice = BIKE_BOOK_PRICES[model] || 0;
        return { referencePrice: bookPrice, baseMargin: 0, margin: pricePerUnit - bookPrice };
    }
    const standardPrice = BIKE_STANDARD_PRICES[model] || 0;
    const baseMargin = BIKE_UNIT_MARGINS[model] || 0;
    return { referencePrice: standardPrice, baseMargin, margin: baseMargin + (pricePerUnit - standardPrice) };
}

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
