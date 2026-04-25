import { Router, type IRouter } from 'express';
import { getSingleProductStatisticsController } from '../controllers/statistics.controller.js';

const router: IRouter = Router();

/**
 * GET /api/statistics/product
 * Aggregated, pre-formatted single-product statistics for the front-end.
 * Query: ?barcode=... OR ?asin=... [&marketplaceId=...]
 */
router.get('/product', getSingleProductStatisticsController);

export default router;
