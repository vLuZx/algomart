import { inferBarcodeType, isValidBarcode, isValidAsin } from '../../src/utils/barcode.utils.js';

describe('Amazon Catalog Controller Logic', () => {
  describe('Barcode Validation', () => {
    it('should validate 12-digit UPC codes', () => {
      expect(isValidBarcode('885909950805')).toBe(true);
      expect(isValidBarcode('012345678901')).toBe(true);
    });

    it('should validate 13-digit EAN codes', () => {
      expect(isValidBarcode('0885909950805')).toBe(true);
      expect(isValidBarcode('0123456789012')).toBe(true);
    });

    it('should reject invalid barcodes', () => {
      expect(isValidBarcode('12345')).toBe(false);
      expect(isValidBarcode('abc123456789')).toBe(false);
    });

    it('should infer barcode type from length', () => {
      expect(inferBarcodeType('885909950805')).toBe('UPC');
      expect(inferBarcodeType('0885909950805')).toBe('EAN');
      expect(inferBarcodeType('12345')).toBe('UNKNOWN');
    });
  });

  describe('ASIN Validation', () => {
    it('should validate correct ASIN format', () => {
      expect(isValidAsin('B075CYMYK6')).toBe(true);
      expect(isValidAsin('B00TEST123')).toBe(true);
    });

    it('should reject invalid ASIN format', () => {
      expect(isValidAsin('INVALID')).toBe(false);
      expect(isValidAsin('B075CYMYK67')).toBe(false);
      expect(isValidAsin('B075-YMYK6')).toBe(false);
    });
  });
});
