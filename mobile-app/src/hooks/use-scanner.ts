/**
 * Scanner Hook
 * Orchestrates camera permissions, barcode detection, and product analysis
 */

import { useCallback, useRef } from 'react';
import { useScannerStore } from '../features/scanner/store/scanner.store';
import { useSession } from '../features/session/hooks/use-session';
import { isValidBarcode, inferBarcodeType, normalizeBarcode } from '../features/scanner/utils/barcode-validator';
import type { SessionMode } from '../features/session/types/session.types';

interface UseScannerOptions {
  sessionId: string;
  mode: SessionMode;
  onScanComplete?: (barcode: string) => void;
  onDuplicateScan?: (barcode: string) => void;
}

const FEEDBACK_LOCK_DURATION = 500; // 500ms minimum feedback display

export function useScanner({
  sessionId,
  mode,
  onScanComplete,
  onDuplicateScan,
}: UseScannerOptions) {
  const {
    isScanning,
    permission,
    status,
    startScanning,
    stopScanning,
    setPermission,
  } = useScannerStore();

  const { session, addProduct } = useSession(sessionId);

  // Critical: Hard locks to prevent scan event spam
  const feedbackLockUntilRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const handleBarcodeDetected = useCallback(
    (barcode: string, barcodeType?: string) => {
      const now = Date.now();

      // HARD LOCK: Ignore all scan events during feedback window
      if (now < feedbackLockUntilRef.current) {
        console.log('SCAN BLOCKED: Feedback lock active', {
          barcode,
          lockRemainingMs: feedbackLockUntilRef.current - now,
        });
        return;
      }

      // HARD LOCK: Ignore all scan events during processing
      if (isProcessingRef.current) {
        console.log('SCAN BLOCKED: Processing active', { barcode });
        return;
      }

      console.log('handleBarcodeDetected:', { barcode, barcodeType });

      // Normalize barcode (convert EAN-13 with leading 0 to UPC-A)
      const normalizedBarcode = normalizeBarcode(barcode);
      console.log('Normalized:', { original: barcode, normalized: normalizedBarcode });

      // Validate barcode format
      if (!isValidBarcode(normalizedBarcode)) {
        console.warn('Invalid barcode format:', normalizedBarcode);
        return;
      }

      // Infer type from normalized barcode
      const type = inferBarcodeType(normalizedBarcode);
      console.log('Validated:', { barcode: normalizedBarcode, type });

      // DUPLICATE CHECK: Use session's actual product array
      const isDuplicate = session?.scannedProducts?.some(
        (p) => p.barcode === normalizedBarcode
      ) ?? false;

      if (isDuplicate) {
        console.log('DUPLICATE DETECTED:', normalizedBarcode);
        
        // Set feedback lock
        feedbackLockUntilRef.current = now + FEEDBACK_LOCK_DURATION;
        
        // Trigger duplicate callback
        onDuplicateScan?.(normalizedBarcode);
        
        // DO NOT proceed to success path
        // DO NOT close scanner (even in single mode)
        return;
      }

      // NEW SCAN: Enter processing state
      console.log('NEW SCAN - Starting processing:', normalizedBarcode);
      
      // Activate processing lock
      isProcessingRef.current = true;
      feedbackLockUntilRef.current = now + FEEDBACK_LOCK_DURATION;

      // Add to session with type
      const added = addProduct(normalizedBarcode, type);
      console.log('Product added:', { added, barcode: normalizedBarcode });

      // Complete processing after minimum feedback time
      setTimeout(() => {
        isProcessingRef.current = false;
        
        if (added) {
          console.log('Calling onScanComplete');
          onScanComplete?.(normalizedBarcode);
        } else {
          console.log('Product was not added - skipping callback');
        }
      }, FEEDBACK_LOCK_DURATION);
    },
    [session, addProduct, onScanComplete, onDuplicateScan]
  );

  const start = useCallback(() => {
    if (permission !== 'granted') {
      console.warn('Camera permission not granted');
      return;
    }
    // Reset locks when starting scanner
    feedbackLockUntilRef.current = 0;
    isProcessingRef.current = false;
    startScanning();
  }, [permission, startScanning]);

  const stop = useCallback(() => {
    // Clear locks when stopping
    feedbackLockUntilRef.current = 0;
    isProcessingRef.current = false;
    stopScanning();
  }, [stopScanning]);

  return {
    // State
    isScanning,
    permission,
    status,

    // Actions
    start,
    stop,
    handleBarcodeDetected,
    setPermission,
  };
}
