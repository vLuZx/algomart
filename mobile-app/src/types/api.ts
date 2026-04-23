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

// --- GET /api/amazon/insights ---

export type ProductInsightField =
  | 'summary'
  | 'identifiers'
  | 'images'
  | 'dimensions'
  | 'salesRank'
  | 'bsr'
  | 'pricing'
  | 'competitivePricing'
  | 'offers'
  | 'fees';

export interface ProductInsightsBsr {
  rank: number;
  category: string;
  link?: string;
}

export interface ProductInsightsResponse {
  asin: string;
  marketplaceId: string;
  fields: Partial<Record<ProductInsightField, unknown>>;
  errors?: Partial<Record<ProductInsightField, string>>;
}

// --- POST /api/amazon/fees/estimate ---

export interface FeesEstimateBreakdownItem {
  type: string;
  amount: number;
}

export interface FeesEstimate {
  asin: string;
  marketplaceId: string;
  currency: string;
  listingPrice: number;
  totalFees: number | null;
  feeBreakdown: FeesEstimateBreakdownItem[];
  status: string | null;
  error?: string;
}

// --- Combined result returned by the frontend service ---

export interface ProductLookupResult {
  asin: string;
  title: string | null;
  brand: string | null;
  manufacturer: string | null;
  price: number | null;
  currency: string | null;
  // Enrichment (best-effort; may be null when Amazon does not return data)
  category: string | null;
  image: string | null;
  dimensions: string | null;
  weight: string | null;
  salesRank: number | null;
  bsr: ProductInsightsBsr | null;
  offersCount: number | null;
  amazonFees: number | null;
  feeBreakdown: FeesEstimateBreakdownItem[];
}
