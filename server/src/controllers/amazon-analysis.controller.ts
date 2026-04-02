import type { Request, Response, NextFunction } from 'express';
import amazonAnalysisService from '../services/amazonAnalysis.service.js';
import { isValidBarcode } from '../utils/barcode.utils.js';

/**
 * Controller for Amazon Product Analysis endpoint
 */

/**
 * GET /api/amazon/product-analysis/:code
 * Comprehensive product analysis from barcode
 * 
 * This aggregates data from:
 * - Catalog item lookup (including sales rank)
 * - Pricing
 * - Offers/competitive summary
 * 
 * Returns one combined JSON response for the frontend
 */
export async function analyzeProduct(req: Request, res: Response, next: NextFunction) {
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

    const analysis = await amazonAnalysisService.analyzeProduct(code);

    // If catalog item not found, return 404
    if (!analysis.catalogItem) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found in Amazon catalog',
        barcode: code,
        barcodeType: analysis.barcodeType,
        timestamp: analysis.timestamp,
      });
    }

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    next(error);
  }
}
