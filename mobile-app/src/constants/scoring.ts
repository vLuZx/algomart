/**
 * Product Scoring Constants
 * Weights and penalties for ranking algorithm
 */

// Scoring weights (must sum to 1.0)
export const SCORING_WEIGHTS = {
  PROFIT_MARGIN: 0.35,
  COMPETITIVENESS: 0.25,
  POPULARITY: 0.20,
  LOGISTICS: 0.10,
  APPROVAL: 0.10,
} as const;

// Penalties
export const APPROVAL_PENALTY = -40; // Heavy penalty for approval-required items
export const FRAGILITY_PENALTY = {
  low: 0,
  medium: -5,
  high: -15,
} as const;

export const SIZE_PENALTY = {
  small: 0,
  medium: -3,
  large: -8,
  oversized: -20,
} as const;

// Thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 70,
  FAIR: 60,
  POOR: 50,
} as const;

// Competition thresholds (number of sellers)
export const COMPETITION_LEVELS = {
  LOW: 10,      // < 10 sellers = low competition
  MEDIUM: 30,   // 10-30 sellers = medium
  HIGH: 50,     // 30-50 = high
  VERY_HIGH: 100, // > 100 = very high
} as const;

// Sales rank thresholds (lower is better)
export const POPULARITY_THRESHOLDS = {
  VERY_POPULAR: 1000,
  POPULAR: 10000,
  MODERATE: 100000,
  LOW: 1000000,
} as const;
