import amazonClient from './amazon-client.service.js';
import { barcodeTypeToIdentifierType } from '../utils/barcode.utils.js';
/**
 * Amazon Catalog Items API Service
 * Handles product lookup by UPC, EAN, or ASIN
 */
class AmazonCatalogService {
    API_VERSION = '2022-04-01';
    /**
     * Search catalog by identifier (UPC, EAN, etc.)
     */
    async searchByIdentifier(identifierType, identifier) {
        const marketplaceId = amazonClient.getMarketplaceId();
        try {
            const response = await amazonClient.get(`/catalog/${this.API_VERSION}/items`, {
                identifiers: identifier,
                identifiersType: identifierType,
                marketplaceIds: marketplaceId,
                includedData: 'identifiers,images,productTypes,salesRanks,summaries,attributes',
            });
            if (response.items && response.items.length > 0) {
                return response.items[0] || null;
            }
            return null;
        }
        catch (error) {
            console.error(`Catalog search error for ${identifierType} ${identifier}:`, error.message);
            throw new Error(`Failed to search catalog: ${error.message}`);
        }
    }
    /**
     * Search catalog by UPC
     */
    async searchByUpc(upc) {
        return this.searchByIdentifier('UPC', upc);
    }
    /**
     * Search catalog by EAN
     */
    async searchByEan(ean) {
        return this.searchByIdentifier('EAN', ean);
    }
    /**
     * Search catalog by barcode (auto-detect type)
     */
    async searchByBarcode(barcode, barcodeType) {
        const identifierType = barcodeTypeToIdentifierType(barcodeType);
        return this.searchByIdentifier(identifierType, barcode);
    }
    /**
     * Get catalog item by ASIN
     */
    async getByAsin(asin) {
        const marketplaceId = amazonClient.getMarketplaceId();
        try {
            const response = await amazonClient.get(`/catalog/${this.API_VERSION}/items/${asin}`, {
                marketplaceIds: marketplaceId,
                includedData: 'identifiers,images,productTypes,salesRanks,summaries,attributes,dimensions',
            });
            return response;
        }
        catch (error) {
            console.error(`Catalog get error for ASIN ${asin}:`, error.message);
            throw new Error(`Failed to get catalog item: ${error.message}`);
        }
    }
    /**
     * Get sales rank for an ASIN
     */
    async getSalesRank(asin) {
        // Sales ranks are part of catalog item data
        return this.getByAsin(asin);
    }
}
export default new AmazonCatalogService();
//# sourceMappingURL=amazon-catalog.service.js.map