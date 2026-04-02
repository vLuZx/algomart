import { inferBarcodeType, isValidBarcode, isValidAsin } from '../../src/utils/barcode.utils.js';

describe('Barcode Utils', () => {
  describe('inferBarcodeType', () => {
    it('should identify 12-digit code as UPC', () => {
      expect(inferBarcodeType('885909950805')).toBe('UPC');
      expect(inferBarcodeType('012345678901')).toBe('UPC');
    });

    it('should identify 13-digit code as EAN', () => {
      expect(inferBarcodeType('0885909950805')).toBe('EAN');
      expect(inferBarcodeType('0123456789012')).toBe('EAN');
    });

    it('should return UNKNOWN for invalid lengths', () => {
      expect(inferBarcodeType('12345')).toBe('UNKNOWN');
      expect(inferBarcodeType('12345678901234')).toBe('UNKNOWN');
      expect(inferBarcodeType('')).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for non-numeric codes', () => {
      expect(inferBarcodeType('abc123456789')).toBe('UNKNOWN');
      expect(inferBarcodeType('12345678901A')).toBe('UNKNOWN');
    });
  });

  describe('isValidBarcode', () => {
    it('should validate 12-digit UPC codes', () => {
      expect(isValidBarcode('885909950805')).toBe(true);
      expect(isValidBarcode('012345678901')).toBe(true);
    });

    it('should validate 13-digit EAN codes', () => {
      expect(isValidBarcode('0885909950805')).toBe(true);
      expect(isValidBarcode('0123456789012')).toBe(true);
    });

    it('should reject invalid lengths', () => {
      expect(isValidBarcode('12345')).toBe(false);
      expect(isValidBarcode('12345678901234')).toBe(false);
      expect(isValidBarcode('')).toBe(false);
    });

    it('should reject non-numeric codes', () => {
      expect(isValidBarcode('abc123456789')).toBe(false);
      expect(isValidBarcode('12345678901A')).toBe(false);
    });

    it('should handle codes with whitespace', () => {
      expect(isValidBarcode(' 885909950805 ')).toBe(true);
      expect(isValidBarcode('885909950805 ')).toBe(true);
    });
  });

  describe('isValidAsin', () => {
    it('should validate 10-character alphanumeric ASINs', () => {
      expect(isValidAsin('B075CYMYK6')).toBe(true);
      expect(isValidAsin('B00TEST123')).toBe(true);
      expect(isValidAsin('1234567890')).toBe(true);
    });

    it('should reject invalid ASINs', () => {
      expect(isValidAsin('B075CYMYK')).toBe(false); // Too short
      expect(isValidAsin('B075CYMYK67')).toBe(false); // Too long
      expect(isValidAsin('B075-YMYK6')).toBe(false); // Contains hyphen
      expect(isValidAsin('')).toBe(false);
    });

    it('should handle ASINs with whitespace', () => {
      expect(isValidAsin(' B075CYMYK6 ')).toBe(true);
      expect(isValidAsin('B075CYMYK6 ')).toBe(true);
    });
  });
});
