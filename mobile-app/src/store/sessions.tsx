import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Session } from '../types/session';

interface SessionsContextValue {
  sessions: Session[];
  addSession: (title: string) => Session;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  incrementProductCount: (id: string) => void;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);

  const addSession = (title: string): Session => {
    const now = new Date().toISOString();
    const session: Session = {
      id: Date.now().toString(),
      title,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    setSessions(prev => [session, ...prev]);
    return session;
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const renameSession = (id: string, title: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s
      )
    );
  };

  const incrementProductCount = (id: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, productCount: s.productCount + 1, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  return (
    <SessionsContext.Provider
      value={{ sessions, addSession, deleteSession, renameSession, incrementProductCount }}
    >
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used inside SessionProvider');
  return ctx;
}
