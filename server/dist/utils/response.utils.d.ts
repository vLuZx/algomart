import type { CatalogItem, NormalizedCatalogItem, ProductPricingItem, NormalizedPricing, CompetitivePricingResponse, NormalizedOffersSummary, NormalizedSalesRank } from '../types/amazon.types.js';
/**
 * Normalize a catalog item from Amazon SP-API response
 */
export declare function normalizeCatalogItem(item: CatalogItem): NormalizedCatalogItem;
/**
 * Normalize pricing response from Amazon SP-API
 */
export declare function normalizePriceResponse(item: ProductPricingItem): NormalizedPricing;
/**
 * Normalize offer summary from competitive pricing response
 * Note: Amazon SP-API does not always provide seller count directly.
 * This extracts the available offer count data by condition and fulfillment channel.
 */
export declare function normalizeOfferSummary(response: CompetitivePricingResponse): NormalizedOffersSummary | null;
/**
 * Normalize sales rank data from catalog item
 */
export declare function normalizeSalesRank(item: CatalogItem): NormalizedSalesRank;
//# sourceMappingURL=response.utils.d.ts.map