/**
 * Design Tokens
 * Centralized design system values for consistency
 */

export const tokens = {
  colors: {
    // Brand
    primary: '#007AFF',
    primaryDark: '#0051D5',
    primaryLight: '#5AC8FA',
    
    // Semantic
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#5AC8FA',
    
    // Neutral
    background: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    backgroundTertiary: '#E5E5EA',
    border: '#C7C7CC',
    borderLight: '#E5E5EA',
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    white: '#FFFFFF',
    black: '#000000',
    
    // Product scoring
    scoreExcellent: '#34C759',
    scoreGood: '#32D74B',
    scoreFair: '#FF9500',
    scorePoor: '#FF453A',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  typography: {
    heading1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
    },
    heading2: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    heading3: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    captionBold: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};
