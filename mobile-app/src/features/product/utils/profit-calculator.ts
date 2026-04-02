/**
 * Profit Calculator
 * Calculates profit margins and estimates
 */

import type { ProductAnalysisResponse, MoneyValue } from '../../../types/api.types';
import type {
  ProductScoreFactors,
  ProductMetrics,
  FragilityLevel,
  SizeCategory,
} from '../types/product.types';
import {
  COMPETITION_LEVELS,
  POPULARITY_THRESHOLDS,
} from '../../../constants/scoring';

/**
 * Calculate profit margin from product analysis
 * Returns 0-100 score
 */
export function calculateProfitMargin(analysis: ProductAnalysisResponse): number {
  if (!analysis.pricing) return 0;
  
  const buyPrice = analysis.pricing.landedPrice?.amount || 
                   analysis.pricing.listPrice?.amount || 
                   0;
  
  if (buyPrice === 0) return 0;
  
  // Estimate sell price (simplified - in production, add fees, shipping, etc.)
  const sellPrice = buyPrice * 1.5; // 50% markup
  const profit = sellPrice - buyPrice;
  const margin = (profit / sellPrice) * 100;
  
  // Normalize to 0-100 score (30%+ margin = 100)
  return Math.min(100, (margin / 30) * 100);
}

/**
 * Calculate estimated profit amount
 */
export function calculateEstimatedProfit(analysis: ProductAnalysisResponse): number {
  if (!analysis.pricing) return 0;
  
  const buyPrice = analysis.pricing.landedPrice?.amount || 
                   analysis.pricing.listPrice?.amount || 
                   0;
  
  const sellPrice = buyPrice * 1.5;
  return sellPrice - buyPrice;
}

/**
 * Calculate competitiveness score (0-100)
 * Lower seller count = higher score
 */
export function calculateCompetitiveness(analysis: ProductAnalysisResponse): number {
  const sellerCount = analysis.offers?.totalOfferCount || 0;
  
  // No sellers = 100 (great opportunity)
  if (sellerCount === 0) return 100;
  
  // < 10 sellers = high score
  if (sellerCount < COMPETITION_LEVELS.LOW) {
    return 90 - (sellerCount / COMPETITION_LEVELS.LOW) * 10;
  }
  
  // 10-30 sellers = medium score
  if (sellerCount < COMPETITION_LEVELS.MEDIUM) {
    return 80 - ((sellerCount - COMPETITION_LEVELS.LOW) / 20) * 20;
  }
  
  // 30-100 sellers = low score
  if (sellerCount < COMPETITION_LEVELS.VERY_HIGH) {
    return 60 - ((sellerCount - COMPETITION_LEVELS.MEDIUM) / 70) * 40;
  }
  
  // > 100 sellers = very low score
  return Math.max(0, 20 - (sellerCount - COMPETITION_LEVELS.VERY_HIGH) / 100);
}

/**
 * Calculate popularity score from sales rank (0-100)
 * Lower rank = more popular = higher score
 */
export function calculatePopularity(analysis: ProductAnalysisResponse): number {
  const rank = analysis.salesRank?.primaryRank?.rank;
  
  if (!rank) return 50; // Default to middle score if unknown
  
  // Rank < 1000 = very popular (90-100)
  if (rank < POPULARITY_THRESHOLDS.VERY_POPULAR) {
    return 100 - (rank / POPULARITY_THRESHOLDS.VERY_POPULAR) * 10;
  }
  
  // Rank 1000-10000 = popular (70-90)
  if (rank < POPULARITY_THRESHOLDS.POPULAR) {
    return 90 - ((rank - POPULARITY_THRESHOLDS.VERY_POPULAR) / 9000) * 20;
  }
  
  // Rank 10000-100000 = moderate (40-70)
  if (rank < POPULARITY_THRESHOLDS.MODERATE) {
    return 70 - ((rank - POPULARITY_THRESHOLDS.POPULAR) / 90000) * 30;
  }
  
  // Rank 100000-1000000 = low (10-40)
  if (rank < POPULARITY_THRESHOLDS.LOW) {
    return 40 - ((rank - POPULARITY_THRESHOLDS.MODERATE) / 900000) * 30;
  }
  
  // Rank > 1000000 = very low (0-10)
  return Math.max(0, 10 - (rank - POPULARITY_THRESHOLDS.LOW) / 1000000);
}

