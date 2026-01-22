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

export const BIKE_BOOK_PRICES: Record<string, number> = {
    'CD70': 151742,
    'CG 125': 226765,
    'PRIDOR': 201158,
    'CG125S.SE': 281406,
    'CB150F': 477118,
    'CG150 2-Tone': 437880,
    'CB125F.SE': 375781,
    'DREAM': 160000, // Reasonable default if not provided
};

export const BIKE_COLORS = [
    'Red',
    'Black',
    'Blue',
    'Silver',
    'White'
] as const;

export type BikeColor = typeof BIKE_COLORS[number];
