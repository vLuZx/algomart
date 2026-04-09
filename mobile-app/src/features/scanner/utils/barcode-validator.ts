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
 * Normalize barcode to standard format
 * Converts EAN-13 barcodes with leading 0 to UPC-A (12 digits)
 */
export function normalizeBarcode(code: string): string {
  const cleanCode = code.trim();
  
  // If it's a 13-digit EAN that starts with 0, convert to UPC-A (remove leading 0)
  if (cleanCode.length === 13 && cleanCode.startsWith('0')) {
    return cleanCode.substring(1);
  }
  
  return cleanCode;
}

/**
 * Infer barcode type from normalized barcode
 */
export function inferBarcodeType(code: string): 'UPC' | 'EAN' | 'UNKNOWN' {
  const normalizedCode = normalizeBarcode(code);
  
  if (!isValidBarcode(normalizedCode)) {
    return 'UNKNOWN';
  }
  
  if (normalizedCode.length === 12) {
    return 'UPC';
  }
  
  if (normalizedCode.length === 13) {
    return 'EAN';
  }
  
  return 'UNKNOWN';
}
