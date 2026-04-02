import type { ProductPricingItem, ProductPricingResponse } from '../../src/types/amazon.types.js';

export const mockPricingData: Record<string, ProductPricingItem> = {
  'B075CYMYK6': {
    ASIN: 'B075CYMYK6',
    status: 'Success',
    Product: {
      Identifiers: {
        MarketplaceASIN: {
          MarketplaceId: 'ATVPDKIKX0DER',
          ASIN: 'B075CYMYK6',
        },
      },
      Offers: [
        {
          offerType: 'NEW',
          BuyingPrice: {
            ListingPrice: {
              CurrencyCode: 'USD',
              Amount: 29.99,
            },
            LandedPrice: {
              CurrencyCode: 'USD',
              Amount: 29.99,
            },
            Shipping: {
              CurrencyCode: 'USD',
              Amount: 0,
            },
          },
          RegularPrice: {
            CurrencyCode: 'USD',
            Amount: 34.99,
          },
        },
      ],
      CompetitivePricing: {
        CompetitivePrices: [
          {
            CompetitivePriceId: '1',
            Price: {
              ListingPrice: {
                CurrencyCode: 'USD',
                Amount: 27.99,
              },
              LandedPrice: {
                CurrencyCode: 'USD',
                Amount: 27.99,
              },
            },
            condition: 'New',
            subcondition: 'New',
            belongsToRequester: false,
          },
        ],
        NumberOfOfferListings: [],
      },
    },
  },
  'B00TEST1234': {
    ASIN: 'B00TEST1234',
    status: 'Success',
    Product: {
      Identifiers: {
        MarketplaceASIN: {
          MarketplaceId: 'ATVPDKIKX0DER',
          ASIN: 'B00TEST1234',
        },
      },
      Offers: [
        {
          offerType: 'NEW',
          BuyingPrice: {
            ListingPrice: {
              CurrencyCode: 'USD',
              Amount: 19.99,
            },
            LandedPrice: {
              CurrencyCode: 'USD',
              Amount: 19.99,
            },
          },
        },
      ],
    },
  },
};

const itemB075CYMYK6 = mockPricingData['B075CYMYK6'];
if (!itemB075CYMYK6) throw new Error('Mock pricing item not found');

export const mockPricingResponse: ProductPricingResponse = {
  payload: [itemB075CYMYK6],
};

export class MockAmazonPricingService {
  async getPricing(asin: string): Promise<ProductPricingItem | null> {
    return mockPricingData[asin] || null;
  }

  async getCompetitivePricing(asin: string): Promise<ProductPricingResponse | null> {
    const item = mockPricingData[asin];
    if (!item) return null;
    return { payload: [item] };
  }
}
