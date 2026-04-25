/**
 * Integration tests for product.service.ts
 *
 * Verifies:
 *   - fetchCatalog / fetchPricing call the correct backend endpoints
 *   - fetchInsightsByBarcode calls /api/amazon/insights with fields
 *   - lookupByBarcode prefers the aggregated insights endpoint
 *   - lookupByBarcode falls back to catalog + pricing when insights fails
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { AxiosInstance } from 'axios';
import type {
  CatalogSearchResponse,
  PricingResponse,
  ProductInsightsResponse,
} from '../../src/types/api';

// ── Mock axios at module level ───────────────────────────────────────

const mockGet = jest.fn() as jest.MockedFunction<AxiosInstance['get']>;

jest.mock('../../src/services/api', () => ({
  api: { get: mockGet },
}));

// Import after mocks are in place
import {
  fetchCatalog,
  fetchPricing,
  fetchInsightsByBarcode,
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

const insightsResponse: ProductInsightsResponse = {
  asin: ASIN,
  marketplaceId: 'ATVPDKIKX0DER',
  fields: {
    summary: {
      itemName: 'Wilson NFL Football',
      brand: 'Wilson',
      manufacturer: 'Wilson Sporting Goods',
      browseClassification: { displayName: 'Footballs' },
    },
    images: [
      {
        images: [
          { variant: 'MAIN', link: 'https://example.com/main.jpg' },
          { variant: 'PT01', link: 'https://example.com/alt.jpg' },
        ],
      },
    ],
    dimensions: [
      {
        item: {
          length: { value: 12, unit: 'inches' },
          width: { value: 6, unit: 'inches' },
          height: { value: 6, unit: 'inches' },
          weight: { value: 1, unit: 'pounds' },
        },
      },
    ],
    salesRank: [
      {
        displayGroupRanks: [{ rank: 1234, title: 'Sports', link: 'https://example.com' }],
      },
    ],
    bsr: { rank: 1234, category: 'Sports', link: 'https://example.com' },
    pricing: {
      payload: [
        {
          Product: {
            Offers: [{ BuyingPrice: { ListingPrice: { Amount: 24.99, CurrencyCode: 'USD' } } }],
          },
        },
      ],
    },
    offers: { payload: [{ Summary: { TotalOfferCount: 5 } }] },
    fees: {
      asin: ASIN,
      marketplaceId: 'ATVPDKIKX0DER',
      currency: 'USD',
      listingPrice: 24.99,
      totalFees: 4.5,
      feeBreakdown: [
        { type: 'ReferralFee', amount: 3.75 },
        { type: 'FBAFees', amount: 0.75 },
      ],
      status: 'Success',
    },
  },
};

// ── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGet.mockReset();
});

describe('fetchCatalog', () => {
  it('calls GET /api/amazon/catalog/barcode/:code', async () => {
    mockGet.mockResolvedValueOnce({ data: catalogResponse } as any);

    const result = await fetchCatalog(BARCODE);

    expect(mockGet).toHaveBeenCalledWith(`/api/amazon/catalog/barcode/${BARCODE}`);
    expect(result).toEqual(catalogResponse);
  });
});

describe('fetchPricing', () => {
  it('calls GET /api/amazon/pricing/price with ASIN params', async () => {
    mockGet.mockResolvedValueOnce({ data: pricingResponse } as any);

    const result = await fetchPricing(ASIN);

    expect(mockGet).toHaveBeenCalledWith('/api/amazon/pricing/price', {
      params: { identifiers: ASIN, type: 'ASIN', marketplaceId: 'ATVPDKIKX0DER' },
    });
    expect(result).toEqual(pricingResponse);
  });
});

describe('fetchInsightsByBarcode', () => {
  it('calls GET /api/amazon/insights with barcode + fields', async () => {
    mockGet.mockResolvedValueOnce({ data: insightsResponse } as any);

    const result = await fetchInsightsByBarcode(BARCODE);

    expect(mockGet).toHaveBeenCalledWith('/api/amazon/insights', {
      params: {
        barcode: BARCODE,
        fields: 'summary,images,dimensions,salesRank,bsr,pricing,competitivePricing,offers,fees',
      },
    });
    expect(result).toEqual(insightsResponse);
  });
});

describe('lookupByBarcode', () => {
  it('returns enriched data from the insights endpoint', async () => {
    mockGet.mockResolvedValueOnce({ data: insightsResponse } as any);

    const result = await lookupByBarcode(BARCODE);

    expect(result).toEqual({
      asin: ASIN,
      title: 'Wilson NFL Football',
      brand: 'Wilson',
      manufacturer: 'Wilson Sporting Goods',
      price: 24.99,
      currency: 'USD',
      category: 'Footballs',
      image: 'https://example.com/main.jpg',
      dimensions: '12 x 6 x 6 inches',
      weight: '1 pounds',
      salesRank: 1234,
      bsr: { rank: 1234, category: 'Sports', link: 'https://example.com' },
      offersCount: 5,
      amazonFees: 4.5,
      feeBreakdown: [
        { type: 'ReferralFee', amount: 3.75 },
        { type: 'FBAFees', amount: 0.75 },
      ],
    });
  });

  it('falls back to catalog + pricing when insights fails', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('insights down'))
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
      category: null,
      image: null,
      dimensions: null,
      weight: null,
      salesRank: null,
      bsr: null,
      offersCount: null,
      amazonFees: null,
      feeBreakdown: [],
    });
  });

  it('resolves price from offers.Summary.BuyBoxPrices when pricing + competitivePricing 404', async () => {
    const gatedInsights: ProductInsightsResponse = {
      asin: 'B006IB5T4W',
      marketplaceId: 'ATVPDKIKX0DER',
      fields: {
        summary: {
          itemName: 'Aquaphor Healing Ointment',
          brand: 'Aquaphor',
          manufacturer: 'Aquaphor',
          browseClassification: { displayName: 'Creams' },
        },
        offers: {
          payload: {
            ASIN: 'B006IB5T4W',
            status: 'Success',
            Summary: {
              BuyBoxPrices: [
                { condition: 'New', ListingPrice: { CurrencyCode: 'USD', Amount: 18.37 } },
              ],
              LowestPrices: [
                {
                  condition: 'new',
                  fulfillmentChannel: 'Amazon',
                  ListingPrice: { CurrencyCode: 'USD', Amount: 18.37 },
                },
              ],
              TotalOfferCount: 13,
            },
          },
        },
        fees: {
          asin: 'B006IB5T4W',
          marketplaceId: 'ATVPDKIKX0DER',
          currency: 'USD',
          listingPrice: 18.37,
          totalFees: null,
          feeBreakdown: [],
          status: 'ClientError',
          error: 'Invalid seller registration.',
        },
      },
      errors: {
        pricing: 'AmazonRequestError: 404',
        competitivePricing: 'AmazonRequestError: 404',
      },
    };

    mockGet.mockResolvedValueOnce({ data: gatedInsights } as any);

    const result = await lookupByBarcode('360331145562');

    expect(result.price).toBe(18.37);
    expect(result.currency).toBe('USD');
    expect(result.asin).toBe('B006IB5T4W');
    expect(result.title).toBe('Aquaphor Healing Ointment');
  });

  it('throws when the fallback catalog returns zero results', async () => {
    mockGet
      .mockRejectedValueOnce(new Error('insights down'))
      .mockResolvedValueOnce({ data: { numberOfResults: 0, items: [] } } as any);

    await expect(lookupByBarcode(BARCODE)).rejects.toThrow(
      `No product found for barcode ${BARCODE}`,
    );
  });
});
