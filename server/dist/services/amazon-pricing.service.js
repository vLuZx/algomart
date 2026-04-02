import amazonClient from './amazon-client.service.js';
/**
 * Amazon Product Pricing API Service
 * Handles pricing data retrieval
 */
class AmazonPricingService {
    API_VERSION = 'v0';
    /**
     * Get pricing for an ASIN
     */
    async getPricing(asin) {
        const marketplaceId = amazonClient.getMarketplaceId();
        try {
            const response = await amazonClient.get(`/products/pricing/${this.API_VERSION}/price`, {
                MarketplaceId: marketplaceId,
                Asins: asin,
                ItemType: 'Asin',
            });
            if (response.payload && response.payload.length > 0) {
                return response.payload[0] || null;
            }
            return null;
        }
        catch (error) {
            console.error(`Pricing error for ASIN ${asin}:`, error.message);
            throw new Error(`Failed to get pricing: ${error.message}`);
        }
    }
    /**
     * Get competitive pricing for an ASIN
     * This includes offer counts by condition and fulfillment channel
     */
    async getCompetitivePricing(asin) {
        const marketplaceId = amazonClient.getMarketplaceId();
        try {
            const response = await amazonClient.get(`/products/pricing/${this.API_VERSION}/competitivePrice`, {
                MarketplaceId: marketplaceId,
                Asins: asin,
                ItemType: 'Asin',
            });
            return response;
        }
        catch (error) {
            console.error(`Competitive pricing error for ASIN ${asin}:`, error.message);
            throw new Error(`Failed to get competitive pricing: ${error.message}`);
        }
    }
}
export default new AmazonPricingService();
//# sourceMappingURL=amazon-pricing.service.js.map