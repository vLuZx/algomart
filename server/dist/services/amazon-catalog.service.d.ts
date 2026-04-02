import type { CatalogItem } from '../types/amazon.types.js';
/**
 * Amazon Catalog Items API Service
 * Handles product lookup by UPC, EAN, or ASIN
 */
declare class AmazonCatalogService {
    private readonly API_VERSION;
    /**
     * Search catalog by identifier (UPC, EAN, etc.)
     */
    searchByIdentifier(identifierType: string, identifier: string): Promise<CatalogItem | null>;
    /**
     * Search catalog by UPC
     */
    searchByUpc(upc: string): Promise<CatalogItem | null>;
    /**
     * Search catalog by EAN
     */
    searchByEan(ean: string): Promise<CatalogItem | null>;
    /**
     * Search catalog by barcode (auto-detect type)
     */
    searchByBarcode(barcode: string, barcodeType: string): Promise<CatalogItem | null>;
    /**
     * Get catalog item by ASIN
     */
    getByAsin(asin: string): Promise<CatalogItem | null>;
    /**
     * Get sales rank for an ASIN
     */
    getSalesRank(asin: string): Promise<CatalogItem | null>;
}
declare const _default: AmazonCatalogService;
export default _default;
//# sourceMappingURL=amazon-catalog.service.d.ts.map