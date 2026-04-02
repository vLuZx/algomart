/**
 * Confirm Dialog Hook
 * Manages confirmation dialogs for destructive actions
 */

import { useState, useCallback } from 'react';
import type { ConfirmDialogConfig } from '../types/common.types';

export function useConfirmDialog() {
  const [config, setConfig] = useState<ConfirmDialogConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showConfirm = useCallback((dialogConfig: ConfirmDialogConfig) => {
    setConfig(dialogConfig);
    setIsOpen(true);
  }, []);

  const hideConfirm = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setConfig(null), 300); // Delay to allow animation
  }, []);

  const handleConfirm = useCallback(() => {
    if (config?.onConfirm) {
      config.onConfirm();
    }
    hideConfirm();
  }, [config, hideConfirm]);

  const handleCancel = useCallback(() => {
    if (config?.onCancel) {
      config.onCancel();
    }
    hideConfirm();
  }, [config, hideConfirm]);

  return {
    isOpen,
    config,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel,
  };
}
