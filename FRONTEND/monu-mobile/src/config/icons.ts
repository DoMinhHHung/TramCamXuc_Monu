/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Icon Resource Library
 * Centralized icon definitions for consistent sizing, styling, and easy future
 * maintenance. Uses Material Icons as primary library with strategic fallbacks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Navigation Icons – Bottom tab bar and main navigation
 * Source: Material Icons (primary choice for semantic clarity and consistency)
 */
export const NAV_ICONS = {
  /** Home screen tab icon */
  home: 'home' as const,
  /** Discover/Explore screen tab icon */
  discover: 'explore' as const,
  /** Create/Upload screen tab icon */
  create: 'add' as const,
  /** Library/Saved songs screen tab icon */
  library: 'library-music' as const,
  /** Premium/Subscription screen tab icon */
  premium: 'redeem' as const,
} as const;

/**
 * Player Control Icons – Music playback controls
 * Source: AntDesign (for modern, rounded feel of player UI)
 */
export const PLAYER_ICONS = {
  /** Play button in player or song list */
  play: 'play-circle' as const,
  /** Pause button in player */
  pause: 'pause-circle' as const,
  /** Skip to next track */
  skipNext: 'stepforward' as const,
  /** Skip to previous track */
  skipPrev: 'stepbackward' as const,
  /** Shuffle icon for shuffle mode */
  shuffle: 'shuffle' as const,
  /** Repeat icon for repeat/loop mode */
  repeat: 'reload' as const,
} as const;

/**
 * Action Icons – Common interactive elements
 * Source: Material Icons (consistent with Android/web conventions)
 */
export const ACTION_ICONS = {
  /** Close/dismiss modal or dialog */
  close: 'close' as const,
  /** Search functionality */
  search: 'search' as const,
  /** More options/menu (three dots) */
  moreOptions: 'more-vert' as const,
  /** Edit or pencil icon */
  edit: 'edit' as const,
  /** Delete or trash icon */
  delete: 'delete' as const,
  /** Download or save */
  download: 'download' as const,
  /** Settings/gear icon */
  settings: 'settings' as const,
  /** Share with other apps */
  share: 'share' as const,
  /** Add or create new */
  add: 'add' as const,
  /** Back/previous navigation */
  back: 'keyboard-arrow-left' as const,
  /** Profile/account icon */
  profile: 'person' as const,
  /** Info or information icon */
  info: 'info' as const,
  /** Check mark or success */
  check: 'check' as const,
  /** Flag / report */
  flag: 'flag' as const,
  /** QR code */
  qr: 'qr-code' as const,
  /** Open external link */
  externalLink: 'open-in-new' as const,
  /** Add to playlist */
  addToPlaylist: 'playlist-add' as const,
  /** Saved search / smart search */
  savedSearch: 'saved-search' as const,
} as const;

/**
 * Social & Engagement Icons
 * Source: AntDesign (modern appearance for social interactions)
 */
export const SOCIAL_ICONS = {
  /** Like/favorite/heart button */
  heart: 'heart' as const,
  /** Heart filled state */
  heartFilled: 'hearto' as const,
  /** Dislike or remove favorite */
  unHeart: 'dislike' as const,
  /** Comment or reply */
  comment: 'message' as const,
  /** Share to social networks */
  socialShare: 'share-alt' as const,
  /** Follow user or artist */
  follow: 'userplus' as const,
  /** Unfollow user or artist */
  unFollow: 'userminus' as const,
} as const;

/**
 * Notification & Status Icons
 * Source: MaterialIcons (clear semantic meaning)
 */
export const STATUS_ICONS = {
  /** Success or positive state */
  success: 'check-circle' as const,
  /** Error or failure state */
  error: 'error' as const,
  /** Warning or caution */
  warning: 'warning' as const,
  /** Loading spinner (animated) */
  loading: 'refresh' as const,
  /** Notification bell */
  notification: 'notifications' as const,
  /** Not downloaded/offline */
  offline: 'cloud-off' as const,
  /** Downloaded/available offline */
  downloaded: 'cloud-done' as const,
} as const;

/**
 * Content Type Icons – Differentiate song, playlist, album, artist types
 * Source: MaterialIcons (semantic clarity for content organization)
 */
export const CONTENT_ICONS = {
  /** Single song/track */
  song: 'music-note' as const,
  /** Playlist collection */
  playlist: 'playlist-play' as const,
  /** Album collection */
  album: 'album' as const,
  /** Artist profile/account */
  artist: 'mic' as const,
  /** Genre category */
  genre: 'category' as const,
  /** Folder or collection */
  folder: 'folder' as const,
  /** Queue or up next */
  queue: 'list' as const,
  /** History or recently played */
  history: 'history' as const,
} as const;

/**
 * Audio & Media Icons
 * Source: MaterialIcons (industry standard symbols)
 */
