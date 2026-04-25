/**
 * Statistics Service
 * ------------------
 * A front-end–facing aggregator that does NOT talk to the Amazon SP-API
 * directly. Instead, it composes the lower-level `amazon/*` services
 * (catalog, pricing) into a single, pre-formatted response shape that the
 * mobile app can render without additional transformation.
 *
 * Public surface:
 *   - getSingleProductStatistics(params) — the ONLY exported function.
 *
 * Everything else in this file (category-fee lookup, FBA storage fee math,
 * attribute flag extraction, etc.) is a private helper used by that
 * function.
 */

import amazonCatalogService from './amazon/catalog.service.js';
import amazonPricingService from './amazon/pricing.service.js';
import amazonFeesService from './amazon/fees.service.js';
import amazonClient from './amazon/client.service.js';

// ─────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────

export type GetSingleProductStatisticsParams = {
	/** Product UPC/EAN. Either `barcode` or `asin` must be provided. */
	barcode?: string;
	/** Amazon ASIN. Either `barcode` or `asin` must be provided. */
	asin?: string;
	/** Override the default marketplace (defaults to client's configured ID). */
	marketplaceId?: string;
	/**
	 * Price the user found the product at (e.g. retail/source price the
	 * frontend captured). Used downstream for profit-margin calculations.
	 */
	foundPrice?: Money;
	/**
	 * User-provided estimate of available units to source. Used downstream
	 * for total-profit / inventory projections.
	 */
	estimatedQuantity?: number;
};

export type Money = {
	amount: number;
	currency: string;
};

export type BestSellerRank = {
	rank: number;
	category: string;
	link?: string;
};

export type OfferCounts = {
	total: number;
	fba: number;
	fbm: number;
};

export type SellerStats = {
	/**
	 * Popularity proxy: number of feedback ratings the Buy Box seller has
	 * received. Higher = more transaction volume over time.
	 */
	popularity: number | null;
	/** Percent positive feedback (0–100). */
	feedbackRating: number | null;
};

export type ProductFlags = {
	/** Raw material strings extracted from the catalog (e.g. "glass"). */
	materials: string[];
	isFragile: boolean;
	isGlass: boolean;
	isHazmat: boolean;
	containsBatteries: boolean;
};

export type PackageDimensions = {
	/** Each dimension is in inches; `weightLb` is in pounds. Null if unknown. */
	lengthIn: number | null;
	widthIn: number | null;
	heightIn: number | null;
	weightLb: number | null;
	/** Computed volume in cubic feet, or null if any dimension missing. */
	cubicFeet: number | null;
};

export type CategoryFeeEstimate = {
	/** Referral-fee category name used for the rate lookup. */
	category: string;
	/** Rate expressed as a decimal (0.15 = 15%). */
	rate: number;
	/** rate × listing price, in listing currency. Null if no price found. */
	amount: number | null;
	/**
	 * Where the rate came from:
	 *  - 'sp-api'   → authoritative, derived from SP-API fees estimate
	 *  - 'local-map'→ fallback, mapped from our static category table
	 *  - 'default'  → no classification matched; used 15% default
	 */
	source: 'sp-api' | 'local-map' | 'default';
};

export type StorageFeeEstimate = {
	/** Standard-size vs oversize classification used for the calculation. */
	sizeTier: 'standard' | 'oversize' | 'unknown';
	/** Season used in the calculation (affects rate). */
	season: 'jan-sep' | 'oct-dec';
	/** Rate in USD per cubic foot per month. */
	ratePerCubicFoot: number | null;
	/** Estimated monthly storage fee in USD. Null if dimensions unknown. */
	monthlyFee: number | null;
};

export type MonthlySalesPoint = {
	/** ISO date for the start of the period (e.g. "2026-03-01"). */
	periodStart: string;
	/** ISO date for the end of the period (e.g. "2026-03-31"). */
	periodEnd: string;
	unitsOrdered: number;
	orderedProductSalesAmount: number;
	currency: string;
	sessions: number;
	pageViews: number;
};

