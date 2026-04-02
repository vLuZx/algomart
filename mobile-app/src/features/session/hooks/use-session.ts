/**
 * Use Session Hook
 * Access and manage a specific session
 */

import { useCallback, useMemo } from 'react';
import { useSessionStore } from '../store/session.store';

export function useSession(sessionId: string) {
  const {
    getSession,
    setActiveSession,
    addProductToSession,
    removeProductFromSession,
    deleteSession,
    updateSessionName,
    updateSessionMode,
    isProductInSession,
  } = useSessionStore();

  const session = useMemo(() => getSession(sessionId), [getSession, sessionId]);

  const addProduct = useCallback((barcode: string) => {
    return addProductToSession(sessionId, barcode);
  }, [addProductToSession, sessionId]);

  const removeProduct = useCallback(async (barcode: string) => {
    await removeProductFromSession(sessionId, barcode);
  }, [removeProductFromSession, sessionId]);

  const deleteCurrentSession = useCallback(async () => {
    await deleteSession(sessionId);
  }, [deleteSession, sessionId]);

  const updateName = useCallback(async (name: string) => {
    await updateSessionName(sessionId, name);
  }, [updateSessionName, sessionId]);

  const isProductScanned = useCallback((barcode: string) => {
    return isProductInSession(sessionId, barcode);
  }, [isProductInSession, sessionId]);

  const setAsActive = useCallback(() => {
    setActiveSession(sessionId);
  }, [setActiveSession, sessionId]);

  return {
    session,
    addProduct,
    removeProduct,
    deleteSession: deleteCurrentSession,
    updateName,
    updateMode: (mode: 'single' | 'rapid') => updateSessionMode(sessionId, mode),
    isProductScanned,
    setAsActive,
  };
}
