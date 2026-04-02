/**
 * Barcode Validator
 * Validates barcode formats
 */

/**
 * Check if barcode is valid UPC or EAN
 */
export function isValidBarcode(code: string): boolean {
  const cleanCode = code.trim();
  
  // Must be numeric
  if (!/^\d+$/.test(cleanCode)) {
    return false;
  }
  
  // Must be 12 (UPC) or 13 (EAN) digits
  return cleanCode.length === 12 || cleanCode.length === 13;
}

/**
 * Infer barcode type from length
 */
export function inferBarcodeType(code: string): 'UPC' | 'EAN' | 'UNKNOWN' {
  const cleanCode = code.trim();
  
  if (!isValidBarcode(cleanCode)) {
    return 'UNKNOWN';
  }
  
  if (cleanCode.length === 12) {
    return 'UPC';
  }
  
  if (cleanCode.length === 13) {
    return 'EAN';
  }
  
  return 'UNKNOWN';
}

/**
 * Normalize barcode (remove whitespace, validate)
 */
export function normalizeBarcode(code: string): string | null {
  const cleanCode = code.trim();
  
  if (!isValidBarcode(cleanCode)) {
    return null;
  }
  
  return cleanCode;
}
