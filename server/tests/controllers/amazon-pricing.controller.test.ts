import { isValidAsin } from '../../src/utils/barcode.utils.js';
import { normalizePriceResponse } from '../../src/utils/response.utils.js';
import { mockPricingData } from '../mocks/amazon-pricing.mock.js';

describe('Amazon Pricing Controller Logic', () => {
  describe('ASIN Validation for Pricing', () => {
    it('should validate ASIN before pricing request', () => {
      expect(isValidAsin('B075CYMYK6')).toBe(true);
      expect(isValidAsin('INVALID')).toBe(false);
    });
  });

  describe('Price Response Normalization', () => {
    it('should normalize pricing data correctly', () => {
      const item = mockPricingData['B075CYMYK6']!;
      const normalized = normalizePriceResponse(item);

      expect(normalized.asin).toBe('B075CYMYK6');
      expect(normalized.listingPrice).toEqual({
        amount: 29.99,
        currency: 'USD',
      });
      expect(normalized.currency).toBe('USD');
    });

    it('should handle pricing with competitive prices', () => {
      const item = mockPricingData['B075CYMYK6']!;
      const normalized = normalizePriceResponse(item);

      expect(normalized.lowestPrice).toBeDefined();
      expect(normalized.lowestPrice?.amount).toBe(27.99);
    });
  });
});
