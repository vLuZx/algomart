/**
 * Integration tests for product.service.ts
 *
 * Verifies:
 *   - fetchCatalog calls the correct backend endpoint
 *   - fetchPricing calls the correct backend endpoint with ASIN params
 *   - lookupByBarcode chains catalog → pricing and returns a flat result
 *   - lookupByBarcode handles empty catalog results
 *   - lookupByBarcode still returns catalog data when pricing fails
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { AxiosInstance } from 'axios';
import type { CatalogSearchResponse, PricingResponse } from '../../src/types/api';

// ── Mock axios at module level ───────────────────────────────────────

const mockGet = jest.fn() as jest.MockedFunction<AxiosInstance['get']>;

jest.mock('../../src/services/api', () => ({
  api: { get: mockGet },
}));

// Import after mocks are in place
import {
  fetchCatalog,
  fetchPricing,
  lookupByBarcode,
} from '../../src/services/product.service';

// ── Fixtures ─────────────────────────────────────────────────────────

const BARCODE = '725272730706';
const ASIN = 'B08N5WRWNW';

const catalogResponse: CatalogSearchResponse = {
  numberOfResults: 1,
  items: [
    {
      asin: ASIN,
      summaries: [
        {
          marketplaceId: 'ATVPDKIKX0DER',
          brand: 'Wilson',
          itemName: 'Wilson NFL Football',
          manufacturer: 'Wilson Sporting Goods',
        },
      ],
    },
  ],
};

const pricingResponse: PricingResponse[] = [
  { identifier: ASIN, price: 24.99, currency: 'USD', offersCount: 5 },
];

// ── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGet.mockReset();
});

describe('fetchCatalog', () => {
  it('calls GET /api/amazon/catalog/barcode/:code', async () => {
    mockGet.mockResolvedValueOnce({ data: catalogResponse } as any);

    const result = await fetchCatalog(BARCODE);

    expect(mockGet).toHaveBeenCalledWith(
      `/api/amazon/catalog/barcode/${BARCODE}`,
    );
    expect(result).toEqual(catalogResponse);
  });
});

describe('fetchPricing', () => {
  it('calls GET /api/amazon/pricing/price with ASIN params', async () => {
    mockGet.mockResolvedValueOnce({ data: pricingResponse } as any);

    const result = await fetchPricing(ASIN);

    expect(mockGet).toHaveBeenCalledWith(
      '/api/amazon/pricing/price',
      {
        params: {
          identifiers: ASIN,
          type: 'ASIN',
          marketplaceId: 'ATVPDKIKX0DER',
        },
      },
    );
    expect(result).toEqual(pricingResponse);
  });
});

describe('lookupByBarcode', () => {
  it('chains catalog → pricing and returns a flat result', async () => {
    // First call = catalog, second call = pricing
    mockGet
      .mockResolvedValueOnce({ data: catalogResponse } as any)
      .mockResolvedValueOnce({ data: pricingResponse } as any);

    const result = await lookupByBarcode(BARCODE);

    expect(result).toEqual({
      asin: ASIN,
      title: 'Wilson NFL Football',
      brand: 'Wilson',
      manufacturer: 'Wilson Sporting Goods',
      price: 24.99,
      currency: 'USD',
    });
  });

  it('throws when catalog returns zero results', async () => {
    mockGet.mockResolvedValueOnce({
      data: { numberOfResults: 0, items: [] },
    } as any);

    await expect(lookupByBarcode(BARCODE)).rejects.toThrow(
      `No product found for barcode ${BARCODE}`,
    );
  });

  it('returns catalog data with null price when pricing fails', async () => {
    mockGet
      .mockResolvedValueOnce({ data: catalogResponse } as any)
      .mockRejectedValueOnce(new Error('Pricing unavailable'));

    const result = await lookupByBarcode(BARCODE);

    expect(result).toEqual({
      asin: ASIN,
      title: 'Wilson NFL Football',
      brand: 'Wilson',
      manufacturer: 'Wilson Sporting Goods',
      price: null,
      currency: null,
    });
  });

  it('returns null fields when catalog item has no summary', async () => {
    const noSummary: CatalogSearchResponse = {
      numberOfResults: 1,
      items: [{ asin: ASIN }],
    };

    mockGet
      .mockResolvedValueOnce({ data: noSummary } as any)
      .mockResolvedValueOnce({ data: pricingResponse } as any);

    const result = await lookupByBarcode(BARCODE);

    expect(result).toEqual({
      asin: ASIN,
      title: null,
      brand: null,
      manufacturer: null,
      price: 24.99,
      currency: 'USD',
    });
  });
});
