/**
 * Toast Hook
 * Simple toast notification management
 */

import { useState, useCallback } from 'react';
import type { ToastMessage } from '../types/common.types';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    toast: Omit<ToastMessage, 'id'>
  ) => {
    const id = `toast_${Date.now()}`;
    const newToast: ToastMessage = {
      id,
      duration: 3000,
      ...toast,
    };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-dismiss
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
    
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    return showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    return showToast({ type: 'error', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    return showToast({ type: 'info', title, message });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    return showToast({ type: 'warning', title, message });
  }, [showToast]);

  return {
    toasts,
    showToast,
    dismissToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
}
