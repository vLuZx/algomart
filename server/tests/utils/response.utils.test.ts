import {
  normalizeCatalogItem,
  normalizePriceResponse,
  normalizeOfferSummary,
  normalizeSalesRank,
} from '../../src/utils/response.utils.js';
import { mockCatalogItems } from '../mocks/amazonCatalog.mock.js';
import { mockPricingData } from '../mocks/amazonPricing.mock.js';
import { mockOffersData } from '../mocks/amazonOffers.mock.js';

describe('Response Utils', () => {
  describe('normalizeCatalogItem', () => {
    it('should normalize a complete catalog item', () => {
      const item = mockCatalogItems['885909950805']!;
      const normalized = normalizeCatalogItem(item);

      expect(normalized.asin).toBe('B075CYMYK6');
      expect(normalized.title).toBe(
        'Neewer NW-700 Professional Studio Broadcasting Recording Condenser Microphone'
      );
      expect(normalized.brand).toBe('Neewer');
      expect(normalized.manufacturer).toBe('Neewer');
      expect(normalized.image).toBe('https://m.media-amazon.com/images/I/71xZv6hKShL.jpg');
      expect(normalized.productGroup).toBe('Musical Instruments');
      expect(normalized.productType).toBe('MICROPHONE');
      expect(normalized.identifiers).toHaveLength(2);
      expect(normalized.salesRanks).toHaveLength(2);
    });

    it('should handle items with missing optional fields', () => {
      const minimalItem = {
        asin: 'B00MINIMAL',
        identifiers: [],
        images: [],
        productTypes: [],
        salesRanks: [],
        summaries: [],
      };

      const normalized = normalizeCatalogItem(minimalItem);

      expect(normalized.asin).toBe('B00MINIMAL');
      expect(normalized.title).toBeNull();
      expect(normalized.brand).toBeNull();
      expect(normalized.manufacturer).toBeNull();
      expect(normalized.image).toBeNull();
      expect(normalized.productGroup).toBeNull();
      expect(normalized.productType).toBeNull();
      expect(normalized.identifiers).toEqual([]);
      expect(normalized.salesRanks).toBeNull();
    });

    it('should extract identifiers correctly', () => {
      const item = mockCatalogItems['885909950805']!;
      const normalized = normalizeCatalogItem(item);

      expect(normalized.identifiers).toEqual([
        { type: 'UPC', value: '885909950805' },
        { type: 'EAN', value: '0885909950805' },
      ]);
    });

    it('should extract sales ranks correctly', () => {
      const item = mockCatalogItems['885909950805']!;
      const normalized = normalizeCatalogItem(item);

      expect(normalized.salesRanks).toEqual([
        { category: 'Musical Instruments', rank: 1234 },
        { category: 'Condenser Microphones', rank: 42 },
      ]);
    });
  });

  describe('normalizePriceResponse', () => {
    it('should normalize pricing data with all fields', () => {
      const item = mockPricingData['B075CYMYK6']!;
      const normalized = normalizePriceResponse(item);

      expect(normalized.asin).toBe('B075CYMYK6');
      expect(normalized.listingPrice).toEqual({ amount: 29.99, currency: 'USD' });
      expect(normalized.landedPrice).toEqual({ amount: 29.99, currency: 'USD' });
      expect(normalized.lowestPrice).toEqual({ amount: 27.99, currency: 'USD' });
      expect(normalized.buyBoxPrice).toEqual({ amount: 34.99, currency: 'USD' });
      expect(normalized.currency).toBe('USD');
    });

    it('should handle missing pricing fields', () => {
      const minimalItem = {
        ASIN: 'B00MINIMAL',
        status: 'Success',
        Product: {
          Identifiers: {
            MarketplaceASIN: {
              MarketplaceId: 'ATVPDKIKX0DER',
              ASIN: 'B00MINIMAL',
            },
          },
        },
      };

      const normalized = normalizePriceResponse(minimalItem);

      expect(normalized.asin).toBe('B00MINIMAL');
      expect(normalized.listingPrice).toBeNull();
      expect(normalized.landedPrice).toBeNull();
      expect(normalized.lowestPrice).toBeNull();
      expect(normalized.buyBoxPrice).toBeNull();
      expect(normalized.currency).toBe('USD');
    });
  });

  describe('normalizeOfferSummary', () => {
    it('should normalize offer summary with counts', () => {
      const response = mockOffersData['B075CYMYK6']!;
      const normalized = normalizeOfferSummary(response);

      expect(normalized).not.toBeNull();
      expect(normalized!.asin).toBe('B075CYMYK6');
      expect(normalized!.offerCounts).toHaveLength(2);
      expect(normalized!.totalOffers).toBe(23);
      expect(normalized!.competitivePrices).toHaveLength(1);
    });

    it('should return null for empty response', () => {
      const emptyResponse = { payload: [] };
      const normalized = normalizeOfferSummary(emptyResponse);

      expect(normalized).toBeNull();
    });

    it('should calculate total offers correctly', () => {
      const response = mockOffersData['B075CYMYK6']!;
      const normalized = normalizeOfferSummary(response);

      expect(normalized!.totalOffers).toBe(15 + 8);
    });
  });

  describe('normalizeSalesRank', () => {
    it('should normalize sales ranks', () => {
      const item = mockCatalogItems['885909950805']!;
      const normalized = normalizeSalesRank(item);

      expect(normalized.asin).toBe('B075CYMYK6');
      expect(normalized.salesRanks).toHaveLength(2);
      expect(normalized.primaryCategory).toBe('Musical Instruments');
      expect(normalized.primaryRank).toBe(1234);
    });

    it('should handle items without sales ranks', () => {
      const itemWithoutRanks = {
        asin: 'B00NORANK',
        salesRanks: [],
      };

      const normalized = normalizeSalesRank(itemWithoutRanks);

      expect(normalized.asin).toBe('B00NORANK');
      expect(normalized.salesRanks).toEqual([]);
      expect(normalized.primaryCategory).toBeNull();
      expect(normalized.primaryRank).toBeNull();
    });
  });
});
