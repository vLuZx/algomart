import type { Request, Response, NextFunction } from 'express';
/**
 * Controller for Amazon Offers/Competitive Summary endpoints
 */
/**
 * GET /api/amazon/offers/:asin
 * Get offer summary for an ASIN
 *
 * Note: Amazon SP-API does not provide a direct "number of sellers" count.
 * This endpoint returns offer counts by condition and fulfillment channel,
 * which is the closest approximation available through SP-API.
 */
export declare function getOffersSummary(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=amazon-offers.controller.d.ts.map