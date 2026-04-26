/**
 * Product Service
 *
 * Calls the aggregated insights endpoint to hydrate a ProductLookupResult
 * from a single request. Falls back to the individual catalog/pricing
 * endpoints if insights fails so the scan flow still works.
 */

import { api } from './api';
import type {
  CatalogSearchResponse,
  FeesEstimate,
  FeesEstimateBreakdownItem,
  PricingResponse,
  ProductCalculation,
  ProductInsightField,
  ProductInsightsBsr,
  ProductInsightsResponse,
  ProductLookupResult,
} from '../types/api';

/** US marketplace – matches the backend's SP_API_MARKETPLACE_ID */
const MARKETPLACE_ID = 'ATVPDKIKX0DER';
const DEBUG_PRODUCT_LOOKUP = typeof __DEV__ !== 'undefined' && __DEV__;

const INSIGHTS_FIELDS: ProductInsightField[] = [
  'summary',
  'images',
  'dimensions',
  'salesRank',
  'bsr',
  'pricing',
  'competitivePricing',
  'offers',
  'fees',
];

// ── Individual endpoint calls ────────────────────────────────────────

/** GET /api/amazon/catalog/barcode/:code */
export async function fetchCatalog(barcode: string): Promise<CatalogSearchResponse> {
  const { data } = await api.get<CatalogSearchResponse>(
    `/api/amazon/catalog/barcode/${barcode}`,
  );
  return data;
}

/** GET /api/amazon/pricing/price?identifiers=…&type=ASIN&marketplaceId=… */
export async function fetchPricing(asin: string): Promise<PricingResponse[]> {
  const { data } = await api.get<PricingResponse[]>('/api/amazon/pricing/price', {
    params: { identifiers: asin, type: 'ASIN', marketplaceId: MARKETPLACE_ID },
  });
  return data;
}

/** GET /api/amazon/insights?barcode=…&fields=… */
export async function fetchInsightsByBarcode(
  barcode: string,
  fields: ProductInsightField[] = INSIGHTS_FIELDS,
): Promise<ProductInsightsResponse> {
  const { data } = await api.get<ProductInsightsResponse>('/api/amazon/insights', {
    params: { barcode, fields: fields.join(',') },
  });
  return data;
}

/**
 * POST /api/amazon/fees/estimate
 * Estimate Amazon seller fees for an ASIN at a given listing price.
 */
export async function fetchFeesEstimate(
  asin: string,
  price: number,
  options?: { currency?: string; isAmazonFulfilled?: boolean; shippingPrice?: number },
): Promise<FeesEstimate> {
  const body: Record<string, unknown> = { asin, price };
  if (options?.currency) body.currency = options.currency;
  if (typeof options?.isAmazonFulfilled === 'boolean') {
    body.isAmazonFulfilled = options.isAmazonFulfilled;
  }
  if (typeof options?.shippingPrice === 'number') body.shippingPrice = options.shippingPrice;

  const { data } = await api.post<FeesEstimate>('/api/amazon/fees/estimate', body);
  return data;
}

/**
 * GET /api/calculations/product
 * Aggregated profit / fees / buy-signal calculation for a single product.
 */
export async function fetchProductCalculation(params: {
  barcode?: string;
  asin?: string;
  foundPrice: number;
  estimatedQuantity?: number;
  costOfGoods?: number;
  marketplaceId?: string;
}): Promise<ProductCalculation> {
  const query: Record<string, string | number> = { foundPrice: params.foundPrice };
  if (params.barcode) query.barcode = params.barcode;
  if (typeof params.estimatedQuantity === 'number') query.estimatedQuantity = params.estimatedQuantity;
  if (typeof params.costOfGoods === 'number') query.costOfGoods = params.costOfGoods;
  if (params.marketplaceId) query.marketplaceId = params.marketplaceId;

  const { data } = await api.get<ProductCalculation>('/api/calculations/product', {
    params: query,
  });
  return data;
}

// ── Extractors from the insights response ────────────────────────────

function extractSummary(fields: ProductInsightsResponse['fields']) {
  return (fields.summary ?? null) as
    | {
        itemName?: string;
        brand?: string;
        manufacturer?: string;
        browseClassification?: { displayName?: string };
      }
    | null;
}

function extractImage(fields: ProductInsightsResponse['fields']): string | null {
  const groups = (fields.images ?? []) as Array<{
    images?: Array<{ variant?: string; link?: string }>;
  }>;
  const firstGroup = groups[0];
  if (!firstGroup?.images || firstGroup.images.length === 0) return null;
  const main = firstGroup.images.find((img) => img.variant === 'MAIN') ?? firstGroup.images[0];
  return main?.link ?? null;
}

