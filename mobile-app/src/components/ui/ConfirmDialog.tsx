/**
 * Confirm Dialog Component
 * Modal dialog for confirmation actions
 */

import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.actions}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="ghost"
              style={styles.button}
            />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              style={styles.button}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: tokens.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  dialog: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...tokens.shadows.lg,
  },
  title: {
    ...tokens.typography.heading2,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  message: {
    ...tokens.typography.body,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
  },
  button: {
    flex: 1,
  },
});
