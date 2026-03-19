# Monu Design System Guide

This guide explains how to use the centralized design system to maintain consistency, reduce visual noise, and improve code maintainability.

## Overview

The design system consists of four main configuration files:

- **colors.ts** - Color tokens (already existed)
- **icons.ts** - Centralized icon/emoji definitions
- **spacing.ts** - 8pt grid system and layout presets
- **typography.ts** - Text styles and hierarchy

## Icons System

### Why Centralized Icons?

Hardcoded emojis scattered throughout the codebase create:
- Inconsistent icon choices
- Difficult maintenance (changing all instances requires grep)
- Visual noise and reduced clarity

### How to Use Icons

```tsx
import { ICONS, ICON_SIZES } from '../../config/icons';

// Simple usage
<Text style={{ fontSize: ICON_SIZES.lg }}>{ICONS.song}</Text>

// With icon styles
<Text style={ICON_STYLES.xl}>{ICONS.microphone}</Text>

// In lists
const tabs = [
  { label: 'Songs', icon: ICONS.song },
  { label: 'Artists', icon: ICONS.microphone },
];
```

### Available Icon Categories

- **MUSIC_ICONS**: song, headphones, guitar, piano, microphone, music_note, disk, playlist
- **ACTION_ICONS**: share, qr, discovery, settings, favorite, add, checkmark, close, more, arrow_right, arrow_left
- **STATUS_ICONS**: lock, public, banned, loading, success, error, info
- **UI_ICONS**: sparkles, document, paperclip, upload, download, bell, search, home, user, clock, link, lock_alt, volume
- **GREETING_ICONS**: wave, tada, rocket, star, fire, zap, crown

### Icon Size Reference

```
xs: 16    // Inline icons
sm: 20    // Buttons, tabs
md: 24    // Standard elements
lg: 32    // Large buttons, cards
xl: 48    // Hero sections
xxl: 56   // Large displays
xxxl: 64  // Full-screen heroes
```

## Spacing System

### Why 8pt Grid?

- Creates visual harmony and rhythm
- Easier for designers and developers to communicate
- Simplifies responsive design
- Reduces decision fatigue

### Spacing Values

```
xs: 4     // Micro spacing
sm: 8     // Tight spacing
md: 16    // Standard padding
lg: 24    // Section spacing
xl: 32    // Major sections
xxl: 48   // Page spacing
```

### Layout Presets

Avoid repeating common patterns:

```tsx
import { LAYOUT_PRESETS } from '../../config/spacing';

// Instead of:
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

// Use:
<View style={LAYOUT_PRESETS.centerFull}>

// Or combine with other styles:
<View style={[LAYOUT_PRESETS.card, styles.customCard]}>
```

### Available Presets

- **centerFull** - Centered container (flex: 1)
- **rowBetween** - Row with space-between alignment
- **rowCenter** - Row with centered items and gap
- **columnCenter** - Column with centered content
- **card** - Basic card styling
- **header** - Header padding
- **section** - Section padding and margin

## Typography System

### Why Standardized Typography?

- Creates clear visual hierarchy
- Reduces decision fatigue
- Makes the app feel more polished and intentional
- Simplifies translations and responsive design

### Text Style Presets

```tsx
import { TEXT_STYLES } from '../../config/typography';

// Headings
<Text style={TEXT_STYLES.h1}>Page Title</Text>
<Text style={TEXT_STYLES.h3}>Section Title</Text>

// Body text
<Text style={TEXT_STYLES.body}>Regular paragraph</Text>
<Text style={TEXT_STYLES.bodyLg}>Larger body text</Text>
<Text style={TEXT_STYLES.bodySm}>Small description</Text>

// Labels
<Text style={TEXT_STYLES.label}>REQUIRED FIELD</Text>
<Text style={TEXT_STYLES.caption}>Small caption</Text>

// Semantic variants
<Text style={TEXT_STYLES.hint}>Helpful tip</Text>
<Text style={TEXT_STYLES.muted}>Disabled state</Text>
<Text style={TEXT_STYLES.accent}>Accent color</Text>
<Text style={TEXT_STYLES.error}>Error message</Text>
```

