/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Theme System
 * Minimalist design with neutral backgrounds and strategic accent colors.
 * Each theme is a complete, cohesive color system.
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

  // Gradients (minimal use)
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

  // Extended surface and accent
  surfaceVariant: string;
  accentAlt: string;

  // Glass overlays
  glass07: string;
  glass15: string;

  // Legacy support colors
  white: string;
  accentTint8: string;
  accentLowTint: string;
}

/**
 * Minimalist theme – Clean, modern, elegant
 * Neutral grays with blue accent for a sophisticated, distraction-free experience
 */
export const darkTheme: ThemeColors = {
  // Primary app colors – clean neutrals
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',

  // Text colors – clear hierarchy
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – slate blue for music
  accent: '#5B7FD4',
  accentFill20: 'rgba(91, 127, 212, 0.20)',
  accentFill35: 'rgba(91, 127, 212, 0.35)',
  accentBorder25: 'rgba(91, 127, 212, 0.25)',
  accentBorder35: 'rgba(91, 127, 212, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal, subtle
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy: '#0F0F0F',
  gradDark: '#0F0F0F',

  // Card gradients – simplified
  cardHealingFrom: '#1F1F1F',
  cardTrendingFrom: '#242424',
  cardTrendingTo: '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo: '#1A1A1A',
  cardLofiFrom: '#161616',
  cardLofiTo: '#1A1A1A',

  // Extended
  surfaceVariant: '#282828',
  accentAlt: '#7B9FE8',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(91, 127, 212, 0.08)',
  accentLowTint: 'rgba(91, 127, 212, 0.12)',
};

/**
 * Classic theme – AMOLED with warm accents
 * Pure blacks with golden highlights for premium, minimal feel
 */
export const classicTheme: ThemeColors = {
  // Primary app colors
  bg: '#000000',
  surface: '#121212',
  surfaceLow: '#0A0A0A',
  surfaceMid: '#1A1A1A',
  surfaceDim: '#262626',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – warm gold
  accent: '#D4A574',
  accentFill20: 'rgba(212, 165, 116, 0.20)',
  accentFill35: 'rgba(212, 165, 116, 0.35)',
  accentBorder25: 'rgba(212, 165, 116, 0.25)',
  accentBorder35: 'rgba(212, 165, 116, 0.35)',

  // Borders and dividers
  border: '#242424',
  divider: '#151515',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal
  gradViolet: '#0A0A0A',
  gradPurple: '#121212',
  gradIndigo: '#0A0A0A',
  gradNavy: '#000000',
  gradDark: '#000000',

  // Card gradients
  cardHealingFrom: '#121212',
  cardTrendingFrom: '#1A1A1A',
  cardTrendingTo: '#1A1A1A',
  cardAcousticFrom: '#0F1F0F',
  cardAcousticTo: '#151515',
  cardLofiFrom: '#0A1A1A',
  cardLofiTo: '#101A1A',

  // Extended
  surfaceVariant: '#202020',
  accentAlt: '#E8C9A0',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(212, 165, 116, 0.08)',
  accentLowTint: 'rgba(212, 165, 116, 0.12)',
};

/**
 * Sunset theme – Warm, minimalist palette with subtle gold accents
 * For users who want warmth with sophisticated simplicity
 */
export const sunsetTheme: ThemeColors = {
  // Primary app colors
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – warm copper
  accent: '#C9915F',
  accentFill20: 'rgba(201, 145, 95, 0.20)',
  accentFill35: 'rgba(201, 145, 95, 0.35)',
  accentBorder25: 'rgba(201, 145, 95, 0.25)',
  accentBorder35: 'rgba(201, 145, 95, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy: '#0F0F0F',
  gradDark: '#0F0F0F',

  // Card gradients
  cardHealingFrom: '#1F1F1F',
  cardTrendingFrom: '#242424',
  cardTrendingTo: '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo: '#1A1A1A',
  cardLofiFrom: '#161616',
  cardLofiTo: '#1A1A1A',

  // Extended
  surfaceVariant: '#282828',
  accentAlt: '#E0A580',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(201, 145, 95, 0.08)',
  accentLowTint: 'rgba(201, 145, 95, 0.12)',
};

/**
 * Ocean theme – Cool, clean palette with subtle blue accents
 * For users who prefer a tech-forward, minimalist aesthetic
 */
