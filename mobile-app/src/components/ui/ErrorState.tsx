/**
 * Error State Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../constants/tokens';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
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
    color: tokens.colors.danger,
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
