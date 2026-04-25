// Request parameter types
export type GetPricingParams = {
  identifiers: string[];
  type: 'ASIN' | 'SKU';
  marketplaceId: string;
  itemCondition?: string;
  customerType?: string;
};

export type GetCompetitivePricingParams = {
  identifiers: string[];
  type: 'ASIN' | 'SKU';
  marketplaceId: string;
};

export type GetOffersParams = {
  marketplaceId: string;
  itemCondition?: string;
  customerType?: string;
};

export type GetCompetitiveSummaryBatchParams = {
  requests: Array<{ asin: string; marketplaceId: string }>;
};

// Response types (minimal, normalized)
export type PricingResponse = {
  identifier: string;
  price: number;
  currency: string;
  condition?: string;
  offersCount?: number;
};

export type OffersResponse = {
  identifier: string;
  offers: Array<{
    price: number;
    currency: string;
    sellerId: string;
    condition: string;
    isPrime: boolean;
  }>;
};

export type CompetitiveSummaryBatchResponse = {
  asin: string;
  marketplaceId: string;
  summary: {
    lowestPrice: number;
    currency: string;
    offerCount: number;
  } | null;
  error?: string;
};
