/**
 * Session Storage Utilities
 * AsyncStorage helpers for session persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, ScannedProduct } from '../types/session.types';
import { generateUUID } from './session-name-generator';

const STORAGE_KEY = '@algomart:sessions';

/**
 * Migrate old session format (scannedBarcodes) to new format (scannedProducts)
 */
function migrateSession(session: any): Session {
  // If session already has scannedProducts, return as is
  if (session.scannedProducts) {
    return session as Session;
  }
  
  // Convert old scannedBarcodes array to scannedProducts
  const scannedProducts: ScannedProduct[] = (session.scannedBarcodes || []).map((barcode: string) => ({
    id: generateUUID(),
    barcode,
    type: 'UNKNOWN', // Old sessions don't have type info
    scannedAt: session.createdAt, // Use session creation time as fallback
  }));
  
  return {
    ...session,
    scannedProducts,
    // Remove old property
    scannedBarcodes: undefined,
  } as Session;
}

/**
 * Load all sessions from AsyncStorage
 */
export async function loadSessions(): Promise<Session[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const rawSessions = JSON.parse(data) as any[];
    const sessions = rawSessions.map(migrateSession);
    
    // Save migrated sessions back to storage
    if (rawSessions.some(s => !s.scannedProducts)) {
      await saveSessions(sessions);
    }
    
    return sessions;
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
}

/**
 * Save all sessions to AsyncStorage
 */
export async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save sessions:', error);
    throw error;
  }
}

/**
 * Clear all sessions from AsyncStorage
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear sessions:', error);
    throw error;
  }
}
