import amazonCatalogService from '../services/amazon-catalog.service.js';
import { isValidBarcode, inferBarcodeType, isValidAsin } from '../utils/barcode.utils.js';
import { normalizeCatalogItem, normalizeSalesRank } from '../utils/response.utils.js';
/**
 * Controller for Amazon Catalog endpoints
 */
/**
 * GET /api/amazon/catalog/barcode/:code
 * Search catalog by barcode (auto-detect UPC or EAN)
 */
export async function searchByBarcode(req, res, next) {
    try {
        const { code } = req.params;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Barcode parameter is required',
                timestamp: new Date().toISOString(),
            });
        }
        // Validate barcode
        if (!isValidBarcode(code)) {
            return res.status(400).json({
                error: 'Invalid barcode',
                message: 'Barcode must be 12 digits (UPC) or 13 digits (EAN)',
                timestamp: new Date().toISOString(),
            });
        }
        const barcodeType = inferBarcodeType(code);
        const catalogItem = await amazonCatalogService.searchByBarcode(code, barcodeType);
        if (!catalogItem) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found in Amazon catalog',
                barcode: code,
                barcodeType,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizeCatalogItem(catalogItem);
        res.json({
            success: true,
            barcode: code,
            barcodeType,
            data: normalized,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/amazon/catalog/upc/:upc
 * Search catalog by UPC
 */
export async function searchByUpc(req, res, next) {
    try {
        const { upc } = req.params;
        if (!upc || typeof upc !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'UPC parameter is required',
                timestamp: new Date().toISOString(),
            });
        }
        // Validate UPC (12 digits)
        if (!/^\d{12}$/.test(upc)) {
            return res.status(400).json({
                error: 'Invalid UPC',
                message: 'UPC must be exactly 12 digits',
                timestamp: new Date().toISOString(),
            });
        }
        const catalogItem = await amazonCatalogService.searchByUpc(upc);
        if (!catalogItem) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found in Amazon catalog',
                upc,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizeCatalogItem(catalogItem);
        res.json({
            success: true,
            upc,
            data: normalized,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/amazon/catalog/ean/:ean
 * Search catalog by EAN
 */
export async function searchByEan(req, res, next) {
    try {
        const { ean } = req.params;
        if (!ean || typeof ean !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'EAN parameter is required',
                timestamp: new Date().toISOString(),
            });
        }
        // Validate EAN (13 digits)
        if (!/^\d{13}$/.test(ean)) {
            return res.status(400).json({
                error: 'Invalid EAN',
                message: 'EAN must be exactly 13 digits',
                timestamp: new Date().toISOString(),
            });
        }
        const catalogItem = await amazonCatalogService.searchByEan(ean);
        if (!catalogItem) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found in Amazon catalog',
                ean,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizeCatalogItem(catalogItem);
        res.json({
            success: true,
            ean,
            data: normalized,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/amazon/catalog/:asin
 * Get catalog item by ASIN
 */
export async function getByAsin(req, res, next) {
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
        const catalogItem = await amazonCatalogService.getByAsin(asin);
        if (!catalogItem) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found in Amazon catalog',
                asin,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizeCatalogItem(catalogItem);
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
/**
 * GET /api/amazon/rank/:asin
 * Get sales rank for an ASIN
 */
export async function getSalesRank(req, res, next) {
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
        const catalogItem = await amazonCatalogService.getSalesRank(asin);
        if (!catalogItem) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Product not found in Amazon catalog',
                asin,
                timestamp: new Date().toISOString(),
            });
        }
        const normalized = normalizeSalesRank(catalogItem);
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
//# sourceMappingURL=amazon-catalog.controller.js.map