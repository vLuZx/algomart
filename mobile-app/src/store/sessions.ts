/**
 * Lightweight session store using React context.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Session } from '../types/session';

let nextId = 1;
function generateId(): string {
  return `session_${Date.now()}_${nextId++}`;
}

interface SessionStore {
  sessions: Session[];
  addSession: (name: string) => Session;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  incrementProductCount: (id: string) => void;
}

const SessionContext = createContext<SessionStore | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);

  const addSession = useCallback((name: string): Session => {
    const now = new Date().toISOString();
    const session: Session = {
      id: generateId(),
      name,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    setSessions((prev) => [session, ...prev]);
    return session;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const renameSession = useCallback((id: string, name: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }, []);

  const incrementProductCount = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, productCount: s.productCount + 1, updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }, []);

  const value = useMemo<SessionStore>(
    () => ({ sessions, addSession, deleteSession, renameSession, incrementProductCount }),
    [sessions, addSession, deleteSession, renameSession, incrementProductCount],
  );

  return React.createElement(SessionContext.Provider, { value }, children);
}

export function useSessions(): SessionStore {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessions must be used inside <SessionProvider>');
  return ctx;
}
