/**
 * Card Component
 * Container with shadow and border radius
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { tokens } from '../../constants/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof tokens.spacing;
}

export function Card({ children, style, padding = 'md' }: CardProps) {
  return (
    <View style={[styles.card, { padding: tokens.spacing[padding] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    ...tokens.shadows.md,
  },
});
