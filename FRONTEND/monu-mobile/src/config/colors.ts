/**
 * Color palette for the Monu mobile app
 * Dark theme colors
 */
export const COLORS = {
  // Background colors
  bg: '#0A090E',
  surface: '#13111A',

  // Border and divider
  border: '#2A2640',

  // Primary accent colors
  accent: '#C084FC',
  accentDim: '#7C3AED',

  // Text colors
  text: '#F3F0FF',
  muted: '#7B7591',

  // Semantic colors
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export type ColorScheme = typeof COLORS;