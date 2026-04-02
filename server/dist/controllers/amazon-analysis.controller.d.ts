import type { Request, Response, NextFunction } from 'express';
/**
 * Controller for Amazon Product Analysis endpoint
 */
/**
 * GET /api/amazon/product-analysis/:code
 * Comprehensive product analysis from barcode
 *
 * This aggregates data from:
 * - Catalog item lookup (including sales rank)
 * - Pricing
 * - Offers/competitive summary
 *
 * Returns one combined JSON response for the frontend
 */
export declare function analyzeProduct(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=amazon-analysis.controller.d.ts.map