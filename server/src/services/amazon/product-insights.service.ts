import amazonCatalogService from './catalog.service.js';
import amazonPricingService from './pricing.service.js';
import amazonClient from './client.service.js';

/**
 * Fields the client can request in a single insights call.
 */
export type ProductInsightField =
	| 'summary'
	| 'identifiers'
	| 'images'
	| 'dimensions'
	| 'salesRank'
	| 'bsr'
	| 'pricing'
	| 'competitivePricing'
	| 'offers';

export type GetProductInsightsParams = {
	barcode?: string;
	asin?: string;
	fields: ProductInsightField[];
	marketplaceId?: string;
	itemCondition?: string;
	customerType?: string;
};

export type ProductInsightsResponse = {
	asin: string;
	marketplaceId: string;
	fields: Partial<Record<ProductInsightField, unknown>>;
	errors?: Partial<Record<ProductInsightField, string>>;
};

/**
 * Orchestrates catalog + pricing calls so the frontend can request
 * any combination of data (pricing, salesRank, BSR, offers, etc.)
 * in a single request.
 */
class ProductInsightsService {
	private readonly CATALOG_FIELDS: ProductInsightField[] = [
		'summary',
		'identifiers',
		'images',
		'dimensions',
		'salesRank',
		'bsr',
	];

	private readonly PRICING_FIELDS: ProductInsightField[] = [
		'pricing',
		'competitivePricing',
		'offers',
	];

	private createHttpError(message: string, statusCode: number, name = 'ProductInsightsError'): Error {
		const error = new Error(message) as Error & { statusCode?: number };
		error.name = name;
		error.statusCode = statusCode;
		return error;
	}

	async getInsights(params: GetProductInsightsParams): Promise<ProductInsightsResponse> {
		if (!params.barcode && !params.asin) {
			throw this.createHttpError(
				'Either barcode or asin is required',
				400,
				'InvalidInsightsRequestError'
			);
		}

		if (!params.fields || params.fields.length === 0) {
			throw this.createHttpError('At least one field is required', 400, 'InvalidInsightsRequestError');
		}

		const marketplaceId = params.marketplaceId && params.marketplaceId.trim().length > 0
			? params.marketplaceId
			: amazonClient.getMarketplaceId();

		const needsCatalog = params.fields.some((field) => this.CATALOG_FIELDS.includes(field));
		const needsCatalogForAsinResolution = !params.asin;

		let asin = params.asin ?? '';
		let catalogItem: any | undefined;
		const errors: Partial<Record<ProductInsightField, string>> = {};

		if (params.barcode) {
			const catalogResponse = await amazonCatalogService.searchCatalogItemsByBarcode(params.barcode);
			asin = amazonCatalogService.getASIN(catalogResponse);
			catalogItem = catalogResponse?.items?.[0];
		} else if (needsCatalog && asin) {
			const catalogResponse = await amazonCatalogService.searchCatalogItemsByAsin(asin);
			catalogItem = catalogResponse?.items?.[0];
		}

		if (!asin) {
			throw this.createHttpError('Unable to resolve ASIN for product', 404, 'AsinNotFoundError');
		}

		const fieldResults: Partial<Record<ProductInsightField, unknown>> = {};

		// Catalog-sourced fields (no extra requests)
		for (const field of params.fields) {
			if (!this.CATALOG_FIELDS.includes(field)) continue;
			fieldResults[field] = this.extractCatalogField(field, catalogItem, marketplaceId);
		}

		// Pricing-sourced fields (parallel requests)
		const pricingTasks = params.fields
			.filter((field) => this.PRICING_FIELDS.includes(field))
			.map(async (field) => {
				try {
					const options: {
						marketplaceId: string;
						itemCondition?: string;
						customerType?: string;
					} = { marketplaceId };
					if (params.itemCondition) options.itemCondition = params.itemCondition;
					if (params.customerType) options.customerType = params.customerType;

					fieldResults[field] = await this.fetchPricingField(field, asin, options);
				} catch (error) {
					errors[field] = (error as Error).message;
				}
			});

		await Promise.all(pricingTasks);

		const response: ProductInsightsResponse = {
			asin,
			marketplaceId,
			fields: fieldResults,
		};

		if (Object.keys(errors).length > 0) {
			response.errors = errors;
		}

		return response;
	}

	private extractCatalogField(
		field: ProductInsightField,
		catalogItem: any,
		marketplaceId: string
	): unknown {
		if (!catalogItem) return null;

		switch (field) {
			case 'summary': {
				const summaries: any[] = catalogItem.summaries ?? [];
				return summaries.find((s) => s.marketplaceId === marketplaceId) ?? summaries[0] ?? null;
			}
			case 'identifiers':
				return catalogItem.identifiers ?? [];
			case 'images':
				return catalogItem.images ?? [];
			case 'dimensions':
				return catalogItem.dimensions ?? [];
			case 'salesRank':
				return catalogItem.salesRanks ?? [];
			case 'bsr':
				return this.extractBsr(catalogItem.salesRanks ?? [], marketplaceId);
			default:
				return null;
		}
	}

	private extractBsr(
		salesRanks: any[],
		marketplaceId: string
	): { rank: number; category: string; link?: string } | null {
		const forMarketplace =
			salesRanks.find((s) => s.marketplaceId === marketplaceId) ?? salesRanks[0];
		if (!forMarketplace) return null;

		const topDisplayRank = forMarketplace.displayGroupRanks?.[0];
		if (topDisplayRank) {
			return {
				rank: topDisplayRank.rank,
				category: topDisplayRank.title,
				link: topDisplayRank.link,
			};
		}

		const topClassificationRank = forMarketplace.classificationRanks?.[0];
		if (topClassificationRank) {
			return {
				rank: topClassificationRank.rank,
				category: topClassificationRank.title,
				link: topClassificationRank.link,
			};
		}

		return null;
	}

	private async fetchPricingField(
		field: ProductInsightField,
		asin: string,
		options: { marketplaceId: string; itemCondition?: string; customerType?: string }
	): Promise<unknown> {
		switch (field) {
			case 'pricing':
				return amazonPricingService.getPricing({
					identifiers: [asin],
					type: 'ASIN',
					marketplaceId: options.marketplaceId,
					...(options.itemCondition ? { itemCondition: options.itemCondition } : {}),
					...(options.customerType ? { customerType: options.customerType } : {}),
				});
			case 'competitivePricing':
				return amazonPricingService.getCompetitivePricing({
					identifiers: [asin],
					type: 'ASIN',
					marketplaceId: options.marketplaceId,
				});
			case 'offers':
				return amazonPricingService.getItemOffers(asin, {
					marketplaceId: options.marketplaceId,
					...(options.itemCondition ? { itemCondition: options.itemCondition } : {}),
					...(options.customerType ? { customerType: options.customerType } : {}),
				});
			default:
				return null;
		}
	}
}

export default new ProductInsightsService();
