/**
 * Infer barcode type based on the code format
 * UPC: 12 digits
 * EAN: 13 digits
 */
export function inferBarcodeType(code) {
    // Remove any whitespace
    const cleanCode = code.trim();
    // Check if it's numeric
    if (!/^\d+$/.test(cleanCode)) {
        return 'UNKNOWN';
    }
    // Determine type based on length
    if (cleanCode.length === 12) {
        return 'UPC';
    }
    else if (cleanCode.length === 13) {
        return 'EAN';
    }
    return 'UNKNOWN';
}
/**
 * Validate barcode format
 */
export function isValidBarcode(code) {
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
export function isValidAsin(asin) {
    const cleanAsin = asin.trim();
    return /^[A-Z0-9]{10}$/i.test(cleanAsin);
}
/**
 * Convert barcode type to Amazon identifier type
 */
export function barcodeTypeToIdentifierType(type) {
    switch (type) {
        case 'UPC':
            return 'UPC';
        case 'EAN':
            return 'EAN';
        default:
            return 'UPC'; // Default fallback
    }
}
//# sourceMappingURL=barcode.utils.js.map