export type MonthlySalesData = {
	/**
	 * Why the data is or isn't present:
	 *  - 'ok'         → report fetched and parsed successfully
	 *  - 'empty'      → report ran but had no rows for this ASIN
	 *                   (likely the seller doesn't list it)
	 *  - 'not-ready'  → report didn't finish in our polling window;
	 *                   try again in a minute or two
	 *  - 'error'      → Reports API call failed; see message
	 */
	status: 'ok' | 'empty' | 'not-ready' | 'error';
	periods: MonthlySalesPoint[];
	message?: string;
};

export type SingleProductStatistics = {
	asin: string;
	marketplaceId: string;
	title: string | null;
	buyBoxPrice: Money | null;
	lowestPrice: Money | null;
	/** Frontend-provided price the user found the product at. */
	foundPrice: Money | null;
	/** Frontend-provided estimate of available units. */
	estimatedQuantity: number | null;
	bsr: BestSellerRank | null;
	offers: OfferCounts;
	seller: SellerStats;
	flags: ProductFlags;
	dimensions: PackageDimensions;
	categoryFee: CategoryFeeEstimate;
	storageFee: StorageFeeEstimate;
	/**
	 * Monthly sales for THIS ASIN from the seller's own account
	 * (`GET_SALES_AND_TRAFFIC_REPORT`). Not market-wide demand —
	 * empty if the seller doesn't list this ASIN.
	 */
	monthlySales: MonthlySalesData;
};

// ─────────────────────────────────────────────────────────────────────
// Public entrypoint
// ─────────────────────────────────────────────────────────────────────

/**
 * Fetches and formats a complete statistics snapshot for a single product.
 *
 * Flow:
 *   1. Resolve the ASIN (from barcode, if needed) and the catalog item.
 *   2. Fetch item-level offers (Buy Box + Lowest + offer breakdown).
 *   3. Derive pricing, BSR, flags, dimensions from those two payloads.
 *   4. Locally compute category referral fee and FBA monthly storage fee.
 */
export async function getSingleProductStatistics(
	params: GetSingleProductStatisticsParams
): Promise<SingleProductStatistics> {
	if (!params.barcode && !params.asin) {
		throw httpError('Either barcode or asin is required', 400, 'InvalidStatisticsRequestError');
	}

	const marketplaceId = params.marketplaceId?.trim()
		? params.marketplaceId
		: amazonClient.getMarketplaceId();

	// 1. Resolve ASIN + catalog item (one SP-API catalog call)
	const catalogResponse = params.barcode
		? await amazonCatalogService.searchCatalogItemsByBarcode(params.barcode)
		: await amazonCatalogService.searchCatalogItemsByAsin(params.asin!);

	const catalogItem = catalogResponse?.items?.[0];
	const asin: string = params.asin ?? amazonCatalogService.getASIN(catalogResponse);

	// 2. Fetch offers (for prices, seller, offer counts). Retry without
	// ItemCondition=New if SP-API rejects it for a restricted ASIN.
	const offersResponse = await fetchOffers(asin, marketplaceId);
	const offersPayload = unwrapPayload(offersResponse);

	// 3. Derive everything from the catalog + offers payloads
	const summary = pickSummary(catalogItem, marketplaceId);
	const title = typeof summary?.itemName === 'string' ? summary.itemName : null;

	const buyBoxPrice = readMoney(offersPayload?.Summary?.BuyBoxPrices?.[0]?.ListingPrice);
	const lowestPrice = readMoney(offersPayload?.Summary?.LowestPrices?.[0]?.ListingPrice);
	const bsr = extractBsr(catalogItem?.salesRanks ?? [], marketplaceId);
	const offers = countOffers(offersPayload);
	const seller = extractBuyBoxSeller(offersPayload);
	const flags = extractFlags(catalogItem);
	const dimensions = extractDimensions(catalogItem);

	// 4. Calculated fees
	//    Prefer the live SP-API referral fee over the static category map —
	//    it reflects Amazon's actual rate (including tiers/promotions) for this
	//    exact ASIN. We fall back to the local map if the API call fails or if
	//    there's no price to submit.
	const priceForFee = buyBoxPrice ?? lowestPrice;
	const categoryFee = await resolveCategoryFee({
		asin,
		marketplaceId,
		summary,
		price: priceForFee,
	});
	const storageFee = estimateMonthlyStorageFee(dimensions);

	// 5. Monthly sales (seller-account scoped). Soft-fail to keep the
	//    rest of the response intact even if the Reports API is slow or
	//    the seller has no data for this ASIN.
	const monthlySales = await fetchMonthlySalesForAsin(asin, marketplaceId);

	return {
		asin,
		marketplaceId,
		title,
		buyBoxPrice,
		lowestPrice,
		foundPrice: params.foundPrice ?? null,
		estimatedQuantity:
			typeof params.estimatedQuantity === 'number' && Number.isFinite(params.estimatedQuantity)
				? params.estimatedQuantity
				: null,
		bsr,
		offers,
		seller,
		flags,
		dimensions,
		categoryFee,
		storageFee,
		monthlySales,
	};
}

