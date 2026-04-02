import type { ProductPricingResponse, ProductPricingItem } from '../types/amazon.types.js';
/**
 * Amazon Product Pricing API Service
 * Handles pricing data retrieval
 */
declare class AmazonPricingService {
    private readonly API_VERSION;
    /**
     * Get pricing for an ASIN
     */
    getPricing(asin: string): Promise<ProductPricingItem | null>;
    /**
     * Get competitive pricing for an ASIN
     * This includes offer counts by condition and fulfillment channel
     */
    getCompetitivePricing(asin: string): Promise<ProductPricingResponse | null>;
}
declare const _default: AmazonPricingService;
export default _default;
//# sourceMappingURL=amazon-pricing.service.d.ts.map