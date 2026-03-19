/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Spacing System (8pt Grid)
 * Provides consistent spacing throughout the app using an 8-point grid system.
 * Uses multiples of 4pt and 8pt for precise, harmonious layouts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SPACING = {
  // Micro spacing (4pt grid)
  xs: 4,        // Minimal spacing, line-height adjustments
  sm: 8,        // Inline element spacing, tight padding
  
  // Base spacing (8pt grid)
  md: 16,       // Standard padding and margins
  lg: 24,       // Section spacing
  xl: 32,       // Major section spacing
  xxl: 48,      // Page spacing, large cards

  // Aliases for clarity
  padding: 16,
  margin: 16,
  gap: 12,
  gapLg: 16,
  gapXl: 24,

  // Component-specific
  inputPaddingX: 16,
  inputPaddingY: 12,
  buttonHeight: 56,
  buttonRadius: 12,
  cardRadius: 18,
  modalRadius: 24,
  
  // Typography line heights (relaxed, natural feel)
  lineHeightTight: 1.3,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.7,
  
  // Shadows and elevation depths
  shadowSmall: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  shadowXl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

/**
 * Preset layouts for common patterns
 * Use these to reduce repetitive style definitions
 */
export const LAYOUT_PRESETS = {
  centerFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  
  columnCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  card: {
    backgroundColor: '#1E1A38', // COLORS.surface
    borderRadius: SPACING.cardRadius,
    padding: SPACING.md,
  },
  
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  
  section: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
} as const;

export type SpacingValue = typeof SPACING[keyof typeof SPACING];
export type LayoutPreset = keyof typeof LAYOUT_PRESETS;
