export const colors = {
  bg: '#18181b',
  bgStrong: '#09090b',
  bgCard: '#27272a',
  bgCardMuted: 'rgba(39, 39, 42, 0.82)',
  bgPanel: 'rgba(39, 39, 42, 0.56)',
  bgInput: '#27272a',
  bgOverlay: 'rgba(0, 0, 0, 0.72)',
  bgOverlaySoft: 'rgba(0, 0, 0, 0.42)',
  text: '#ffffff',
  textMuted: '#a1a1aa',
  textSubtle: '#71717a',
  textFaint: '#52525b',
  accent: '#f59e0b',
  accentLight: '#fbbf24',
  accentDark: '#d97706',
  accentText: '#18181b',
  accentSoft: 'rgba(245, 158, 11, 0.14)',
  accentBorder: 'rgba(245, 158, 11, 0.28)',
  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  info: '#60a5fa',
  infoSoft: 'rgba(96, 165, 250, 0.12)',
  warning: '#fb923c',
  danger: '#f87171',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  border: 'rgba(63, 63, 70, 0.52)',
  borderStrong: 'rgba(113, 113, 122, 0.32)',
  shadow: '#000000',
};

export const gradients = {
  amber: ['#f59e0b', '#d97706'] as const,
  amberActive: ['#fbbf24', '#f59e0b'] as const,
  danger: ['#dc2626', '#f87171'] as const,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const font = {
  sizeXs: 12,
  sizeSm: 14,
  sizeMd: 16,
  sizeLg: 18,
  sizeXl: 20,
  size2xl: 24,
  weightNormal: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
  weightBold: '700' as const,
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  amber: {
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
};
