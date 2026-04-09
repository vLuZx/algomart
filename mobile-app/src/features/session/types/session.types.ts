/**
 * Session Types
 */

export type SessionMode = 'single' | 'rapid';

export interface ScannedProduct {
  id: string;
  barcode: string;
  type: string; // 'UPC-A', 'UPC-E', 'EAN-13', 'EAN-8', etc.
  scannedAt: number;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  scannedProducts: ScannedProduct[];
  productCount: number;
  lastUsedMode: SessionMode | null;
}

export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  productCount: number;
}
