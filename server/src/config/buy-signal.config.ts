/**
 * Buy Signal scoring configuration.
 * Tweak these values without touching algorithm code.
 */

export const COMPONENT_MAX = {
    profitability: 40,
    velocity: 25,
    competition: 20,
} as const;

/**
 * Tier boundaries (inclusive lower bound).
 *
 * NOTE: Component maxes sum to 85, so STRONG_BUY (>=86) is unreachable
 * from raw components alone — by design. Only the alignment bonus
 * (granted when profitability is maxed AND velocity/competition near-max
 * AND zero risk penalties) can push a score into STRONG_BUY territory.
 * This enforces the spec's "rare, high-conviction" intent.
 */
export const TIER_BOUNDARIES = {
    LEAN_BUY: 51,
    BUY: 66,
    STRONG_BUY: 86,
} as const;

/** Awarded only when every component is ~maxed AND no risk penalties triggered. */
export const ALIGNMENT_BONUS = 15;

export const HARD_DISQUALIFIER_THRESHOLDS = {
    minRoiPct: 10,
    minMarginPct: 8,
} as const;

/** Final score cap when any hard disqualifier is present. */
export const HARD_DISQUALIFIER_CAP = 30;

/** ROI sub-score brackets (lowerBound exclusive, points). Sorted descending. */
export const ROI_BRACKETS: Array<{ minPct: number; points: number }> = [
    { minPct: 100, points: 25 },
    { minPct: 75, points: 22 },
    { minPct: 50, points: 18 },
    { minPct: 25, points: 12 },
    { minPct: 10, points: 5 },
    { minPct: 0, points: 0 },
];

/** Margin sub-score brackets. */
export const MARGIN_BRACKETS: Array<{ minPct: number; points: number }> = [
    { minPct: 35, points: 15 },
    { minPct: 25, points: 12 },
    { minPct: 15, points: 8 },
    { minPct: 8, points: 4 },
    { minPct: 0, points: 0 },
];

/** Sales velocity brackets (upper bound days, points). Sorted ascending. */
export const VELOCITY_BRACKETS: Array<{ maxDays: number; points: number }> = [
    { maxDays: 7, points: 25 },
    { maxDays: 14, points: 22 },
    { maxDays: 30, points: 18 },
    { maxDays: 60, points: 12 },
    { maxDays: 90, points: 6 },
    { maxDays: 180, points: 2 },
    { maxDays: Infinity, points: 0 },
];

export const FBA_COMPETITION_BRACKETS: Array<{ maxSellers: number; points: number }> = [
    { maxSellers: 1, points: 10 },
    { maxSellers: 3, points: 8 },
    { maxSellers: 6, points: 5 },
    { maxSellers: 10, points: 2 },
    { maxSellers: Infinity, points: 0 },
];

export const RISK_PENALTIES = {
    awdWinningBuyBox: 8,
    weightOver3lb: 3,
    weightOver5lb: 5,
    highPriceSpread: 2,
    lowAverageFeedback: 2,
    q4ApproachingSlowMover: 3,
} as const;

/**
 * Industry-average return rates by Amazon category (as decimals).
 * Effective profit gets multiplied by (1 - rate * costShare) — see
 * `buy-signal.service.ts` for the exact math. The category match is a
 * case-insensitive `includes` check against the BSR category string.
 */
export const CATEGORY_RETURN_RATES: Array<{ match: string; rate: number }> = [
    { match: 'clothing', rate: 0.30 },
    { match: 'shoes', rate: 0.30 },
    { match: 'jewelry', rate: 0.30 },
    { match: 'electronics', rate: 0.20 },
    { match: 'toys', rate: 0.12 },
    { match: 'sports', rate: 0.12 },
    { match: 'home', rate: 0.10 },
    { match: 'kitchen', rate: 0.10 },
    { match: 'beauty', rate: 0.08 },
    { match: 'health', rate: 0.05 },
    { match: 'grocery', rate: 0.03 },
    { match: 'gourmet food', rate: 0.03 },
    { match: 'book', rate: 0.04 },
];
export const DEFAULT_RETURN_RATE = 0.10;
