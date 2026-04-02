/**
 * Scanner Hook
 * Orchestrates camera permissions, barcode detection, and product analysis
 */

import { useCallback } from 'react';
import { useScannerStore } from '../features/scanner/store/scanner.store';
import { useSession } from '../features/session/hooks/use-session';
import { shouldAcceptScan } from '../features/scanner/utils/scan-debounce';
import { isValidBarcode } from '../features/scanner/utils/barcode-validator';
import type { SessionMode } from '../features/session/types/session.types';

interface UseScannerOptions {
  sessionId: string;
  mode: SessionMode;
  onScanComplete?: (barcode: string) => void;
  onDuplicateScan?: (barcode: string) => void;
}

export function useScanner({
  sessionId,
  mode,
  onScanComplete,
  onDuplicateScan,
}: UseScannerOptions) {
  const {
    isScanning,
    permission,
    lastScannedBarcode,
    lastScannedAt,
    status,
    startScanning,
    stopScanning,
    recordScan,
    setPermission,
  } = useScannerStore();

  const { addProduct, isProductScanned } = useSession(sessionId);

  const handleBarcodeDetected = useCallback(
    (barcode: string) => {
      // Validate barcode format
      if (!isValidBarcode(barcode)) {
        console.warn('Invalid barcode format:', barcode);
        return;
      }

      // Check debounce (prevent duplicate scans within 1 second)
      if (!shouldAcceptScan(barcode, lastScannedBarcode, lastScannedAt)) {
        console.log('Scan debounced:', barcode);
        return;
      }

      // Check if already scanned in session
      if (isProductScanned(barcode)) {
        console.log('Duplicate scan detected:', barcode);
        onDuplicateScan?.(barcode);
        
        // In rapid mode, just show toast and continue scanning
        if (mode === 'rapid') {
          return;
        }
      }

      // Record the scan
      recordScan(barcode);

      // Add to session
      const added = addProduct(barcode);

      if (added || mode === 'single') {
        // Notify completion
        onScanComplete?.(barcode);
      }
    },
    [
      lastScannedBarcode,
      lastScannedAt,
      isProductScanned,
      addProduct,
      recordScan,
      onScanComplete,
      onDuplicateScan,
      mode,
    ]
  );

  const start = useCallback(() => {
    if (permission !== 'granted') {
      console.warn('Camera permission not granted');
      return;
    }
    startScanning();
  }, [permission, startScanning]);

  const stop = useCallback(() => {
    stopScanning();
  }, [stopScanning]);

  return {
    // State
    isScanning,
    permission,
    lastScannedBarcode,
    status,

    // Actions
    start,
    stop,
    handleBarcodeDetected,
    setPermission,
  };
}
