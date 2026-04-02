import amazonPricingService from './amazon-pricing.service.js';
import type { CompetitivePricingResponse } from '../types/amazon.types.js';

/**
 * Amazon Offers Service
 * Handles offer summary and competitive data
 * 
 * Note: Amazon SP-API does not provide a direct "number of sellers" endpoint.
 * The competitive pricing API provides offer counts by condition and fulfillment channel,
 * which is the closest approximation available through SP-API.
 */
class AmazonOffersService {
  /**
   * Get offer summary for an ASIN
   * Returns offer counts by condition and fulfillment channel
   */
  async getOffersSummary(asin: string): Promise<CompetitivePricingResponse | null> {
    try {
      // Use competitive pricing API which includes offer listings count
      const response = await amazonPricingService.getCompetitivePricing(asin);
      return response;
    } catch (error: any) {
      console.error(`Offers summary error for ASIN ${asin}:`, error.message);
      throw new Error(`Failed to get offers summary: ${error.message}`);
    }
  }
}

export default new AmazonOffersService();
