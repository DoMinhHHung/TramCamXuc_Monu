/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Theme Utilities
 * Helper functions for theme-aware styling with modern visual effects
 * Glassmorphism, depth layers, shadows, and gradients
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ThemeColors } from './themes';

/**
 * Shadow depths for visual hierarchy
 */
export const shadowPresets = {
  /** Subtle shadow for slight elevation */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  /** Medium shadow for moderate elevation */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Large shadow for significant elevation */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  /** Extra large shadow for prominent elements */
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Glassmorphism effect preset
 * Creates a frosted glass appearance with backdrop blur
 */
export const glassPreset = (opacity: number = 0.1) => ({
  backgroundColor: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: 'blur(10px)',
});

/**
 * Generate theme-specific glow effect for accent colors
 */
export const createGlow = (accentColor: string, opacity: number = 0.5) => ({
  shadowColor: accentColor,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: opacity,
  shadowRadius: 12,
  elevation: 8,
});

/**
 * Create a gradient background with theme colors
 */
export const createGradient = (colors: ThemeColors) => ({
  gradientStart: colors.gradPurple,
  gradientEnd: colors.gradDark,
  gradientMid: colors.surface,
});

/**
 * Create card gradient presets for different content types
 */
export const cardGradients = (colors: ThemeColors) => ({
  healing: {
    from: colors.cardHealingFrom,
    to: colors.surface,
  },
  trending: {
    from: colors.cardTrendingFrom,
    to: colors.cardTrendingTo,
  },
  acoustic: {
    from: colors.cardAcousticFrom,
    to: colors.cardAcousticTo,
  },
  lofi: {
    from: colors.cardLofiFrom,
    to: colors.cardLofiTo,
  },
});

/**
 * Border styles with theme colors
 */
export const borderPresets = (colors: ThemeColors) => ({
  subtle: {
    borderColor: colors.border,
    borderWidth: 0.5,
  },
  standard: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  accent: {
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  accentLight: {
    borderColor: colors.accentBorder25,
    borderWidth: 1,
  },
});

/**
 * Opacity values for glass layers
 */
export const glassLayers = {
  veryLight: 0.05,
  light: 0.1,
  medium: 0.2,
  strong: 0.3,
  veryStrong: 0.4,
};

/**
 * Spacing tokens for consistent layout
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

/**
 * Border radius tokens
 */
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

/**
 * Font size tokens for typography hierarchy
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

/**
 * Font weight tokens
 */
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

/**
 * Animation duration presets (in milliseconds)
 */
export const animationDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

/**
 * Create a luxury card style with depth and glass effect
 */
export const createLuxuryCard = (colors: ThemeColors) => ({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.accentBorder25,
    borderWidth: 0.5,
    ...shadowPresets.md,
  },
  glassOverlay: {
    backgroundColor: `rgba(255, 255, 255, 0.05)`,
  },
  gradient: {
    start: colors.gradPurple,
    end: colors.surface,
  },
});

/**
 * Create theme-aware text hierarchy
 */
export const textHierarchy = {
  headline: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: 32,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: 24,
  },
  body: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.normal,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: 18,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: 16,
  },
};

/**
 * Utility to create accessible overlay
 */
export const createAccessibleOverlay = (baseColor: string, opacity: number) => `rgba(${baseColor}, ${opacity})`;

/**
 * Create theme-specific press feedback
 */
export const pressedStateStyle = (colors: ThemeColors) => ({
  opacity: 0.7,
  backgroundColor: colors.surfaceMid,
});

/**
 * Create theme-specific disabled state
 */
export const disabledStateStyle = (colors: ThemeColors) => ({
  opacity: 0.5,
  backgroundColor: colors.surfaceDim,
});

export default {
  shadowPresets,
  glassPreset,
  createGlow,
  createGradient,
  cardGradients,
  borderPresets,
  glassLayers,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  animationDuration,
  createLuxuryCard,
  textHierarchy,
  createAccessibleOverlay,
  pressedStateStyle,
  disabledStateStyle,
};
