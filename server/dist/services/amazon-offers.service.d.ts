import type { CompetitivePricingResponse } from '../types/amazon.types.js';
/**
 * Amazon Offers Service
 * Handles offer summary and competitive data
 *
 * Note: Amazon SP-API does not provide a direct "number of sellers" endpoint.
 * The competitive pricing API provides offer counts by condition and fulfillment channel,
 * which is the closest approximation available through SP-API.
 */
declare class AmazonOffersService {
    /**
     * Get offer summary for an ASIN
     * Returns offer counts by condition and fulfillment channel
     */
    getOffersSummary(asin: string): Promise<CompetitivePricingResponse | null>;
}
declare const _default: AmazonOffersService;
export default _default;
//# sourceMappingURL=amazon-offers.service.d.ts.map