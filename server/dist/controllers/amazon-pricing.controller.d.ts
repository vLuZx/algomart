import type { Request, Response, NextFunction } from 'express';
/**
 * Controller for Amazon Pricing endpoints
 */
/**
 * GET /api/amazon/pricing/:asin
 * Get pricing for an ASIN
 */
export declare function getPricing(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=amazon-pricing.controller.d.ts.map