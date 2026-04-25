import amazonClient from './client.service.js';

/**
 * Amazon Product Fees API Service
 *
 * Wraps SP-API Product Fees v0:
 *   POST /products/fees/v0/items/{Asin}/feesEstimate
 *   POST /products/fees/v0/listings/{SellerSKU}/feesEstimate
 */

export type GetFeesEstimateParams = {
	asin: string;
	price: number;
	currency?: string;
	marketplaceId?: string;
	isAmazonFulfilled?: boolean;
	/** Optional seller-provided shipping revenue */
	shippingPrice?: number;
	/** Optional promo/rebate amount deducted before fees are calculated */
	pointsValue?: number;
	/**
	 * Unique identifier for this request (Amazon requires it).
	 * If not provided, one will be generated.
	 */
	identifier?: string;
};

export type FeesEstimate = {
	asin: string;
	marketplaceId: string;
	currency: string;
	listingPrice: number;
	totalFees: number | null;
	feeBreakdown: Array<{ type: string; amount: number }>;
	status: string | null;
	error?: string;
};

class AmazonFeesService {
	private readonly API_VERSION = 'v0';

	private createHttpError(message: string, statusCode: number, name = 'AmazonFeesError'): Error {
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
	 * Estimate fees for a single ASIN at a given listing price.
	 */
	async getFeesEstimateForAsin(params: GetFeesEstimateParams): Promise<FeesEstimate> {
		if (!params.asin) {
			throw this.createHttpError('asin is required', 400, 'InvalidFeesRequestError');
		}
		if (typeof params.price !== 'number' || !Number.isFinite(params.price) || params.price <= 0) {
			throw this.createHttpError(
				'price must be a positive number',
				400,
				'InvalidFeesRequestError'
			);
		}

		const marketplaceId = this.resolveMarketplaceId(params.marketplaceId);
		const currency = params.currency && params.currency.trim().length > 0 ? params.currency : 'USD';
		const identifier = params.identifier ?? `${params.asin}-${Date.now()}`;

		const feesEstimateRequest: Record<string, unknown> = {
			MarketplaceId: marketplaceId,
			IsAmazonFulfilled: params.isAmazonFulfilled ?? true,
			PriceToEstimateFees: {
				ListingPrice: { CurrencyCode: currency, Amount: params.price },
			},
			Identifier: identifier,
		};

		if (typeof params.shippingPrice === 'number') {
			(feesEstimateRequest.PriceToEstimateFees as Record<string, unknown>).Shipping = {
				CurrencyCode: currency,
				Amount: params.shippingPrice,
			};
		}

		if (typeof params.pointsValue === 'number') {
			(feesEstimateRequest.PriceToEstimateFees as Record<string, unknown>).Points = {
				PointsNumber: 0,
				PointsMonetaryValue: { CurrencyCode: currency, Amount: params.pointsValue },
			};
		}

		try {
			const response = await amazonClient.post<any>(
				`/products/fees/${this.API_VERSION}/items/${encodeURIComponent(params.asin)}/feesEstimate`,
				{ FeesEstimateRequest: feesEstimateRequest }
			);
			return this.normalizeResponse(response, params.asin, marketplaceId, currency, params.price);
		} catch (error) {
			throw this.createHttpError(
				`Error: ${error}, Message: Failed to fetch fees estimate for ASIN ${params.asin}`,
				500,
				'AmazonFeesRequestError'
			);
		}
	}

	private normalizeResponse(
		raw: any,
		asin: string,
		marketplaceId: string,
		currency: string,
		listingPrice: number
	): FeesEstimate {
		// SP-API wraps the result at payload.FeesEstimateResult for the single-item endpoint.
		const result =
			raw?.payload?.FeesEstimateResult ??
			raw?.FeesEstimateResult ??
			raw?.payload ??
			raw ??
			{};

		const estimate = result?.FeesEstimate ?? null;
		const status: string | null = typeof result?.Status === 'string' ? result.Status : null;

		const totalAmount: number | null =
			typeof estimate?.TotalFeesEstimate?.Amount === 'number'
				? estimate.TotalFeesEstimate.Amount
				: null;

		const returnedCurrency: string =
			typeof estimate?.TotalFeesEstimate?.CurrencyCode === 'string'
				? estimate.TotalFeesEstimate.CurrencyCode
				: currency;

		const detailList: any[] = Array.isArray(estimate?.FeeDetailList) ? estimate.FeeDetailList : [];
		const feeBreakdown = detailList
			.map((detail) => ({
				type: typeof detail?.FeeType === 'string' ? detail.FeeType : 'Unknown',
				amount: typeof detail?.FinalFee?.Amount === 'number' ? detail.FinalFee.Amount : 0,
			}))
			.filter((entry) => entry.amount !== 0);

		const normalized: FeesEstimate = {
			asin,
			marketplaceId,
			currency: returnedCurrency,
			listingPrice,
			totalFees: totalAmount,
			feeBreakdown,
			status,
		};

		const errorMessage =
			result?.Error?.Message ?? raw?.errors?.[0]?.message ?? undefined;
		if (typeof errorMessage === 'string' && errorMessage.length > 0) {
			normalized.error = errorMessage;
		}

		return normalized;
	}
}

export default new AmazonFeesService();
