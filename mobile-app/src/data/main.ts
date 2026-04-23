import type { Session } from '../types/session';
import type { ScannedProductInput, SessionProduct } from '../types/product';

/**
 * Session/product state helpers.
 *
 * Sessions are currently stored only in-memory on the client. A backend
 * endpoint to persist sessions per user does not exist yet.
 * TODO(backend): replace `buildInitialSessionState` with a call to
 * `GET /api/sessions` once the server exposes it.
 */

const EMPTY_INITIAL_STATE: { sessions: Session[]; productsBySession: Record<string, SessionProduct[]> } = {
  sessions: [],
  productsBySession: {},
};

export function buildInitialSessionState() {
  return EMPTY_INITIAL_STATE;
}

/**
 * Build a SessionProduct from a scanner input. Enrichment fields sourced
 * from `/api/amazon/insights` (see services/product.service.ts) are used
 * when present; otherwise the field is left at a neutral default.
 *
 * TODO(backend): the following fields still have no server source because
 * SP-API does not expose them; they require additional APIs or scraping:
 *   - rating / reviewCount   (Amazon product reviews)
 *   - sellerPopularity(Score) / competitionLevel (derived metric)
 *   - estimatedShipping      (no dedicated SP-API endpoint)
 *   - monthlySalesEstimate   (third-party estimator)
 *   - requiresApproval / restrictions (Listings Restrictions API)
 *
 * `amazonFees` is now populated via POST /api/amazon/fees/estimate when
 * a lookup returns an Amazon listing price (see scan.tsx handleConfirm).
 */
export function createScannedProduct(
  sessionId: string,
  input: ScannedProductInput,
  sequence: number,
): SessionProduct {
  const foundPrice = input.foundPrice;
  const price = input.price;
  const amazonFees = input.amazonFees ?? 0;
  const estimatedShipping = input.estimatedShipping ?? 0;
  const profitMargin =
    input.profitMargin ?? Math.max(0, price - foundPrice - amazonFees - estimatedShipping);

  return {
    id: `${sessionId}-scan-${sequence}`,
    asin: input.asin,
    barcode: input.barcode ?? '',
    barcodeType: input.barcodeType ?? '',
    title: input.title,
    image: input.image,
    rating: input.rating,
    reviewCount: input.reviewCount ?? 0,
    category: input.category,
    price,
    foundPrice,
    sellerPopularity: input.sellerPopularity,
    sellerPopularityScore: input.sellerPopularityScore ?? 0,
    estimatedShipping,
    amazonFees,
    profitMargin,
    requiresApproval: input.requiresApproval ?? false,
    competitionLevel: input.competitionLevel ?? 'Low',
    salesRank: input.salesRank ?? 0,
    bsr: input.bsr ?? 0,
    dimensions: input.dimensions ?? '',
    weight: input.weight ?? '',
    restrictions: input.restrictions ?? [],
    monthlySalesEstimate: input.monthlySalesEstimate ?? 0,
  };
}

/**
 * Update the found price on an existing product and recompute profit
 * margin locally using whatever fees/shipping we already have on record.
 *
 * TODO(backend): when a real Fees endpoint is wired up, ask the server
 * for the refreshed breakdown rather than recomputing on-device.
 */
export function updateProductFoundPrice(product: SessionProduct, foundPrice: number): SessionProduct {
  const profitMargin = Math.max(
    0,
    product.price - foundPrice - product.amazonFees - product.estimatedShipping,
  );
  return { ...product, foundPrice, profitMargin };
}

