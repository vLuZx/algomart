/**
 * App-wide design tokens and reusable style helpers.
 */

import { StyleSheet } from 'react-native';

// Color palette

export const colors = {
  bg: '#0D0D0F',
  bgCard: '#1A1A1E',
  bgCardPressed: '#222226',
  bgInput: '#151517',

  accent: '#F5A623',
  accentDark: '#C4841A',
  accentMuted: 'rgba(245, 166, 35, 0.12)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A8',
  textMuted: '#666670',

  danger: '#E54D4D',
  dangerMuted: 'rgba(229, 77, 77, 0.12)',
  success: '#4CAF50',

  border: '#2A2A2E',
  borderLight: '#333338',
} as const;

// Typography

export const font = {
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
} as const;

// Spacing / Radius

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// Shared styles

export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
