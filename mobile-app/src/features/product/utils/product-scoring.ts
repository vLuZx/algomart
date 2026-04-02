/**
 * Product Scoring Algorithm
 * Core business logic for ranking products
 */

import {
  SCORING_WEIGHTS,
  APPROVAL_PENALTY,
  FRAGILITY_PENALTY,
  SIZE_PENALTY,
  SCORE_THRESHOLDS,
} from '../../../constants/scoring';
import type {
  ProductScore,
  ProductScoreFactors,
  ProductGrade,
  ProductRecommendation,
} from '../types/product.types';

/**
 * Calculate comprehensive product score
 * Returns score 0-100 with grade and recommendation
 */
export function calculateProductScore(factors: ProductScoreFactors): ProductScore {
  // Base scores (0-100)
  const profitScore = Math.max(0, Math.min(100, factors.profitMargin));
  const competitionScore = 100 - Math.max(0, Math.min(100, factors.competitiveness));
  const popularityScore = Math.max(0, Math.min(100, factors.popularity));
  
  // Logistics score (starts at 100, penalties applied)
  let logisticsScore = 100;
  logisticsScore += FRAGILITY_PENALTY[factors.fragility];
  logisticsScore += SIZE_PENALTY[factors.size];
  logisticsScore = Math.max(0, Math.min(100, logisticsScore));
  
  // Approval score (heavy penalty if required)
  const approvalScore = factors.approvalRequired ? APPROVAL_PENALTY : 0;
  
  // Calculate weighted total
  let total = 
    profitScore * SCORING_WEIGHTS.PROFIT_MARGIN +
    competitionScore * SCORING_WEIGHTS.COMPETITIVENESS +
    popularityScore * SCORING_WEIGHTS.POPULARITY +
    logisticsScore * SCORING_WEIGHTS.LOGISTICS;
  
  // Add approval penalty (can go negative)
  total += approvalScore * SCORING_WEIGHTS.APPROVAL;
  
  // Clamp final score to 0-100
  total = Math.max(0, Math.min(100, total));
  
  // Determine grade
  const grade = calculateGrade(total);
  
  // Determine recommendation
  const recommendation = calculateRecommendation(total, factors.approvalRequired);
  
  return {
    total: Math.round(total * 10) / 10, // Round to 1 decimal
    grade,
    recommendation,
    breakdown: {
      profit: Math.round(profitScore * SCORING_WEIGHTS.PROFIT_MARGIN * 10) / 10,
      competition: Math.round(competitionScore * SCORING_WEIGHTS.COMPETITIVENESS * 10) / 10,
      popularity: Math.round(popularityScore * SCORING_WEIGHTS.POPULARITY * 10) / 10,
      logistics: Math.round(logisticsScore * SCORING_WEIGHTS.LOGISTICS * 10) / 10,
      approval: Math.round(approvalScore * SCORING_WEIGHTS.APPROVAL * 10) / 10,
    },
  };
}

/**
 * Calculate letter grade from score
 */
function calculateGrade(score: number): ProductGrade {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'A';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'B';
  if (score >= SCORE_THRESHOLDS.FAIR) return 'C';
  if (score >= SCORE_THRESHOLDS.POOR) return 'D';
  return 'F';
}

/**
 * Calculate recommendation from score
 * Approval-required items are always rated lower
 */
function calculateRecommendation(
  score: number,
  approvalRequired: boolean
): ProductRecommendation {
  // Approval-required items can't be "excellent"
  if (approvalRequired) {
    if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
    if (score >= SCORE_THRESHOLDS.FAIR) return 'fair';
    return 'poor';
  }
  
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (score >= SCORE_THRESHOLDS.GOOD) return 'good';
  if (score >= SCORE_THRESHOLDS.FAIR) return 'fair';
  return 'poor';
}

/**
 * Get color for score visualization
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return '#34C759'; // Green
  if (score >= SCORE_THRESHOLDS.GOOD) return '#32D74B'; // Light green
  if (score >= SCORE_THRESHOLDS.FAIR) return '#FF9500'; // Orange
  return '#FF453A'; // Red
}

/**
 * Get color for grade badge
 */
export function getGradeColor(grade: ProductGrade): string {
  switch (grade) {
    case 'A': return '#34C759';
    case 'B': return '#32D74B';
    case 'C': return '#FF9500';
    case 'D': return '#FF6B00';
    case 'F': return '#FF453A';
  }
}
