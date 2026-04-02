/**
 * Session Types
 */

export type SessionMode = 'single' | 'rapid';

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  scannedBarcodes: string[];
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
