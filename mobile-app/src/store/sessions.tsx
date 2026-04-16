import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buildInitialSessionState, createScannedProduct, updateProductFoundPrice } from '../data/mockData';
import { Session } from '../types/session';
import type { ScannedProductInput, SessionProduct } from '../types/product';

interface SessionsContextValue {
  sessions: Session[];
  getSession: (id: string) => Session | undefined;
  getProducts: (sessionId: string) => SessionProduct[];
  getProduct: (sessionId: string, productId: string) => SessionProduct | undefined;
  addSession: (title: string) => Session;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteProduct: (sessionId: string, productId: string) => void;
  updateFoundPrice: (sessionId: string, productId: string, foundPrice: number) => void;
  addScannedProduct: (sessionId: string, input: ScannedProductInput) => SessionProduct;
}

interface SessionProviderProps {
  readonly children: ReactNode;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

const initialState = buildInitialSessionState();

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, setState] = useState(initialState);

  const addSession = useCallback((title: string): Session => {
    const now = new Date().toISOString();
    const session: Session = {
      id: `session-${Date.now()}`,
      title,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setState((prev) => ({
      sessions: [session, ...prev.sessions],
      productsBySession: {
        ...prev.productsBySession,
        [session.id]: [],
      },
    }));

    return session;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setState((prev) => {
      const nextProducts = { ...prev.productsBySession };
      delete nextProducts[id];

      return {
        sessions: prev.sessions.filter((session) => session.id !== id),
        productsBySession: nextProducts,
      };
    });
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) =>
        session.id === id
          ? { ...session, title, updatedAt: new Date().toISOString() }
          : session,
      ),
    }));
  }, []);

  const deleteProduct = useCallback((sessionId: string, productId: string) => {
    setState((prev) => {
      const currentProducts = prev.productsBySession[sessionId] ?? [];
      const nextProducts = currentProducts.filter((product) => product.id !== productId);

      if (nextProducts.length === currentProducts.length) {
        return prev;
      }

      return {
        sessions: prev.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                productCount: nextProducts.length,
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
        productsBySession: {
          ...prev.productsBySession,
          [sessionId]: nextProducts,
        },
      };
    });
  }, []);

  const updateFoundPrice = useCallback((sessionId: string, productId: string, foundPrice: number) => {
    setState((prev) => {
      const currentProducts = prev.productsBySession[sessionId] ?? [];
      const nextProducts = currentProducts.map((product) =>
        product.id === productId ? updateProductFoundPrice(product, foundPrice) : product,
      );

      return {
        sessions: prev.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, updatedAt: new Date().toISOString() }
            : session,
        ),
        productsBySession: {
          ...prev.productsBySession,
          [sessionId]: nextProducts,
        },
      };
    });
  }, []);

  const addScannedProduct = useCallback((sessionId: string, input: ScannedProductInput) => {
    const createdProduct = createScannedProduct(sessionId, input, Date.now());

    setState((prev) => {
      const nextProducts = [createdProduct, ...(prev.productsBySession[sessionId] ?? [])];

      return {
        sessions: prev.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                productCount: nextProducts.length,
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
        productsBySession: {
          ...prev.productsBySession,
          [sessionId]: nextProducts,
        },
      };
    });

    return createdProduct;
  }, []);

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
      (state.productsBySession[sessionId] ?? []).find((product) => product.id === productId),
    [state.productsBySession],
  );

  const value = useMemo(
    () => ({
      sessions: state.sessions,
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

  return (
    <SessionsContext.Provider value={value}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used inside SessionProvider');
  return ctx;
}
