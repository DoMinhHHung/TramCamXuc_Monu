# Monu Mobile UI Refactoring Guide

## Overview

This document guides developers through the refactoring of Monu Mobile to use the new icon/emoji resource system, localization, and theme system. The refactoring was designed to be done incrementally without breaking existing functionality.

## Phase Completion Status

- ✅ **Phase 1: Icon & Emoji Extraction** - COMPLETE
- ✅ **Phase 2: Localization System (i18n)** - COMPLETE
- ✅ **Phase 3: Theme System** - COMPLETE
- 📋 **Phase 4: Visual Enhancements** - IN PROGRESS

---

## 1. Icon & Emoji System

### Overview
All hardcoded icons and emojis have been extracted into centralized resource files for easier management and consistent styling.

### Files
- `src/config/icons.ts` - Icon definitions organized by category
- `src/config/emojis.ts` - Emoji definitions with semantic grouping

### Using Icons
```tsx
import { NAV_ICONS, PLAYER_ICONS, ACTION_ICONS } from '../config/icons';

// In your component
<MaterialIcons name={NAV_ICONS.home} size={24} color="white" />
```

### Using Emojis
```tsx
import { MUSIC_EMOJIS, MOOD_EMOJIS, STATS_EMOJIS } from '../config/emojis';

// In your component
<Text>{MUSIC_EMOJIS.song}</Text>
<Text>{MOOD_EMOJIS.healing}</Text>
```

### Refactoring Screens
When updating screens, replace hardcoded icon/emoji strings:

**Before:**
```tsx
<Text style={styles.emoji}>🎵</Text>
<MaterialIcons name="home" />
```

**After:**
```tsx
import { MUSIC_EMOJIS } from '../config/emojis';
import { NAV_ICONS } from '../config/icons';

<Text style={styles.emoji}>{MUSIC_EMOJIS.song}</Text>
<MaterialIcons name={NAV_ICONS.home} />
```

---

## 2. Localization System (i18n)

### Overview
The app now supports multiple languages through LocalizationContext. Vietnamese and English are currently supported, with easy extensibility for additional languages.

### Files
- `src/context/LocalizationContext.tsx` - Context and hook for translations
- `src/locales/vi.json` - Vietnamese translations
- `src/locales/en.json` - English translations

### Using Translations
```tsx
import { useTranslation } from '../context/LocalizationContext';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <Text>{t('screens.home.searchPlaceholder')}</Text>;
};
```

### Translation Key Structure
Keys use dot notation for nested organization:
```
screens.home.searchPlaceholder
navigation.home
auth.login
```

### Adding a New Language
1. Create `src/locales/[lang].json` with all keys from `en.json` or `vi.json`
2. Update `translations` object in `LocalizationContext.tsx`
3. Add language to `availableLanguages` array

### Refactoring Screens
Replace hardcoded strings with translation keys:

**Before:**
```tsx
<Text>Tìm bài hát, nghệ sĩ...</Text>
```

**After:**
```tsx
const { t } = useTranslation();
<Text>{t('screens.home.searchPlaceholder')}</Text>
```

---

## 3. Theme System

### Overview
Three complete themes are available: Dark (default), Light, and Classic. Each theme is a complete color system that can be switched at runtime, with preference persisted to device storage.

### Files
- `src/config/themes.ts` - Theme definitions (dark, light, classic)
- `src/context/ThemeContext.tsx` - Theme context and hook

### Current Themes
1. **Dark** - Monu's signature purple/lavender palette (default)
2. **Light** - Clean, modern neutral palette
3. **Classic** - AMOLED with golden/orange accents

### Using Theme Colors
```tsx
import { useTheme } from '../context/ThemeContext';

const MyComponent = () => {
  const { colors } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.text }}>Content</Text>
    </View>
  );
};
```

### Color Tokens Available
```
// Semantic text colors
colors.text           // Primary text
colors.textSecondary  // Secondary text
colors.muted          // Muted/disabled text

// Backgrounds
colors.bg             // Main background
colors.surface        // Card/modal surface
colors.surfaceLow     // Lower elevation
colors.surfaceMid     // Middle elevation
colors.surfaceDim     // Dimmed surface

// Accents (theme-specific)
colors.accent         // Primary accent
colors.accentFill20   // Accent with 20% opacity
colors.accentBorder25 // Accent border at 25% opacity

// Status
colors.success        // Success/positive
colors.error          // Error/negative
colors.warning        // Warning state
colors.info           // Info state

// Gradients (for hero sections)
colors.gradPurple
colors.gradIndigo
colors.gradNavy
colors.gradDark
```

### Refactoring Components to Use Themes

**Before (hardcoded colors):**
```tsx
import { COLORS } from '../config/colors';

export const MyComponent = () => (
  <View style={{ backgroundColor: COLORS.surface }}>
    <Text style={{ color: COLORS.white }}>Hello</Text>
  </View>
);
```

