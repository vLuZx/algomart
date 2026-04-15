/**
 * Product Service
 *
 * Calls two backend endpoints in sequence:
 *   1. Catalog search by barcode → extracts ASIN + summary
 *   2. Pricing by ASIN         → extracts price
 *
 * Returns a single, flat ProductLookupResult.
 */

import { api } from './api';
import type {
  CatalogSearchResponse,
  PricingResponse,
  ProductLookupResult,
} from '../types/api';

/** US marketplace – matches the backend's SP_API_MARKETPLACE_ID */
const MARKETPLACE_ID = 'ATVPDKIKX0DER';

// ── Individual endpoint calls ────────────────────────────────────────

/** GET /api/amazon/catalog/barcode/:code */
export async function fetchCatalog(barcode: string): Promise<CatalogSearchResponse> {
  const { data } = await api.get<CatalogSearchResponse>(
    `/api/amazon/catalog/barcode/${barcode}`,
  );
  return data;
}

/** GET /api/amazon/pricing/price?identifiers=…&type=ASIN&marketplaceId=… */
export async function fetchPricing(asin: string): Promise<PricingResponse[]> {
  const { data } = await api.get<PricingResponse[]>(
    '/api/amazon/pricing/price',
    {
      params: {
        identifiers: asin,
        type: 'ASIN',
        marketplaceId: MARKETPLACE_ID,
      },
    },
  );
  return data;
}

// ── Combined lookup ──────────────────────────────────────────────────

/**
 * Look up a product by barcode:
 *   barcode → catalog (ASIN + summary) → pricing
 */
export async function lookupByBarcode(barcode: string): Promise<ProductLookupResult> {
  // 1. Catalog search
  const catalog = await fetchCatalog(barcode);

  if (catalog.numberOfResults === 0 || !catalog.items[0]) {
    throw new Error(`No product found for barcode ${barcode}`);
  }

  const item = catalog.items[0];
  const summary = item.summaries?.[0] ?? null;

  // 2. Pricing lookup
  let price: number | null = null;
  let currency: string | null = null;

  try {
    const pricing = await fetchPricing(item.asin);
    if (pricing.length > 0) {
      price = pricing[0].price;
      currency = pricing[0].currency || null;
    }
  } catch {
    // Pricing may not be available; still return catalog data.
    console.warn('Pricing lookup failed for ASIN', item.asin);
  }

  return {
    asin: item.asin,
    title: summary?.itemName ?? null,
    brand: summary?.brand ?? null,
    manufacturer: summary?.manufacturer ?? null,
    price,
    currency,
  };
}
