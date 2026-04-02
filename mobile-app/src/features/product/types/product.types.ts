/**
 * Product Types
 */

import type { ProductAnalysisResponse } from '../../../types/api.types';

export type ProductGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type ProductRecommendation = 'excellent' | 'good' | 'fair' | 'poor';

export type FragilityLevel = 'low' | 'medium' | 'high';

export type SizeCategory = 'small' | 'medium' | 'large' | 'oversized';

export interface ProductScore {
  total: number; // 0-100
  grade: ProductGrade;
  recommendation: ProductRecommendation;
  breakdown: {
    profit: number;
    competition: number;
    popularity: number;
    logistics: number;
    approval: number;
  };
}

export interface ProductScoreFactors {
  profitMargin: number; // 0-100
  competitiveness: number; // 0-100 (lower is better)
  popularity: number; // 0-100 (higher is better)
  approvalRequired: boolean;
  fragility: FragilityLevel;
  size: SizeCategory;
}

export interface EnrichedProduct {
  barcode: string;
  analysis: ProductAnalysisResponse;
  score: ProductScore;
  factors: ProductScoreFactors;
  rank?: number; // Position in sorted list
}

export interface ProductMetrics {
  estimatedProfit: number;
  profitMargin: number;
  sellerCount: number;
  competitionLevel: 'low' | 'medium' | 'high' | 'very-high';
  popularityLevel: 'very-popular' | 'popular' | 'moderate' | 'low';
  approvalRequired: boolean;
  fragility: FragilityLevel;
  size: SizeCategory;
}
