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
import amazonEligibilityService, {
	type InboundEligibilityResult,
} from './amazon/eligibility.service.js';
import amazonRestrictionsService, {
	type ListingRestrictionsResult,
} from './amazon/restrictions.service.js';
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

type OfferCounts = {
	total: number;
	fba: number;
	fbm: number;
};

type SellerStats = {
	/**
	 * Popularity proxy: number of feedback ratings the Buy Box seller has
	 * received. Higher = more transaction volume over time.
	 */
	popularity: number | null;
	/** Percent positive feedback (0–100). */
	feedbackRating: number | null;
};

type ProductFlags = {
	/** Raw material strings extracted from the catalog (e.g. "glass"). */
	materials: string[];
	isFragile: boolean;
	isGlass: boolean;
	isHazmat: boolean;
	containsBatteries: boolean;
};

/**
 * Per-seller offer details extracted from the SP-API offers payload.
 * Pure data — no scoring (that lives in calculation.service).
 */
export type SellerOffer = {
	sellerId: string | null;
	/** True only for Amazon Retail (1P). Excludes AWD / Amazon Resale. */
	isAmazon: boolean;
	/** True if the seller is any Amazon-owned entity (Retail OR Warehouse Deals OR Resale). */
	isAmazonOwned: boolean;
	/** Which Amazon-owned program this seller is, when applicable. */
	amazonSellerType: 'amazon-retail' | 'amazon-warehouse-deals' | 'amazon-resale' | null;
	isFulfilledByAmazon: boolean;
	isBuyBoxWinner: boolean;
	isFeaturedMerchant: boolean;
	isPrimeEligible: boolean;
	condition: string | null;
	listingPrice: Money | null;
	shippingPrice: Money | null;
	/** listingPrice + shippingPrice (in listing currency). Null if no listing price. */
	landedPrice: Money | null;
	feedbackRating: number | null;
	feedbackCount: number | null;
	/** Country / region the offer ships from, when reported. */
	shipsFrom: string | null;
};

/** Listing-level aggregate metrics across all observed sellers. */
export type CompetitionAggregate = {
	totalSellerCount: number;
	fbaSellerCount: number;
	fbmSellerCount: number;
	newConditionCount: number;
	amazonIsSelling: boolean;
	amazonIsBuyBoxWinner: boolean;
	buyBoxPrice: Money | null;
	buyBoxSellerId: string | null;
	lowestFbaPrice: Money | null;
	lowestFbmPrice: Money | null;
	/** highest landed price minus lowest landed price (listing currency). */
	priceSpread: number | null;
	/** mean SellerPositiveFeedbackRating across sellers that report it (0–100). */
	averageFeedbackRating: number | null;
};

type CompetitionData = {
	sellers: SellerOffer[];
	aggregate: CompetitionAggregate;
};

type PackageDimensions = {
	/** Each dimension is in inches; `weightLb` is in pounds. Null if unknown. */
	lengthIn: number | null;
	widthIn: number | null;
	heightIn: number | null;
	weightLb: number | null;
	/** Computed volume in cubic feet, or null if any dimension missing. */
	cubicFeet: number | null;
};

