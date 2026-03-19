/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Icon System (Emojis & Unicode)
 * Centralized icon definitions for consistency and easy maintenance.
 * Use these instead of hardcoding emojis throughout the app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Music & Audio icons
 */
export const MUSIC_ICONS = {
  song: '🎵',
  headphones: '🎧',
  guitar: '🎸',
  piano: '🎹',
  microphone: '🎤',
  music_note: '🎼',
  disk: '💿',
  playlist: '📋',
} as const;

/**
 * Action icons
 */
export const ACTION_ICONS = {
  share: '↗',
  qr: '⬛',
  discovery: '🌟',
  settings: '⚙️',
  favorite: '❤️',
  add: '✚',
  checkmark: '✓',
  close: '✕',
  more: '⋯',
  arrow_right: '›',
  arrow_left: '‹',
} as const;

/**
 * Status icons
 */
export const STATUS_ICONS = {
  lock: '🔒',
  public: '🌐',
  banned: '🚫',
  loading: '⟳',
  success: '✓',
  error: '⚠',
  info: 'ℹ',
} as const;

/**
 * UI & Decorative icons
 */
export const UI_ICONS = {
  sparkles: '✨',
  document: '📄',
  paperclip: '📎',
  upload: '⬆',
  download: '⬇',
  bell: '🔔',
  search: '🔍',
  home: '🏠',
  user: '👤',
  clock: '⏱',
  link: '🔗',
  lock_alt: '🔐',
  volume: '🔊',
} as const;

/**
 * Greeting & Welcome icons
 */
export const GREETING_ICONS = {
  wave: '👋',
  tada: '🎉',
  rocket: '🚀',
  star: '⭐',
  fire: '🔥',
  zap: '⚡',
  crown: '👑',
} as const;

/**
 * Combined icon sets for easy lookup
 */
export const ICONS = {
  ...MUSIC_ICONS,
  ...ACTION_ICONS,
  ...STATUS_ICONS,
  ...UI_ICONS,
  ...GREETING_ICONS,
} as const;

/**
 * Icon size definitions for consistency
 * Use these instead of hardcoding font sizes
 */
export const ICON_SIZES = {
  xs: 16,      // Small inline icons
  sm: 20,      // Buttons, tabs
  md: 24,      // Standard UI elements
  lg: 32,      // Larger buttons, cards
  xl: 48,      // Hero sections, large cards
  xxl: 56,     // Page heroes, prominent displays
  xxxl: 64,    // Full screen heroes
} as const;

/**
 * Typography for icons (use with Text component)
 * Ensures consistent styling across the app
 */
export const ICON_STYLES = {
  xs: { fontSize: ICON_SIZES.xs },
  sm: { fontSize: ICON_SIZES.sm },
  md: { fontSize: ICON_SIZES.md },
  lg: { fontSize: ICON_SIZES.lg },
  xl: { fontSize: ICON_SIZES.xl },
  xxl: { fontSize: ICON_SIZES.xxl },
  xxxl: { fontSize: ICON_SIZES.xxxl },
} as const;

export type IconKey = keyof typeof ICONS;
export type IconSize = keyof typeof ICON_SIZES;
