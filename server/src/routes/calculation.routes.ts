import { Router, type IRouter } from 'express';
import { getProductCalculationController } from '../controllers/calculation.controller.js';

const router: IRouter = Router();

/**
 * GET /api/calculations/product
 * Profit/shipping/fee calculations for a single product, derived from
 * the statistics aggregator.
 * Query: ?barcode=... OR ?asin=... [&foundPrice=...&estimatedQuantity=...]
 */
router.get('/product', getProductCalculationController);

export default router;
