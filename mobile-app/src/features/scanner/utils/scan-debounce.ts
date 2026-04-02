/**
 * Scan Debounce Utility
 * Prevents rapid duplicate scans
 */

import { SCAN_DEBOUNCE_MS } from '../../../constants/config';

/**
 * Check if enough time has passed since last scan
 */
export function shouldProcessScan(
  lastScannedAt: number | null,
  debounceMs: number = SCAN_DEBOUNCE_MS
): boolean {
  if (!lastScannedAt) return true;
  
  const now = Date.now();
  const timeSinceLastScan = now - lastScannedAt;
  
  return timeSinceLastScan >= debounceMs;
}

/**
 * Check if barcode is different from last scanned
 */
export function isDifferentBarcode(
  newBarcode: string,
  lastBarcode: string | null
): boolean {
  if (!lastBarcode) return true;
  return newBarcode !== lastBarcode;
}

/**
 * Determine if scan should be processed
 * Combines timing and duplicate checks
 */
export function shouldAcceptScan(
  newBarcode: string,
  lastBarcode: string | null,
  lastScannedAt: number | null,
  debounceMs: number = SCAN_DEBOUNCE_MS
): boolean {
  // If same barcode, check debounce timing
  if (newBarcode === lastBarcode) {
    return shouldProcessScan(lastScannedAt, debounceMs);
  }
  
  // Different barcode, accept immediately
  return true;
}
