/**
 * Unified Typography & Style System
 * All admin dashboard components use these constants for consistency
 */

// ─── Typography ──────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  // Label/Badge text - smallest
  label: 'text-[10px] font-medium tracking-widest text-zinc-500 dark:text-zinc-600 uppercase',
  labelHover: 'text-[10px] font-medium tracking-widest text-zinc-700 dark:text-zinc-500 uppercase',
  
  // Input helper text, small descriptions
  xs: 'text-[10px]',
  
  // Body text, table cells, normal content
  sm: 'text-[11px]',
  smBold: 'text-[11px] font-semibold',
  smMedium: 'text-[11px] font-medium',
  
  // Default/standard text
  base: 'text-xs',
  baseBold: 'text-xs font-semibold',
  baseMedium: 'text-xs font-medium',
  
  // Headings
  heading4: 'text-sm font-semibold',
  heading3: 'text-base font-bold',
  heading2: 'text-lg font-bold',
  heading1: 'text-xl font-bold',
} as const;

// ─── Form Inputs ─────────────────────────────────────────────────────────────
export const INPUT_STYLES = {
  // Standard input for all text fields, search boxes, etc.
  base: `w-full h-8 bg-white dark:bg-black border border-zinc-200 dark:border-white/10
    text-zinc-900 dark:text-white text-[11px] px-3 outline-none
    focus:border-zinc-400 dark:focus:border-white/30
    placeholder:text-zinc-400 dark:placeholder:text-zinc-700 transition-colors`,
  
  // Larger input for better visibility
  large: `w-full h-9 bg-white dark:bg-black border border-zinc-200 dark:border-white/10
    text-zinc-900 dark:text-white text-xs px-3 outline-none
    focus:border-zinc-400 dark:focus:border-white/30
    placeholder:text-zinc-400 dark:placeholder:text-zinc-700 transition-colors`,

  // Select/dropdown inputs
  select: `h-8 bg-white dark:bg-black border border-zinc-200 dark:border-white/10
    text-zinc-900 dark:text-white text-[11px] px-3 outline-none cursor-pointer
    focus:border-zinc-400 dark:focus:border-white/30 transition-colors`,
} as const;

// ─── Buttons ─────────────────────────────────────────────────────────────────
export const BUTTON_STYLES = {
  // Primary button - main actions
  primary: `px-3 h-8 bg-white dark:bg-white text-black dark:text-black text-[11px] font-semibold
    hover:bg-zinc-200 dark:hover:bg-zinc-100 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed`,

  // Secondary button - secondary actions
  secondary: `px-3 h-8 bg-white/10 dark:bg-white/5 border border-zinc-200 dark:border-white/10
    text-zinc-900 dark:text-white text-[11px] font-medium
    hover:bg-white/20 dark:hover:bg-white/10 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed`,

  // Icon button - minimal, just icon
  icon: `w-8 h-8 flex items-center justify-center text-zinc-600 dark:text-zinc-400
    hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10
    transition-colors rounded`,

  // Danger button - destructive actions
  danger: `px-3 h-8 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800
    text-red-700 dark:text-red-300 text-[11px] font-medium
    hover:bg-red-100 dark:hover:bg-red-900 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed`,

  // Success button
  success: `px-3 h-8 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800
    text-emerald-700 dark:text-emerald-300 text-[11px] font-medium
    hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed`,
} as const;

// ─── Tables & Lists ──────────────────────────────────────────────────────────
export const TABLE_STYLES = {
  // Table header cell
  headerCell: 'text-[10px] font-semibold tracking-widest text-zinc-600 dark:text-zinc-400 uppercase px-3 py-2 text-left bg-zinc-50 dark:bg-white/[0.02]',
  
  // Table body cell
  bodyCell: 'text-[11px] text-zinc-900 dark:text-white px-3 py-2.5 border-b border-zinc-200 dark:border-white/5',
  
  // Table row
  row: 'hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors',
  
  // Table container
  container: 'border border-zinc-200 dark:border-white/10',
} as const;

// ─── Badges & Status ─────────────────────────────────────────────────────────
export const BADGE_STYLES = {
  // Success/Active status
  success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20',
  
  // Warning/Pending status
  warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/20',
  
  // Danger/Error status
  danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20',
  
  // Default/Neutral status
  neutral: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
  
  // Container classes
  container: 'inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold border rounded',
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: '0.25rem',      // 4px
  sm: '0.5rem',       // 8px
  md: '1rem',         // 16px
  lg: '1.5rem',       // 24px
  xl: '2rem',         // 32px
} as const;

// ─── Colors ──────────────────────────────────────────────────────────────────
export const COLORS = {
  border: {
    light: 'border-zinc-200',
    dark: 'dark:border-white/10',
    focus: 'border-zinc-400 dark:border-white/30',
  },
  text: {
    primary: 'text-zinc-900 dark:text-white',
    secondary: 'text-zinc-600 dark:text-zinc-400',
    muted: 'text-zinc-500 dark:text-zinc-500',
  },
  bg: {
    light: 'bg-white dark:bg-black',
    lightAlt: 'bg-zinc-50 dark:bg-white/[0.02]',
    muted: 'bg-white/10 dark:bg-white/5',
  },
} as const;

// ─── Modals & Cards ──────────────────────────────────────────────────────────
export const CARD_STYLES = {
  // Standard card
  card: 'bg-white dark:bg-black border border-zinc-200 dark:border-white/10 p-4 rounded',
  
  // Data card (small info box)
  dataCard: 'border border-zinc-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.02]',
} as const;

// ─── Toast & Notifications ───────────────────────────────────────────────────
export const TOAST_STYLES = {
  // Success toast
  success: 'bg-white dark:bg-emerald-950 border-zinc-200 dark:border-emerald-800 text-zinc-700 dark:text-emerald-300',
  
  // Error toast
  error: 'bg-white dark:bg-red-950 border-zinc-200 dark:border-red-800 text-zinc-700 dark:text-red-300',
  
  // Container
  container: 'fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5 text-xs border shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200',
} as const;

// ─── Animations ──────────────────────────────────────────────────────────────
export const ANIMATIONS = {
  fadeIn: 'animate-in fade-in duration-200',
  slideUp: 'animate-in slide-in-from-bottom-2 duration-200',
  transition: 'transition-all duration-200',
} as const;
