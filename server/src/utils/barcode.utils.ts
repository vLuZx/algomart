import { BarcodeType } from '../types/amazon.types.js';

/**
 * Infer barcode type based on the code format
 * UPC: 12 digits
 * EAN: 13 digits
 */
export function inferBarcodeType(code: string): BarcodeType {
  // Remove any whitespace
  const cleanCode = code.trim();
  
  // Check if it's numeric
  if (!/^\d+$/.test(cleanCode)) {
    return BarcodeType.UNKNOWN;
  }
  
  // Determine type based on length
  if (cleanCode.length === 12) {
    return BarcodeType.UPC;
  } else if (cleanCode.length === 13) {
    return BarcodeType.EAN;
  } else if (cleanCode.length == 8 || cleanCode.length == 14) {
    return BarcodeType.GTIN;
  }
  
  return BarcodeType.UNKNOWN;
}

/**
 * Validate barcode format
 */
export function isValidBarcode(code: string): boolean {
  const cleanCode = code.trim();
  
  // Must be numeric
  if (!/^\d+$/.test(cleanCode)) {
    return false;
  }
  
  // Must be 12 or 13 digits
  return cleanCode.length === 12 || cleanCode.length === 13;
}

/**
 * Validate ASIN format
 * ASINs are 10 characters, alphanumeric
 */
export function isValidAsin(asin: string): boolean {
  const cleanAsin = asin.trim();
  return /^[A-Z0-9]{10}$/i.test(cleanAsin);
}