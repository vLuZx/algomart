/**
 * Product API Service
 * Handles product-related backend calls
 */

import { apiService } from './api.service';
import type { ProductAnalysisResponse } from '../types/api.types';

class ProductApiService {
  /**
   * Get comprehensive product analysis by barcode
   * This is the primary endpoint for the app
   */
  async getAnalysis(barcode: string): Promise<ProductAnalysisResponse> {
    return apiService.get<ProductAnalysisResponse>(
      `/api/amazon/product-analysis/${barcode}`
    );
  }

  /**
   * Get catalog item by ASIN
   */
  async getCatalogItem(asin: string) {
    return apiService.get(`/api/amazon/catalog/${asin}`);
  }

  /**
   * Get pricing by ASIN
   */
  async getPricing(asin: string) {
    return apiService.get(`/api/amazon/pricing/${asin}`);
  }

  /**
   * Get offers by ASIN
   */
  async getOffers(asin: string) {
    return apiService.get(`/api/amazon/offers/${asin}`);
  }

  /**
   * Get sales rank by ASIN
   */
  async getSalesRank(asin: string) {
    return apiService.get(`/api/amazon/rank/${asin}`);
  }
}

export const productApiService = new ProductApiService();
