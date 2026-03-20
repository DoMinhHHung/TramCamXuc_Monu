# Monu Mobile - UI Refactoring Implementation Guide

## Quick Start for Developers

The Monu Mobile frontend has been refactored with a modern, extensible design system. This guide helps you leverage the new systems immediately.

---

## Available Systems

### 1. Icon & Emoji System

Import and use semantic icons and emojis:

```tsx
import { NAV_ICONS, PLAYER_ICONS, ACTION_ICONS } from '../config/icons';
import { MUSIC_EMOJIS, MOOD_EMOJIS } from '../config/emojis';

// Use in your component
<MaterialIcons name={NAV_ICONS.home} size={24} color="white" />
<Text>{MUSIC_EMOJIS.song}</Text>
```

**Files:**
- `src/config/icons.ts` - 60+ icons in 7 categories
- `src/config/emojis.ts` - 30+ emojis in 5 categories

---

### 2. Localization (i18n)

Get translated text for your component:

```tsx
import { useTranslation } from '../context/LocalizationContext';

const MyScreen = () => {
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <>
      <Text>{t('screens.home.searchPlaceholder')}</Text>
      <Button onPress={() => setLanguage('en')} title="English" />
    </>
  );
};
```

**Supported Languages:** Vietnamese (`vi`), English (`en`)

**Translation Structure:**
```
screens.home.searchPlaceholder
navigation.home
auth.login
actions.shareQR
```

**Files:**
- `src/context/LocalizationContext.tsx` - Context provider
- `src/locales/en.json` - English translations (180+ strings)
- `src/locales/vi.json` - Vietnamese translations (180+ strings)

---

### 3. Theme System

Use dynamic theme colors in your components:

```tsx
import { useTheme } from '../context/ThemeContext';
import { StyleSheet, View, Text } from 'react-native';

const MyComponent = () => {
  const { colors, theme, setTheme } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,  // Dynamic per theme
      borderColor: colors.border,
    },
    text: {
      color: colors.text,  // Automatic contrast in any theme
    }
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
      <Button onPress={() => setTheme('light')} title="Light Mode" />
    </View>
  );
};
```

