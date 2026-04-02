import { isValidAsin } from '../../src/utils/barcode.utils.js';
import { normalizeOfferSummary } from '../../src/utils/response.utils.js';
import { mockOffersData } from '../mocks/amazonOffers.mock.js';

describe('Amazon Offers Controller Logic', () => {
  describe('ASIN Validation for Offers', () => {
    it('should validate ASIN before offers request', () => {
      expect(isValidAsin('B075CYMYK6')).toBe(true);
      expect(isValidAsin('INVALID')).toBe(false);
    });
  });

  describe('Offers Summary Normalization', () => {
    it('should normalize offers data with counts', () => {
      const response = mockOffersData['B075CYMYK6'];
      if (!response) throw new Error('Mock data not found');
      const normalized = normalizeOfferSummary(response);

      expect(normalized).not.toBeNull();
      expect(normalized!.asin).toBe('B075CYMYK6');
      expect(normalized!.offerCounts).toHaveLength(2);
      expect(normalized!.totalOffers).toBe(23);
    });

    it('should extract competitive prices', () => {
      const response = mockOffersData['B075CYMYK6'];
      if (!response) throw new Error('Mock data not found');
      const normalized = normalizeOfferSummary(response);

      expect(normalized!.competitivePrices).toBeDefined();
      expect(normalized!.competitivePrices.length).toBeGreaterThan(0);
    });

    it('should calculate total offers correctly', () => {
      const response = mockOffersData['B075CYMYK6'];
      if (!response) throw new Error('Mock data not found');
      const normalized = normalizeOfferSummary(response);

      expect(normalized!.totalOffers).toBe(15 + 8);
    });
  });
});