export const AUDIO_ICONS = {
  /** Volume/sound level */
  volume: 'volume-up' as const,
  /** Muted volume */
  volumeMute: 'volume-mute' as const,
  /** Microphone for recording/vocals */
  microphone: 'mic' as const,
  /** Headphones or audio output */
  headphones: 'headset' as const,
  /** Speaker or sound system */
  speaker: 'speaker' as const,
  /** Audio equalizer */
  equalizer: 'equalizer' as const,
} as const;

/**
 * Icon Library References
 * Helper object to identify which icon library to use
 */
export const ICON_LIBRARY = {
  [NAV_ICONS.home]: 'MaterialIcons',
  [NAV_ICONS.discover]: 'MaterialIcons',
  [NAV_ICONS.create]: 'MaterialIcons',
  [NAV_ICONS.library]: 'MaterialIcons',
  [NAV_ICONS.premium]: 'MaterialIcons',
  
  [PLAYER_ICONS.play]: 'AntDesign',
  [PLAYER_ICONS.pause]: 'AntDesign',
  [PLAYER_ICONS.skipNext]: 'AntDesign',
  [PLAYER_ICONS.skipPrev]: 'AntDesign',
  [PLAYER_ICONS.shuffle]: 'AntDesign',
  [PLAYER_ICONS.repeat]: 'AntDesign',
  
  [ACTION_ICONS.close]: 'MaterialIcons',
  [ACTION_ICONS.search]: 'MaterialIcons',
  [ACTION_ICONS.moreOptions]: 'MaterialIcons',
  [ACTION_ICONS.edit]: 'MaterialIcons',
  [ACTION_ICONS.delete]: 'MaterialIcons',
  [ACTION_ICONS.download]: 'MaterialIcons',
  [ACTION_ICONS.settings]: 'MaterialIcons',
  [ACTION_ICONS.share]: 'MaterialIcons',
  [ACTION_ICONS.back]: 'MaterialIcons',
  [ACTION_ICONS.profile]: 'MaterialIcons',
  [ACTION_ICONS.info]: 'MaterialIcons',
  [ACTION_ICONS.check]: 'MaterialIcons',
  
  [SOCIAL_ICONS.heart]: 'AntDesign',
  [SOCIAL_ICONS.heartFilled]: 'AntDesign',
  [SOCIAL_ICONS.unHeart]: 'AntDesign',
  [SOCIAL_ICONS.comment]: 'AntDesign',
  [SOCIAL_ICONS.socialShare]: 'AntDesign',
  [SOCIAL_ICONS.follow]: 'AntDesign',
  [SOCIAL_ICONS.unFollow]: 'AntDesign',
  
  [STATUS_ICONS.success]: 'MaterialIcons',
  [STATUS_ICONS.error]: 'MaterialIcons',
  [STATUS_ICONS.warning]: 'MaterialIcons',
  [STATUS_ICONS.loading]: 'MaterialIcons',
  [STATUS_ICONS.notification]: 'MaterialIcons',
  [STATUS_ICONS.offline]: 'MaterialIcons',
  [STATUS_ICONS.downloaded]: 'MaterialIcons',
  
  [CONTENT_ICONS.song]: 'MaterialIcons',
  [CONTENT_ICONS.playlist]: 'MaterialIcons',
  [CONTENT_ICONS.album]: 'MaterialIcons',
  [CONTENT_ICONS.artist]: 'MaterialIcons',
  [CONTENT_ICONS.genre]: 'MaterialIcons',
  [CONTENT_ICONS.folder]: 'MaterialIcons',
  [CONTENT_ICONS.queue]: 'MaterialIcons',
  [CONTENT_ICONS.history]: 'MaterialIcons',
  
  [AUDIO_ICONS.volume]: 'MaterialIcons',
  [AUDIO_ICONS.volumeMute]: 'MaterialIcons',
  [AUDIO_ICONS.headphones]: 'MaterialIcons',
  [AUDIO_ICONS.speaker]: 'MaterialIcons',
  [AUDIO_ICONS.equalizer]: 'MaterialIcons',
} as const;

/**
 * Sizes for different icon contexts
 * Use these constants for consistent icon sizing across the app
 */
export const ICON_SIZES = {
  /** Tiny icons for subtle indicators */
  tiny: 12,
  /** Small icons for compact UI */
  small: 16,
  /** Standard/default icon size */
  standard: 20,
  /** Medium icons for primary interactions */
  medium: 24,
  /** Large icons for hero sections */
  large: 32,
  /** Extra large for prominent displays */
  extraLarge: 48,
} as const;

/**
 * Type exports for strict typing
 */
export type NavIconKey = keyof typeof NAV_ICONS;
export type PlayerIconKey = keyof typeof PLAYER_ICONS;
export type ActionIconKey = keyof typeof ACTION_ICONS;
export type SocialIconKey = keyof typeof SOCIAL_ICONS;
export type StatusIconKey = keyof typeof STATUS_ICONS;
export type ContentIconKey = keyof typeof CONTENT_ICONS;
export type AudioIconKey = keyof typeof AUDIO_ICONS;
