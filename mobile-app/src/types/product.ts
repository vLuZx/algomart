export type SellerPopularity = 'Low' | 'Medium' | 'High' | 'Very High';

export type CompetitionLevel = 'Low' | 'Medium' | 'High' | 'Very High';

export interface SessionProduct {
  id: string;
  asin: string;
  barcode: string;
  barcodeType: string;
  title: string;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  price: number;
  foundPrice: number;
  sellerPopularity: SellerPopularity;
  sellerPopularityScore: number;
  estimatedShipping: number;
  amazonFees: number;
  profitMargin: number;
  requiresApproval: boolean;
  competitionLevel: CompetitionLevel;
  salesRank: number;
  bsr: number;
  dimensions: string;
  weight: string;
  restrictions: string[];
  monthlySalesEstimate: number;
}

export interface ScannerSeedProduct {
  asin: string;
  title: string;
  image: string;
  rating: number;
  category: string;
  price: number;
  sellerPopularity: SellerPopularity;
}

export interface ScannedProductInput extends ScannerSeedProduct {
  foundPrice: number;
}