### Sizing Reference

```
h1: 34px  // Hero titles
h2: 32px  // Page titles
h3: 26px  // Section titles
h4: 22px  // Larger headings
h5: 20px  // Headings
h6: 18px  // Card titles
lg: 15px  // Primary text
md: 14px  // Body text
sm: 13px  // Descriptions
xs: 12px  // Captions
```

## Practical Examples

### Example 1: Card Component

```tsx
import { COLORS } from './config/colors';
import { SPACING, LAYOUT_PRESETS } from './config/spacing';
import { TEXT_STYLES } from './config/typography';
import { ICONS, ICON_SIZES } from './config/icons';

const CardComponent = () => (
  <View style={[
    LAYOUT_PRESETS.card,
    SPACING.shadowMedium,
  ]}>
    <Text style={TEXT_STYLES.h6}>{ICONS.song} Song Title</Text>
    <Text style={[TEXT_STYLES.bodySm, { marginTop: SPACING.sm }]}>
      by Artist Name
    </Text>
  </View>
);
```

### Example 2: Form Section

```tsx
const FormSection = () => (
  <View style={LAYOUT_PRESETS.section}>
    <Text style={TEXT_STYLES.label}>Your Name</Text>
    <TextInput
      style={{
        ...TEXT_STYLES.bodyLg,
        paddingHorizontal: SPACING.inputPaddingX,
        paddingVertical: SPACING.inputPaddingY,
        borderRadius: SPACING.buttonRadius,
        borderColor: COLORS.glass15,
        marginTop: SPACING.sm,
      }}
    />
  </View>
);
```

### Example 3: Header with Icon

```tsx
const Header = () => (
  <View style={[LAYOUT_PRESETS.rowBetween, LAYOUT_PRESETS.header]}>
    <Text style={TEXT_STYLES.h4}>My Library</Text>
    <Pressable>
      <Text style={{ fontSize: ICON_SIZES.lg }}>
        {ICONS.settings}
      </Text>
    </Pressable>
  </View>
);
```

## Best Practices

### ✅ Do

- Use icon names instead of emojis: `ICONS.song` instead of `'🎵'`
- Apply text styles from presets: `TEXT_STYLES.h3` instead of inline styles
- Use spacing constants: `SPACING.md` instead of `16`
- Apply layout presets when possible: `LAYOUT_PRESETS.centerFull`
- Use semantic color names from `COLORS` object
- Keep custom styles minimal - only for unique cases

### ❌ Don't

- Hardcode emojis in components
- Create inline text styles for common patterns
- Use magic numbers for spacing (16, 24, 32, etc.)
- Create duplicate layouts (multiple `flex: 1` definitions)
- Ignore the design system for "just this one component"
- Use arbitrary font sizes

## Migration Guide

When refactoring existing code:

1. Replace hardcoded emojis with `ICONS.*`
2. Replace inline text styles with `TEXT_STYLES.*`
3. Replace magic numbers with `SPACING.*`
4. Replace common layout patterns with `LAYOUT_PRESETS.*`

Example:

```tsx
// Before
<Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>
  🎵 Title
</Text>

// After
<Text style={[TEXT_STYLES.h6, { marginBottom: SPACING.sm }]}>
  {ICONS.song} Title
</Text>
```

## Benefits

✨ **Consistency** - Same patterns used everywhere  
🎨 **Visual Harmony** - 8pt grid creates natural rhythm  
🚀 **Faster Development** - No design decisions needed for common patterns  
📚 **Easy Maintenance** - Change system once, update everywhere  
♿ **Accessibility** - Consistent sizing and spacing help readability  
🌍 **Scalability** - New designs easily integrated into system  

---

For questions or additions to the design system, reference the config files in `src/config/`.