// ─────────────────────────────────────────────────────────────────────
// Error + payload helpers
// ─────────────────────────────────────────────────────────────────────

function httpError(message: string, statusCode: number, name = 'StatisticsError'): Error {
	const error = new Error(message) as Error & { statusCode?: number };
	error.name = name;
	error.statusCode = statusCode;
	return error;
}

/** SP-API responses sometimes wrap `payload` in an array. Normalize both. */
function unwrapPayload(raw: unknown): any | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const payload = (raw as { payload?: unknown }).payload;
	return Array.isArray(payload) ? payload[0] : payload;
}

function readMoney(listing: any): Money | null {
	if (!listing || typeof listing.Amount !== 'number') return null;
	return {
		amount: listing.Amount,
		currency: typeof listing.CurrencyCode === 'string' ? listing.CurrencyCode : 'USD',
	};
}

async function fetchOffers(asin: string, marketplaceId: string): Promise<unknown> {
	try {
		return await amazonPricingService.getItemOffers(asin, {
			marketplaceId,
			itemCondition: 'New',
		});
	} catch {
		// Restricted ASINs can reject ItemCondition=New — retry once without it.
		return amazonPricingService.getItemOffers(asin, { marketplaceId });
	}
}

// ─────────────────────────────────────────────────────────────────────
// Monthly sales (Reports API)
// ─────────────────────────────────────────────────────────────────────

/** Default lookback window for monthly sales: previous 3 full months. */
function buildMonthlySalesDateRange(): { dataStartTime: string; dataEndTime: string } {
	const now = new Date();
	// End of last fully-completed month
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
	// Start of the month 3 months before that
	const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1, 0, 0, 0));
	return {
		dataStartTime: start.toISOString(),
		dataEndTime: end.toISOString(),
	};
}

async function fetchMonthlySalesForAsin(
	asin: string,
	marketplaceId: string
): Promise<MonthlySalesData> {
	const { dataStartTime, dataEndTime } = buildMonthlySalesDateRange();
	try {
		const { rows } = await amazonCatalogService.fetchSalesAndTrafficReportForAsin({
			asin,
			marketplaceId,
			dataStartTime,
			dataEndTime,
			dateGranularity: 'MONTH',
			asinGranularity: 'CHILD',
		});

		if (rows.length === 0) {
			return { status: 'empty', periods: [] };
		}

		const periods = rows.map(mapSalesRow).filter((p): p is MonthlySalesPoint => p !== null);
		return { status: 'ok', periods };
	} catch (error: any) {
		if (error?.name === 'ReportNotReady') {
			return { status: 'not-ready', periods: [], message: error.message };
		}
		return {
			status: 'error',
			periods: [],
			message: error?.message ?? 'Failed to fetch sales-and-traffic report',
		};
	}
}

function mapSalesRow(row: any): MonthlySalesPoint | null {
	if (!row || typeof row !== 'object') return null;

	const sales = row.salesByAsin ?? row.sales ?? {};
	const traffic = row.trafficByAsin ?? row.traffic ?? {};
	const date = row.date ?? row.startDate ?? {};

	const periodStart =
		typeof date === 'string' ? date : (date.startDate ?? row.startDate ?? '');
	const periodEnd =
		typeof date === 'string' ? date : (date.endDate ?? row.endDate ?? periodStart);

	const orderedSales = sales.orderedProductSales ?? sales.orderedProductSalesB2B ?? {};

	return {
		periodStart: String(periodStart),
		periodEnd: String(periodEnd),
		unitsOrdered: Number(sales.unitsOrdered ?? sales.unitsOrderedB2B ?? 0),
		orderedProductSalesAmount: Number(orderedSales.amount ?? 0),
		currency: typeof orderedSales.currencyCode === 'string' ? orderedSales.currencyCode : 'USD',
		sessions: Number(traffic.sessions ?? traffic.sessionsB2B ?? 0),
		pageViews: Number(traffic.pageViews ?? traffic.pageViewsB2B ?? 0),
	};
}