type CategoryFeeEstimate = {
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

/**
 * FBA fulfillment (pick & pack) fee — distinct from the referral fee
 * captured in `CategoryFeeEstimate`. Pulled from the SP-API fees estimate
 * when available; falls back to a published US rate-card estimate based
 * on package dimensions + weight when SP-API doesn't return one.
 */
type FulfillmentFeeEstimate = {
	amount: number | null;
	source: 'sp-api' | 'rate-card' | 'unavailable';
};

type StorageSeason = 'jan-sep' | 'oct-dec';

type StorageFeeEstimate = {
	/** Standard-size vs oversize classification used for the calculation. */
	sizeTier: 'standard' | 'oversize' | 'unknown';
	/** Active season (drives `ratePerCubicFoot` / `monthlyFee`). */
	season: StorageSeason;
	/** Rate in USD per cubic foot for the active season. */
	ratePerCubicFoot: number | null;
	/** Estimated monthly storage fee for the active season. Null if dimensions unknown. */
	monthlyFee: number | null;
	/** Both seasonal rates, exposed so the UI can warn about the Q4 spike. */
	seasonalRates: { 'jan-sep': number; 'oct-dec': number } | null;
	/** Both seasonal monthly fees, computed from cubic feet. */
	seasonalMonthlyFees: { 'jan-sep': number; 'oct-dec': number } | null;
};

export type SingleProductStatistics = {
	asin: string;
	marketplaceId: string;
	title: string | null;
	/** URL of the product's MAIN image for this marketplace, or null if unavailable. */
	image: string | null;
	buyBoxPrice: Money | null;
	lowestPrice: Money | null;
	/** Frontend-provided estimate of available units. */
	estimatedQuantity: number | null;
	bsr: BestSellerRank | null;
	offers: OfferCounts;
	seller: SellerStats;
	flags: ProductFlags;
	dimensions: PackageDimensions;
	categoryFee: CategoryFeeEstimate;
	/** FBA fulfillment (pick & pack) fee, separate from referral fee. */
	fulfillmentFee: FulfillmentFeeEstimate;
	storageFee: StorageFeeEstimate;
	/** FBA INBOUND eligibility for this ASIN, with translated reason codes. */
	inboundEligibility: InboundEligibilityResult;
	/** Listings Restrictions for this seller/ASIN (approval-required check). */
	listingRestrictions: ListingRestrictionsResult;
	/** Per-seller offers + listing-level aggregate metrics. */
	competition: CompetitionData;
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
	const image = extractMainImage(catalogItem, marketplaceId);

	const buyBoxPrice = readMoney(offersPayload?.Summary?.BuyBoxPrices?.[0]?.ListingPrice);
	const lowestPrice = readMoney(offersPayload?.Summary?.LowestPrices?.[0]?.ListingPrice);
	const bsr = extractBsr(catalogItem?.salesRanks ?? [], marketplaceId);
	const offers = countOffers(offersPayload);
	const seller = extractBuyBoxSeller(offersPayload);
	const competition = extractCompetition(offersPayload, marketplaceId);
	const flags = extractFlags(catalogItem);
	const dimensions = extractDimensions(catalogItem);

	// 4. Calculated fees
	//    Prefer the live SP-API referral fee over the static category map —
	//    it reflects Amazon's actual rate (including tiers/promotions) for this
	//    exact ASIN. We fall back to the local map if the API call fails or if
	//    there's no price to submit.
	// 4. Calculated fees
	//    Prefer the live SP-API fees estimate over the static category map —
	//    one estimate call returns BOTH the referral fee and the FBA
	//    fulfillment (pick & pack) fee. Splitting them here is critical:
	//    they're distinct line items in Amazon's calculator, and conflating
	//    them was the source of a profit miscalculation bug.
	const priceForFee = buyBoxPrice ?? lowestPrice;
	const [feesResult, inboundEligibility, listingRestrictions] = await Promise.all([
		resolveCombinedFees({
			asin,
			marketplaceId,
			summary,
			price: priceForFee,
			dimensions,
		}),
		amazonEligibilityService.getInboundEligibility(asin, marketplaceId, 'INBOUND'),
		amazonRestrictionsService.getRestrictions(asin, { marketplaceId }),
	]);
	const { categoryFee, fulfillmentFee } = feesResult;
	const storageFee = estimateMonthlyStorageFee(dimensions);

	return {
		asin,
		marketplaceId,
		title,
		image,
		buyBoxPrice,
		lowestPrice,
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
		fulfillmentFee,
		storageFee,
		inboundEligibility,
		listingRestrictions,
		competition,
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
// Catalog extraction
// ─────────────────────────────────────────────────────────────────────

function pickSummary(catalogItem: any, marketplaceId: string): any | null {
	const summaries: any[] = catalogItem?.summaries ?? [];
	return summaries.find((s) => s.marketplaceId === marketplaceId) ?? summaries[0] ?? null;
}

/**
 * Pulls the MAIN image URL for the given marketplace from the catalog item.
 * Catalog Items v2022-04-01 shape:
 *   item.images = [{ marketplaceId, images: [{ variant, link, height, width }, ...] }]
 * Falls back to the first marketplace block, then the first image of any variant.
 */
function extractMainImage(catalogItem: any, marketplaceId: string): string | null {
	const groups: any[] = catalogItem?.images ?? [];
	if (groups.length === 0) return null;

	const group = groups.find((g) => g?.marketplaceId === marketplaceId) ?? groups[0];
	const images: any[] = group?.images ?? [];
	if (images.length === 0) return null;

	const main = images.find((img) => img?.variant === 'MAIN') ?? images[0];
	return typeof main?.link === 'string' ? main.link : null;
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

/**
 * The Amazon Retail (1P) seller IDs by marketplace.
 * Amazon's offers come back with this SellerId; that's how we detect
 * "Amazon as a seller" (vs. a third-party).
 */
const AMAZON_RETAIL_SELLER_IDS: Record<string, string> = {
	ATVPDKIKX0DER: 'ATVPDKIKX0DER', // US (Amazon.com)
	A2EUQ1WTGCTBG2: 'A3DWYIK6Y9EEQB', // CA
	A1AM78C64UM0Y8: 'AVDBXBAVVSXLQ', // MX
	A1F83G8C2ARO7P: 'A3P5ROKL5A1OLE', // UK
	A1PA6795UKMFR9: 'A3JWKAKR8XB7XF', // DE
	A13V1IB3VIYZZH: 'A1X6FK5RDHNB96', // FR
	APJ6JRA9NG5V4: 'A11IL2PNWYJU7H', // IT
	A1RKKUPIHCS9HS: 'A1AT7YVPFBWXBL', // ES
	A1VC38T7YXB528: 'AN1VRQENFRJN5', // JP
};

/**
 * Other Amazon-owned seller programs that show up on listings. These are
 * NOT Amazon Retail — they're separate sub-brands selling used / open-box
 * inventory — but they ARE Amazon-controlled and carry the Amazon trust
 * halo, so threat scoring needs to flag them differently than a random 3P.
 */
const AMAZON_OWNED_SELLER_IDS: Record<string, 'amazon-warehouse-deals' | 'amazon-resale'> = {
	A2R2RITDJNW1Q6: 'amazon-warehouse-deals', // Amazon Warehouse Deals (AWD) — used/open-box
	A2L77EE7U53NWQ: 'amazon-resale', // Amazon Resale (rebrand of AWD in some markets)
};

function classifyAmazonSeller(
	sellerId: string | null,
	marketplaceId: string
): {
	isAmazon: boolean;
	isAmazonOwned: boolean;
	amazonSellerType: SellerOffer['amazonSellerType'];
} {
	if (!sellerId) return { isAmazon: false, isAmazonOwned: false, amazonSellerType: null };

	const retailId = AMAZON_RETAIL_SELLER_IDS[marketplaceId];
	if (retailId && sellerId === retailId) {
		return { isAmazon: true, isAmazonOwned: true, amazonSellerType: 'amazon-retail' };
	}

	const ownedType = AMAZON_OWNED_SELLER_IDS[sellerId];
	if (ownedType) {
		return { isAmazon: false, isAmazonOwned: true, amazonSellerType: ownedType };
	}

	return { isAmazon: false, isAmazonOwned: false, amazonSellerType: null };
}

/**
 * Extracts the per-seller offer list and listing-level aggregate metrics
 * from a Product Pricing v0 offers payload.
 *
 * Note: SP-API caps the offer list at ~20 entries; treat counts as
 * "active offers visible to us" rather than a true global total. Use the
 * payload's Summary.TotalOfferCount when present for the wider count.
 */
function extractCompetition(offersPayload: any, marketplaceId: string): CompetitionData {
	const rawOffers: any[] = Array.isArray(offersPayload?.Offers) ? offersPayload.Offers : [];
	const sellers: SellerOffer[] = rawOffers.map((offer) => normalizeSellerOffer(offer, marketplaceId));

	const fbaSellerCount = sellers.filter((s) => s.isFulfilledByAmazon).length;
	const fbmSellerCount = sellers.filter((s) => !s.isFulfilledByAmazon).length;
	const newConditionCount = sellers.filter(
		(s) => s.condition !== null && s.condition.toLowerCase() === 'new'
	).length;

	const amazonOffers = sellers.filter((s) => s.isAmazon);
	const amazonIsSelling = amazonOffers.length > 0;
	const amazonIsBuyBoxWinner = amazonOffers.some((s) => s.isBuyBoxWinner);

	const buyBoxWinner = sellers.find((s) => s.isBuyBoxWinner) ?? null;
	const buyBoxPrice =
		readMoney(offersPayload?.Summary?.BuyBoxPrices?.[0]?.ListingPrice) ??
		buyBoxWinner?.landedPrice ??
		null;
	const buyBoxSellerId = buyBoxWinner?.sellerId ?? null;

	const lowestFbaPrice = lowestLandedPrice(sellers.filter((s) => s.isFulfilledByAmazon));
	const lowestFbmPrice = lowestLandedPrice(sellers.filter((s) => !s.isFulfilledByAmazon));

	const landedAmounts = sellers
		.map((s) => s.landedPrice?.amount)
		.filter((v): v is number => typeof v === 'number');
	const priceSpread =
		landedAmounts.length >= 2
			? Math.max(...landedAmounts) - Math.min(...landedAmounts)
			: null;

	const ratings = sellers
		.map((s) => s.feedbackRating)
		.filter((v): v is number => typeof v === 'number');
	const averageFeedbackRating =
		ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

	const summaryTotal =
		typeof offersPayload?.Summary?.TotalOfferCount === 'number'
			? offersPayload.Summary.TotalOfferCount
			: null;

	return {
		sellers,
		aggregate: {
			totalSellerCount: summaryTotal ?? sellers.length,
			fbaSellerCount,
			fbmSellerCount,
			newConditionCount,
			amazonIsSelling,
			amazonIsBuyBoxWinner,
			buyBoxPrice,
			buyBoxSellerId,
			lowestFbaPrice,
			lowestFbmPrice,
			priceSpread,
			averageFeedbackRating,
		},
	};
}

function normalizeSellerOffer(offer: any, marketplaceId: string): SellerOffer {
	const sellerId = typeof offer?.SellerId === 'string' ? offer.SellerId : null;
	const listingPrice = readMoney(offer?.ListingPrice);
	const shippingPrice = readMoney(offer?.Shipping);
	const landedPrice =
		listingPrice
			? {
					amount: listingPrice.amount + (shippingPrice?.amount ?? 0),
					currency: listingPrice.currency,
				}
			: null;

	const feedback = offer?.SellerFeedbackRating;
	const shipsFromCountry = typeof offer?.ShipsFrom?.Country === 'string' ? offer.ShipsFrom.Country : null;
	const shipsFromState = typeof offer?.ShipsFrom?.State === 'string' ? offer.ShipsFrom.State : null;
	const shipsFrom = shipsFromState
		? `${shipsFromState}${shipsFromCountry ? `, ${shipsFromCountry}` : ''}`
		: shipsFromCountry;

	const amazonClassification = classifyAmazonSeller(sellerId, marketplaceId);

	return {
		sellerId,
		isAmazon: amazonClassification.isAmazon,
		isAmazonOwned: amazonClassification.isAmazonOwned,
		amazonSellerType: amazonClassification.amazonSellerType,
		isFulfilledByAmazon: offer?.IsFulfilledByAmazon === true,
		isBuyBoxWinner: offer?.IsBuyBoxWinner === true,
		isFeaturedMerchant: offer?.IsFeaturedMerchant === true,
		isPrimeEligible: offer?.PrimeInformation?.IsOfferPrime === true,
		condition: typeof offer?.SubCondition === 'string' ? offer.SubCondition : null,
		listingPrice,
		shippingPrice,
		landedPrice,
		feedbackRating:
			typeof feedback?.SellerPositiveFeedbackRating === 'number'
				? feedback.SellerPositiveFeedbackRating
				: null,
		feedbackCount: typeof feedback?.FeedbackCount === 'number' ? feedback.FeedbackCount : null,
		shipsFrom,
	};
}

function lowestLandedPrice(sellers: SellerOffer[]): Money | null {
	let best: Money | null = null;
	for (const s of sellers) {
		if (!s.landedPrice) continue;
		if (best === null || s.landedPrice.amount < best.amount) best = s.landedPrice;
	}
	return best;
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
 * Preferred path: ask SP-API for the authoritative referral fee AND FBA
 * fulfillment fee for this ASIN at the given price in a single call. Falls
 * back to the local category map for the referral fee if SP-API doesn't
 * return a usable value; the FBA fee has no fallback (returns null).
 */
async function resolveCombinedFees(args: {
	asin: string;
	marketplaceId: string;
	summary: any;
	price: Money | null;
	dimensions: PackageDimensions;
}): Promise<{ categoryFee: CategoryFeeEstimate; fulfillmentFee: FulfillmentFeeEstimate }> {
	const categoryFallback = estimateCategoryFee(args.summary, args.price);

	if (!args.price || args.price.amount <= 0) {
		return {
			categoryFee: categoryFallback,
			fulfillmentFee: estimateFulfillmentFeeFromRateCard(args.dimensions),
		};
	}

	try {
		const live = await amazonFeesService.getCombinedFeesForAsin({
			asin: args.asin,
			price: args.price.amount,
			currency: args.price.currency,
			marketplaceId: args.marketplaceId,
			isAmazonFulfilled: true,
		});

		const categoryFee: CategoryFeeEstimate =
			live.referralFee !== null && live.referralRate !== null
				? {
						category: categoryFallback.category,
						rate: round4(live.referralRate),
						amount: round2(live.referralFee),
						source: 'sp-api',
					}
				: categoryFallback;

		const fulfillmentFee: FulfillmentFeeEstimate =
			live.fulfillmentFee !== null
				? { amount: round2(live.fulfillmentFee), source: 'sp-api' }
				: estimateFulfillmentFeeFromRateCard(args.dimensions);

		return { categoryFee, fulfillmentFee };
	} catch {
		return {
			categoryFee: categoryFallback,
			fulfillmentFee: estimateFulfillmentFeeFromRateCard(args.dimensions),
		};
	}
}

// ─────────────────────────────────────────────────────────────────────
// FBA fulfillment fee fallback (rate-card estimate)
// ─────────────────────────────────────────────────────────────────────

/**
 * US FBA Fulfillment Fee rate card (2024) — used ONLY when SP-API doesn't
 * return a `FBAFees` line for the ASIN (which happens when Amazon doesn't
 * have current package dimensions on file). Numbers are reasonable
 * estimates; the live SP-API value should always be preferred.
 *
 * Buckets are by size tier and weight band. Sources: Amazon Seller Central
 * "FBA fulfillment fees" published rate card, US, 2024.
 */
const FBA_FEE_RATE_CARD = {
	smallStandard: [
		{ maxLb: 4 / 16, fee: 3.06 },   // ≤ 4 oz
		{ maxLb: 8 / 16, fee: 3.15 },   // ≤ 8 oz
		{ maxLb: 12 / 16, fee: 3.24 },  // ≤ 12 oz
		{ maxLb: 16 / 16, fee: 3.43 },  // ≤ 16 oz
	],
	largeStandard: [
		{ maxLb: 4 / 16, fee: 3.68 },   // ≤ 4 oz
		{ maxLb: 8 / 16, fee: 3.90 },   // ≤ 8 oz
		{ maxLb: 12 / 16, fee: 4.15 },  // ≤ 12 oz
		{ maxLb: 16 / 16, fee: 4.55 },  // ≤ 16 oz (1 lb)
		{ maxLb: 1.5, fee: 4.99 },
		{ maxLb: 2.0, fee: 5.37 },
		{ maxLb: 2.5, fee: 5.52 },
		{ maxLb: 3.0, fee: 5.77 },
	],
	oversize: [
		{ maxLb: 1.0, fee: 9.61 },
		{ maxLb: 2.0, fee: 10.67 },
		{ maxLb: 5.0, fee: 12.13 },
		{ maxLb: 12.0, fee: 14.45 },
	],
} as const;

/** True for "small standard" — the cheapest FBA tier. */
function isSmallStandard(d: PackageDimensions): boolean {
	if (d.lengthIn === null || d.widthIn === null || d.heightIn === null) return false;
	const sides = [d.lengthIn, d.widthIn, d.heightIn].sort((a, b) => b - a);
	const [longest, median, shortest] = sides as [number, number, number];
	const weight = d.weightLb ?? 0;
	return longest <= 15 && median <= 12 && shortest <= 0.75 && weight <= 1;
}

function estimateFulfillmentFeeFromRateCard(
	dimensions: PackageDimensions
): FulfillmentFeeEstimate {
	const weight = dimensions.weightLb;
	if (weight === null || !Number.isFinite(weight) || weight <= 0) {
		return { amount: null, source: 'unavailable' };
	}

	const sizeTier = classifySizeTier(dimensions);
	if (sizeTier === 'unknown') return { amount: null, source: 'unavailable' };

	const table =
		sizeTier === 'oversize'
			? FBA_FEE_RATE_CARD.oversize
			: isSmallStandard(dimensions)
				? FBA_FEE_RATE_CARD.smallStandard
				: FBA_FEE_RATE_CARD.largeStandard;

	for (const band of table) {
		if (weight <= band.maxLb) {
			return { amount: band.fee, source: 'rate-card' };
		}
	}

	// Above the heaviest band — use the top band as a floor (over-3lb large
	// standard adds $0.16 per 4oz, oversize adds per-lb above 12 lb; we
	// approximate by returning the heaviest band).
	const last = table[table.length - 1]!;
	return { amount: last.fee, source: 'rate-card' };
}

// ─────────────────────────────────────────────────────────────────────
// FBA monthly storage fee estimation
// ─────────────────────────────────────────────────────────────────────

/**
 * FBA Monthly Inventory Storage Fees (US, 2024).
 *   - Standard-size: Jan\u2013Sep $0.87 / ft\u00b3, Oct\u2013Dec $2.40 / ft\u00b3
 *   - Oversize:      Jan\u2013Sep $0.56 / ft\u00b3, Oct\u2013Dec $1.40 / ft\u00b3
 *
 * Standard-size definition (simplified):
 *   Longest side \u2264 18", median side \u2264 14", shortest side \u2264 8",
 *   and unit weight \u2264 20 lb.
 */
const STORAGE_RATES = {
	standard: { 'jan-sep': 0.87, 'oct-dec': 2.40 },
	oversize: { 'jan-sep': 0.56, 'oct-dec': 1.40 },
} as const;

function currentStorageSeason(now: Date = new Date()): StorageSeason {
	const month = now.getUTCMonth(); // 0-indexed: 9 = Oct
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
		return {
			sizeTier,
			season,
			ratePerCubicFoot: null,
			monthlyFee: null,
			seasonalRates: null,
			seasonalMonthlyFees: null,
		};
	}

	const rates = STORAGE_RATES[sizeTier];
	const cubicFeet = dimensions.cubicFeet;
	const seasonalMonthlyFees = {
		'jan-sep': round2(rates['jan-sep'] * cubicFeet),
		'oct-dec': round2(rates['oct-dec'] * cubicFeet),
	};

	return {
		sizeTier,
		season,
		ratePerCubicFoot: rates[season],
		monthlyFee: seasonalMonthlyFees[season],
		seasonalRates: { 'jan-sep': rates['jan-sep'], 'oct-dec': rates['oct-dec'] },
		seasonalMonthlyFees,
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