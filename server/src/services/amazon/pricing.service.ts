import amazonClient from './client.service.js';
import type {
	GetPricingParams,
	GetCompetitivePricingParams,
	GetOffersParams,
	GetCompetitiveSummaryBatchParams,
	CompetitiveSummaryBatchResponse,
} from '../../types/amazon/pricing.types.js';

/**
 * Amazon Product Pricing API Service
 * Handles price, competitive pricing, and offers lookups.
 */
class AmazonPricingService {
	private readonly API_VERSION_V0 = 'v0';
	private readonly API_VERSION_2022 = '2022-05-01';

	private createHttpError(message: string, statusCode: number, name = 'AmazonPricingError'): Error {
		const error = new Error(message) as Error & { statusCode?: number };
		error.name = name;
		error.statusCode = statusCode;
		return error;
	}

	private resolveMarketplaceId(marketplaceId?: string): string {
		return marketplaceId && marketplaceId.trim().length > 0
			? marketplaceId
			: amazonClient.getMarketplaceId();
	}

	/**
	 * GET /products/pricing/v0/price
	 */
	async getPricing(params: GetPricingParams): Promise<any> {
		if (!params.identifiers || params.identifiers.length === 0) {
			throw this.createHttpError('At least one identifier is required', 400, 'InvalidPricingRequestError');
		}

		const marketplaceId = this.resolveMarketplaceId(params.marketplaceId);
		const query: Record<string, string | string[] | undefined> = {
			MarketplaceId: marketplaceId,
			ItemType: params.type,
			[params.type === 'ASIN' ? 'Asins' : 'Skus']: params.identifiers,
		};

		if (params.itemCondition) query.ItemCondition = params.itemCondition;
		if (params.customerType) query.CustomerType = params.customerType;

		try {
			return await amazonClient.get<any>(`/products/pricing/${this.API_VERSION_V0}/price`, query);
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to fetch pricing for ${params.identifiers.join(',')}`,
				500,
				'AmazonPricingRequestError'
			);
		}
	}

	/**
	 * GET /products/pricing/v0/competitivePrice
	 */
	async getCompetitivePricing(params: GetCompetitivePricingParams): Promise<any> {
		if (!params.identifiers || params.identifiers.length === 0) {
			throw this.createHttpError('At least one identifier is required', 400, 'InvalidPricingRequestError');
		}

		const marketplaceId = this.resolveMarketplaceId(params.marketplaceId);
		const query: Record<string, string | string[] | undefined> = {
			MarketplaceId: marketplaceId,
			ItemType: params.type,
			[params.type === 'ASIN' ? 'Asins' : 'Skus']: params.identifiers,
		};

		try {
			return await amazonClient.get<any>(
				`/products/pricing/${this.API_VERSION_V0}/competitivePrice`,
				query
			);
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to fetch competitive pricing for ${params.identifiers.join(',')}`,
				500,
				'AmazonCompetitivePricingRequestError'
			);
		}
	}

	/**
	 * GET /products/pricing/v0/listings/{SellerSKU}/offers
	 */
	async getListingOffers(sellerSKU: string, params: GetOffersParams): Promise<any> {
		if (!sellerSKU) {
			throw this.createHttpError('sellerSKU is required', 400, 'InvalidPricingRequestError');
		}

		const marketplaceId = this.resolveMarketplaceId(params.marketplaceId);
		const query: Record<string, string | undefined> = {
			MarketplaceId: marketplaceId,
			ItemCondition: params.itemCondition,
			CustomerType: params.customerType,
		};

		try {
			return await amazonClient.get<any>(
				`/products/pricing/${this.API_VERSION_V0}/listings/${encodeURIComponent(sellerSKU)}/offers`,
				query
			);
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to fetch listing offers for SKU ${sellerSKU}`,
				500,
				'AmazonListingOffersRequestError'
			);
		}
	}

	/**
	 * GET /products/pricing/v0/items/{Asin}/offers
	 */
	async getItemOffers(asin: string, params: GetOffersParams): Promise<any> {
		if (!asin) {
			throw this.createHttpError('asin is required', 400, 'InvalidPricingRequestError');
		}

		const marketplaceId = this.resolveMarketplaceId(params.marketplaceId);
		const query: Record<string, string | undefined> = {
			MarketplaceId: marketplaceId,
			ItemCondition: params.itemCondition,
			CustomerType: params.customerType,
		};

		try {
			return await amazonClient.get<any>(
				`/products/pricing/${this.API_VERSION_V0}/items/${encodeURIComponent(asin)}/offers`,
				query
			);
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to fetch item offers for ASIN ${asin}`,
				500,
				'AmazonItemOffersRequestError'
			);
		}
	}

	/**
	 * POST /batches/products/pricing/2022-05-01/items/competitiveSummary
	 */
	async getCompetitiveSummaryBatch(
		params: GetCompetitiveSummaryBatchParams
	): Promise<CompetitiveSummaryBatchResponse[]> {
		if (!params.requests || params.requests.length === 0) {
			throw this.createHttpError('At least one request is required', 400, 'InvalidPricingRequestError');
		}

		const body = {
			requests: params.requests.map((r) => ({
				asin: r.asin,
				marketplaceId: this.resolveMarketplaceId(r.marketplaceId),
				method: 'GET',
				uri: '/products/pricing/2022-05-01/items/competitiveSummary',
				includedData: ['featuredBuyingOptions', 'lowestPricedOffers', 'referencePrices'],
			})),
		};

		try {
			const response = await amazonClient.post<any>(
				`/batches/products/pricing/${this.API_VERSION_2022}/items/competitiveSummary`,
				body
			);

			const responses: any[] = response?.responses ?? [];
			return responses.map((entry): CompetitiveSummaryBatchResponse => {
				const asin: string = entry?.request?.asin ?? '';
				const marketplaceId: string = entry?.request?.marketplaceId ?? '';
				const errorMessage: string | undefined = entry?.body?.errors?.[0]?.message;

				if (errorMessage) {
					return { asin, marketplaceId, summary: null, error: errorMessage };
				}

				const lowest = entry?.body?.lowestPricedOffers?.[0]?.offers?.[0];
				const lowestPrice: number | undefined = lowest?.listingPrice?.amount;
				const currency: string | undefined = lowest?.listingPrice?.currencyCode;
				const offerCount: number | undefined = entry?.body?.numberOfOffers?.[0]?.offerCount;

				if (lowestPrice === undefined || !currency) {
					return { asin, marketplaceId, summary: null };
				}

				return {
					asin,
					marketplaceId,
					summary: {
						lowestPrice,
						currency,
						offerCount: offerCount ?? 0,
					},
				};
			});
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to fetch competitive summary batch`,
				500,
				'AmazonCompetitiveSummaryBatchError'
			);
		}
	}
}

export default new AmazonPricingService();
