# Color Migration Guide

## Mapping Hardcoded Colors to Theme System

### Common Hardcoded Colors Found in Screens

| Hardcoded Value | Theme Token | Usage |
|---|---|---|
| #000000, #111111 | COLORS.bg | Background surfaces |
| #1a1a1a, #1f1f1f | COLORS.surface | Card/container backgrounds |
| #ffffff, #fafafa | COLORS.text | Primary text color |
| #888888, #999999 | COLORS.textSecondary | Secondary text, labels |
| #FF6B35, #ff7e5f | COLORS.accent | Buttons, accents, primary CTAs |
| #A855F7, #9333EA | COLORS.accent (variant) | Purple accent for music genre |
| #4ADE80, #10b981 | COLORS.success | Success states, play button |
| #EF4444, #ff4d4f | COLORS.error | Error states, delete |
| #FFB84D, #f59e0b | COLORS.warning | Warning states |
| #60A5FA | COLORS.info | Info states, links |

### Migration Pattern Template

```tsx
// BEFORE (Hardcoded)
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderColor: '#ff7e5f',
  },
  text: {
    color: '#ffffff',
  },
});

// AFTER (Theme-aware)
const styles = (colors: typeof COLORS) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  text: {
    color: colors.text,
  },
});

// Inside component
const { COLORS } = useTheme();
const styles = themeStyles(COLORS);
```

### I18n Migration Pattern

```tsx
// BEFORE (Hardcoded strings)
<Text>Play Song</Text>
<Text>Delete Playlist</Text>

// AFTER (i18n)
const { t } = useTranslation();
<Text>{t('controls.play')}</Text>
<Text>{t('controls.delete')}</Text>
```

## Implementation Steps

1. Import hooks at top of file
2. Replace all hardcoded color values
3. Replace all hardcoded strings with t() calls
4. Add missing keys to i18n files
5. Test with multiple themes
