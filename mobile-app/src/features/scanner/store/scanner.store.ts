/**
 * Scanner Store (Zustand)
 * Manages scanner state
 */

import { create } from 'zustand';
import type { CameraPermissionStatus, ScannerStatus } from '../types/scanner.types';

interface ScannerState {
  // State
  isScanning: boolean;
  permission: CameraPermissionStatus;
  lastScannedBarcode: string | null;
  lastScannedAt: number | null;
  status: ScannerStatus;
  
  // Actions
  startScanning: () => void;
  stopScanning: () => void;
  pauseScanning: () => void;
  resumeScanning: () => void;
  setPermission: (permission: CameraPermissionStatus) => void;
  recordScan: (barcode: string) => void;
  resetScanner: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  // Initial state
  isScanning: false,
  permission: 'undetermined',
  lastScannedBarcode: null,
  lastScannedAt: null,
  status: 'idle',

  // Start scanning
  startScanning: () => {
    set({
      isScanning: true,
      status: 'scanning',
    });
  },

  // Stop scanning
  stopScanning: () => {
    set({
      isScanning: false,
      status: 'idle',
    });
  },

  // Pause scanning
  pauseScanning: () => {
    set({
      isScanning: false,
      status: 'paused',
    });
  },

  // Resume scanning
  resumeScanning: () => {
    set({
      isScanning: true,
      status: 'scanning',
    });
  },

  // Set camera permission
  setPermission: (permission) => {
    set({ permission });
  },

  // Record a successful scan
  recordScan: (barcode) => {
    set({
      lastScannedBarcode: barcode,
      lastScannedAt: Date.now(),
      status: 'processing',
    });
  },

  // Reset scanner state
  resetScanner: () => {
    set({
      isScanning: false,
      lastScannedBarcode: null,
      lastScannedAt: null,
      status: 'idle',
    });
  },
}));
