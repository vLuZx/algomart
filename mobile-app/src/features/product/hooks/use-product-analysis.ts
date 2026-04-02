/**
 * Product Analysis Hook
 * TanStack Query wrapper for product analysis API
 */

import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { productApiService } from '../../../services/product-api.service';
import type { ProductAnalysisResponse } from '../../../types/api.types';

/**
 * Fetch product analysis by barcode
 */
export function useProductAnalysis(
  barcode: string | null
): UseQueryResult<ProductAnalysisResponse, Error> {
  return useQuery({
    queryKey: ['product-analysis', barcode],
    queryFn: () => productApiService.getAnalysis(barcode!),
    enabled: !!barcode, // Only fetch if barcode is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime)
    retry: 2,
  });
}

/**
 * Prefetch product analysis (for rapid scanning)
 */
export function usePrefetchProductAnalysis() {
  const queryClient = useQueryClient();
  
  return (barcode: string) => {
    queryClient.prefetchQuery({
      queryKey: ['product-analysis', barcode],
      queryFn: () => productApiService.getAnalysis(barcode),
      staleTime: 5 * 60 * 1000,
    });
  };
}
