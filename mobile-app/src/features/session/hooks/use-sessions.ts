/**
 * Use Sessions Hook
 * Access all sessions and session management actions
 */

import { useEffect } from 'react';
import { useSessionStore } from '../store/session.store';

export function useSessions() {
  const {
    sessions,
    isLoading,
    loadSessions,
    createSession,
    deleteSession,
    updateSessionName,
  } = useSessionStore();

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    isLoading,
    createSession,
    deleteSession,
    updateSessionName,
  };
}