// ─────────────────────────────────────────────────────────────────────
// Catalog extraction
// ─────────────────────────────────────────────────────────────────────

function pickSummary(catalogItem: any, marketplaceId: string): any | null {
	const summaries: any[] = catalogItem?.summaries ?? [];
	return summaries.find((s) => s.marketplaceId === marketplaceId) ?? summaries[0] ?? null;
}

function extractBsr(salesRanks: any[], marketplaceId: string): BestSellerRank | null {
	const forMarketplace = salesRanks.find((s) => s.marketplaceId === marketplaceId) ?? salesRanks[0];
	if (!forMarketplace) return null;
	const top = forMarketplace.displayGroupRanks?.[0] ?? forMarketplace.classificationRanks?.[0];
	if (!top) return null;
	return { rank: top.rank, category: top.title, link: top.link };
}

// ─────────────────────────────────────────────────────────────────────
// Offers / seller extraction
// ─────────────────────────────────────────────────────────────────────

function countOffers(offersPayload: any): OfferCounts {
	const summary = offersPayload?.Summary;

	const totalFromSummary =
		typeof summary?.TotalOfferCount === 'number' ? summary.TotalOfferCount : null;

	const offerList: any[] = Array.isArray(offersPayload?.Offers) ? offersPayload.Offers : [];
	let fba = 0;
	let fbm = 0;
	for (const offer of offerList) {
		if (offer?.IsFulfilledByAmazon === true) fba += 1;
		else if (offer?.IsFulfilledByAmazon === false) fbm += 1;
	}

	const detailedTotal = fba + fbm;
	return {
		total: totalFromSummary ?? detailedTotal,
		fba,
		fbm,
	};
}

function extractBuyBoxSeller(offersPayload: any): SellerStats {
	const offers: any[] = Array.isArray(offersPayload?.Offers) ? offersPayload.Offers : [];
	const winner = offers.find((o) => o?.IsBuyBoxWinner === true) ?? offers[0];
	const feedback = winner?.SellerFeedbackRating;
	return {
		popularity: typeof feedback?.FeedbackCount === 'number' ? feedback.FeedbackCount : null,
		feedbackRating:
			typeof feedback?.SellerPositiveFeedbackRating === 'number'
				? feedback.SellerPositiveFeedbackRating
				: null,
	};
}

// ─────────────────────────────────────────────────────────────────────
// Flags extraction
// ─────────────────────────────────────────────────────────────────────

const FRAGILE_KEYWORDS = ['fragile', 'glass', 'ceramic', 'porcelain', 'crystal'];
const GLASS_KEYWORDS = ['glass', 'crystal'];

function extractFlags(catalogItem: any): ProductFlags {
	const attributes = catalogItem?.attributes ?? {};
	const materials = collectAttributeValues(attributes, [
		'material',
		'material_type',
		'fabric_type',
		'outer_material_type',
	]);

	const lowered = materials.map((m) => m.toLowerCase());
	const isGlass = lowered.some((m) => GLASS_KEYWORDS.some((k) => m.includes(k)));
	const isFragile =
		isGlass ||
		lowered.some((m) => FRAGILE_KEYWORDS.some((k) => m.includes(k))) ||
		readBooleanAttribute(attributes, 'is_fragile') === true;

	const isHazmat =
		readBooleanAttribute(attributes, 'is_hazmat') === true ||
		readBooleanAttribute(attributes, 'hazmat') === true ||
		!!readStringAttribute(attributes, 'dangerous_goods_regulations');

	const containsBatteries =
		readBooleanAttribute(attributes, 'are_batteries_included') === true ||
		readBooleanAttribute(attributes, 'batteries_required') === true ||
		!!readStringAttribute(attributes, 'battery_cell_composition');

	return { materials, isFragile, isGlass, isHazmat, containsBatteries };
}

