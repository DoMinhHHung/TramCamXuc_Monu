# Screen Theme & I18n Refactoring Template

Use this template for each screen refactoring to maintain consistency.

## Step 1: Add Hook Imports
```tsx
// Add to imports:
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext'; // if not already present
```

## Step 2: Get Theme Colors in Component
```tsx
const { COLORS: themeColors } = useTheme();
const { t } = useTranslation(); // if not already present
```

## Step 3: Convert Static Styles to Dynamic
**BEFORE:**
```tsx
const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a1a', color: '#ffffff' }
});
```

**AFTER:**
```tsx
const getStyles = (colors: typeof COLORS) => StyleSheet.create({
  container: { backgroundColor: colors.bg, color: colors.text }
});

// Then in component body:
const styles = getStyles(themeColors);
```

## Step 4: Replace Hardcoded Colors

### Icon Colors
```tsx
// BEFORE
<Icon color="#ffffff" />

// AFTER
<Icon color={themeColors.text} />
```

### ActivityIndicator Colors
```tsx
// BEFORE
<ActivityIndicator color="#4ade80" />

// AFTER
<ActivityIndicator color={themeColors.success} />
```

## Step 5: Replace Hardcoded Strings

### Common Patterns
```tsx
// BEFORE
<Text>Play</Text>
<Text>Delete</Text>
<Text>Loading...</Text>

// AFTER
<Text>{t('controls.play')}</Text>
<Text>{t('controls.delete')}</Text>
<Text>{t('messages.loading')}</Text>
```

## Step 6: Test Theme Switching
1. Change theme in Settings
2. Verify all colors update dynamically
3. Test with all 6 themes:
   - dark, light, classic, sunset, ocean, neonGen

## Color Token Mapping

| Use Case | Token |
|----------|-------|
| Main background | colors.bg |
| Card/container | colors.surface |
| Nested container | colors.surfaceMid |
| Primary text | colors.text |
| Secondary text | colors.textSecondary |
| Muted/label text | colors.muted |
| Borders | colors.border |
| Dividers | colors.divider |
| Accent/buttons | colors.accent |
| Success states | colors.success |
| Error states | colors.error |
| Warning states | colors.warning |
| Info/links | colors.info |

## i18n Key Structure

- `controls.*` - Action buttons (play, pause, like, follow, etc.)
- `labels.*` - Static labels (duration, artist, album, etc.)
- `messages.*` - User feedback (loading, success, error, empty states)
- `screens.*` - Screen-specific content
- `common.*` - Reusable strings

## Checklist

- [ ] Added theme hooks
- [ ] Converted styles to dynamic function
- [ ] Initialized styles in component
- [ ] Replaced all hardcoded colors
- [ ] Replaced all hardcoded text strings
- [ ] Added missing i18n keys to en.json
- [ ] Added missing i18n keys to vi.json
- [ ] Tested with multiple themes
- [ ] Tested language switching
