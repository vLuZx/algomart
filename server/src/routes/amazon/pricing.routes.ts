import { Router, type IRouter } from 'express';
import {
  getPricing,
  getCompetitivePricing,
  getListingOffers,
  getItemOffers,
  getCompetitiveSummaryBatch
} from '../../controllers/amazon/pricing.controller.js';

const router: IRouter = Router();

router.get('/price', getPricing);
router.get('/competitive', getCompetitivePricing);
router.get('/listings/:sellerSKU/offers', getListingOffers);
router.get('/items/:asin/offers', getItemOffers);
router.post('/competitive-summary-batch', getCompetitiveSummaryBatch);

export default router;
