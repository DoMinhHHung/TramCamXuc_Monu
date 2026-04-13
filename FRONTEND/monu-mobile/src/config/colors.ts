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
  /** Nền chính của app */
  bg:         '#090909',
  /** Surface card nổi (modal, list card) */
  surface:    '#151515',
  /** Surface thấp hơn (gradient end của card) */
  surfaceLow: '#101010',
  /** Surface disabled / flat */
  surfaceMid: '#1D1D1D',
  /** Surface tối nhất (inactive) */
  surfaceDim: '#333333',

  // ── Gradient stops ─────────────────────────────────────────────────────────
  /** WelcomeScreen hero top */
  gradViolet: '#1A0B04',
  /** HomeScreen / ProfileScreen hero */
  gradPurple: '#1D1D1D',
  /** Auth screens (Login, ForgotPassword, VerifyOtp, ResetPassword) */
  gradIndigo: '#121212',
  /** Register, SelectGenres, CreateScreen */
  gradNavy:   '#0B0B0B',
  /** Library, Search, EditFavorites header */
  gradSlate:  '#111111',

  // ── Accent ─────────────────────────────────────────────────────────────────
  /** Primary accent – lavender (buttons, links, active state) */
  accent:     '#1ED760',
  /** Gradient end cho accent button */
  accentAlt:  '#22E065',
  /** Button fill sâu hơn */
  accentDim:  '#0FA44A',
  /** Sâu nhất – shadow / glow */
  accentDeep: '#0B7A37',

  // ── Accent transparent layers ──────────────────────────────────────────────
  /** Email badge, cellFilled background */
  accentFill20:   'rgba(30,215,96,0.20)',
  /** Count badge, section badge background */
  accentFill25:   'rgba(30,215,96,0.25)',
  /** Featured banner gradient start */
  accentFill90:   'rgba(30,215,96,0.90)',
  /** Featured banner gradient end */
  accentFill95:   'rgba(13,122,55,0.95)',
  /** Ring trang trí (WelcomeScreen outer) */
  accentBorder12: 'rgba(30,215,96,0.12)',
  /** Genre chip border */
  accentBorder25: 'rgba(30,215,96,0.25)',
  /** Badge border, count badge border */
  accentBorder30: 'rgba(30,215,96,0.30)',
  accentBorder35: 'rgba(30,215,96,0.35)',
  /** Logo ring, icon wrap border */
  accentBorder40: 'rgba(30,215,96,0.40)',
  /** Logo ring WelcomeScreen, active OTP cell */
  accentBorder50: 'rgba(30,215,96,0.50)',

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
  border:       '#2A2A2A',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderLight:  'rgba(255,255,255,0.10)',

  // ── Text ──────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  text:  '#F7F7F7',
  textSecondary: '#B5B5B5',
  muted: '#808080',

  // ── Semantic ──────────────────────────────────────────────────────────────
  error:         '#EF4444',
  errorDim:      'rgba(239,68,68,0.15)',
  success:       '#22C55E',
  successAlt:    '#10B981',
  warningMid:    '#FBBF24',
  warning:       '#F59E0B',
  warningDim:    'rgba(245,158,11,0.15)',
  warningBorder: 'rgba(245,158,11,0.40)',
  info:          '#3B82F6',

  // ── Misc ──────────────────────────────────────────────────────────────────
  /** Modal / overlay backdrop */
  scrim: 'rgba(0,0,0,0.70)',

  // ── HomeScreen quick-action card gradients ────────────────────────────────
  cardHealingFrom:  '#1A1A1A',
  cardHealingTo:    '#0F3F23',
  cardTrendingFrom: '#1F0A00',
  cardTrendingTo:   '#FF6B1A',
  cardAcousticFrom: '#0B1A12',
  cardAcousticTo:   '#17623A',
  cardLofiFrom:     '#111111',
  cardLofiTo:       '#28323C',

  // ── SearchScreen category card gradients ─────────────────────────────────
  catPopFrom:     '#1a0a2e',
  catPopTo:       '#3D1A6B',
  catRnbFrom:     '#0a1a2e',
  catRnbTo:       '#1A3D6B',
  catHipHopFrom:  '#1a0a0a',
  catHipHopTo:    '#6B1A2E',
  catEdmFrom:     '#0a1a0a',
  catEdmTo:       '#1A6B3D',
  catAcousticFrom: '#1a1a0a',
  catAcousticTo:   '#4A4A10',
  catChillFrom:   '#0a0a1a',
  catChillTo:     '#1A1A6B',
  catIndieFrom:   '#0a1a10',
  catIndieTo:     '#1A5A30',
  catClassicFrom: '#1a100a',
  catClassicTo:   '#5A300A',

  // ── Premium UI ──────────────────────────────────────────────────────────────
  premiumGlow: '#C084FC',
  premiumGlowSoft: 'rgba(192,132,252,0.35)',
  premiumCardFrom: '#1A1040',
  premiumCardTo: '#2D1B69',
  premiumShine: 'rgba(255,255,255,0.15)',
  premiumBorder: 'rgba(192,132,252,0.35)',

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
