import amazonPricingService from '../services/amazon-pricing.service.js';
import { isValidAsin } from '../utils/barcode.utils.js';
import { normalizePriceResponse } from '../utils/response.utils.js';
/**
 * Controller for Amazon Pricing endpoints
 */
/**
 * GET /api/amazon/pricing/:asin
 * Get pricing for an ASIN
 */
export async function getPricing(req, res, next) {
    try {
        const { asin } = req.params;
        if (!asin || typeof asin !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'ASIN parameter is required',
                timestamp: new Date().toISOString(),
            });
        }
        // Validate ASIN
        if (!isValidAsin(asin)) {
            return res.status(400).json({
                error: 'Invalid ASIN',
                message: 'ASIN must be 10 alphanumeric characters',
                timestamp: new Date().toISOString(),
            });
        }
        const pricingData = await amazonPricingService.getPricing(asin);
        if (!pricingData) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Pricing data not available for this ASIN',
                asin,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizePriceResponse(pricingData);
        res.json({
            success: true,
            asin,
            data: normalized,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=amazon-pricing.controller.js.map