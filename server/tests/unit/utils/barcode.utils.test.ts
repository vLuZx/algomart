/**
 * Unit Tests: Barcode Utils
 */

import {
  inferBarcodeType,
  isValidBarcode,
  isValidAsin,
  barcodeTypeToIdentifierType,
} from '../../../src/utils/barcode.utils.js';

describe('barcode.utils', () => {
  describe('inferBarcodeType', () => {
    it('should identify UPC (12 digits)', () => {
      expect(inferBarcodeType('810043986496')).toBe('UPC');
      expect(inferBarcodeType('123456789012')).toBe('UPC');
    });

    it('should identify EAN (13 digits)', () => {
      expect(inferBarcodeType('9780123456789')).toBe('EAN');
      expect(inferBarcodeType('1234567890123')).toBe('EAN');
    });

    it('should return UNKNOWN for non-numeric codes', () => {
      expect(inferBarcodeType('ABC123456789')).toBe('UNKNOWN');
      expect(inferBarcodeType('12345-67890')).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for invalid lengths', () => {
      expect(inferBarcodeType('123')).toBe('UNKNOWN');
      expect(inferBarcodeType('12345678901234')).toBe('UNKNOWN');
    });

    it('should trim whitespace before checking', () => {
      expect(inferBarcodeType('  810043986496  ')).toBe('UPC');
      expect(inferBarcodeType(' 9780123456789 ')).toBe('EAN');
    });

    it('should handle empty string', () => {
      expect(inferBarcodeType('')).toBe('UNKNOWN');
    });
  });

  describe('isValidBarcode', () => {
    it('should validate UPC barcodes', () => {
      expect(isValidBarcode('810043986496')).toBe(true);
      expect(isValidBarcode('123456789012')).toBe(true);
    });

    it('should validate EAN barcodes', () => {
      expect(isValidBarcode('9780123456789')).toBe(true);
      expect(isValidBarcode('1234567890123')).toBe(true);
    });

    it('should reject non-numeric barcodes', () => {
      expect(isValidBarcode('ABC123456789')).toBe(false);
      expect(isValidBarcode('12345-67890')).toBe(false);
      expect(isValidBarcode('123.456.789.012')).toBe(false);
    });

    it('should reject invalid lengths', () => {
      expect(isValidBarcode('123')).toBe(false);
      expect(isValidBarcode('12345')).toBe(false);
      expect(isValidBarcode('12345678901234')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidBarcode('  810043986496  ')).toBe(true);
      expect(isValidBarcode(' 123 ')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidBarcode('')).toBe(false);
      expect(isValidBarcode('   ')).toBe(false);
    });
  });

  describe('isValidAsin', () => {
    it('should validate valid ASINs', () => {
      expect(isValidAsin('B08N5WRWNW')).toBe(true);
      expect(isValidAsin('B000123XYZ')).toBe(true);
      expect(isValidAsin('0123456789')).toBe(true);
    });

    it('should validate case-insensitive', () => {
      expect(isValidAsin('b08n5wrwnw')).toBe(true);
      expect(isValidAsin('B08N5wrwnw')).toBe(true);
    });

    it('should reject invalid lengths', () => {
      expect(isValidAsin('B08N5')).toBe(false);
      expect(isValidAsin('B08N5WRWNW123')).toBe(false);
    });

    it('should reject special characters', () => {
      expect(isValidAsin('B08N5-RWWN')).toBe(false);
      expect(isValidAsin('B08N5_RWWN')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidAsin('  B08N5WRWNW  ')).toBe(true);
      expect(isValidAsin('B08N5 WRWNW')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidAsin('')).toBe(false);
    });
  });

  describe('barcodeTypeToIdentifierType', () => {
    it('should convert UPC to UPC', () => {
      expect(barcodeTypeToIdentifierType('UPC')).toBe('UPC');
    });

    it('should convert EAN to EAN', () => {
      expect(barcodeTypeToIdentifierType('EAN')).toBe('EAN');
    });

    it('should default UNKNOWN to UPC', () => {
      expect(barcodeTypeToIdentifierType('UNKNOWN')).toBe('UPC');
    });
  });
});
