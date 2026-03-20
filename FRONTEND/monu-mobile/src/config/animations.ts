/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Animation Utilities
 * Centralized animation timing and easing functions for consistent,
 * intentional micro-interactions across the app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Standard animation durations (in milliseconds)
 * Chosen based on interaction type and user expectation
 */
export const ANIMATION_DURATIONS = {
  /** Rapid feedback (button press, immediate state change) */
  quick: 150,
  
  /** Standard transitions (screen changes, modal open/close) */
  standard: 300,
  
  /** Deliberate, noticeable animations (hero reveals, special effects) */
  deliberate: 400,
  
  /** Slow, contemplative animations (ambient, background elements) */
  slow: 600,
  
  /** Very slow for special emphasis */
  verySlow: 800,
} as const;

/**
 * Easing functions for natural motion
 */
export const EASING = {
  /**  Linear (no easing) - for progress indicators */
  linear: 'linear',
  
  /** ease-in-out (default) - natural, balanced feel */
  ease: 'ease-in-out',
  
  /** ease-in - for exit animations (things fading away) */
  easeIn: 'ease-in',
  
  /** ease-out - for entrance animations (things appearing) */
  easeOut: 'ease-out',
  
  /** Cubic bezier for bounce effect (playful, responsive feel) */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  /** Cubic bezier for elastic effect (smooth spring-like) */
  elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

/**
 * Animation presets for common UI interactions
 */
export const ANIMATION_PRESETS = {
  /**  Button press feedback - quick and snappy */
  buttonPress: {
    duration: ANIMATION_DURATIONS.quick,
    easing: EASING.ease,
  },
  
  /**  Modal entrance - smooth and deliberate */
  modalSlideIn: {
    duration: ANIMATION_DURATIONS.standard,
    easing: EASING.easeOut,
  },
  
  /** Modal exit - same duration but slightly different feel */
  modalSlideOut: {
    duration: ANIMATION_DURATIONS.standard,
    easing: EASING.easeIn,
  },
  
  /** Fade transitions - standard opacity change */
  fadeIn: {
    duration: ANIMATION_DURATIONS.standard,
    easing: EASING.easeOut,
  },
  
  fadeOut: {
    duration: ANIMATION_DURATIONS.standard,
    easing: EASING.easeIn,
  },
  
  /** List item entrance - slightly slower for flow */
  listItemEnter: {
    duration: ANIMATION_DURATIONS.deliberate,
    easing: EASING.easeOut,
  },
  
  /** Loading spinner - continuous rotation */
  spin: {
    duration: 800, // Custom duration for smooth rotation
    easing: EASING.linear,
  },
  
  /** Bounce effect - playful feedback */
  bounce: {
    duration: ANIMATION_DURATIONS.standard,
    easing: EASING.bounce,
  },
  
  /** Pulse effect - attention-drawing animation */
  pulse: {
    duration: 1000,
    easing: EASING.ease,
  },
} as const;

/**
 * Get animation config by name
 */
export const getAnimationConfig = (preset: keyof typeof ANIMATION_PRESETS) => {
  return ANIMATION_PRESETS[preset];
};

/**
 * Convert duration constant to string (if needed for string-based animations)
 */
export const durationToString = (duration: number): string => {
  return `${duration}ms`;
};
