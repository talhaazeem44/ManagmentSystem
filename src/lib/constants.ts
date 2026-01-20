export const HONDA_BIKE_MODELS = [
    'CD70',
    'DREAM',
    'PRIDOR',
    'CG 125',
    'CG125S.SE',
    'CB125F.SE',
    'CB150F'
] as const;

export type HondaBikeModel = typeof HONDA_BIKE_MODELS[number];

export const BIKE_COLORS = [
    'Red',
    'Black',
    'Blue',
    'Silver',
    'White'
] as const;

export type BikeColor = typeof BIKE_COLORS[number];
