import type { Request, Response } from 'express';
import { calculateProductStatistics } from '../services/calculation.service.js';
import {
    getSingleProductStatistics,
    type GetSingleProductStatisticsParams,
} from '../services/statistics.service.js';
import { parseNumber, parseSingleValue } from '../utils/parser.utils.js';

/**
 * GET /api/calculations/product
 *
 * Fetches the raw single-product statistics and runs them through
 * `calculateProductStatistics` to produce profit/shipping/fee numbers
 * shaped for the front-end calculation card.
 *
 * Query params:
 *   - barcode? (string)            UPC/EAN. One of barcode|asin required.
 *   - asin? (string)               ASIN. One of barcode|asin required.
 *   - estimatedQuantity? (number)  User-provided unit count estimate.
 *   - costOfGoods? (number)        Per-unit COGS. Required for profit math;
 *                                  if omitted, profit fields come back null
 *                                  with an explicit `COGS_REQUIRED` error.
 */
export async function getProductCalculationController(
    req: Request,
    res: Response
) {
    try {
        const barcode = parseSingleValue(req.query.barcode);
        const asin = parseSingleValue(req.query.asin);
        const estimatedQuantity = parseNumber(req.query.estimatedQuantity);
        const costOfGoods = parseNumber(req.query.costOfGoods);

        if (!barcode && !asin) {
            return res.status(400).json({
                error: 'InvalidCalculationRequestError',
                message: 'Either barcode or asin is required',
            });
        }

        const params: GetSingleProductStatisticsParams = {};
        if (barcode) params.barcode = barcode;
        if (asin) params.asin = asin;
        if (estimatedQuantity !== undefined) params.estimatedQuantity = estimatedQuantity;

        const stats = await getSingleProductStatistics(params);
        const result = calculateProductStatistics(
            stats,
            costOfGoods !== undefined ? { costOfGoods } : {}
        );
        res.status(200).json(result);
    } catch (error: any) {
        res.status(error?.statusCode || 500).json({
            error: error?.name || 'CalculationError',
            message: error?.message || 'Failed to compute product calculations',
        });
    }
}