**After (theme-aware):**
```tsx
import { useTheme } from '../context/ThemeContext';

export const MyComponent = () => {
  const { colors } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
};
```

### Adding a New Theme
1. Add theme definition to `src/config/themes.ts`:
```tsx
export const myTheme: ThemeColors = {
  bg: '#...',
  surface: '#...',
  // ... all color tokens
};
```

2. Add to `THEMES` record and `ThemeName` type:
```tsx
export const THEMES: Record<ThemeName, ThemeColors> = {
  dark: darkTheme,
  light: lightTheme,
  classic: classicTheme,
  myTheme: myTheme,  // Add here
};

export type ThemeName = 'dark' | 'light' | 'classic' | 'myTheme';
```

3. Update `getThemeName` function

### Switching Themes at Runtime
```tsx
const { setTheme, availableThemes } = useTheme();

// User selects theme
<Button 
  onPress={() => setTheme('light')}
  title="Use Light Mode"
/>
```

---

## 4. Progressive Migration Strategy

The refactoring is designed for incremental progress. Priority order:

### High Priority (Visual Impact)
1. Main screens (HomeScreen, LibraryScreen, DiscoverScreen)
2. Player components (MiniPlayer, FullPlayerModal)
3. Navigation/TabBar

### Medium Priority
4. Settings/Profile screens
5. Playlist/Album detail screens
6. Search screens

### Lower Priority (Can be Deferred)
7. Auth screens (less frequently updated)
8. Onboarding screens
9. Admin/Artist screens

---

## 5. Best Practices

### Icons
- Use specific icon categories (NAV_ICONS, PLAYER_ICONS, etc.)
- Don't hardcode icon names in component props
- Icons are sized through ICON_SIZES constants

### Localization
- Use semantic key names reflecting meaning
- Keep translations in locale files only
- Use fallback strings in the `t()` function

### Theming
- Always use theme colors via `useTheme()` hook
- Don't hardcode hex values in components
- Gradients should use theme colors
- Test all components in all three themes

### Performance
- Memoize theme-dependent components if needed
- ThemeContext is optimized to minimize re-renders
- LocalizationContext only re-renders when language changes

---

## 6. Common Refactoring Patterns

### Converting a Screen to Use Themes
```tsx
// 1. Add useTheme import
import { useTheme } from '../context/ThemeContext';

// 2. Call hook in component
const MyScreen = () => {
  const { colors } = useTheme();
  
  // 3. Replace COLORS references
  // FROM: backgroundColor: COLORS.surface
  // TO:   backgroundColor: colors.surface
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,  // Dynamic per theme
      color: colors.text,
    }
  });
  
  return ...
}
```

### Converting a Component to Use Translations
```tsx
// 1. Add useTranslation import
import { useTranslation } from '../context/LocalizationContext';

// 2. Call hook in component
const MyComponent = () => {
  const { t } = useTranslation();
  
  // 3. Replace hardcoded strings
  // FROM: <Text>Hello World</Text>
  // TO:   <Text>{t('common.hello')}</Text>
  
  return <Text>{t('common.hello')}</Text>;
}
```

---

## 7. Testing Themes and Languages

### Testing Theme Switching
1. Navigate to Profile > Settings > Theme
2. Select each theme (Dark, Light, Classic)
3. Verify all components render correctly
4. Check status bar and StatusBar updates

### Testing Language Switching
1. Navigate to Profile > Settings > Language
2. Switch between Vietnamese and English
3. Verify all UI text updates
4. Check RTL readiness (for future Arabic/Hebrew support)

---

## 8. Troubleshooting

### Theme Not Persisting
- Check AsyncStorage permissions
- Verify `THEME_STORAGE_KEY` isn't cleared
- Check device storage availability

### Translation Key Not Found
- Verify key exists in both `en.json` and `vi.json`
- Use `t()` fallback parameter: `t('missing.key', 'Fallback text')`
- Check for typos in nested key path

### Lint Warnings
- Ensure all imports use absolute paths from `src/`
- Update any relative imports to use alias if configured
- Avoid circular dependencies between contexts

---

## 9. Future Enhancements

Potential improvements for next phases:

- [ ] Dynamic theme creation UI for users
- [ ] Scheduled theme switching (light by day, dark by night)
- [ ] High contrast theme for accessibility
- [ ] Right-to-left (RTL) language support
- [ ] Translation management UI for admin
- [ ] Theme preview in settings
- [ ] Adaptive colors based on device appearance
- [ ] Color blindness friendly themes

---

## Contact & Support

For questions about the refactoring approach, refer to the comments in:
- `src/config/themes.ts` - Theme philosophy and decisions
- `src/context/ThemeContext.tsx` - Theme state management
- `src/context/LocalizationContext.tsx` - Localization patterns
- `src/config/icons.ts` - Icon naming rationale