/** Catalog v2022 attributes are shaped as `{ [name]: [{ value, marketplace_id, ... }] }`. */
function collectAttributeValues(attributes: Record<string, any>, keys: string[]): string[] {
	const out: string[] = [];
	for (const key of keys) {
		const entries = attributes?.[key];
		if (!Array.isArray(entries)) continue;
		for (const entry of entries) {
			const value = entry?.value;
			if (typeof value === 'string' && value.trim().length > 0) out.push(value.trim());
		}
	}
	return out;
}

function readStringAttribute(attributes: Record<string, any>, key: string): string | null {
	const entries = attributes?.[key];
	if (!Array.isArray(entries) || entries.length === 0) return null;
	const value = entries[0]?.value;
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readBooleanAttribute(attributes: Record<string, any>, key: string): boolean | null {
	const entries = attributes?.[key];
	if (!Array.isArray(entries) || entries.length === 0) return null;
	const value = entries[0]?.value;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
	return null;
}

// ─────────────────────────────────────────────────────────────────────
// Dimensions extraction
// ─────────────────────────────────────────────────────────────────────

const CM_TO_INCH = 1 / 2.54;
const KG_TO_LB = 2.2046226218;
const G_TO_LB = KG_TO_LB / 1000;
const OZ_TO_LB = 1 / 16;

function extractDimensions(catalogItem: any): PackageDimensions {
	const dimensionEntries: any[] = catalogItem?.dimensions ?? [];
	// Prefer `package` dimensions (ship weight/size) over `item` dimensions.
	const entry = dimensionEntries[0];
	const pkg = entry?.package ?? entry?.item ?? null;

	const lengthIn = toInches(pkg?.length);
	const widthIn = toInches(pkg?.width);
	const heightIn = toInches(pkg?.height);
	const weightLb = toPounds(pkg?.weight);

	const cubicFeet =
		lengthIn !== null && widthIn !== null && heightIn !== null
			? (lengthIn * widthIn * heightIn) / 1728
			: null;

	return { lengthIn, widthIn, heightIn, weightLb, cubicFeet };
}

function toInches(measure: any): number | null {
	if (!measure || typeof measure.value !== 'number') return null;
	const unit = String(measure.unit ?? '').toLowerCase();
	if (unit === 'inches' || unit === 'in') return measure.value;
	if (unit === 'centimeters' || unit === 'cm') return measure.value * CM_TO_INCH;
	if (unit === 'millimeters' || unit === 'mm') return (measure.value / 10) * CM_TO_INCH;
	if (unit === 'feet' || unit === 'ft') return measure.value * 12;
	return measure.value; // assume inches if unspecified
}

function toPounds(measure: any): number | null {
	if (!measure || typeof measure.value !== 'number') return null;
	const unit = String(measure.unit ?? '').toLowerCase();
	if (unit === 'pounds' || unit === 'lb' || unit === 'lbs') return measure.value;
	if (unit === 'ounces' || unit === 'oz') return measure.value * OZ_TO_LB;
	if (unit === 'kilograms' || unit === 'kg') return measure.value * KG_TO_LB;
	if (unit === 'grams' || unit === 'g') return measure.value * G_TO_LB;
	return measure.value; // assume lbs if unspecified
}

// ─────────────────────────────────────────────────────────────────────
// Category referral-fee estimation
// ─────────────────────────────────────────────────────────────────────

/**
 * Amazon US referral-fee rates by category (decimal form).
 * Source: Amazon "Selling on Amazon fee schedule" (US, 2024).
 *
 * Most categories are 15%. Categories with tiered rates use the dominant
 * tier — we keep the lookup simple per the requirement. If a category is
 * not recognized, we fall back to 0.15 (Everything Else).
 */
const CATEGORY_FEE_RATES: Record<string, number> = {
	'3D Printed Products': 0.12,
	'Amazon Device Accessories': 0.45,
	'Automotive & Powersports': 0.12,
	'Baby Products': 0.15,
	'Beauty, Health & Personal Care': 0.15,
	'Books': 0.15,
	'Camera & Photo': 0.08,
	'Cell Phones': 0.08,
	'Clothing & Accessories': 0.17,
	'Compact Appliances': 0.15,
	'Consumer Electronics': 0.08,
	'Electronics Accessories': 0.15,
	'Full-size Appliances': 0.08,
	'Furniture': 0.15,
	'Grocery & Gourmet Food': 0.15,
	'Handmade': 0.15,
	'Home & Kitchen': 0.15,
	'Industrial & Scientific': 0.12,
	'Jewelry': 0.20,
	'Luggage': 0.15,
	'Major Appliances': 0.08,
	'Music, Video & DVD': 0.15,
	'Musical Instruments & AV Production': 0.15,
	'Office Products': 0.15,
	'Outdoors': 0.15,
	'Pet Supplies': 0.15,
	'Shoes, Handbags & Sunglasses': 0.15,
	'Software & Computer/Video Games': 0.15,
	'Sports': 0.15,
	'Tires': 0.10,
	'Tools & Home Improvement': 0.15,
	'Toys & Games': 0.15,
	'Video Game Consoles': 0.08,
	'Watches': 0.16,
	'Everything Else': 0.15,
};

const DEFAULT_CATEGORY_FEE_RATE = 0.15;

/**
 * Map free-text catalog classifications to one of our known category keys.
 * Kept intentionally coarse — callers can refine over time without changing
 * the public shape.
 */
function resolveFeeCategory(summary: any): { category: string; rate: number } {
	// Concatenate every classification hint into one haystack instead of
	// short-circuiting on the first non-null field. The leaf node (e.g.
	// browseClassification.displayName="Creams") is often too specific to
	// match a top-level category, but websiteDisplayGroupName ("Beauty") and
	// itemName usually contain the keyword we need.
	const haystackParts: string[] = [
		summary?.browseClassification?.displayName,
		summary?.websiteDisplayGroupName,
		summary?.websiteDisplayGroup,
		summary?.itemClassification,
		summary?.itemName,
		summary?.brand,
	].filter((s): s is string => typeof s === 'string' && s.length > 0);

	if (haystackParts.length === 0) {
		return { category: 'Everything Else', rate: DEFAULT_CATEGORY_FEE_RATE };
	}

	const lowered = haystackParts.join(' | ').toLowerCase();

	for (const [key, rate] of Object.entries(CATEGORY_FEE_RATES)) {
		if (lowered.includes(key.toLowerCase())) {
			return { category: key, rate };
		}
	}

	// Keyword fallbacks (catalog strings rarely match our labels exactly).
	const keywordRules: Array<[RegExp, string]> = [
		[/clothing|apparel|shirt|dress|pants/, 'Clothing & Accessories'],
		[/shoe|footwear|handbag|sunglass/, 'Shoes, Handbags & Sunglasses'],
		[/jewelry|necklace|ring|bracelet/, 'Jewelry'],
		[/watch/, 'Watches'],
		[/phone|cellular|smartphone/, 'Cell Phones'],
		[/camera|photo/, 'Camera & Photo'],
		[/electronic|tv|television|audio|headphone/, 'Consumer Electronics'],
		[/grocery|gourmet|food|beverage/, 'Grocery & Gourmet Food'],
		[
			/beauty|cosmetic|skin\s?care|makeup|fragrance|perfume|shampoo|lotion|cream|ointment|balm|moisturiz|serum|deodorant|hair\s?care|nail|health|vitamin|supplement|wellness|personal\s?care/,
			'Beauty, Health & Personal Care',
		],
		[/baby|infant|toddler|diaper|formula/, 'Baby Products'],
		[/pet|dog|cat|aquarium/, 'Pet Supplies'],
		[/toy|game|puzzle/, 'Toys & Games'],
		[/book/, 'Books'],
		[/music|instrument/, 'Musical Instruments & AV Production'],
		[/office|stationery/, 'Office Products'],
		[/sport|fitness|exercise/, 'Sports'],
		[/tool|hardware/, 'Tools & Home Improvement'],
		[/furniture/, 'Furniture'],
		[/kitchen|home|decor/, 'Home & Kitchen'],
		[/automotive|car|vehicle/, 'Automotive & Powersports'],
		[/industrial|scientific/, 'Industrial & Scientific'],
		[/luggage|suitcase|backpack/, 'Luggage'],
	];

	for (const [regex, category] of keywordRules) {
		if (regex.test(lowered)) {
			return { category, rate: CATEGORY_FEE_RATES[category] ?? DEFAULT_CATEGORY_FEE_RATE };
		}
	}

	return { category: 'Everything Else', rate: DEFAULT_CATEGORY_FEE_RATE };
}

function estimateCategoryFee(summary: any, price: Money | null): CategoryFeeEstimate {
	const { category, rate } = resolveFeeCategory(summary);
	const amount = price ? round2(price.amount * rate) : null;
	const source: CategoryFeeEstimate['source'] =
		category === 'Everything Else' ? 'default' : 'local-map';
	return { category, rate, amount, source };
}

/**
 * Preferred path: ask SP-API for the authoritative referral fee for this ASIN
 * at the given price, then back-calculate the rate. Falls back to the local
 * category map if SP-API doesn't return a usable referral fee.
 */
async function resolveCategoryFee(args: {
	asin: string;
	marketplaceId: string;
	summary: any;
	price: Money | null;
}): Promise<CategoryFeeEstimate> {
	const fallback = estimateCategoryFee(args.summary, args.price);

	if (!args.price || args.price.amount <= 0) return fallback;

	try {
		const live = await amazonFeesService.getReferralFeeForAsin({
			asin: args.asin,
			price: args.price.amount,
			currency: args.price.currency,
			marketplaceId: args.marketplaceId,
		});

		if (live.referralFee !== null && live.referralRate !== null) {
			return {
				category: fallback.category,
				rate: round4(live.referralRate),
				amount: round2(live.referralFee),
				source: 'sp-api',
			};
		}
	} catch {
		// Swallow — fall back to the static map.
	}

	return fallback;
}

// ─────────────────────────────────────────────────────────────────────
// FBA monthly storage fee estimation
// ─────────────────────────────────────────────────────────────────────

/**
 * FBA Monthly Inventory Storage Fees (US, 2024).
 *   - Standard-size: Jan–Sep $0.87 / ft³, Oct–Dec $2.40 / ft³
 *   - Oversize:      Jan–Sep $0.56 / ft³, Oct–Dec $1.40 / ft³
 *
 * Standard-size definition (simplified):
 *   Longest side ≤ 18", median side ≤ 14", shortest side ≤ 8",
 *   and unit weight ≤ 20 lb.
 */
const STORAGE_RATES = {
	standard: { 'jan-sep': 0.87, 'oct-dec': 2.40 },
	oversize: { 'jan-sep': 0.56, 'oct-dec': 1.40 },
} as const;

function currentStorageSeason(now: Date = new Date()): 'jan-sep' | 'oct-dec' {
	const month = now.getUTCMonth(); // 0-indexed
	return month >= 9 ? 'oct-dec' : 'jan-sep';
}

function classifySizeTier(
	dimensions: PackageDimensions
): 'standard' | 'oversize' | 'unknown' {
	const { lengthIn, widthIn, heightIn, weightLb } = dimensions;
	if (lengthIn === null || widthIn === null || heightIn === null) return 'unknown';

	const sides = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
	const [longest, median, shortest] = sides as [number, number, number];

	const withinStandard =
		longest <= 18 &&
		median <= 14 &&
		shortest <= 8 &&
		(weightLb === null || weightLb <= 20);

	return withinStandard ? 'standard' : 'oversize';
}

function estimateMonthlyStorageFee(dimensions: PackageDimensions): StorageFeeEstimate {
	const sizeTier = classifySizeTier(dimensions);
	const season = currentStorageSeason();

	if (sizeTier === 'unknown' || dimensions.cubicFeet === null) {
		return { sizeTier, season, ratePerCubicFoot: null, monthlyFee: null };
	}

	const ratePerCubicFoot = STORAGE_RATES[sizeTier][season];
	return {
		sizeTier,
		season,
		ratePerCubicFoot,
		monthlyFee: round2(ratePerCubicFoot * dimensions.cubicFeet),
	};
}

// ─────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

function round4(n: number): number {
	return Math.round(n * 10000) / 10000;
}