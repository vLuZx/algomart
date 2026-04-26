import { BarcodeType } from '../types/amazon.types.js';
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
//# sourceMappingURL=barcode.utils.d.ts.map