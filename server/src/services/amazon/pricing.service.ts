import amazonClient from './client.service.js';

/**
 * Amazon Product Pricing API Service
 * Currently only exposes the single endpoint used by statistics.service.
 */

type GetItemOffersParams = {
	marketplaceId?: string;
	itemCondition?: string;
	customerType?: string;
};

class AmazonPricingService {
	private readonly API_VERSION_V0 = 'v0';

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
	 * GET /products/pricing/v0/items/{Asin}/offers
	 */
	async getItemOffers(asin: string, params: GetItemOffersParams): Promise<any> {
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
}

export default new AmazonPricingService();
