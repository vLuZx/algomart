/**
 * API Response Types
 * Matches backend response structure
 */

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ProductAnalysisResponse {
  barcode: string;
  barcodeType: 'UPC' | 'EAN' | 'UNKNOWN';
  catalogItem: CatalogItem | null;
  pricing: PricingData | null;
  offers: OffersData | null;
  salesRank: SalesRankData | null;
  timestamp: string;
  errors?: string[];
}

export interface CatalogItem {
  asin: string;
  title: string | null;
  brand: string | null;
  manufacturer: string | null;
  image: string | null;
  productGroup: string | null;
  productType: string | null;
}

export interface PricingData {
  listPrice: MoneyValue | null;
  landedPrice: MoneyValue | null;
  shipping: MoneyValue | null;
  condition: string;
  fulfillmentChannel: string;
}

export interface MoneyValue {
  amount: number;
  currencyCode: string;
}

export interface OffersData {
  asin: string;
  newOffers: OfferCounts;
  usedOffers: OfferCounts;
  buyBoxPrice: MoneyValue | null;
  totalOfferCount: number;
}

export interface OfferCounts {
  amazon: number;
  fba: number;
  fbm: number;
}

export interface SalesRankData {
  primaryRank: {
    category: string;
    rank: number;
    link?: string;
  } | null;
  additionalRanks?: Array<{
    category: string;
    rank: number;
  }>;
}
