/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Typography System
 * Defines consistent text styles for titles, body, labels, and hints.
 * Reduces visual noise by establishing clear hierarchy and readability.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TextStyle } from 'react-native';
import { COLORS } from './colors';
import { SPACING } from './spacing';

/**
 * Text sizes - Base sizes for consistent hierarchy
 */
export const TEXT_SIZES = {
  xs: 12,    // Helper text, badges, small labels
  sm: 13,    // Descriptions, secondary text
  md: 14,    // Standard body text
  lg: 15,    // Primary text, button labels
  xl: 16,    // Larger body text, input text
  h6: 18,    // Small headings, card titles
  h5: 20,    // Section headings
  h4: 22,    // Larger section headings
  h3: 26,    // Page section titles
  h2: 32,    // Page titles
  h1: 34,    // Hero titles
} as const;

/**
 * Font weights - Consistent weight usage
 */
export const FONT_WEIGHTS = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

/**
 * Line heights - Ensures natural, readable spacing
 */
export const LINE_HEIGHTS = {
  tight: 1.3,    // Headings - more compact
  normal: 1.5,   // Body text - standard
  relaxed: 1.7,  // Long-form content - more breathing room
  loose: 1.9,    // Maximum spacing for accessibility
} as const;

/**
 * Typography presets - Ready-to-use text styles
 * Use these instead of creating inline styles throughout the app
 */
export const TEXT_STYLES: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontSize: TEXT_SIZES.h1,
    fontWeight: FONT_WEIGHTS.extrabold,
    lineHeight: TEXT_SIZES.h1 * LINE_HEIGHTS.tight,
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: TEXT_SIZES.h2,
    fontWeight: FONT_WEIGHTS.extrabold,
    lineHeight: TEXT_SIZES.h2 * LINE_HEIGHTS.tight,
    color: COLORS.white,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: TEXT_SIZES.h3,
    fontWeight: FONT_WEIGHTS.extrabold,
    lineHeight: TEXT_SIZES.h3 * LINE_HEIGHTS.tight,
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  h4: {
    fontSize: TEXT_SIZES.h4,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: TEXT_SIZES.h4 * LINE_HEIGHTS.tight,
    color: COLORS.white,
    letterSpacing: -0.2,
  },
  h5: {
    fontSize: TEXT_SIZES.h5,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: TEXT_SIZES.h5 * LINE_HEIGHTS.normal,
    color: COLORS.white,
  },
  h6: {
    fontSize: TEXT_SIZES.h6,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: TEXT_SIZES.h6 * LINE_HEIGHTS.normal,
    color: COLORS.white,
  },

  // Body text
  body: {
    fontSize: TEXT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: TEXT_SIZES.md * LINE_HEIGHTS.relaxed,
    color: COLORS.glass80,
  },
  bodyLg: {
    fontSize: TEXT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: TEXT_SIZES.lg * LINE_HEIGHTS.relaxed,
    color: COLORS.glass85,
  },
  bodySm: {
    fontSize: TEXT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: TEXT_SIZES.sm * LINE_HEIGHTS.relaxed,
    color: COLORS.glass70,
  },

  // Button text
  button: {
    fontSize: TEXT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: TEXT_SIZES.lg * LINE_HEIGHTS.tight,
    color: COLORS.white,
  },
  buttonSm: {
    fontSize: TEXT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: TEXT_SIZES.md * LINE_HEIGHTS.tight,
    color: COLORS.white,
  },

  // Labels and captions
  label: {
    fontSize: TEXT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: TEXT_SIZES.xs * LINE_HEIGHTS.tight,
    color: COLORS.glass50,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: TEXT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: TEXT_SIZES.xs * LINE_HEIGHTS.tight,
    color: COLORS.glass40,
  },

  // Secondary/muted text
  hint: {
    fontSize: TEXT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: TEXT_SIZES.sm * LINE_HEIGHTS.normal,
    color: COLORS.glass45,
  },
  muted: {
    fontSize: TEXT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: TEXT_SIZES.sm * LINE_HEIGHTS.normal,
    color: COLORS.glass35,
  },

  // Accent text
  accent: {
    color: COLORS.accent,
  },
  accentBold: {
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.accent,
  },

  // Error/warning text
  error: {
    color: COLORS.error,
  },
  success: {
    color: COLORS.success,
  },
  warning: {
    color: COLORS.warningMid,
  },
} as const;

/**
 * Quick helpers for common text variations
 */
export const textHelper = {
  title: (size: 'lg' | 'md' | 'sm' = 'md') => {
    switch (size) {
      case 'lg':
        return TEXT_STYLES.h3;
      case 'sm':
        return TEXT_STYLES.h5;
      default:
        return TEXT_STYLES.h4;
    }
  },
  
  subtitle: (color = COLORS.glass50) => ({
    ...TEXT_STYLES.bodySm,
    color,
  }),
  
  meta: (color = COLORS.glass40) => ({
    ...TEXT_STYLES.caption,
    color,
  }),
};

export type TextStyle = typeof TEXT_STYLES[keyof typeof TEXT_STYLES];
