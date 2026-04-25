import type { Request, Response } from 'express';
import feesService from '../../services/amazon/fees.service.js';

function parseSingleValue(value: unknown): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	if (typeof raw !== 'string') return undefined;
	const trimmed = raw.trim();
	return trimmed || undefined;
}

function parseNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
	}
	return undefined;
}

/**
 * POST /api/amazon/fees/estimate
 * Body: { asin, price, currency?, marketplaceId?, isAmazonFulfilled?, shippingPrice? }
 */
export async function getFeesEstimate(req: Request, res: Response) {
	try {
		const body = (req.body ?? {}) as Record<string, unknown>;
		const asin = parseSingleValue(body.asin);
		const price = parseNumber(body.price);

		if (!asin) {
			return res.status(400).json({
				error: 'InvalidFeesRequestError',
				message: 'asin is required',
			});
		}
		if (typeof price !== 'number') {
			return res.status(400).json({
				error: 'InvalidFeesRequestError',
				message: 'price (number) is required',
			});
		}

		const params: Parameters<typeof feesService.getFeesEstimateForAsin>[0] = { asin, price };

		const currency = parseSingleValue(body.currency);
		const marketplaceId = parseSingleValue(body.marketplaceId);
		const isAmazonFulfilled = parseBoolean(body.isAmazonFulfilled);
		const shippingPrice = parseNumber(body.shippingPrice);

		if (currency) params.currency = currency;
		if (marketplaceId) params.marketplaceId = marketplaceId;
		if (typeof isAmazonFulfilled === 'boolean') params.isAmazonFulfilled = isAmazonFulfilled;
		if (typeof shippingPrice === 'number') params.shippingPrice = shippingPrice;

		const result = await feesService.getFeesEstimateForAsin(params);
		res.json(result);
	} catch (error: any) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
}
