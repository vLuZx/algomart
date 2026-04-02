import type { BarcodeType } from '../types/amazon.types.js';
/**
 * Infer barcode type based on the code format
 * UPC: 12 digits
 * EAN: 13 digits
 */
export declare function inferBarcodeType(code: string): BarcodeType;
/**
 * Validate barcode format
 */
export declare function isValidBarcode(code: string): boolean;
/**
 * Validate ASIN format
 * ASINs are 10 characters, alphanumeric
 */
export declare function isValidAsin(asin: string): boolean;
/**
 * Convert barcode type to Amazon identifier type
 */
export declare function barcodeTypeToIdentifierType(type: BarcodeType): string;
//# sourceMappingURL=barcode.utils.d.ts.map