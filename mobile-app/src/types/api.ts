/**
 * API response types.
 * Matches the actual shapes returned by the backend endpoints documented
 * in agent/server-structure.md.
 */

// --- GET /api/amazon/catalog/barcode/:code ---

export interface CatalogItemSummary {
  marketplaceId: string;
  brand?: string;
  itemName?: string;
  manufacturer?: string;
  packageQuantity?: number;
  websiteDisplayGroup?: string;
  websiteDisplayGroupName?: string;
}

export interface CatalogSearchItem {
  asin: string;
  summaries?: CatalogItemSummary[];
}

export interface CatalogSearchResponse {
  numberOfResults: number;
  items: CatalogSearchItem[];
}

// --- GET /api/amazon/pricing/price ---

export interface PricingResponse {
  identifier: string;
  price: number | null;
  currency: string;
  condition?: string;
  offersCount?: number;
}

// --- Combined result returned by the frontend service ---

export interface ProductLookupResult {
  asin: string;
  title: string | null;
  brand: string | null;
  manufacturer: string | null;
  price: number | null;
  currency: string | null;
}
