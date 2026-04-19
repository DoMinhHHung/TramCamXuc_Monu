import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Design System Color Tokens
 * Single source of truth. Không hardcode màu ở nơi khác.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const COLORS = {

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:         '#0A0A0C',
  surface:    '#121216',
  surfaceLow: '#0D0D10',
  surfaceMid: '#18181D',
  surfaceDim: '#202026',
  surfaceVariant: '#2A2A35',

  // ── Gradient stops ─────────────────────────────────────────────────────────
  backgroundStart: '#110502',
  backgroundEnd: '#0A0A0C',
  gradViolet: '#110502',
  gradPurple: '#220803',
  gradIndigo: '#1A0E0B',
  gradNavy:   '#0F121C',
  gradSlate:  '#15151A',

  // ── Streak Banner ──────────────────────────────────────────────────────────
  streakFrom: '#1A0E0B',
  streakTo: '#0A0A0C',

  // ── Accent ─────────────────────────────────────────────────────────────────
  accent:     '#FF5500',
  accentAlt:  '#FF7733',
  accentDim:  '#CC4400',
  accentDeep: '#993300',

  // ── Accent transparent layers ──────────────────────────────────────────────
  accentFill20:   'rgba(255,85,0,0.20)',
  accentFill25:   'rgba(255,85,0,0.25)',
  accentFill90:   'rgba(255,85,0,0.90)',
  accentFill95:   'rgba(204,68,0,0.95)',
  accentBorder12: 'rgba(255,85,0,0.12)',
  accentBorder25: 'rgba(255,85,0,0.25)',
  accentBorder30: 'rgba(255,85,0,0.30)',
  accentBorder35: 'rgba(255,85,0,0.35)',
  accentBorder40: 'rgba(255,85,0,0.40)',
  accentBorder50: 'rgba(255,85,0,0.50)',

  // ── White glass layers ─────────────────────────────────────────────────────
  glass03: 'rgba(255,255,255,0.03)',
  glass04: 'rgba(255,255,255,0.04)',
  glass05: 'rgba(255,255,255,0.05)',
  glass06: 'rgba(255,255,255,0.06)',
  glass07: 'rgba(255,255,255,0.07)',
  glass08: 'rgba(255,255,255,0.08)',
  glass10: 'rgba(255,255,255,0.10)',
  glass12: 'rgba(255,255,255,0.12)',
  glass15: 'rgba(255,255,255,0.15)',
  glass20: 'rgba(255,255,255,0.20)',
  glass25: 'rgba(255,255,255,0.25)',
  glass30: 'rgba(255,255,255,0.30)',
  glass35: 'rgba(255,255,255,0.35)',
  glass40: 'rgba(255,255,255,0.40)',
  glass45: 'rgba(255,255,255,0.45)',
  glass50: 'rgba(255,255,255,0.50)',
  glass60: 'rgba(255,255,255,0.60)',
  glass65: 'rgba(255,255,255,0.65)',
  glass70: 'rgba(255,255,255,0.70)',
  glass80: 'rgba(255,255,255,0.80)',
  glass85: 'rgba(255,255,255,0.85)',
  glass90: 'rgba(255,255,255,0.90)',

  // ── Borders ────────────────────────────────────────────────────────────────
  border:       '#1E1E24',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderLight:  'rgba(255,255,255,0.10)',

  // ── Text ──────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  text:  '#F5F5F5',
  textSecondary: '#A0A0A0',
  muted: '#6B6B6B',

  // ── Semantic ──────────────────────────────────────────────────────────────
  error:         '#FF0033',
  errorDim:      'rgba(255,0,51,0.15)',
  success:       '#1DB954',
  successAlt:    '#1AA34A',
  warningMid:    '#FFB800',
  warning:       '#E6A600',
  warningDim:    'rgba(230,166,0,0.15)',
  warningBorder: 'rgba(230,166,0,0.40)',
  info:          '#00E5FF',

  // ── Misc ──────────────────────────────────────────────────────────────────
  scrim: 'rgba(0,0,0,0.70)',

  // ── HomeScreen quick-action card gradients ────────────────────────────────
  cardHealingFrom:  '#4A1208',
  cardHealingTo:    '#2A0A05',
  cardTrendingFrom: '#FF5500',
  cardTrendingTo:   '#B33B00',
  cardAcousticFrom: '#0A2616',
  cardAcousticTo:   '#103F25',
  cardLofiFrom:     '#061D2B',
  cardLofiTo:       '#0B344D',

  // ── SearchScreen category card gradients ─────────────────────────────────
  catPopFrom:     '#4A1208',
  catPopTo:       '#2A0A05',
  catRnbFrom:     '#0A2616',
  catRnbTo:       '#103F25',
  catHipHopFrom:  '#FF5500',
  catHipHopTo:    '#B33B00',
  catEdmFrom:     '#061D2B',
  catEdmTo:       '#0B344D',
  catAcousticFrom: '#2B2B06',
  catAcousticTo:   '#4D4D0B',
  catChillFrom:   '#1B062B',
  catChillTo:     '#2D0B4D',
  catIndieFrom:   '#062B1B',
  catIndieTo:     '#0B4D2D',
  catClassicFrom: '#2B1206',
  catClassicTo:   '#4D210B',

  // ── Premium UI ──────────────────────────────────────────────────────────────
  premiumGlow: '#FF5500',
  premiumGlowSoft: 'rgba(255,85,0,0.35)',
  premiumCardFrom: '#2A0A05',
  premiumCardTo: '#1A0E0B',
  premiumShine: 'rgba(255,255,255,0.15)',
  premiumBorder: 'rgba(255,85,0,0.35)',

} as const;

export type ColorScheme = typeof COLORS & {
  textSecondary: string;
  divider: string;
  [key: string]: string;
};

// Hook: merge current theme palette with base tokens so legacy styles respond to theme switch.
export const useThemeColors = (): ColorScheme => {
  const { colors } = useTheme();

  return useMemo(
    () => ({
      ...COLORS,
      ...colors,
      text: colors.text ?? COLORS.text,
      textSecondary: (colors as any).textSecondary ?? (COLORS as any).textSecondary ?? COLORS.text,
      muted: colors.muted ?? COLORS.muted,
      accent: colors.accent ?? COLORS.accent,
      accentFill20: (colors as any).accentFill20 ?? COLORS.accentFill20,
      accentFill25: (colors as any).accentFill25 ?? (COLORS as any).accentFill25 ?? COLORS.accentFill25,
      accentBorder25: (colors as any).accentBorder25 ?? COLORS.accentBorder25,
      accentBorder35: (colors as any).accentBorder35 ?? (COLORS as any).accentBorder35 ?? COLORS.accentBorder35,
      border: colors.border ?? COLORS.border,
      divider: (colors as any).divider ?? (COLORS as any).divider ?? COLORS.border,
      success: colors.success ?? COLORS.success,
      error: colors.error ?? COLORS.error,
      warning: colors.warning ?? COLORS.warning,
      info: colors.info ?? COLORS.info,
      white: (colors as any).white ?? COLORS.white,
    } as ColorScheme),
    [colors],
  );
};