**Available Themes:**
1. **dark** - Purple/lavender (Monu's signature)
2. **light** - Clean, modern neutral
3. **classic** - AMOLED with golden accents

**Color Tokens Available:**
- Text: `text`, `textSecondary`, `muted`
- Backgrounds: `bg`, `surface`, `surfaceLow`, `surfaceMid`, `surfaceDim`
- Accents: `accent`, `accentFill20`, `accentBorder35`
- Status: `success`, `error`, `warning`, `info`
- Gradients: `gradPurple`, `gradIndigo`, `gradNavy`, `gradDark`
- Card gradients: `cardHealingFrom`, `cardTrendingFrom`, etc.

**Files:**
- `src/config/themes.ts` - 3 complete theme definitions
- `src/context/ThemeContext.tsx` - Theme context and hook

---

### 4. Animation Utilities

Use intentional animation timing:

```tsx
import { ANIMATION_DURATIONS, ANIMATION_PRESETS } from '../config/animations';
import { Animated } from 'react-native';

const MyComponent = () => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Quick animation (150ms)
  Animated.timing(slideAnim, {
    toValue: 1,
    duration: ANIMATION_DURATIONS.quick,
    useNativeDriver: true,
  }).start();
  
  // Or use presets
  const config = ANIMATION_PRESETS.modalSlideIn;
};
```

**Duration Presets:**
- `quick` - 150ms (button press)
- `standard` - 300ms (normal transitions)
- `deliberate` - 400ms (noticeable changes)
- `slow` - 600ms (contemplative animations)
- `verySlow` - 800ms (special emphasis)

**Animation Presets:**
- `buttonPress`, `fadeIn`, `fadeOut`, `modalSlideIn`, `modalSlideOut`
- `listItemEnter`, `spin`, `bounce`, `pulse`

**File:**
- `src/config/animations.ts` - Animation presets and easing functions

---

## Implementation Priority

### Immediate (This Sprint)
- [ ] Add theme switcher to ProfileScreen
- [ ] Add language switcher to ProfileScreen
- [ ] Test theme switching in preview

### Short Term (Next 2 Sprints)
- [ ] Refactor HomeScreen to use `useTheme()` for all colors
- [ ] Refactor LibraryScreen to use `useTheme()` for all colors
- [ ] Refactor Player components (MiniPlayer, FullPlayerModal)
- [ ] Update all navigation/TabBar colors to use `useTheme()`

### Medium Term (Next 4-6 Sprints)
- [ ] Update remaining screens using refactoring guide
- [ ] Test all screens in all 3 themes
- [ ] Test all screens in all 2 languages
- [ ] Update documentation with theme/language features

---

## Code Examples

### Migrating a Component to Use Theme

**Before:**
```tsx
import { COLORS } from '../config/colors';

export const MyCard = () => (
  <View style={{ backgroundColor: COLORS.surface }}>
    <Text style={{ color: COLORS.white }}>Card content</Text>
  </View>
);
```

**After:**
```tsx
import { useTheme } from '../context/ThemeContext';

export const MyCard = () => {
  const { colors } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.text }}>Card content</Text>
    </View>
  );
};
```

### Migrating a Screen to Use Translations

**Before:**
```tsx
<Text>Tìm bài hát, nghệ sĩ...</Text>
<Text>Phát nhanh</Text>
```

**After:**
```tsx
import { useTranslation } from '../context/LocalizationContext';

const MyScreen = () => {
  const { t } = useTranslation();
  
  return (
    <>
      <Text>{t('screens.home.searchPlaceholder')}</Text>
      <Text>{t('screens.home.quickActions')}</Text>
    </>
  );
};
```

---

## Documentation Files

### Essential Reading
1. **REFACTORING_GUIDE.md** (387 lines)
   - Complete developer guide for all systems
   - Before/after code examples
   - Best practices and patterns
   - Troubleshooting section

2. **REFACTORING_COMPLETE.md** (380 lines)
   - Completion report and metrics
   - Technical achievements
   - Migration readiness
   - Next steps for implementation

---

## Testing Your Changes

### Theme Testing
1. Use `setTheme('dark')`, `setTheme('light')`, `setTheme('classic')`
2. Verify all colors are theme-aware
3. Check gradients render correctly
4. Test status bar styling

### Language Testing
1. Use `setLanguage('en')` or `setLanguage('vi')`
2. Verify all text updates
3. Check RTL readiness (if added)
4. Ensure no text truncation in either language

### Animation Testing
1. Verify timing feels responsive (not too fast/slow)
2. Check easing curves feel natural
3. Test on real devices (timing may vary)

---

## Common Patterns

### Using Multiple Hooks in a Component
```tsx
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';

const MyScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.text }}>{t('screens.myscreen.title')}</Text>
    </View>
  );
};
```

### Creating Theme-Aware StyleSheets
```tsx
const styles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
  }
});

// In component
const MyComponent = () => {
  const { colors } = useTheme();
  const dynamicStyles = styles(colors);
  // Use dynamicStyles...
};
```

### Handling Theme-Dependent Values
```tsx
const { colors, theme } = useTheme();

const accentColor = theme === 'classic' ? colors.accent : '#A78BFA';
const borderRadius = theme === 'light' ? 12 : 8;
```

---

## Troubleshooting

### Component Not Updating When Theme Changes
- Ensure component uses `useTheme()` hook
- Check component is not memoized without proper dependency
- Verify theme context is in provider stack (check App.tsx)

### Translation Key Returns the Key Itself
- Verify key exists in BOTH en.json and vi.json
- Check nested path is correct (use dot notation)
- Use fallback: `t('missing.key', 'Default text')`

### Icons Not Showing
- Verify icon library matches the icon constant
- Check icon name is valid for that library
- Confirm icon color contrasts with background

---

## Next Resources

- `src/config/icons.ts` - Icon library reference
- `src/config/emojis.ts` - Emoji reference
- `src/config/themes.ts` - Theme color reference
- `src/config/animations.ts` - Animation presets reference
- REFACTORING_GUIDE.md - Detailed migration guide
- REFACTORING_COMPLETE.md - Architecture overview

---

## Quick Help

**Q: How do I add a new translation key?**
A: Add the key to both `src/locales/en.json` and `src/locales/vi.json`, then use `t('path.to.key')` in your component.

**Q: How do I add a new theme?**
A: Add theme definition to `src/config/themes.ts`, add to THEMES record, and update ThemeName type in ThemeContext.

**Q: Can I use hardcoded colors?**
A: Prefer theme colors for consistency, but COLORS constant still works during transition period.

**Q: How do I test theme switching?**
A: Import `useTheme()` in any component and call `setTheme('dark'/'light'/'classic')`.

---

## Summary

You now have access to three powerful systems:
- ✅ **Icons/Emojis** - Centralized, easy to manage
- ✅ **Localization** - Multi-language support ready
- ✅ **Themes** - Three distinct visual designs
- ✅ **Animations** - Intentional motion timing

Start using them today to improve user experience and code maintainability!

