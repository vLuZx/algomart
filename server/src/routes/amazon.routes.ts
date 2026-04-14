import { Router, type IRouter } from 'express';
import * as catalogController from '../controllers/amazon/catalog.controller.js';

const router: IRouter = Router();

/**
 * GET /api/amazon/catalog/barcode/:code
 * Search by barcode (auto-detect UPC/EAN)
 */
router.get('/catalog/barcode/:code', catalogController.searchByBarcode);

export default router;
