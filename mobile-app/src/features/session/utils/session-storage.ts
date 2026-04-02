/**
 * Session Storage Utilities
 * AsyncStorage helpers for session persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '../types/session.types';

const STORAGE_KEY = '@algomart:sessions';

/**
 * Load all sessions from AsyncStorage
 */
export async function loadSessions(): Promise<Session[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const sessions = JSON.parse(data) as Session[];
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
