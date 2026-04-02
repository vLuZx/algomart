import { Router, type IRouter } from 'express';
import * as catalogController from '../controllers/amazon-catalog.controller.js';
import * as pricingController from '../controllers/amazon-pricing.controller.js';
import * as offersController from '../controllers/amazon-offers.controller.js';
import * as analysisController from '../controllers/amazon-analysis.controller.js';

const router: IRouter = Router();

// ===== Catalog Routes =====

/**
 * GET /api/amazon/catalog/barcode/:code
 * Search by barcode (auto-detect UPC/EAN)
 */
router.get('/catalog/barcode/:code', catalogController.searchByBarcode);

/**
 * GET /api/amazon/catalog/upc/:upc
 * Search by UPC explicitly
 */
router.get('/catalog/upc/:upc', catalogController.searchByUpc);

/**
 * GET /api/amazon/catalog/ean/:ean
 * Search by EAN explicitly
 */
router.get('/catalog/ean/:ean', catalogController.searchByEan);

/**
 * GET /api/amazon/catalog/:asin
 * Get catalog item by ASIN
 */
router.get('/catalog/:asin', catalogController.getByAsin);

// ===== Pricing Routes =====

/**
 * GET /api/amazon/pricing/:asin
 * Get pricing for an ASIN
 */
router.get('/pricing/:asin', pricingController.getPricing);

// ===== Offers Routes =====

/**
 * GET /api/amazon/offers/:asin
 * Get offers summary for an ASIN
 */
router.get('/offers/:asin', offersController.getOffersSummary);

// ===== Sales Rank Route =====

/**
 * GET /api/amazon/rank/:asin
 * Get sales rank for an ASIN
 */
router.get('/rank/:asin', catalogController.getSalesRank);

// ===== Product Analysis Route =====

/**
 * GET /api/amazon/product-analysis/:code
 * Comprehensive product analysis from barcode
 */
router.get('/product-analysis/:code', analysisController.analyzeProduct);

export default router;
