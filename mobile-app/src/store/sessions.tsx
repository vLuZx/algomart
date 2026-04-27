import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  addSessionProduct,
  createSessionApi,
  deleteSessionApi,
  deleteSessionProductApi,
  fetchSessionProducts,
  fetchSessions,
  renameSessionApi,
  updateProductFoundPriceApi,
} from '../services/sessions.service';
import type { Session } from '../types/session';
import type { ScannedProductInput, SessionProduct } from '../types/product';

interface SessionsState {
  sessions: Session[];
  productsBySession: Record<string, SessionProduct[]>;
}

interface SessionsContextValue {
  sessions: Session[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  loadSessionProducts: (sessionId: string) => Promise<void>;
  getSession: (id: string) => Session | undefined;
  getProducts: (sessionId: string) => SessionProduct[];
  getProduct: (sessionId: string, productId: string) => SessionProduct | undefined;
  addSession: (title: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteProduct: (sessionId: string, productId: string) => Promise<void>;
  updateFoundPrice: (sessionId: string, productId: string, foundPrice: number) => Promise<void>;
  addScannedProduct: (sessionId: string, input: ScannedProductInput) => Promise<SessionProduct>;
}

interface SessionProviderProps {
  readonly children: ReactNode;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

const EMPTY_STATE: SessionsState = { sessions: [], productsBySession: {} };

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, setState] = useState<SessionsState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const loadedProductsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const sessions = await fetchSessions();
      setState((prev) => ({ ...prev, sessions }));
    } catch (error) {
      console.warn('[sessions] failed to load sessions', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadSessionProducts = useCallback(async (sessionId: string) => {
    if (loadedProductsRef.current.has(sessionId)) return;
    try {
      const products = await fetchSessionProducts(sessionId);
      loadedProductsRef.current.add(sessionId);
      setState((prev) => ({
        ...prev,
        productsBySession: { ...prev.productsBySession, [sessionId]: products },
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, productCount: products.length } : s,
        ),
      }));
    } catch (error) {
      console.warn('[sessions] failed to load products', error);
    }
  }, []);

  const addSession = useCallback(async (title: string): Promise<Session> => {
    const session = await createSessionApi(title);
    setState((prev) => ({
      ...prev,
      sessions: [session, ...prev.sessions],
      productsBySession: { ...prev.productsBySession, [session.id]: [] },
    }));
    loadedProductsRef.current.add(session.id);
    return session;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    await deleteSessionApi(id);
    loadedProductsRef.current.delete(id);
    setState((prev) => {
      const nextProducts = { ...prev.productsBySession };
      delete nextProducts[id];
      return {
        sessions: prev.sessions.filter((s) => s.id !== id),
        productsBySession: nextProducts,
      };
    });
  }, []);

  const renameSession = useCallback(async (id: string, title: string) => {
    const updated = await renameSessionApi(id, title);
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...updated } : s)),
    }));
  }, []);

  const deleteProduct = useCallback(async (sessionId: string, productId: string) => {
    await deleteSessionProductApi(sessionId, productId);
    setState((prev) => {
      const next = (prev.productsBySession[sessionId] ?? []).filter((p) => p.id !== productId);
      return {
        sessions: prev.sessions.map((s) =>
          s.id === sessionId
            ? { ...s, productCount: next.length, updatedAt: new Date().toISOString() }
            : s,
        ),
        productsBySession: { ...prev.productsBySession, [sessionId]: next },
      };
    });
  }, []);

  const updateFoundPrice = useCallback(
    async (sessionId: string, productId: string, foundPrice: number) => {
      const list = state.productsBySession[sessionId] ?? [];
      const target = list.find((p) => p.id === productId);
      const projectedProfitMargin = target
        ? Math.max(0, target.price - foundPrice - target.amazonFees - target.estimatedShipping)
        : 0;

      const updated = await updateProductFoundPriceApi(
        sessionId,
        productId,
        foundPrice,
        projectedProfitMargin,
      );
      setState((prev) => ({
        ...prev,
        productsBySession: {
          ...prev.productsBySession,
          [sessionId]: (prev.productsBySession[sessionId] ?? []).map((p) =>
            p.id === productId ? updated : p,
          ),
        },
        sessions: prev.sessions.map((s) =>
          s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s,
        ),
      }));
    },
    [state.productsBySession],
  );

  const addScannedProduct = useCallback(
    async (sessionId: string, input: ScannedProductInput): Promise<SessionProduct> => {
      const product = await addSessionProduct(sessionId, input);
      setState((prev) => {
        const next = [product, ...(prev.productsBySession[sessionId] ?? [])];
        return {
          sessions: prev.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, productCount: next.length, updatedAt: new Date().toISOString() }
              : s,
          ),
          productsBySession: { ...prev.productsBySession, [sessionId]: next },
        };
      });
      return product;
    },
    [],
  );

  const getSession = useCallback(
    (id: string) => state.sessions.find((session) => session.id === id),
    [state.sessions],
  );
  const getProducts = useCallback(
    (sessionId: string) => state.productsBySession[sessionId] ?? [],
    [state.productsBySession],
  );
  const getProduct = useCallback(
    (sessionId: string, productId: string) =>
      (state.productsBySession[sessionId] ?? []).find((p) => p.id === productId),
    [state.productsBySession],
  );

  const value = useMemo<SessionsContextValue>(
    () => ({
      sessions: state.sessions,
      isLoading,
      refresh,
      loadSessionProducts,
      getSession,
      getProducts,
      getProduct,
      addSession,
      deleteSession,
      renameSession,
      deleteProduct,
      updateFoundPrice,
      addScannedProduct,
    }),
    [
      state.sessions,
      isLoading,
      refresh,
      loadSessionProducts,
      getSession,
      getProducts,
      getProduct,
      addSession,
      deleteSession,
      renameSession,
      deleteProduct,
      updateFoundPrice,
      addScannedProduct,
    ],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used inside SessionProvider');
  return ctx;
}
