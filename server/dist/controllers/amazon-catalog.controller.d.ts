import type { Request, Response, NextFunction } from 'express';
/**
 * Controller for Amazon Catalog endpoints
 */
/**
 * GET /api/amazon/catalog/barcode/:code
 * Search catalog by barcode (auto-detect UPC or EAN)
 */
export declare function searchByBarcode(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/amazon/catalog/upc/:upc
 * Search catalog by UPC
 */
export declare function searchByUpc(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/amazon/catalog/ean/:ean
 * Search catalog by EAN
 */
export declare function searchByEan(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/amazon/catalog/:asin
 * Get catalog item by ASIN
 */
export declare function getByAsin(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/amazon/rank/:asin
 * Get sales rank for an ASIN
 */
export declare function getSalesRank(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=amazon-catalog.controller.d.ts.map