# Quick Start: Screen Refactoring

## 60-Second Setup

1. Open LibraryScreen or next screen from SCREENS_PRIORITY.md
2. Copy the 4-step template from REFACTORING_TEMPLATE.md
3. Follow the color mapping from COLOR_MIGRATION_GUIDE.md
4. Test with Settings → Theme switching

---

## The 5-Minute Refactoring Process

### 1. Import & Initialize (1 min)
```tsx
// In imports section:
import { useTheme } from '../context/ThemeContext';

// In component function:
const { COLORS: themeColors } = useTheme();
```

### 2. Convert Styles to Dynamic (2 min)
```tsx
// At bottom: Change from
const styles = StyleSheet.create({ ... })

// To:
const getStyles = (colors: typeof COLORS) => StyleSheet.create({ ... })

// In component body, add:
const styles = getStyles(themeColors);
```

### 3. Replace Colors (1 min)
Find-replace patterns:
- `#ffffff` → `themeColors.text`
- `#1a1a1a` → `themeColors.bg`
- `#4ade80` → `themeColors.success`
- See full mapping in COLOR_MIGRATION_GUIDE.md

### 4. Replace Text (1 min)
- `<Text>Play</Text>` → `<Text>{t('controls.play')}</Text>`
- `<Text>Delete</Text>` → `<Text>{t('controls.delete')}</Text>`
- See all keys in en.json

---

## Copy-Paste Templates

### Template 1: Import Section
```tsx
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
```

### Template 2: Component Hook
```tsx
const { COLORS: themeColors } = useTheme();
const { t } = useTranslation();
const styles = getStyles(themeColors);
```

### Template 3: Convert Styles Function
```tsx
const getStyles = (colors: typeof COLORS) => StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    color: colors.text,
  },
  // ... rest of your styles, replacing COLORS references
});
```

### Template 4: Icon Color Updates
```tsx
// Before:
<Icon color="#ffffff" size={24} />

// After:
<Icon color={themeColors.text} size={24} />
```

---

## Common Color Replacements

| Visual Element | Color Token |
|---|---|
| Main text | `themeColors.text` |
| Secondary text | `themeColors.textSecondary` |
| Muted/labels | `themeColors.muted` |
| Backgrounds | `themeColors.bg` |
| Cards/surfaces | `themeColors.surface` |
| Buttons/accents | `themeColors.accent` |
| Success/checkmarks | `themeColors.success` |
| Errors/warnings | `themeColors.error` |
| Borders | `themeColors.border` |

---

## Common String Replacements

| Element | i18n Key |
|---|---|
| "Play" button | `t('controls.play')` |
| "Pause" button | `t('controls.pause')` |
| "Delete" action | `t('controls.delete')` |
| "Loading..." | `t('messages.loading')` |
| "No data" | `t('messages.noData')` |
| "Try Again" | `t('common.tryAgain')` |

See all available keys in `/src/locales/en.json`

---

## Test Checklist (5 min)

```bash
# After refactoring a screen:
1. Open app in simulator
2. Navigate to the screen
3. Settings → Change theme → dark/light/classic/sunset/ocean/neonGen
4. Verify all colors changed correctly ✓
5. Settings → Change language → English/Vietnamese
6. Verify all text changed correctly ✓
7. Check for console errors/warnings ✓
```

---

## Troubleshooting

**Colors not updating?**
- Did you call `const styles = getStyles(themeColors);` in component?
- Are you using `themeColors` in JSX (e.g., icon colors)?

**Text not translating?**
- Check the i18n key exists in both en.json AND vi.json
- Did you add the key to BOTH files?

**Console errors?**
- Make sure useTheme and useTranslation are imported
- Check that StyleSheet keys match between getStyles function and usage

---

## Pro Tips

1. **Batch Find-Replace:** Use VS Code regex find-replace to speed up color replacements
2. **Copy Colors:** Copy color values from COLORS constant to find exact matches
3. **Test Early:** Test theme switching after every 5-10 color replacements
4. **Commit Often:** Commit after each screen for easy rollback if needed
5. **Leave Comments:** If you add complex logic, comment for next person

---

## Current Progress

- ✓ HomeScreen - DONE
- ⏳ LibraryScreen - 1731 lines, 138 style refs (up next)
- Remaining: 30 screens in priority order

**Your Goal:** Refactor 1-2 screens per day following this process.

**Success Criteria:** Every screen works perfectly with all 6 themes + both languages.
