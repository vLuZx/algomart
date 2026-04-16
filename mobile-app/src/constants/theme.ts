// Design tokens matching figma — zinc/amber dark palette
export const colors = {
  // Backgrounds
  bg: '#18181b',        // zinc-900
  bgCard: '#27272a',    // zinc-800

  // Text
  text: '#ffffff',
  textMuted: '#a1a1aa', // zinc-400
  textSubtle: '#71717a', // zinc-500
  textFaint: '#52525b', // zinc-600

  // Accent (amber)
  accent: '#f59e0b',    // amber-500
  accentDark: '#d97706', // amber-600
  accentText: '#1c1917', // zinc-900 (text on amber buttons)

  // Destructive (red)
  destructiveBg: 'rgba(239, 68, 68, 0.1)', // red-500/10
  destructiveIcon: '#f87171',               // red-400

  // Border / separator
  border: 'rgba(255, 255, 255, 0.06)',      // zinc-800/50 equivalent
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const font = {
  sizeXs: 12,
  sizeSm: 14,
  sizeMd: 16,
  sizeLg: 20,
  sizeXl: 24,
  weightNormal: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
};
