import { inferBarcodeType, isValidBarcode } from '../../src/utils/barcode.utils.js';
import { normalizeCatalogItem, normalizePriceResponse, normalizeOfferSummary } from '../../src/utils/response.utils.js';
import { mockCatalogItems } from '../mocks/amazonCatalog.mock.js';
import { mockPricingData } from '../mocks/amazonPricing.mock.js';
import { mockOffersData } from '../mocks/amazonOffers.mock.js';

describe('Amazon Analysis Controller Logic', () => {
  describe('Multi-source Data Analysis', () => {
    it('should aggregate catalog, pricing, and offers data', () => {
      const barcode = '885909950805';
      const barcodeType = inferBarcodeType(barcode);
      
      expect(barcodeType).toBe('UPC');
      expect(isValidBarcode(barcode)).toBe(true);

      // Simulate analysis aggregation
      const catalogItem = mockCatalogItems[barcode];
      const pricing = mockPricingData['B075CYMYK6'];
      const offers = mockOffersData['B075CYMYK6'];

      expect(catalogItem).toBeDefined();
      expect(pricing).toBeDefined();
      expect(offers).toBeDefined();
    });

    it('should normalize all data sources', () => {
      const catalogItem = mockCatalogItems['885909950805']!;
      const pricing = mockPricingData['B075CYMYK6']!;
      const offers = mockOffersData['B075CYMYK6']!;

      const normalizedCatalog = normalizeCatalogItem(catalogItem);
      const normalizedPricing = normalizePriceResponse(pricing);
      const normalizedOffers = normalizeOfferSummary(offers);

      expect(normalizedCatalog.asin).toBe('B075CYMYK6');
      expect(normalizedPricing.asin).toBe('B075CYMYK6');
      expect(normalizedOffers!.asin).toBe('B075CYMYK6');
    });

    it('should handle barcode type inference for analysis', () => {
      expect(inferBarcodeType('885909950805')).toBe('UPC');
      expect(inferBarcodeType('0885909950805')).toBe('EAN');
    });
  });
});
