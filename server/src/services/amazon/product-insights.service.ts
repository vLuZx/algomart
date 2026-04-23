import amazonCatalogService from './catalog.service.js';
import amazonPricingService from './pricing.service.js';
import amazonFeesService from './fees.service.js';
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
	| 'offers'
	| 'fees';

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

		// ── DEBUG: pricing data shapes ────────────────────────────────
		console.debug('[Insights] ASIN', asin, 'marketplaceId', marketplaceId);
		if (fieldResults.pricing) {
			const pricingPayload = (fieldResults.pricing as any)?.payload;
			console.debug(
				'[Insights] pricing.payload[0] keys:',
				Array.isArray(pricingPayload) && pricingPayload[0]
					? Object.keys(pricingPayload[0])
					: 'no payload[0]'
			);
			const offerCount = (fieldResults.pricing as any)?.payload?.[0]?.Product?.Offers?.length ?? 0;
			console.debug('[Insights] pricing.Offers count:', offerCount);
		}
		if (fieldResults.offers) {
			const offersPayload = (fieldResults.offers as any)?.payload;
			const obj = Array.isArray(offersPayload) ? offersPayload[0] : offersPayload;
			console.debug('[Insights] offers.payload keys:', obj ? Object.keys(obj) : 'no payload');
			console.debug('[Insights] offers.Summary:', JSON.stringify(obj?.Summary ?? null));
		}

		// Fees (runs after pricing so we can use Amazon's listing price).
		if (params.fields.includes('fees')) {
			try {
				// Make sure we have offers data (best source for non-self-listed ASINs)
				if (fieldResults.offers === undefined && fieldResults.pricing === undefined) {
					console.debug('[Insights] fees: pre-fetching offers for price discovery');
					try {
						fieldResults.offers = await this.fetchPricingField('offers', asin, { marketplaceId });
					} catch (offersError) {
						console.debug('[Insights] fees: offers pre-fetch failed', (offersError as Error).message);
					}
				}

				const listingPrice = this.extractListingPriceFromAllSources(fieldResults);
				console.debug('[Insights] fees: resolved listing price =', listingPrice);

				if (listingPrice && listingPrice.price > 0) {
					fieldResults.fees = await amazonFeesService.getFeesEstimateForAsin({
						asin,
						price: listingPrice.price,
						currency: listingPrice.currency,
						marketplaceId,
					});
				} else {
					errors.fees = 'No Amazon listing price available to estimate fees';
				}
			} catch (error) {
				errors.fees = (error as Error).message;
			}
		}

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
			case 'offers': {
				// Many restricted/gated ASINs reject ItemCondition=New with
				// "Invalid condition". Retry once without ItemCondition so we
				// still get Summary (Buy Box / Lowest) data.
				const condition = options.itemCondition ?? 'New';
				try {
					return await amazonPricingService.getItemOffers(asin, {
						marketplaceId: options.marketplaceId,
						itemCondition: condition,
						...(options.customerType ? { customerType: options.customerType } : {}),
					});
				} catch (error) {
					console.debug(
						'[Insights] offers: retrying without ItemCondition after:',
						(error as Error).message
					);
					return amazonPricingService.getItemOffers(asin, {
						marketplaceId: options.marketplaceId,
						...(options.customerType ? { customerType: options.customerType } : {}),
					});
				}
			}
			default:
				return null;
		}
	}

	/**
	 * Resolve the best Amazon listing price across all pricing payloads.
	 *
	 * GetPricing v0 only returns *your own* offers, so for ASINs you don't
	 * sell, `Offers` is empty. Fall back to GetItemOffers' Buy Box / Lowest
	 * prices, which reflect the actual market price.
	 */
	private extractListingPriceFromAllSources(
		fieldResults: Partial<Record<ProductInsightField, unknown>>
	): { price: number; currency: string; source: string } | null {
		// Source 1: pricing payload (only useful if you have your own offer)
		const fromPricing = this.extractListingPriceFromRawPricing(fieldResults.pricing);
		if (fromPricing) {
			return { ...fromPricing, source: 'pricing.Offers' };
		}

		// Source 2: GetItemOffers Buy Box price → Lowest price
		const fromOffers = this.extractListingPriceFromRawOffers(fieldResults.offers);
		if (fromOffers) {
			return fromOffers;
		}

		// Source 3: competitivePricing buy box
		const fromCompetitive = this.extractListingPriceFromCompetitive(fieldResults.competitivePricing);
		if (fromCompetitive) {
			return fromCompetitive;
		}

		return null;
	}

	/**
	 * Walks the raw SP-API GetPricing response to find the first listing price.
	 * Returns null if the shape doesn't match or no price is present.
	 */
	private extractListingPriceFromRawPricing(
		raw: unknown
	): { price: number; currency: string } | null {
		if (!raw || typeof raw !== 'object') return null;
		const payload = (raw as { payload?: unknown }).payload;
		const first = Array.isArray(payload) ? (payload[0] as Record<string, any>) : undefined;
		const offers = first?.Product?.Offers;
		const listing = Array.isArray(offers) ? offers[0]?.BuyingPrice?.ListingPrice : undefined;
		const price = typeof listing?.Amount === 'number' ? listing.Amount : null;
		const currency = typeof listing?.CurrencyCode === 'string' ? listing.CurrencyCode : 'USD';
		return price !== null ? { price, currency } : null;
	}

	/**
	 * Walks the raw SP-API GetItemOffers response.
	 * `payload` is an OBJECT (not array) for the single-ASIN endpoint and
	 * exposes Summary.BuyBoxPrices and Summary.LowestPrices.
	 */
	private extractListingPriceFromRawOffers(
		raw: unknown
	): { price: number; currency: string; source: string } | null {
		if (!raw || typeof raw !== 'object') return null;
		const payload = (raw as { payload?: unknown }).payload;
		// Some SP-API shapes wrap payload in an array; handle both.
		const obj = Array.isArray(payload) ? (payload[0] as any) : (payload as any);
		const summary = obj?.Summary;
		if (!summary) return null;

		const buyBox = summary.BuyBoxPrices?.[0]?.ListingPrice;
		if (typeof buyBox?.Amount === 'number') {
			return {
				price: buyBox.Amount,
				currency: typeof buyBox.CurrencyCode === 'string' ? buyBox.CurrencyCode : 'USD',
				source: 'offers.Summary.BuyBoxPrices',
			};
		}

		const lowest = summary.LowestPrices?.[0]?.ListingPrice;
		if (typeof lowest?.Amount === 'number') {
			return {
				price: lowest.Amount,
				currency: typeof lowest.CurrencyCode === 'string' ? lowest.CurrencyCode : 'USD',
				source: 'offers.Summary.LowestPrices',
			};
		}

		return null;
	}

	private extractListingPriceFromCompetitive(
		raw: unknown
	): { price: number; currency: string; source: string } | null {
		if (!raw || typeof raw !== 'object') return null;
		const payload = (raw as { payload?: unknown }).payload;
		const first = Array.isArray(payload) ? (payload[0] as any) : undefined;
		const competitivePrices = first?.Product?.CompetitivePricing?.CompetitivePrices;
		const buyBox = Array.isArray(competitivePrices)
			? competitivePrices.find((p) => p?.CompetitivePriceId === '1') ?? competitivePrices[0]
			: undefined;
		const listing = buyBox?.Price?.ListingPrice;
		if (typeof listing?.Amount === 'number') {
			return {
				price: listing.Amount,
				currency: typeof listing.CurrencyCode === 'string' ? listing.CurrencyCode : 'USD',
				source: 'competitivePricing.CompetitivePrices',
			};
		}
		return null;
	}
}

export default new ProductInsightsService();
