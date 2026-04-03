/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Emoji Resource Library
 * Centralized emoji definitions for consistent personality, accessibility, and
 * easy future management. Each emoji is chosen intentionally for meaning & feel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Music & Audio Emojis – Playback and song representations
 * Used as fallback visual placeholders when thumbnail images aren't available
 */
export const MUSIC_EMOJIS = {
  /** Generic song/music note – primary fallback for song thumbnails */
  song: '🎵' as const,
  /** Microphone – often paired with artist or vocalist references */
  microphone: '🎤' as const,
  /** Musical note with single stem – alternative music representation */
  note: '♪' as const,
  /** Music note symbol – alternative representation */
  noteSymbol: '♫' as const,
  /** Headphones – audio listening context */
  headphones: '🎧' as const,
  /** Guitar – specifically for acoustic or guitar-based content */
  guitar: '🎸' as const,
  /** Piano – for instrumental or classical music */
  piano: '🎹' as const,
  /** Saxophone – jazz or instrumental vibes */
  saxophone: '🎷' as const,
  /** Trumpet – brass instruments */
  trumpet: '🎺' as const,
  /** Drum – percussion and rhythm */
  drum: '🥁' as const,
} as const;

/**
 * Mood & Vibe Emojis – Emotional context and content categorization
 * Used in HomeScreen quick action cards and playlist mood indicators
 */
export const MOOD_EMOJIS = {
  /** Healing/wellness music – calming, therapeutic vibes */
  healing: '🌙' as const,
  /** Trending/hot content – popular, in-demand songs */
  trending: '🔥' as const,
  /** Energy/upbeat – dance, workout, high energy content */
  energy: '⚡' as const,
  /** Focus/concentration – lofi, study beats, deep work */
  focus: '🎧' as const,
  /** Love/romance – emotional, heartfelt content */
  love: '💕' as const,
  /** Party/celebration – upbeat social music */
  party: '🎉' as const,
  /** Sad/melancholy – emotional, introspective content */
  sad: '😢' as const,
  /** Chill/relaxed – laid-back, groovy vibes */
  chill: '😎' as const,
  /** Nostalgic – throwback, classic hits */
  nostalgic: '✨' as const,
  /** Peaceful – meditative, ambient, zen */
  peaceful: '☮️' as const,
} as const;

/**
 * Analytic & Stats Emojis – Insights and user listening data
 * Used in InsightsScreen to visualize listening habits and achievements
 */
export const STATS_EMOJIS = {
  /** Clock/time – total listening duration */
  duration: '⏱' as const,
  /** Fire/streak – consecutive listening days (achievements) */
  streak: '🔥' as const,
  /** Trophy – longest streak or top achievement */
  achievement: '🏆' as const,
  /** Chart/graph – overview or summary view */
  overview: '📊' as const,
  /** Rising arrow – growth or trending up */
  growth: '📈' as const,
  /** Calendar – date or time period statistics */
  calendar: '📅' as const,
  /** Top #1 – number one or ranking indicator */
  topRank: '🥇' as const,
} as const;

/**
 * Action & Interactive Emojis – User interactions and CTAs
 * Used for buttons, interactive prompts, and user feedback
 */
export const INTERACTION_EMOJIS = {
  /** Heart – favorite/like action */
  heart: '❤️' as const,
  /** Star – rating or favoriting */
  star: '⭐' as const,
  /** Plus sign – add, create, or expand action */
  plus: '➕' as const,
  /** Minus sign – remove or reduce action */
  minus: '➖' as const,
  /** Checkmark – success, completion, or confirmation */
  check: '✅' as const,
  /** Cross/X – close, decline, or error state */
  cross: '❌' as const,
  /** Right arrow – next step or forward navigation */
  arrowRight: '➡️' as const,
  /** Left arrow – previous or back navigation */
  arrowLeft: '⬅️' as const,
  /** Up arrow – scroll up or expand */
  arrowUp: '⬆️' as const,
  /** Down arrow – scroll down or collapse */
  arrowDown: '⬇️' as const,
} as const;

/**
 * Onboarding & Welcome Emojis – Used in intro screens
 * Chosen to convey Monu's brand personality and user journey
 */
export const ONBOARDING_EMOJIS = {
  /** Music note – welcome to Monu's music platform */
  welcome: '🎵' as const,
  /** Microphone – artist/creator focus */
  artist: '🎤' as const,
  /** Genres representation */
  genre: '🎸' as const,
} as const;

/**
 * UI Action Emojis – Generic interactive or label emojis
 * Use these instead of inline emoji strings in JSX/components
 */
export const UI_EMOJIS = {
  /** Save to library */
  save: '💾' as const,
  /** Attachment / link indicator */
  link: '📎' as const,
  /** Share or export */
  share: '↗' as const,
  /** Settings / gear */
  settings: '⚙️' as const,
  /** User / person placeholder */
  person: '👤' as const,
  /** Download / offline save */
  download: '⬇️' as const,
  /** SoundCloud brand indicator */
  soundcloud: '🔶' as const,
  /** Spotify brand indicator */
  spotify: '🟢' as const,
  /** Announcement / broadcast */
  announce: '📢' as const,
  /** Locked / premium */
  locked: '🔐' as const,
  /** Crown / premium tier */
  crown: '👑' as const,
  /** Catalog / collection */
  catalog: '📚' as const,
} as const;

/**
 * Content Status Emojis – Indicate visibility / moderation state of content
 * Used in album/playlist/post status badges
 */
export const STATUS_TEXT_EMOJIS = {
  /** Public / global visibility */
  public: '🌐' as const,
  /** Followers-only visibility */
  followers: '👥' as const,
  /** Private / hidden */
  private: '🔒' as const,
  /** Draft / not yet published */
  draft: '📝' as const,
  /** Pending review / approval */
  pending: '⏳' as const,
  /** Banned / suspended */
  banned: '🚫' as const,
  /** Rejected */
  rejected: '✕' as const,
  /** Approved / verified */
  approved: '✓' as const,
} as const;

/**
 * Semantic Emoji Categories
 * Maps emoji purpose to actual emoji characters for programmatic access
 */
export const EMOJI_CATEGORIES = {
  music: MUSIC_EMOJIS,
  mood: MOOD_EMOJIS,
  stats: STATS_EMOJIS,
  interaction: INTERACTION_EMOJIS,
  onboarding: ONBOARDING_EMOJIS,
  ui: UI_EMOJIS,
  status: STATUS_TEXT_EMOJIS,
} as const;

/**
 * Type exports for strict typing across the app
 */
export type MusicEmojiKey = keyof typeof MUSIC_EMOJIS;
export type MoodEmojiKey = keyof typeof MOOD_EMOJIS;
export type StatsEmojiKey = keyof typeof STATS_EMOJIS;
export type InteractionEmojiKey = keyof typeof INTERACTION_EMOJIS;
export type OnboardingEmojiKey = keyof typeof ONBOARDING_EMOJIS;
export type UiEmojiKey = keyof typeof UI_EMOJIS;
export type StatusTextEmojiKey = keyof typeof STATUS_TEXT_EMOJIS;
