import { StyleSheet, type ViewStyle } from 'react-native';
import type { ColorScheme } from './colors';

type GlassIntensity = 'subtle' | 'default' | 'strong';

const glassAlpha: Record<GlassIntensity, number> = {
  subtle: 0.05,
  default: 0.08,
  strong: 0.12,
};

export const uiPresets = {
  screenGradient: (c: ColorScheme) => ({
    colors: [c.gradNavy ?? c.surfaceMid, c.bg] as const,
    start: { x: 0, y: 0 } as const,
    end: { x: 1, y: 1 } as const,
  }),

  glassSurface: (
    c: ColorScheme,
    opts?: { intensity?: GlassIntensity; radius?: number; border?: boolean },
  ): ViewStyle => {
    const intensity = opts?.intensity ?? 'default';
    const radius = opts?.radius ?? 24;
    const border = opts?.border ?? true;
    return {
      backgroundColor: `rgba(255,255,255,${glassAlpha[intensity]})`,
      borderRadius: radius,
      borderWidth: border ? StyleSheet.hairlineWidth : 0,
      borderColor: border ? c.glass12 : 'transparent',
    };
  },

  glassPill: (c: ColorScheme, opts?: { intensity?: GlassIntensity; border?: boolean }): ViewStyle => ({
    ...uiPresets.glassSurface(c, { intensity: opts?.intensity ?? 'default', radius: 999, border: opts?.border ?? true }),
  }),
} as const;

