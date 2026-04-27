/**
 * API response types.
 * Matches the actual shapes returned by the backend endpoints documented
 * in agent/server-structure.md.
 */

// --- GET /api/calculations/product ---

export interface ProductCalculationProfit {
  netProfitPerUnit: number | null;
  netProfitTotal: number | null;
  roi: number | null;
  marginPercentage: number | null;
  totalFeesPerUnit: number | null;
  error?: string;
  message?: string;
}

export interface ProductCalculationComputed {
  amazonPrice: number;
  costOfGoodsPerUnit: number | null;
  referralFee: number;
  fbaFee: number;
  inboundFee: number;
  shippingFee: number;
  monthlyStorageFee: number;
  removalFeePerUnit: number;
  disposalFeePerUnit: number;
  profit: ProductCalculationProfit;
}

export interface BuySignalBreakdownComponent {
  score: number;
  max: number;
  details: string;
}

export interface BuySignalRiskPenalties {
  score: number;
  details: string[];
}

export interface ProductBuySignal {
  score: number;
  breakdown: {
    profitability: BuySignalBreakdownComponent;
    velocity: BuySignalBreakdownComponent;
    competition: BuySignalBreakdownComponent;
    riskPenalties: BuySignalRiskPenalties;
  };
}

export interface ProductListingRestrictionReason {
  message: string;
  reasonCode: string;
}

export interface ProductListingRestriction {
  marketplaceId: string;
  conditionType?: string;
  reasons: ProductListingRestrictionReason[];
}

export interface ProductListingRestrictions {
  canList: boolean;
  requiresApproval: boolean;
  conditionType: string;
  restrictions: ProductListingRestriction[];
  error?: string;
}

export interface ProductCalculationFetched {
  sellerPopularity: number;
  bsr: number;
  dimensions: {
    weight: number;
    length: number;
    width: number;
    height: number;
  };
  inboundEligibility: {
    isEligible: boolean;
    reasons: string[];
  };
  listingRestrictions: ProductListingRestrictions;
  competition: {
    totalSellerCount: number;
    fbaSellerCount: number;
    fbmSellerCount: number;
  };
  salesEstimate: {
    unitsPerMonth: number | null;
    confidence: 'low' | 'medium' | 'high' | string;
    daysToSellQuantity: number | null;
  };
}

export interface ProductCalculationApprovalRequired {
  approvalRequired: true;
}

export interface ProductCalculationFull {
  metadata: {
    asin: string;
    title: string;
    category: string;
    image: string;
  };
  computed: ProductCalculationComputed;
  buySignal: ProductBuySignal;
  fetched: ProductCalculationFetched;
}

export type ProductCalculation =
  | ProductCalculationFull
  | ProductCalculationApprovalRequired;
