import type { CompetitivePricingResponse } from '../../src/types/amazon.types.js';

export const mockOffersData: Record<string, CompetitivePricingResponse> = {
  'B075CYMYK6': {
    payload: [
      {
        ASIN: 'B075CYMYK6',
        status: 'Success',
        Product: {
          Identifiers: {
            MarketplaceASIN: {
              MarketplaceId: 'ATVPDKIKX0DER',
              ASIN: 'B075CYMYK6',
            },
          },
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
            NumberOfOfferListings: [
              {
                condition: 'New',
                fulfillmentChannel: 'Amazon',
                offerCount: 15,
              },
              {
                condition: 'New',
                fulfillmentChannel: 'Merchant',
                offerCount: 8,
              },
            ],
          },
        },
      },
    ],
  },
  'B00TEST1234': {
    payload: [
      {
        ASIN: 'B00TEST1234',
        status: 'Success',
        Product: {
          Identifiers: {
            MarketplaceASIN: {
              MarketplaceId: 'ATVPDKIKX0DER',
              ASIN: 'B00TEST1234',
            },
          },
          CompetitivePricing: {
            CompetitivePrices: [],
            NumberOfOfferListings: [
              {
                condition: 'New',
                fulfillmentChannel: 'Amazon',
                offerCount: 5,
              },
            ],
          },
        },
      },
    ],
  },
};

export class MockAmazonOffersService {
  async getOffersSummary(asin: string): Promise<CompetitivePricingResponse | null> {
    return mockOffersData[asin] || null;
  }
}
