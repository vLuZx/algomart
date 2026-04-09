/**
 * Session Products Hook
 * Manages product list with ranking and pagination
 */

import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { productApiService } from '../../../services/product-api.service';
import { rankProducts, paginateProducts } from '../../product/utils/product-ranking';
import { calculateProductScore } from '../../product/utils/product-scoring';
import { extractScoreFactors } from '../../product/utils/profit-calculator';
import { useSession } from './use-session';
import { PRODUCTS_PER_PAGE } from '../../../constants/config';
import type { EnrichedProduct } from '../../product/types/product.types';
import type { ProductAnalysisResponse } from '../../../types/api.types';

interface UseSessionProductsOptions {
  sessionId: string;
  pageSize?: number;
}

export function useSessionProducts(options: UseSessionProductsOptions) {
  const { sessionId, pageSize = PRODUCTS_PER_PAGE } = options;
  const [currentPage, setCurrentPage] = useState(1);
  
  const { session } = useSession(sessionId);
  const scannedBarcodes = session?.scannedProducts.map(p => p.barcode) || [];

  // Fetch all products in parallel
  const productQueries = useQueries({
    queries: scannedBarcodes.map((barcode: string) => ({
      queryKey: ['product-analysis', barcode],
      queryFn: () => productApiService.getAnalysis(barcode),
      staleTime: 60 * 1000,
    })),
  });

  // Check if any queries are loading
  const isLoading = productQueries.some((q) => q.isLoading);
  
  // Check if any queries have errors
  const hasError = productQueries.some((q) => q.isError);

  // Enrich products with scores and rank
  const enrichedProducts = useMemo(() => {
    const products: EnrichedProduct[] = [];
    
    productQueries.forEach((query, index) => {
      if (query.data) {
        const analysis = query.data as ProductAnalysisResponse;
        const factors = extractScoreFactors(analysis);
        const score = calculateProductScore(factors);
        
        products.push({
          barcode: scannedBarcodes[index],
          analysis,
          score,
          factors,
        });
      }
    });
    
    // Rank products by score
    return rankProducts(products);
  }, [productQueries, scannedBarcodes]);

  // Paginate products
  const paginatedData = useMemo(() => {
    return paginateProducts(enrichedProducts, currentPage, pageSize);
  }, [enrichedProducts, currentPage, pageSize]);

  return {
    products: paginatedData.items,
    allProducts: enrichedProducts,
    isLoading,
    hasError,
    currentPage,
    totalPages: paginatedData.totalPages,
    totalItems: paginatedData.totalItems,
    pageSize: paginatedData.pageSize,
    setPage: setCurrentPage,
  };
}