function formatDimensions(dimensions: ProductInsightsResponse['fields']['dimensions']): {
  dimensions: string | null;
  weight: string | null;
} {
  const entries = (dimensions ?? []) as Array<{
    item?: {
      length?: { value: number; unit: string };
      width?: { value: number; unit: string };
      height?: { value: number; unit: string };
      weight?: { value: number; unit: string };
    };
  }>;
  const item = entries[0]?.item;
  if (!item) return { dimensions: null, weight: null };

  const dims =
    item.length && item.width && item.height
      ? `${item.length.value} x ${item.width.value} x ${item.height.value} ${item.length.unit}`
      : null;
  const weight = item.weight ? `${item.weight.value} ${item.weight.unit}` : null;
  return { dimensions: dims, weight };
}

function extractSalesRank(fields: ProductInsightsResponse['fields']): number | null {
  const ranks = (fields.salesRank ?? []) as Array<{
    classificationRanks?: Array<{ rank: number }>;
    displayGroupRanks?: Array<{ rank: number }>;
  }>;
  const first = ranks[0];
  const rank =
    first?.displayGroupRanks?.[0]?.rank ?? first?.classificationRanks?.[0]?.rank ?? null;
  return typeof rank === 'number' ? rank : null;
}

function extractBsr(fields: ProductInsightsResponse['fields']): ProductInsightsBsr | null {
  const bsr = fields.bsr as ProductInsightsBsr | null | undefined;
  return bsr && typeof bsr.rank === 'number' ? bsr : null;
}

/**
 * Best-effort extraction from the raw SP-API GetPricing response.
 * GetPricing v0 only returns YOUR own offers, so for ASINs you don't sell
 * `Product.Offers` is empty and we return null. Callers should then try
 * `extractPriceFromRawOffers` for the market price.
 */
function extractPriceFromRawPricing(raw: unknown): { price: number | null; currency: string | null } {
  if (!raw || typeof raw !== 'object') return { price: null, currency: null };
  const payload = (raw as { payload?: unknown }).payload;
  const first = Array.isArray(payload) ? (payload[0] as Record<string, any>) : undefined;
  const offers = first?.Product?.Offers;
  const listingPrice = Array.isArray(offers) ? offers[0]?.BuyingPrice?.ListingPrice : undefined;
  const price = typeof listingPrice?.Amount === 'number' ? listingPrice.Amount : null;
  const currency = typeof listingPrice?.CurrencyCode === 'string' ? listingPrice.CurrencyCode : null;
  return { price, currency };
}

/**
 * Walks the GetItemOffers payload (which is an OBJECT, not an array)
 * for Buy Box price → Lowest price. This is the actual market price.
 */
function extractPriceFromRawOffers(raw: unknown): {
  price: number | null;
  currency: string | null;
  source: string | null;
} {
  if (!raw || typeof raw !== 'object') return { price: null, currency: null, source: null };
  const payload = (raw as { payload?: unknown }).payload;
  const obj = Array.isArray(payload) ? (payload[0] as any) : (payload as any);
  const summary = obj?.Summary;
  if (!summary) return { price: null, currency: null, source: null };

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
  return { price: null, currency: null, source: null };
}

/**
 * Walks the GetCompetitivePricing response for the Buy Box competitive
 * price. Reliable fallback for restricted / gated ASINs where GetPricing
 * returns 404 and GetItemOffers rejects the ItemCondition.
 */
function extractPriceFromCompetitive(raw: unknown): {
  price: number | null;
  currency: string | null;
  source: string | null;
} {
  if (!raw || typeof raw !== 'object') return { price: null, currency: null, source: null };
  const payload = (raw as { payload?: unknown }).payload;
  const first = Array.isArray(payload) ? (payload[0] as any) : (payload as any);
  const list = first?.Product?.CompetitivePricing?.CompetitivePrices;
  const buyBox = Array.isArray(list)
    ? list.find((p: any) => p?.CompetitivePriceId === '1') ?? list[0]
    : undefined;
  const listing = buyBox?.Price?.ListingPrice;
  if (typeof listing?.Amount === 'number') {
    return {
      price: listing.Amount,
      currency: typeof listing.CurrencyCode === 'string' ? listing.CurrencyCode : 'USD',
      source: 'competitivePricing',
    };
  }
  return { price: null, currency: null, source: null };
}

function extractOffersCount(fields: ProductInsightsResponse['fields']): number | null {
  const raw = fields.offers as { payload?: unknown } | undefined;
  if (!raw) return null;
  // `payload` is an object for single-ASIN GetItemOffers, but can be an
  // array for batched responses — handle both.
  const obj = Array.isArray(raw.payload) ? (raw.payload[0] as any) : (raw.payload as any);
  const count = obj?.Summary?.TotalOfferCount;
  return typeof count === 'number' ? count : null;
}

