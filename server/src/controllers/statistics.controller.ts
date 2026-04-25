import type { Request, Response } from 'express';
import {
	getSingleProductStatistics,
	type GetSingleProductStatisticsParams,
	type Money,
} from '../services/statistics.service.js';

/**
 * Statistics Controller
 * ---------------------
 * Thin HTTP adapter for the front-end-facing `statistics.service`.
 * Does no business logic — only parses query params, delegates, and
 * shapes the HTTP response.
 */

function parseSingleValue(value: unknown): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	if (typeof raw !== 'string') return undefined;
	const trimmed = raw.trim();
	return trimmed || undefined;
}

function parseNumber(value: unknown): number | undefined {
	const raw = parseSingleValue(value);
	if (raw === undefined) return undefined;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
}

function parseFoundPrice(req: Request): Money | undefined {
	const amount = parseNumber(req.query.foundPrice ?? req.query.foundPriceAmount);
	if (amount === undefined) return undefined;
	const currency =
		parseSingleValue(req.query.foundPriceCurrency) ??
		parseSingleValue(req.query.currency) ??
		'USD';
	return { amount, currency };
}

/**
 * GET /api/statistics/product
 *
 * Query params:
 *   - barcode? (string)            UPC/EAN. One of barcode|asin required.
 *   - asin? (string)               ASIN. One of barcode|asin required.
 *   - marketplaceId? (string)      Override the default marketplace.
 *   - foundPrice? (number)         Price the user found the product at.
 *   - foundPriceCurrency? (string) Currency for foundPrice (default USD).
 *   - estimatedQuantity? (number)  User-provided unit count estimate.
 */
export async function getSingleProductStatisticsController(
	req: Request,
	res: Response
) {
	try {
		const barcode = parseSingleValue(req.query.barcode);
		const asin = parseSingleValue(req.query.asin);
		const marketplaceId = parseSingleValue(req.query.marketplaceId);
		const foundPrice = parseFoundPrice(req);
		const estimatedQuantity = parseNumber(req.query.estimatedQuantity);

		if (!barcode && !asin) {
			return res.status(400).json({
				error: 'InvalidStatisticsRequestError',
				message: 'Either barcode or asin is required',
			});
		}

		const params: GetSingleProductStatisticsParams = {};
		if (barcode) params.barcode = barcode;
		if (asin) params.asin = asin;
		if (marketplaceId) params.marketplaceId = marketplaceId;
		if (foundPrice) params.foundPrice = foundPrice;
		if (estimatedQuantity !== undefined) params.estimatedQuantity = estimatedQuantity;

		const result = await getSingleProductStatistics(params);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(error?.statusCode || 500).json({
			error: error?.name || 'StatisticsError',
			message: error?.message || 'Failed to fetch product statistics',
		});
	}
}
