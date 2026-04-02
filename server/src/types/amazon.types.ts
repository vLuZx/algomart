// Amazon SP-API Type Definitions

export type BarcodeType = 'UPC' | 'EAN' | 'UNKNOWN';

export interface AmazonCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  marketplaceId: string;
  endpoint: string;
}

export interface LWAAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// Catalog Item Types
export interface CatalogItemIdentifier {
  identifierType: string;
  identifier: string;
}

export interface CatalogItemImage {
  link: string;
  height?: number;
  width?: number;
  variant?: string;
}

export interface SalesRank {
  title: string;
  link?: string;
  rank: number;
}

export interface CatalogItemDimensions {
  height?: { value: number; unit: string };
  length?: { value: number; unit: string };
  width?: { value: number; unit: string };
  weight?: { value: number; unit: string };
}

export interface CatalogItemAttributes {
  brand?: string[];
  manufacturer?: string[];
  productGroup?: string[];
  productType?: string;
  title?: string;
  color?: string[];
  size?: string[];
  model?: string[];
  partNumber?: string[];
}

export interface CatalogItem {
  asin: string;
  identifiers?: CatalogItemIdentifier[];
  images?: CatalogItemImage[];
  productTypes?: { productType: string }[];
  salesRanks?: SalesRank[];
  summaries?: {
    marketplaceId: string;
    brandName?: string;
    browseClassification?: {
      displayName: string;
      classificationId: string;
    };
    colorName?: string;
    itemName?: string;
    manufacturer?: string;
    modelNumber?: string;
    sizeName?: string;
    styleName?: string;
  }[];
  attributes?: any;
  dimensions?: CatalogItemDimensions[];
}

export interface CatalogSearchResponse {
  items?: CatalogItem[];
  numberOfResults?: number;
  pagination?: {
    nextToken?: string;
  };
}

// Normalized Catalog Item for API Response
export interface NormalizedCatalogItem {
  asin: string;
  title: string | null;
  brand: string | null;
  manufacturer: string | null;
  image: string | null;
  productGroup: string | null;
  productType: string | null;
  identifiers: {
    type: string;
    value: string;
  }[];
  salesRanks: {
    category: string;
    rank: number;
  }[] | null;
  rawData?: CatalogItem;
}

// Pricing Types
export interface MoneyType {
  CurrencyCode: string;
  Amount: number;
}

export interface PriceDetail {
  ListingPrice?: MoneyType;
  LandedPrice?: MoneyType;
  Shipping?: MoneyType;
}

export interface OfferDetail {
  offerType?: string;
  BuyingPrice?: PriceDetail;
  RegularPrice?: MoneyType;
  businessPrice?: MoneyType;
  quantityDiscountPrices?: any[];
}

export interface LowestPricedOffer {
  condition: string;
  fulfillmentChannel: string;
  offerType?: string;
  ListingPrice?: MoneyType;
  Shipping?: MoneyType;
  LandedPrice?: MoneyType;
}

export interface ProductPricingItem {
  ASIN: string;
  status: string;
  Product?: {
    Identifiers: {
      MarketplaceASIN: {
        MarketplaceId: string;
        ASIN: string;
      };
    };
    Offers?: OfferDetail[];
    CompetitivePricing?: {
      CompetitivePrices?: any[];
      NumberOfOfferListings?: any[];
    };
    SalesRankings?: {
      ProductCategoryId: string;
      Rank: number;
    }[];
  };
}

export interface ProductPricingResponse {
  payload?: ProductPricingItem[];
  errors?: Array<{
    code: string;
    message: string;
    details?: string;
  }>;
}

// Normalized Pricing Response
export interface NormalizedPricing {
  asin: string;
  listingPrice: {
    amount: number;
    currency: string;
  } | null;
  landedPrice: {
    amount: number;
    currency: string;
  } | null;
  lowestPrice: {
    amount: number;
    currency: string;
  } | null;
  currency: string;
  buyBoxPrice: {
    amount: number;
    currency: string;
  } | null;
  rawData?: ProductPricingItem;
}

// Offers/Competitive Summary Types
export interface CompetitivePrice {
  CompetitivePriceId: string;
  Price: {
    LandedPrice?: MoneyType;
    ListingPrice?: MoneyType;
    Shipping?: MoneyType;
  };
  condition: string;
  subcondition: string;
  offerType?: string;
  quantityTier?: number;
  quantityDiscountType?: string;
  sellerId?: string;
  belongsToRequester: boolean;
}

export interface OfferCount {
  condition: string;
  fulfillmentChannel: string;
  offerCount: number;
}

export interface CompetitivePricingResponse {
  payload?: Array<{
    ASIN: string;
    status: string;
    Product?: {
      Identifiers: {
        MarketplaceASIN: {
          MarketplaceId: string;
          ASIN: string;
        };
      };
      CompetitivePricing?: {
        CompetitivePrices?: CompetitivePrice[];
        NumberOfOfferListings?: OfferCount[];
      };
    };
  }>;
  errors?: Array<{
    code: string;
    message: string;
    details?: string;
  }>;
}

// Normalized Offers Summary
export interface NormalizedOffersSummary {
  asin: string;
  offerCounts: {
    condition: string;
    fulfillmentChannel: string;
    count: number;
  }[];
  competitivePrices: {
    condition: string;
    amount: number;
    currency: string;
    fulfillmentChannel?: string;
  }[];
  totalOffers: number;
  rawData?: any;
}

// Sales Rank Response
export interface NormalizedSalesRank {
  asin: string;
  salesRanks: {
    category: string;
    rank: number;
  }[];
  primaryCategory: string | null;
  primaryRank: number | null;
  rawData?: CatalogItem;
}

// Combined Product Analysis
export interface ProductAnalysis {
  barcode: string;
  barcodeType: BarcodeType;
  catalogItem: NormalizedCatalogItem | null;
  pricing: NormalizedPricing | null;
  offers: NormalizedOffersSummary | null;
  salesRank: NormalizedSalesRank | null;
  timestamp: string;
  errors?: string[];
}

// API Error Response
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}