export const oceanTheme: ThemeColors = {
  // Primary app colors
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – cool cyan
  accent: '#4FA3D1',
  accentFill20: 'rgba(79, 163, 209, 0.20)',
  accentFill35: 'rgba(79, 163, 209, 0.35)',
  accentBorder25: 'rgba(79, 163, 209, 0.25)',
  accentBorder35: 'rgba(79, 163, 209, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy: '#0F0F0F',
  gradDark: '#0F0F0F',

  // Card gradients
  cardHealingFrom: '#1F1F1F',
  cardTrendingFrom: '#242424',
  cardTrendingTo: '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo: '#1A1A1A',
  cardLofiFrom: '#161616',
  cardLofiTo: '#1A1A1A',

  // Extended
  surfaceVariant: '#282828',
  accentAlt: '#6CB8E0',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(79, 163, 209, 0.08)',
  accentLowTint: 'rgba(79, 163, 209, 0.12)',
};

/**
 * Neon Gen Z theme – Minimalist with vibrant accent
 * For users who want a pop of color with clean design
 */
export const neonGenTheme: ThemeColors = {
  // Primary app colors
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – vibrant magenta
  accent: '#E63A9D',
  accentFill20: 'rgba(230, 58, 157, 0.20)',
  accentFill35: 'rgba(230, 58, 157, 0.35)',
  accentBorder25: 'rgba(230, 58, 157, 0.25)',
  accentBorder35: 'rgba(230, 58, 157, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy: '#0F0F0F',
  gradDark: '#0F0F0F',

  // Card gradients
  cardHealingFrom: '#1F1F1F',
  cardTrendingFrom: '#242424',
  cardTrendingTo: '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo: '#1A1A1A',
  cardLofiFrom: '#161616',
  cardLofiTo: '#1A1A1A',

  // Extended
  surfaceVariant: '#282828',
  accentAlt: '#F058B1',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(230, 58, 157, 0.08)',
  accentLowTint: 'rgba(230, 58, 157, 0.12)',
};

/**
 * Neon Curator theme – Minimalist with purple accent
 * Clean aesthetic with elegant purple highlights for curation focus
 */
export const neonCuratorTheme: ThemeColors = {
  // Primary app colors
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – purple
  accent: '#8B5FBD',
  accentFill20: 'rgba(139, 95, 189, 0.20)',
  accentFill35: 'rgba(139, 95, 189, 0.35)',
  accentBorder25: 'rgba(139, 95, 189, 0.25)',
  accentBorder35: 'rgba(139, 95, 189, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy: '#0F0F0F',
  gradDark: '#0F0F0F',

  // Card gradients
  cardHealingFrom: '#1F1F1F',
  cardTrendingFrom: '#242424',
  cardTrendingTo: '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo: '#1A1A1A',
  cardLofiFrom: '#161616',
  cardLofiTo: '#1A1A1A',

  // Extended
  surfaceVariant: '#282828',
  accentAlt: '#A879D4',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(139, 95, 189, 0.08)',
  accentLowTint: 'rgba(139, 95, 189, 0.12)',
};

/**
 * Neon Pulse theme – Minimal with energetic orange accent
 * Clean design with warm, energetic highlights for dynamic listening
 */
export const neonPulseTheme: ThemeColors = {
  // Primary app colors
  bg: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // Accent/brand colors – warm orange
  accent: '#D97706',
  accentFill20: 'rgba(217, 119, 6, 0.20)',
  accentFill35: 'rgba(217, 119, 6, 0.35)',
  accentBorder25: 'rgba(217, 119, 6, 0.25)',
  accentBorder35: 'rgba(217, 119, 6, 0.35)',

  // Borders and dividers
  border: '#2A2A2A',
  divider: '#1F1F1F',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Gradients – minimal
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy: '#0F0F0F',
  gradDark: '#0F0F0F',

  // Card gradients
  cardHealingFrom: '#1F1F1F',
  cardTrendingFrom: '#242424',
  cardTrendingTo: '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo: '#1A1A1A',
  cardLofiFrom: '#161616',
  cardLofiTo: '#1A1A1A',

  // Extended
  surfaceVariant: '#282828',
  accentAlt: '#F59E0B',
  glass07: 'rgba(255,255,255,0.07)',
  glass15: 'rgba(255,255,255,0.15)',

  // Legacy
  white: '#FFFFFF',
  accentTint8: 'rgba(217, 119, 6, 0.08)',
  accentLowTint: 'rgba(217, 119, 6, 0.12)',
};

/**
 * Theme variants exported for selection
 */
export type ThemeName = 'dark' | 'classic' | 'sunset' | 'ocean' | 'neonGen' | 'neonCurator' | 'neonPulse';

export const THEMES: Record<ThemeName, ThemeColors> = {
  dark: darkTheme,
  classic: classicTheme,
  sunset: sunsetTheme,
  ocean: oceanTheme,
  neonGen: neonGenTheme,
  neonCurator: neonCuratorTheme,
  neonPulse: neonPulseTheme,
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
    neonCurator: 'Neon Curator',
    neonPulse: 'Neon Pulse',
  };
  return names[theme];
};
