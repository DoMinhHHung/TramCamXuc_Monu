import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Design System Color Tokens
 * Single source of truth. Không hardcode màu ở nơi khác.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const COLORS = {

  // ── Backgrounds – Neutral minimalist palette ────────────────────────────────
  bg:         '#0F0F0F',
  surface:    '#1A1A1A',
  surfaceLow: '#161616',
  surfaceMid: '#242424',
  surfaceDim: '#303030',
  surfaceVariant: '#282828',

  // ── Gradient stops – Subtle ────────────────────────────────────────────────
  backgroundStart: '#161616',
  backgroundEnd: '#0F0F0F',
  gradViolet: '#161616',
  gradPurple: '#1A1A1A',
  gradIndigo: '#161616',
  gradNavy:   '#0F0F0F',
  gradSlate:  '#1A1A1A',

  // ── Streak Banner ──────────────────────────────────────────────────────────
  streakFrom: '#1A1A1A',
  streakTo: '#0F0F0F',

  // ── Accent – Slate Blue (primary brand color) ──────────────────────────────
  accent:     '#5B7FD4',
  accentAlt:  '#7B9FE8',
  accentDim:  '#4A6BA8',
  accentDeep: '#3A5B8B',

  // ── Accent transparent layers ──────────────────────────────────────────────
  accentFill20:   'rgba(91,127,212,0.20)',
  accentFill25:   'rgba(91,127,212,0.25)',
  accentFill90:   'rgba(91,127,212,0.90)',
  accentFill95:   'rgba(75,107,168,0.95)',
  accentBorder12: 'rgba(91,127,212,0.12)',
  accentBorder25: 'rgba(91,127,212,0.25)',
  accentBorder30: 'rgba(91,127,212,0.30)',
  accentBorder35: 'rgba(91,127,212,0.35)',
  accentBorder40: 'rgba(91,127,212,0.40)',
  accentBorder50: 'rgba(91,127,212,0.50)',

  // ── White glass layers – Keep for existing components ────────────────────
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

  // ── Borders – Subtle ───────────────────────────────────────────────────────
  border:       '#2A2A2A',
  borderSubtle: 'rgba(255,255,255,0.04)',
  borderLight:  'rgba(255,255,255,0.08)',

  // ── Text ──────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  text:  '#FFFFFF',
  textSecondary: '#999999',
  muted: '#666666',

  // ── Semantic ──────────────────────────────────────────────────────────────
  error:         '#EF4444',
  errorDim:      'rgba(239,68,68,0.15)',
  success:       '#10B981',
  successAlt:    '#059669',
  warningMid:    '#F59E0B',
  warning:       '#F59E0B',
  warningDim:    'rgba(245,158,11,0.15)',
  warningBorder: 'rgba(245,158,11,0.40)',
  info:          '#3B82F6',

  // ── Misc ──────────────────────────────────────────────────────────────────
  scrim: 'rgba(0,0,0,0.70)',

  // ── Card gradients – Minimal, no neon ──────────────────────────────────────
  cardHealingFrom:  '#1F1F1F',
  cardHealingTo:    '#1A1A1A',
  cardTrendingFrom: '#242424',
  cardTrendingTo:   '#242424',
  cardAcousticFrom: '#161616',
  cardAcousticTo:   '#1A1A1A',
  cardLofiFrom:     '#161616',
  cardLofiTo:       '#1A1A1A',

  // ── Category card gradients – Minimal ──────────────────────────────────────
  catPopFrom:     '#1F1F1F',
  catPopTo:       '#1A1A1A',
  catRnbFrom:     '#161616',
  catRnbTo:       '#1A1A1A',
  catHipHopFrom:  '#242424',
  catHipHopTo:    '#242424',
  catEdmFrom:     '#161616',
  catEdmTo:       '#1A1A1A',
  catAcousticFrom: '#1A1A1A',
  catAcousticTo:   '#161616',
  catChillFrom:   '#181818',
  catChillTo:     '#151515',
  catIndieFrom:   '#161616',
  catIndieTo:     '#1A1A1A',
  catClassicFrom: '#1F1F1F',
  catClassicTo:   '#1A1A1A',

  // ── Premium UI ─────────────────────────────────────────────────────────────
  premiumGlow: '#5B7FD4',
  premiumGlowSoft: 'rgba(91,127,212,0.35)',
  premiumCardFrom: '#1A1A1A',
  premiumCardTo: '#161616',
  premiumShine: 'rgba(255,255,255,0.08)',
  premiumBorder: 'rgba(91,127,212,0.35)',

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
