/**
 * Sessions Service
 *
 * Thin wrapper around the server's `/api/sessions` endpoints. Bearer-token
 * auth is attached automatically by the shared axios instance in `api.ts`.
 *
 * All mutations are persisted server-side; `SessionProvider` keeps a local
 * cache for fast reads but is always reconciled against the responses
 * returned here.
 */

import { api } from './api';
import type { Session } from '../types/session';
import type { ScannedProductInput, SessionProduct } from '../types/product';

/**
 * Server returns `SessionProduct`-shaped objects but a few client-only
 * legacy fields (`salesRank`) may not be persisted. Normalize so the
 * mobile type contract holds.
 */
function normalizeProduct(raw: Partial<SessionProduct> & { sessionId?: string }): SessionProduct {
  return {
    id: String(raw.id ?? ''),
    asin: raw.asin ?? '',
    barcode: raw.barcode ?? '',
    barcodeType: raw.barcodeType ?? '',
    title: raw.title ?? 'Unknown Product',
    image: raw.image ?? '',
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : 0,
    category: raw.category ?? '',
    price: typeof raw.price === 'number' ? raw.price : 0,
    foundPrice: typeof raw.foundPrice === 'number' ? raw.foundPrice : 0,
    sellerPopularity: (raw.sellerPopularity as SessionProduct['sellerPopularity']) ?? 'Low',
    sellerPopularityScore: typeof raw.sellerPopularityScore === 'number' ? raw.sellerPopularityScore : 0,
    estimatedShipping: typeof raw.estimatedShipping === 'number' ? raw.estimatedShipping : 0,
    amazonFees: typeof raw.amazonFees === 'number' ? raw.amazonFees : 0,
    profitMargin: typeof raw.profitMargin === 'number' ? raw.profitMargin : 0,
    requiresApproval: Boolean(raw.requiresApproval),
    competitionLevel: (raw.competitionLevel as SessionProduct['competitionLevel']) ?? 'Low',
    salesRank: typeof raw.salesRank === 'number' ? raw.salesRank : 0,
    bsr: typeof raw.bsr === 'number' ? raw.bsr : 0,
    dimensions: raw.dimensions ?? '',
    weight: raw.weight ?? '',
    restrictions: Array.isArray(raw.restrictions) ? raw.restrictions : [],
    monthlySalesEstimate: typeof raw.monthlySalesEstimate === 'number' ? raw.monthlySalesEstimate : 0,
    estimatedQuantity: typeof raw.estimatedQuantity === 'number' ? raw.estimatedQuantity : 1,
  };
}

export async function fetchSessions(): Promise<Session[]> {
  const { data } = await api.get<{ sessions: Session[] }>('/api/sessions');
  return data.sessions;
}

export async function createSessionApi(title: string): Promise<Session> {
  const { data } = await api.post<{ session: Session }>('/api/sessions', { title });
  return data.session;
}

export async function renameSessionApi(id: string, title: string): Promise<Session> {
  const { data } = await api.patch<{ session: Session }>(`/api/sessions/${id}`, { title });
  return data.session;
}

export async function deleteSessionApi(id: string): Promise<void> {
  await api.delete(`/api/sessions/${id}`);
}

export async function fetchSessionProducts(sessionId: string): Promise<SessionProduct[]> {
  const { data } = await api.get<{ products: SessionProduct[] }>(
    `/api/sessions/${sessionId}/products`,
  );
  return data.products.map(normalizeProduct);
}

export async function addSessionProduct(
  sessionId: string,
  input: ScannedProductInput,
): Promise<SessionProduct> {
  const payload = {
    asin: input.asin,
    barcode: input.barcode ?? '',
    barcodeType: input.barcodeType ?? '',
    title: input.title,
    image: input.image,
    rating: input.rating,
    reviewCount: input.reviewCount ?? 0,
    category: input.category,
    price: input.price,
    foundPrice: input.foundPrice,
    sellerPopularity: input.sellerPopularity,
    sellerPopularityScore: input.sellerPopularityScore ?? 0,
    estimatedShipping: input.estimatedShipping ?? 0,
    amazonFees: input.amazonFees ?? 0,
    profitMargin:
      input.profitMargin ??
      Math.max(
        0,
        input.price - input.foundPrice - (input.amazonFees ?? 0) - (input.estimatedShipping ?? 0),
      ),
    requiresApproval: input.requiresApproval ?? false,
    competitionLevel: input.competitionLevel ?? 'Low',
    bsr: input.bsr ?? 0,
    dimensions: input.dimensions ?? '',
    weight: input.weight ?? '',
    restrictions: input.restrictions ?? [],
    monthlySalesEstimate: input.monthlySalesEstimate ?? 0,
    estimatedQuantity: input.estimatedQuantity ?? 1,
  };
  const { data } = await api.post<{ product: SessionProduct }>(
    `/api/sessions/${sessionId}/products`,
    payload,
  );
  return normalizeProduct(data.product);
}

export async function updateProductFoundPriceApi(
  sessionId: string,
  productId: string,
  foundPrice: number,
  profitMargin: number,
): Promise<SessionProduct> {
  const { data } = await api.patch<{ product: SessionProduct }>(
    `/api/sessions/${sessionId}/products/${productId}`,
    { foundPrice, profitMargin },
  );
  return normalizeProduct(data.product);
}

export async function deleteSessionProductApi(
  sessionId: string,
  productId: string,
): Promise<void> {
  await api.delete(`/api/sessions/${sessionId}/products/${productId}`);
}
