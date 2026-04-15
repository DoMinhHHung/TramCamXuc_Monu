import type { ThemeColors } from '../config/themes';

export function createCachedThemeStyles<T>(getStyles: (colors: ThemeColors) => T) {
  const styleCache = new WeakMap<ThemeColors, T>();

  return (colors: ThemeColors): T => {
    const cached = styleCache.get(colors);
    if (cached) return cached;

    const styles = getStyles(colors);
    styleCache.set(colors, styles);
    return styles;
  };
}