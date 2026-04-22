import type { Request, Response } from 'express';
import productInsightsService, {
	type ProductInsightField,
} from '../../services/amazon/product-insights.service.js';

const VALID_FIELDS: ProductInsightField[] = [
	'summary',
	'identifiers',
	'images',
	'dimensions',
	'salesRank',
	'bsr',
	'pricing',
	'competitivePricing',
	'offers',
];

function parseFields(raw: unknown): ProductInsightField[] {
	if (typeof raw !== 'string' || raw.trim().length === 0) return [];
	return raw
		.split(',')
		.map((field) => field.trim())
		.filter((field): field is ProductInsightField =>
			VALID_FIELDS.includes(field as ProductInsightField)
		);
}

function parseSingleValue(value: unknown): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	if (typeof raw !== 'string') return undefined;
	const trimmed = raw.trim();
	return trimmed || undefined;
}

export async function getProductInsights(req: Request, res: Response) {
	try {
		const fields = parseFields(req.query.fields);
		if (fields.length === 0) {
			return res.status(400).json({
				error: 'InvalidInsightsRequestError',
				message: `fields is required and must contain one or more of: ${VALID_FIELDS.join(', ')}`,
			});
		}

		const params: Parameters<typeof productInsightsService.getInsights>[0] = { fields };

		const barcode = parseSingleValue(req.query.barcode);
		const asin = parseSingleValue(req.query.asin);
		const marketplaceId = parseSingleValue(req.query.marketplaceId);
		const itemCondition = parseSingleValue(req.query.itemCondition);
		const customerType = parseSingleValue(req.query.customerType);

		if (barcode) params.barcode = barcode;
		if (asin) params.asin = asin;
		if (marketplaceId) params.marketplaceId = marketplaceId;
		if (itemCondition) params.itemCondition = itemCondition;
		if (customerType) params.customerType = customerType;

		const result = await productInsightsService.getInsights(params);
		const hasPartial = !!result.errors && Object.keys(result.errors).length > 0;
		res.status(hasPartial ? 207 : 200).json(result);
	} catch (error: any) {
		res.status(error.statusCode || 500).json({ error: error.message });
	}
}
