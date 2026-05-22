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

/** Bottom tab bar visual height (pill, no safe-area inflation). */
export const MAIN_TAB_BAR_BASE_HEIGHT = 74;

/** Mini player bar height — container renders MINI_PLAYER_HEIGHT + 4 px total. */
export const MINI_PLAYER_HEIGHT = 68;

/**
 * Distance from screen bottom edge to the bottom of the floating tab bar pill.
 * Keeps the pill clear of the home indicator / gesture zone on all devices.
 */
export const getTabBarBottomOffset = (insetBottom: number): number =>
  Math.max(16, insetBottom + 12);

// ── Border Radius ─────────────────────────────────────────────────────────────
/** Unified border-radius scale – minimize to enhance minimalism. */
export const RADIUS = {
  /** 4px – tiny elements */
  xs: scale(4),
  /** 6px – small chips */
  sm: scale(6),
  /** 10px – standard card corner */
  md: scale(10),
  /** 12px – large card / modal */
  lg: scale(12),
  /** 16px – bottom sheet top corners */
  xl: scale(16),
  /** 20px – hero cards */
  xxl: scale(20),
  /** 999 – full pill / circle */
  full: 999,
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
/** Font-size scale – minimalist hierarchy with clear distinction. */
export const FONT_SIZE = {
  /** 12px – label / badge tiny */
  xxs: moderateScale(12),
  /** 13px – caption / supplemental info */
  xs: moderateScale(13),
  /** 14px – secondary text */
  sm: moderateScale(14),
  /** 15px – body small */
  body_sm: moderateScale(15),
  /** 16px – body default */
  body: moderateScale(16),
  /** 17px – body medium */
  body_md: moderateScale(17),
  /** 19px – card title / section heading */
  md: moderateScale(19),
  /** 21px – modal/screen title */
  lg: moderateScale(21),
  /** 26px – screen title */
  xl: moderateScale(26),
  /** 30px – hero value */
  xxl: moderateScale(30),
  /** 36px – display title */
  display: moderateScale(36),
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
/** Minimal shadow presets – reduce visual complexity. */
export const SHADOW = {
  none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  md: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  lg: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
