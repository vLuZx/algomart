import amazonOffersService from '../services/amazon-offers.service.js';
import { isValidAsin } from '../utils/barcode.utils.js';
import { normalizeOfferSummary } from '../utils/response.utils.js';
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
export async function getOffersSummary(req, res, next) {
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
        const offersData = await amazonOffersService.getOffersSummary(asin);
        if (!offersData) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Offers data not available for this ASIN',
                asin,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizeOfferSummary(offersData);
        if (!normalized) {
            return res.status(404).json({
                error: 'Not found',
                message: 'No offer data available for this ASIN',
                asin,
                timestamp: new Date().toISOString(),
            });
        }
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
//# sourceMappingURL=amazon-offers.controller.js.map