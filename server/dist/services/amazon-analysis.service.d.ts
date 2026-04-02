import type { ProductAnalysis } from '../types/amazon.types.js';
/**
 * Amazon Product Analysis Service
 * Aggregates data from multiple Amazon SP-API endpoints
 */
declare class AmazonAnalysisService {
    /**
     * Perform comprehensive product analysis from a barcode
     * This is the main aggregation endpoint that combines:
     * - Catalog item lookup
     * - Pricing data
     * - Offer summary
     * - Sales rank
     */
    analyzeProduct(barcode: string): Promise<ProductAnalysis>;
}
declare const _default: AmazonAnalysisService;
export default _default;
//# sourceMappingURL=amazon-analysis.service.d.ts.map