function extractFees(fields: ProductInsightsResponse['fields']): {
  amazonFees: number | null;
  feeBreakdown: FeesEstimateBreakdownItem[];
} {
  const fees = fields.fees as FeesEstimate | undefined;
  if (!fees) return { amazonFees: null, feeBreakdown: [] };
  return {
    amazonFees: typeof fees.totalFees === 'number' ? fees.totalFees : null,
    feeBreakdown: Array.isArray(fees.feeBreakdown) ? fees.feeBreakdown : [],
  };
}

// ── Combined lookup ──────────────────────────────────────────────────

/**
 * Look up a product by barcode. Prefers the aggregated insights endpoint,
 * falls back to the legacy catalog + pricing calls if that fails.
 */
export async function lookupByBarcode(barcode: string): Promise<ProductLookupResult> {
  if (DEBUG_PRODUCT_LOOKUP) {
    console.info('[Lookup] lookupByBarcode start', { barcode });
  }

  try {
    const insights = await fetchInsightsByBarcode(barcode);

    // ── DEBUG: log the full insights payload structure ───────────────
    console.debug('[Lookup] insights.asin =', insights.asin);
    console.debug('[Lookup] insights.errors =', insights.errors ?? null);
    console.debug('[Lookup] insights.fields keys =', Object.keys(insights.fields ?? {}));
    console.debug('[Lookup] raw pricing =', JSON.stringify(insights.fields.pricing ?? null));
    console.debug('[Lookup] raw offers  =', JSON.stringify(insights.fields.offers ?? null));
    console.debug('[Lookup] raw fees    =', JSON.stringify(insights.fields.fees ?? null));

    const summary = extractSummary(insights.fields);
    const fromPricing = extractPriceFromRawPricing(insights.fields.pricing);
    const fromOffers = extractPriceFromRawOffers(insights.fields.offers);
    const fromCompetitive = extractPriceFromCompetitive(insights.fields.competitivePricing);

    // Prefer own pricing, then Buy Box/Lowest from offers, then competitive.
    const price = fromPricing.price ?? fromOffers.price ?? fromCompetitive.price;
    const currency = fromPricing.currency ?? fromOffers.currency ?? fromCompetitive.currency;
    console.debug(
      '[Lookup] price resolution =',
      JSON.stringify({
        fromPricing,
        fromOffers,
        fromCompetitive,
        resolvedPrice: price,
        resolvedCurrency: currency,
      }),
    );

    const { dimensions, weight } = formatDimensions(insights.fields.dimensions);
    const { amazonFees, feeBreakdown } = extractFees(insights.fields);

    const result: ProductLookupResult = {
      asin: insights.asin,
      title: summary?.itemName ?? null,
      brand: summary?.brand ?? null,
      manufacturer: summary?.manufacturer ?? null,
      price,
      currency,
      category: summary?.browseClassification?.displayName ?? null,
      image: extractImage(insights.fields),
      dimensions,
      weight,
      salesRank: extractSalesRank(insights.fields),
      bsr: extractBsr(insights.fields),
      offersCount: extractOffersCount(insights.fields),
      amazonFees,
      feeBreakdown,
    };

    console.debug('[Lookup] final ProductLookupResult =', JSON.stringify(result));

    return result;
  } catch (insightsError) {
    console.warn('[Lookup] insights failed, falling back to catalog + pricing', insightsError);
    return lookupByBarcodeLegacy(barcode);
  }
}

/** Legacy catalog + pricing fallback (no enrichment). */
async function lookupByBarcodeLegacy(barcode: string): Promise<ProductLookupResult> {
  const catalog = await fetchCatalog(barcode);
  if (catalog.numberOfResults === 0 || !catalog.items[0]) {
    throw new Error(`No product found for barcode ${barcode}`);
  }
  const item = catalog.items[0];
  const summary = item.summaries?.[0] ?? null;

  let price: number | null = null;
  let currency: string | null = null;
  try {
    const pricing = await fetchPricing(item.asin);
    if (pricing.length > 0 && pricing[0]) {
      price = pricing[0].price ?? null;
      currency = pricing[0].currency || null;
    }
  } catch {
    console.warn('[Lookup] Pricing lookup failed for ASIN', item.asin);
  }

  return {
    asin: item.asin,
    title: summary?.itemName ?? null,
    brand: summary?.brand ?? null,
    manufacturer: summary?.manufacturer ?? null,
    price,
    currency,
    category: null,
    image: null,
    dimensions: null,
    weight: null,
    salesRank: null,
    bsr: null,
    offersCount: null,
    amazonFees: null,
    feeBreakdown: [],
  };
}
