/**
 * Empty State Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  title: {
    ...tokens.typography.heading2,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...tokens.typography.body,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.lg,
    textAlign: 'center',
  },
  button: {
    minWidth: 200,
  },
});
