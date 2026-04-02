/**
 * Product Scoring Hook
 * Calculates product score from analysis data
 */

import { useMemo } from 'react';
import { calculateProductScore } from '../utils/product-scoring';
import { extractScoreFactors, buildProductMetrics } from '../utils/profit-calculator';
import type { ProductAnalysisResponse } from '../../../types/api.types';
import type { ProductScore, ProductScoreFactors, ProductMetrics } from '../types/product.types';

interface ProductScoringResult {
  score: ProductScore | null;
  factors: ProductScoreFactors | null;
  metrics: ProductMetrics | null;
}

/**
 * Calculate product score and metrics from analysis
 */
export function useProductScoring(
  analysis: ProductAnalysisResponse | undefined
): ProductScoringResult {
  return useMemo(() => {
    if (!analysis || !analysis.catalogItem) {
      return {
        score: null,
        factors: null,
        metrics: null,
      };
    }

    // Extract factors from backend response
    const factors = extractScoreFactors(analysis);
    
    // Calculate score
    const score = calculateProductScore(factors);
    
    // Build metrics
    const metrics = buildProductMetrics(analysis, factors);

    return { score, factors, metrics };
  }, [analysis]);
}
