/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Theme System
 * Multiple cohesive themes with intentional color choices reflecting Monu's
 * identity and user preferences. Each theme is a complete color system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Theme color specification with semantic naming
 */
export interface ThemeColors {
  // Primary app colors
  bg: string;
  surface: string;
  surfaceLow: string;
  surfaceMid: string;
  surfaceDim: string;

  // Text colors
  text: string;
  textSecondary: string;
  muted: string;

  // Accent/brand colors
  accent: string;
  accentFill20: string;
  accentFill35: string;
  accentBorder25: string;
  accentBorder35: string;

  // Borders and dividers
  border: string;
  divider: string;

  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;

  // Gradients (for hero sections and cards)
  gradViolet: string;
  gradPurple: string;
  gradIndigo: string;
  gradNavy: string;
  gradDark: string;

  // Card gradients
  cardHealingFrom: string;
  cardTrendingFrom: string;
  cardTrendingTo: string;
  cardAcousticFrom: string;
  cardAcousticTo: string;
  cardLofiFrom: string;
  cardLofiTo: string;

  // Legacy support colors
  white: string;
  accentTint8: string;
  accentLowTint: string;
}

/**
 * Dark theme – Monu's signature identity
 * Purple/lavender palette with sophisticated depth
 */
export const darkTheme: ThemeColors = {
  // Primary app colors
  bg: '#090909',
  surface: '#151515',
  surfaceLow: '#101010',
  surfaceMid: '#1D1D1D',
  surfaceDim: '#252525',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B5B5B5',
  muted: '#7F7F7F',

  // Accent/brand colors – purple as primary identity
  accent: '#1ED760',
  accentFill20: 'rgba(30, 215, 96, 0.20)',
  accentFill35: 'rgba(30, 215, 96, 0.35)',
  accentBorder25: 'rgba(30, 215, 96, 0.25)',
  accentBorder35: 'rgba(30, 215, 96, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1B1B1B',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients
  gradViolet: '#1A0B04',
  gradPurple: '#1D1D1D',
  gradIndigo: '#121212',
  gradNavy: '#0B0B0B',
  gradDark: '#090909',

  // Card gradients
  cardHealingFrom: '#1A1A1A',
  cardTrendingFrom: '#1F0A00',
  cardTrendingTo: '#FF6B1A',
  cardAcousticFrom: '#0B1A12',
  cardAcousticTo: '#17623A',
  cardLofiFrom: '#111111',
  cardLofiTo: '#28323C',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(30, 215, 96, 0.08)',
  accentLowTint: 'rgba(30, 215, 96, 0.12)',
};

/**
 * Classic theme – AMOLED with warm accents
 * Deep blacks with golden/orange highlights for premium feel
 */
export const classicTheme: ThemeColors = {
  // Primary app colors
  bg: '#000000',
  surface: '#1A1A1A',
  surfaceLow: '#121212',
  surfaceMid: '#242424',
  surfaceDim: '#2D2D2D',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#757575',

  // Accent/brand colors – golden/orange for classic feel
  accent: '#FF6B1A',
  accentFill20: 'rgba(255, 107, 26, 0.20)',
  accentFill35: 'rgba(255, 107, 26, 0.35)',
  accentBorder25: 'rgba(255, 107, 26, 0.25)',
  accentBorder35: 'rgba(255, 107, 26, 0.35)',

  // Borders and dividers
  border: '#303030',
  divider: '#212121',

  // Status colors
  success: '#4ADE80',
  error: '#FF5555',
  warning: '#FFB84D',
  info: '#60A5FA',

  // Gradients
  gradViolet: '#1A0F2E',
  gradPurple: '#2D1B4A',
  gradIndigo: '#1A0F3D',
  gradNavy: '#0F1A3D',
  gradDark: '#000000',

  // Card gradients
  cardHealingFrom: '#1F0F3A',
  cardTrendingFrom: '#3D1F0F',
  cardTrendingTo: '#5C2C0C',
  cardAcousticFrom: '#0F3A1F',
  cardAcousticTo: '#1F4A2F',
  cardLofiFrom: '#0F1F3D',
  cardLofiTo: '#0F3A5C',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(255, 107, 26, 0.08)',
  accentLowTint: 'rgba(255, 107, 26, 0.12)',
};

/**
 * Sunset theme – Warm, luxurious palette with deep oranges and golds
 * Perfect for users who want a warm, sophisticated aesthetic
 */
