import amazonCatalogService from './amazon-catalog.service.js';
import amazonPricingService from './amazon-pricing.service.js';
import amazonOffersService from './amazon-offers.service.js';
import { inferBarcodeType } from '../utils/barcode.utils.js';
import { normalizeCatalogItem, normalizePriceResponse, normalizeOfferSummary, normalizeSalesRank } from '../utils/response.utils.js';
/**
 * Amazon Product Analysis Service
 * Aggregates data from multiple Amazon SP-API endpoints
 */
class AmazonAnalysisService {
    /**
     * Perform comprehensive product analysis from a barcode
     * This is the main aggregation endpoint that combines:
     * - Catalog item lookup
     * - Pricing data
     * - Offer summary
     * - Sales rank
     */
    async analyzeProduct(barcode) {
        const errors = [];
        const barcodeType = inferBarcodeType(barcode);
        const analysis = {
            barcode,
            barcodeType,
            catalogItem: null,
            pricing: null,
            offers: null,
            salesRank: null,
            timestamp: new Date().toISOString(),
        };
        try {
            // Step 1: Find the catalog item by barcode
            const catalogItem = await amazonCatalogService.searchByBarcode(barcode, barcodeType);
            if (!catalogItem) {
                errors.push('Product not found in Amazon catalog');
                analysis.errors = errors;
                return analysis;
            }
            analysis.catalogItem = normalizeCatalogItem(catalogItem);
            const asin = catalogItem.asin;
            // Step 2: Fetch pricing data
            try {
                const pricingData = await amazonPricingService.getPricing(asin);
                if (pricingData) {
                    analysis.pricing = normalizePriceResponse(pricingData);
                }
            }
            catch (error) {
                errors.push(`Pricing lookup failed: ${error.message}`);
            }
            // Step 3: Fetch offers/competitive summary
            try {
                const offersData = await amazonOffersService.getOffersSummary(asin);
                if (offersData) {
                    analysis.offers = normalizeOfferSummary(offersData);
                }
            }
            catch (error) {
                errors.push(`Offers lookup failed: ${error.message}`);
            }
            // Step 4: Extract sales rank (already available from catalog item)
            if (catalogItem.salesRanks && catalogItem.salesRanks.length > 0) {
                analysis.salesRank = normalizeSalesRank(catalogItem);
            }
            if (errors.length > 0) {
                analysis.errors = errors;
            }
            return analysis;
        }
        catch (error) {
            errors.push(`Analysis failed: ${error.message}`);
            analysis.errors = errors;
            return analysis;
        }
    }
}
export default new AmazonAnalysisService();
//# sourceMappingURL=amazon-analysis.service.js.map