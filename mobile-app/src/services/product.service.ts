/**
 * Product Service
 *
 * The mobile app makes exactly one call to the backend per product:
 * `GET /api/calculations/product`. Everything the UI needs (metadata,
 * computed fees, profit, buy-signal, fetched market data) is returned
 * by that endpoint.
 */

import { api } from './api';
import type { ProductCalculation } from '../types/api';

/**
 * GET /api/calculations/product
 * Aggregated profit / fees / buy-signal calculation for a single product.
 */
export async function fetchProductCalculation(params: {
  barcode?: string;
  asin?: string;
  foundPrice: number;
  estimatedQuantity?: number;
  costOfGoods?: number;
  marketplaceId?: string;
}): Promise<ProductCalculation> {
  const query: Record<string, string | number> = { foundPrice: params.foundPrice };
  if (params.barcode) query.barcode = params.barcode;
  if (params.asin) query.asin = params.asin;
  if (typeof params.estimatedQuantity === 'number') query.estimatedQuantity = params.estimatedQuantity;
  if (typeof params.costOfGoods === 'number') query.costOfGoods = params.costOfGoods;
  if (params.marketplaceId) query.marketplaceId = params.marketplaceId;

  const { data } = await api.get<ProductCalculation>('/api/calculations/product', {
    params: query,
  });
  return data;
}