export const sunsetTheme: ThemeColors = {
  // Primary app colors
  bg: '#0F0805',
  surface: '#2B1F15',
  surfaceLow: '#1E1410',
  surfaceMid: '#3A2B1F',
  surfaceDim: '#4A3A2A',

  // Text colors
  text: '#FFF8F0',
  textSecondary: '#D4A574',
  muted: '#996633',

  // Accent/brand colors – deep orange/gold for luxury
  accent: '#FF8C42',
  accentFill20: 'rgba(255, 140, 66, 0.20)',
  accentFill35: 'rgba(255, 140, 66, 0.35)',
  accentBorder25: 'rgba(255, 140, 66, 0.25)',
  accentBorder35: 'rgba(255, 140, 66, 0.35)',

  // Borders and dividers
  border: '#4A3A2A',
  divider: '#2B1F15',

  // Status colors
  success: '#4ADE80',
  error: '#FF6B6B',
  warning: '#FFB84D',
  info: '#60A5FA',

  // Gradients
  gradViolet: '#3D1F0F',
  gradPurple: '#5C2C0C',
  gradIndigo: '#4A2D15',
  gradNavy: '#2D1F0F',
  gradDark: '#0F0805',

  // Card gradients
  cardHealingFrom: '#4A2D15',
  cardTrendingFrom: '#6B3A1F',
  cardTrendingTo: '#8B5C3A',
  cardAcousticFrom: '#2D4A1F',
  cardAcousticTo: '#3A6B2D',
  cardLofiFrom: '#1F3A5C',
  cardLofiTo: '#2D5C8B',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(255, 140, 66, 0.08)',
  accentLowTint: 'rgba(255, 140, 66, 0.12)',
};

/**
 * Ocean theme – Cool, modern palette with deep blues and teals
 * Perfect for users who prefer a tech-forward, sleek aesthetic
 */
export const oceanTheme: ThemeColors = {
  // Primary app colors
  bg: '#050F1F',
  surface: '#0F2340',
  surfaceLow: '#081833',
  surfaceMid: '#1A3A5C',
  surfaceDim: '#2A4A7A',

  // Text colors
  text: '#E8F4FF',
  textSecondary: '#7AAFFF',
  muted: '#4A7099',

  // Accent/brand colors – bright cyan for modern tech feel
  accent: '#00D9FF',
  accentFill20: 'rgba(0, 217, 255, 0.20)',
  accentFill35: 'rgba(0, 217, 255, 0.35)',
  accentBorder25: 'rgba(0, 217, 255, 0.25)',
  accentBorder35: 'rgba(0, 217, 255, 0.35)',

  // Borders and dividers
  border: '#1A3A5C',
  divider: '#0F2340',

  // Status colors
  success: '#4ADE80',
  error: '#FF6B6B',
  warning: '#FFB84D',
  info: '#60A5FA',

  // Gradients
  gradViolet: '#0F2B5C',
  gradPurple: '#1A3A7A',
  gradIndigo: '#081833',
  gradNavy: '#050F1F',
  gradDark: '#000814',

  // Card gradients
  cardHealingFrom: '#0F2B5C',
  cardTrendingFrom: '#1A3A5C',
  cardTrendingTo: '#2D5C8B',
  cardAcousticFrom: '#0F4A2A',
  cardAcousticTo: '#1A6B4A',
  cardLofiFrom: '#0F2B5C',
  cardLofiTo: '#0F4A8B',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(0, 217, 255, 0.08)',
  accentLowTint: 'rgba(0, 217, 255, 0.12)',
};

/**
 * Neon Gen Z theme – High contrast, vibrant palette
 * Perfect for users who want bold, eye-catching aesthetics with luxury touches
 */
export const neonGenTheme: ThemeColors = {
  // Primary app colors
  bg: '#0A0014',
  surface: '#1A0F33',
  surfaceLow: '#140828',
  surfaceMid: '#2A1F47',
  surfaceDim: '#3A2F57',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#DA70FF',
  muted: '#8B5FA8',

  // Accent/brand colors – vibrant magenta for Gen Z vibe
  accent: '#FF006E',
  accentFill20: 'rgba(255, 0, 110, 0.20)',
  accentFill35: 'rgba(255, 0, 110, 0.35)',
  accentBorder25: 'rgba(255, 0, 110, 0.25)',
  accentBorder35: 'rgba(255, 0, 110, 0.35)',

  // Borders and dividers
  border: '#3A2F57',
  divider: '#1A0F33',

  // Status colors
  success: '#00FF88',
  error: '#FF0050',
  warning: '#FFD600',
  info: '#00FFFF',

  // Gradients
  gradViolet: '#2A0F4A',
  gradPurple: '#4A1F7A',
  gradIndigo: '#1A0F4A',
  gradNavy: '#0A0F3A',
  gradDark: '#0A0014',

  // Card gradients
  cardHealingFrom: '#4A1F7A',
  cardTrendingFrom: '#6B0F3A',
  cardTrendingTo: '#8B2F5A',
  cardAcousticFrom: '#0F4A2A',
  cardAcousticTo: '#1A7B4A',
  cardLofiFrom: '#0F2F7A',
  cardLofiTo: '#1F5FAB',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(255, 0, 110, 0.08)',
  accentLowTint: 'rgba(255, 0, 110, 0.12)',
};

/**
 * Theme variants exported for selection
 */
export type ThemeName = 'dark' | 'classic' | 'sunset' | 'ocean' | 'neonGen';

export const THEMES: Record<ThemeName, ThemeColors> = {
  dark: darkTheme,
  classic: classicTheme,
  sunset: sunsetTheme,
  ocean: oceanTheme,
  neonGen: neonGenTheme,
};

/**
 * Get theme display name for UI
 */
export const getThemeName = (theme: ThemeName): string => {
  const names: Record<ThemeName, string> = {
    dark: 'Dark Mode',
    classic: 'Classic',
    sunset: 'Sunset',
    ocean: 'Ocean',
    neonGen: 'Neon Gen Z',
  };
  return names[theme];
};
