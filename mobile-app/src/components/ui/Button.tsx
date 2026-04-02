/**
 * Button Component
 * Reusable button with variants
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import { tokens } from '../../constants/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : tokens.colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles] as TextStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: tokens.colors.primary,
  },
  secondary: {
    backgroundColor: tokens.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  danger: {
    backgroundColor: tokens.colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  small: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  medium: {
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  large: {
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...tokens.typography.bodyBold,
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: tokens.colors.text,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  ghostText: {
    color: tokens.colors.primary,
  },
});
