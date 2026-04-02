/**
 * Product Ranking Utility
 * Sorts products by score
 */

import type { EnrichedProduct } from '../types/product.types';

/**
 * Sort products by score (descending)
 * Best products first (index 0 = rank 1)
 */
export function rankProducts(products: EnrichedProduct[]): EnrichedProduct[] {
  const sorted = [...products].sort((a, b) => {
    // Primary sort: by total score (descending)
    if (b.score.total !== a.score.total) {
      return b.score.total - a.score.total;
    }
    
    // Secondary sort: by profit margin (descending)
    return b.factors.profitMargin - a.factors.profitMargin;
  });
  
  // Assign ranks
  return sorted.map((product, index) => ({
    ...product,
    rank: index + 1,
  }));
}

/**
 * Get top N products
 */
export function getTopProducts(
  products: EnrichedProduct[],
  limit: number
): EnrichedProduct[] {
  const ranked = rankProducts(products);
  return ranked.slice(0, limit);
}

/**
 * Filter products by minimum score
 */
export function filterByMinScore(
  products: EnrichedProduct[],
  minScore: number
): EnrichedProduct[] {
  return products.filter((p) => p.score.total >= minScore);
}

/**
 * Paginate products
 */
export function paginateProducts(
  products: EnrichedProduct[],
  page: number,
  pageSize: number
): {
  items: EnrichedProduct[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
} {
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = products.slice(startIndex, endIndex);
  
  return {
    items,
    page,
    pageSize,
    totalPages,
    totalItems,
  };
}
