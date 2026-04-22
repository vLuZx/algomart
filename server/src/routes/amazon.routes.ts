import { Router, type IRouter } from 'express';
import * as catalogController from '../controllers/amazon/catalog.controller.js';
import * as pricingController from '../controllers/amazon/pricing.controller.js';
import * as productInsightsController from '../controllers/amazon/product-insights.controller.js';
import * as feesController from '../controllers/amazon/fees.controller.js';
const router: IRouter = Router();

/**
 * GET /api/amazon/catalog/barcode/:code
 * Search by barcode (auto-detect UPC/EAN)
 */
router.get('/catalog/barcode/:code', catalogController.searchByBarcode);

router.get('/pricing/price', pricingController.getPricing);
router.get('/pricing/competitive', pricingController.getCompetitivePricing);
router.get('/pricing/listings/:sellerSKU/offers', pricingController.getListingOffers);
router.get('/pricing/items/:asin/offers', pricingController.getItemOffers);
router.post('/pricing/competitive-summary-batch', pricingController.getCompetitiveSummaryBatch);

/**
 * POST /api/amazon/fees/estimate
 * Body: { asin, price, currency?, marketplaceId?, isAmazonFulfilled?, shippingPrice? }
 */
router.post('/fees/estimate', feesController.getFeesEstimate);

/**
 * GET /api/amazon/insights
 * Aggregated product insights. Frontend passes ?fields=pricing,salesRank,bsr,...
 * along with ?barcode= or ?asin=.
 */
router.get('/insights', productInsightsController.getProductInsights);

export default router;
