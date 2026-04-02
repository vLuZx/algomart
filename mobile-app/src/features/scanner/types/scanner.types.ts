/**
 * Scanner Types
 */

export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type ScannerStatus = 'idle' | 'scanning' | 'processing' | 'paused';

export interface ScannerState {
  isScanning: boolean;
  permission: CameraPermissionStatus;
  lastScannedBarcode: string | null;
  lastScannedAt: number | null;
  status: ScannerStatus;
}

export interface BarcodeFrame {
  value: string;
  type: 'ean-13' | 'upc-a' | 'upc-e';
  timestamp: number;
}
