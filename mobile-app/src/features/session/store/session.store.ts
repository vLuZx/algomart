/**
 * Session Store (Zustand)
 * Manages all sessions with AsyncStorage persistence
 */

import { create } from 'zustand';
import type { Session, SessionMode, ScannedProduct } from '../types/session.types';
import { loadSessions, saveSessions } from '../utils/session-storage';
import { generateSessionName, generateUUID } from '../utils/session-name-generator';

interface SessionState {
  // State
  sessions: Session[];
  activeSessionId: string | null;
  isLoading: boolean;
  
  // Actions
  loadSessions: () => Promise<void>;
  createSession: (name?: string) => string;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;
  addProductToSession: (sessionId: string, barcode: string, barcodeType: string) => boolean;
  removeProductFromSession: (sessionId: string, productId: string) => Promise<void>;
  updateSessionName: (id: string, name: string) => Promise<void>;
  updateSessionMode: (id: string, mode: SessionMode) => void;
  
  // Helpers
  getSession: (id: string) => Session | undefined;
  isProductInSession: (sessionId: string, barcode: string) => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  
  // Load sessions from AsyncStorage
  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const sessions = await loadSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ isLoading: false });
    }
  },
  
  // Create a new session
  createSession: (name?: string) => {
    const id = generateUUID();
    const sessions = get().sessions;
    const sessionName = name || generateSessionName(sessions.length);
    
    const newSession: Session = {
      id,
      name: sessionName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scannedProducts: [],
      productCount: 0,
      lastUsedMode: null,
    };
    
    const updatedSessions = [...sessions, newSession];
    set({ sessions: updatedSessions, activeSessionId: id });
    
    // Save to storage (fire and forget)
    saveSessions(updatedSessions).catch(console.error);
    
    return id;
  },
  
  // Delete a session
  deleteSession: async (id: string) => {
    const sessions = get().sessions.filter(s => s.id !== id);
    const activeSessionId = get().activeSessionId === id ? null : get().activeSessionId;
    
    set({ sessions, activeSessionId });
    await saveSessions(sessions);
  },
  
  // Set active session
  setActiveSession: (id: string) => {
    set({ activeSessionId: id });
  },
  
  // Add product to session
  addProductToSession: (sessionId: string, barcode: string, barcodeType: string) => {
    const sessions = get().sessions;
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      console.warn('Session not found:', sessionId);
      return false;
    }
    
    // Ensure scannedProducts array exists (migration safety)
    if (!session.scannedProducts) {
      session.scannedProducts = [];
    }
    
    // Check for duplicate barcode
    if (session.scannedProducts.some(p => p.barcode === barcode)) {
      console.log('Duplicate barcode:', barcode);
      return false;
    }
    
    // Create new scanned product
    const newProduct: ScannedProduct = {
      id: generateUUID(),
      barcode,
      type: barcodeType,
      scannedAt: Date.now(),
    };
    
    // Add product
    session.scannedProducts.push(newProduct);
    session.productCount = session.scannedProducts.length;
    session.updatedAt = Date.now();
    
    set({ sessions: [...sessions] });
    
    // Save to storage
    saveSessions(sessions).catch(console.error);
    
    return true;
  },
  
  // Remove product from session
  removeProductFromSession: async (sessionId: string, productId: string) => {
    const sessions = get().sessions;
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;
    
    session.scannedProducts = session.scannedProducts.filter(p => p.id !== productId);
    session.productCount = session.scannedProducts.length;
    session.updatedAt = Date.now();
    
    set({ sessions: [...sessions] });
    await saveSessions(sessions);
  },
  
  // Update session name
  updateSessionName: async (id: string, name: string) => {
    const sessions = get().sessions;
    const session = sessions.find(s => s.id === id);
    
    if (!session) return;
    
    session.name = name;
    session.updatedAt = Date.now();
    
    set({ sessions: [...sessions] });
    await saveSessions(sessions);
  },
  
  // Update session mode
  updateSessionMode: (id: string, mode: SessionMode) => {
    const sessions = get().sessions;
    const session = sessions.find(s => s.id === id);
    
    if (!session) return;
    
    session.lastUsedMode = mode;
    session.updatedAt = Date.now();
    
    set({ sessions: [...sessions] });
    saveSessions(sessions).catch(console.error);
  },
  
  // Get session by ID
  getSession: (id: string) => {
    return get().sessions.find(s => s.id === id);
  },
  
  // Check if product is in session
  isProductInSession: (sessionId: string, barcode: string) => {
    const session = get().sessions.find(s => s.id === sessionId);
    return session?.scannedProducts?.some(p => p.barcode === barcode) ?? false;
  },
}));
