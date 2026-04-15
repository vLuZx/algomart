import { Router, type IRouter } from 'express';
import * as catalogController from '../controllers/amazon/catalog.controller.js';
import * as pricingController from '../controllers/amazon/pricing.controller.js';
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

export default router;
