/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Design System Tokens
 * Single source of truth for spacing, border-radius, typography, shadows.
 * Import these constants instead of hard-coding magic numbers in screens.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { moderateScale, scale } from '../utils/responsive';

// ── Spacing ──────────────────────────────────────────────────────────────────
/** Consistent spacing scale (px). Use SPACING.* everywhere instead of raw numbers. */
export const SPACING = {
  /** 2px – hair-line gap */
  xxs: scale(2),
  /** 4px – tight inline gap */
  xs: scale(4),
  /** 8px – default small gap */
  sm: scale(8),
  /** 12px – comfortable inner padding */
  md: scale(12),
  /** 16px – standard section padding */
  lg: scale(16),
  /** 20px – screen-edge horizontal padding */
  xl: scale(20),
  /** 24px – hero / card internal padding */
  xxl: scale(24),
  /** 32px – large section separator */
  section: scale(32),
} as const;

/** Bottom tab bar content height (excluding safe-area); must match `tabBarStyle.height` math in AppNavigator. */
export const MAIN_TAB_BAR_BASE_HEIGHT = 74;

/** Mini player bar height — keep in sync with `MiniPlayer` layout. */
export const MINI_PLAYER_HEIGHT = 68;

// ── Border Radius ─────────────────────────────────────────────────────────────
/** Unified border-radius scale. */
export const RADIUS = {
  /** 6px – tiny pill / tag */
  xs: scale(6),
  /** 8px – small chip / badge */
  sm: scale(8),
  /** 14px – standard card corner */
  md: scale(14),
  /** 20px – large card / modal */
  lg: scale(20),
  /** 24px – bottom sheet top corners */
  xl: scale(24),
  /** 32px – hero cards */
  xxl: scale(32),
  /** 999 – full pill / circle */
  full: 999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
/** Font-size scale. */
export const FONT_SIZE = {
  /** 11px – badge / label tiny */
  xxs: moderateScale(11),
  /** 12px – caption / supplemental info */
  xs: moderateScale(12),
  /** 13px – secondary text */
  sm: moderateScale(13),
  /** 14px – body small */
  body_sm: moderateScale(14),
  /** 15px – body default */
  body: moderateScale(15),
  /** 16px – body medium */
  body_md: moderateScale(16),
  /** 18px – card title / section heading */
  md: moderateScale(18),
  /** 20px – modal title */
  lg: moderateScale(20),
  /** 24px – screen title */
  xl: moderateScale(24),
  /** 28px – hero value */
  xxl: moderateScale(28),
  /** 34px – display title */
  display: moderateScale(34),
} as const;

/** Font-weight helpers. */
export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

// ── Elevation / Shadow ────────────────────────────────────────────────────────
/** Consistent shadow presets for Android (elevation) + iOS (shadow*). */
export const SHADOW = {
  none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sm: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  md: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  lg: {
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
} as const;

// ── Hit Slop ──────────────────────────────────────────────────────────────────
/** Standard hit-slop presets for touchable elements to improve accessibility. */
export const HIT_SLOP = {
  sm: { top: 6, right: 6, bottom: 6, left: 6 },
  md: { top: 10, right: 10, bottom: 10, left: 10 },
  lg: { top: 14, right: 14, bottom: 14, left: 14 },
} as const;

// ── Z-Index ───────────────────────────────────────────────────────────────────
/** Layering scale so components stack predictably. */
export const Z_INDEX = {
  base: 0,
  card: 10,
  overlay: 50,
  modal: 100,
  toast: 200,
} as const;