/**
 * Check if approval is required
 * Simplified version - checks category keywords
 */
export function checkApprovalRequired(analysis: ProductAnalysisResponse): boolean {
  const category = analysis.catalogItem?.productGroup?.toLowerCase() || '';
  const title = analysis.catalogItem?.title?.toLowerCase() || '';
  
  // Common restricted categories
  const restrictedKeywords = [
    'collectible',
    'fine art',
    'jewelry',
    'watch',
    'luxury',
    'automotive',
    'grocery',
    'food',
    'health',
    'beauty',
  ];
  
  return restrictedKeywords.some(
    (keyword) => category.includes(keyword) || title.includes(keyword)
  );
}

/**
 * Infer fragility from product category
 */
export function inferFragility(analysis: ProductAnalysisResponse): FragilityLevel {
  const category = analysis.catalogItem?.productGroup?.toLowerCase() || '';
  const title = analysis.catalogItem?.title?.toLowerCase() || '';
  
  const combined = `${category} ${title}`;
  
  // High fragility
  if (
    combined.includes('glass') ||
    combined.includes('ceramic') ||
    combined.includes('fragile') ||
    combined.includes('electronics')
  ) {
    return 'high';
  }
  
  // Medium fragility
  if (
    combined.includes('plastic') ||
    combined.includes('home') ||
    combined.includes('kitchen')
  ) {
    return 'medium';
  }
  
  // Low fragility (default)
  return 'low';
}

/**
 * Infer size category from product type
 */
export function inferSize(analysis: ProductAnalysisResponse): SizeCategory {
  const category = analysis.catalogItem?.productGroup?.toLowerCase() || '';
  const title = analysis.catalogItem?.title?.toLowerCase() || '';
  
  const combined = `${category} ${title}`;
  
  // Oversized
  if (
    combined.includes('furniture') ||
    combined.includes('large') ||
    combined.includes('oversized')
  ) {
    return 'oversized';
  }
  
  // Large
  if (
    combined.includes('appliance') ||
    combined.includes('equipment')
  ) {
    return 'large';
  }
  
  // Small
  if (
    combined.includes('accessory') ||
    combined.includes('small') ||
    combined.includes('compact')
  ) {
    return 'small';
  }
  
  // Medium (default)
  return 'medium';
}

/**
 * Extract all score factors from product analysis
 */
export function extractScoreFactors(
  analysis: ProductAnalysisResponse
): ProductScoreFactors {
  return {
    profitMargin: calculateProfitMargin(analysis),
    competitiveness: calculateCompetitiveness(analysis),
    popularity: calculatePopularity(analysis),
    approvalRequired: checkApprovalRequired(analysis),
    fragility: inferFragility(analysis),
    size: inferSize(analysis),
  };
}

/**
 * Get competition level label
 */
export function getCompetitionLevel(
  sellerCount: number
): 'low' | 'medium' | 'high' | 'very-high' {
  if (sellerCount < COMPETITION_LEVELS.LOW) return 'low';
  if (sellerCount < COMPETITION_LEVELS.MEDIUM) return 'medium';
  if (sellerCount < COMPETITION_LEVELS.HIGH) return 'high';
  return 'very-high';
}

/**
 * Get popularity level label
 */
export function getPopularityLevel(
  rank: number
): 'very-popular' | 'popular' | 'moderate' | 'low' {
  if (rank < POPULARITY_THRESHOLDS.VERY_POPULAR) return 'very-popular';
  if (rank < POPULARITY_THRESHOLDS.POPULAR) return 'popular';
  if (rank < POPULARITY_THRESHOLDS.MODERATE) return 'moderate';
  return 'low';
}

/**
 * Build complete product metrics
 */
export function buildProductMetrics(
  analysis: ProductAnalysisResponse,
  factors: ProductScoreFactors
): ProductMetrics {
  const sellerCount = analysis.offers?.totalOfferCount || 0;
  const rank = analysis.salesRank?.primaryRank?.rank || 1000000;
  
  return {
    estimatedProfit: calculateEstimatedProfit(analysis),
    profitMargin: factors.profitMargin,
    sellerCount,
    competitionLevel: getCompetitionLevel(sellerCount),
    popularityLevel: getPopularityLevel(rank),
    approvalRequired: factors.approvalRequired,
    fragility: factors.fragility,
    size: factors.size,
  };
}
