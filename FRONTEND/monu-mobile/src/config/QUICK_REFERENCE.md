# Design System Quick Reference

Keep this handy when building components. No magic numbers, no hardcoded emojis!

## Icons Quick Reference

```tsx
import { ICONS, ICON_SIZES } from './icons';

// Music
ICONS.song              // 🎵
ICONS.headphones        // 🎧
ICONS.guitar            // 🎸
ICONS.piano             // 🎹
ICONS.microphone        // 🎤

// Actions
ICONS.share             // ↗
ICONS.discovery         // 🌟
ICONS.qr                // ⬛
ICONS.arrow_right       // ›
ICONS.favorite          // ❤️
ICONS.settings          // ⚙️

// Status
ICONS.lock              // 🔒
ICONS.public            // 🌐
ICONS.banned            // 🚫

// Greetings
ICONS.wave              // 👋
ICONS.sparkles          // ✨
ICONS.fire              // 🔥
ICONS.star              // ⭐

// Icon Sizes
ICON_SIZES.xs  // 16
ICON_SIZES.sm  // 20
ICON_SIZES.md  // 24
ICON_SIZES.lg  // 32
ICON_SIZES.xl  // 48
ICON_SIZES.xxl // 56
```

## Spacing Quick Reference

```tsx
import { SPACING, LAYOUT_PRESETS } from './spacing';

// Spacing Values
SPACING.xs   // 4
SPACING.sm   // 8
SPACING.md   // 16 (standard)
SPACING.lg   // 24
SPACING.xl   // 32
SPACING.xxl  // 48

// Common Shortcuts
SPACING.padding        // 16
SPACING.margin         // 16
SPACING.gap            // 12
SPACING.gapLg          // 16
SPACING.gapXl          // 24

// Layout Presets
LAYOUT_PRESETS.centerFull   // flex: 1, centered
LAYOUT_PRESETS.rowBetween   // row with space-between
LAYOUT_PRESETS.rowCenter    // row with gap
LAYOUT_PRESETS.card         // card background, padding, radius
LAYOUT_PRESETS.header       // header padding
LAYOUT_PRESETS.section      // section padding and margin
```

## Typography Quick Reference

```tsx
import { TEXT_STYLES } from './typography';

// Headings (largest to smallest)
TEXT_STYLES.h1              // 34px, extrabold, tight line-height
TEXT_STYLES.h2              // 32px, extrabold, tight
TEXT_STYLES.h3              // 26px, extrabold, tight
TEXT_STYLES.h4              // 22px, bold, tight
TEXT_STYLES.h5              // 20px, bold, normal
TEXT_STYLES.h6              // 18px, bold, normal

// Body Text
TEXT_STYLES.body            // 14px, normal, relaxed (standard)
TEXT_STYLES.bodyLg          // 15px, normal, relaxed (larger)
TEXT_STYLES.bodySm          // 13px, normal, relaxed (smaller)

// Buttons
TEXT_STYLES.button          // 16px, bold, tight
TEXT_STYLES.buttonSm        // 14px, semibold, tight

// Labels & Captions
TEXT_STYLES.label           // 12px, bold, uppercase, tight
TEXT_STYLES.caption         // 12px, normal, tight

// Semantic
TEXT_STYLES.hint            // 13px, gray, helpful text
TEXT_STYLES.muted           // 13px, gray, disabled state
TEXT_STYLES.accent          // applies accent color
TEXT_STYLES.error           // applies error color
TEXT_STYLES.success         // applies success color
```

## Real-World Examples

### 1. Song Card

```tsx
<View style={[LAYOUT_PRESETS.card, SPACING.shadowMedium]}>
  <Text style={TEXT_STYLES.h6}>
    {ICONS.song} Song Title
  </Text>
  <Text style={[TEXT_STYLES.bodySm, { marginTop: SPACING.sm }]}>
    by Artist
  </Text>
</View>
```

### 2. Form Field

```tsx
<View style={LAYOUT_PRESETS.section}>
  <Text style={TEXT_STYLES.label}>Your Name</Text>
  <TextInput
    style={{
      ...TEXT_STYLES.bodyLg,
      padding: SPACING.md,
      borderRadius: SPACING.buttonRadius,
      borderColor: COLORS.glass15,
      borderWidth: 1,
      marginTop: SPACING.sm,
    }}
  />
</View>
```

### 3. Header with Icon

```tsx
<View style={[LAYOUT_PRESETS.rowBetween, LAYOUT_PRESETS.header]}>
  <Text style={TEXT_STYLES.h4}>My Library</Text>
  <Pressable>
    <Text style={{ fontSize: ICON_SIZES.lg }}>
      {ICONS.settings}
    </Text>
  </Pressable>
</View>
```

### 4. Button

```tsx
<Pressable style={{ borderRadius: SPACING.buttonRadius }}>
  <LinearGradient colors={[...]} 
    style={{ minHeight: SPACING.buttonHeight }}>
    <Text style={TEXT_STYLES.button}>{ICONS.share} Share</Text>
  </LinearGradient>
</Pressable>
```

### 5. Action Section

```tsx
<View style={[LAYOUT_PRESETS.section, { gap: SPACING.gapXl }]}>
  {items.map(item => (
    <Pressable key={item.id} style={LAYOUT_PRESETS.rowBetween}>
      <View>
        <Text style={TEXT_STYLES.h6}>{item.icon} {item.title}</Text>
        <Text style={TEXT_STYLES.hint}>{item.description}</Text>
      </View>
      <Text style={{ fontSize: ICON_SIZES.lg }}>
        {ICONS.arrow_right}
      </Text>
    </Pressable>
  ))}
</View>
```

## Common Patterns

### Centered Loading State
```tsx
<View style={LAYOUT_PRESETS.centerFull}>
  <ActivityIndicator />
  <Text style={[TEXT_STYLES.hint, { marginTop: SPACING.md }]}>
    Loading...
  </Text>
</View>
```

### Empty State
```tsx
<View style={[LAYOUT_PRESETS.centerFull, { gap: SPACING.lg }]}>
  <Text style={{ fontSize: ICON_SIZES.xxl }}>{ICONS.song}</Text>
  <Text style={TEXT_STYLES.h4}>No Songs Yet</Text>
  <Text style={TEXT_STYLES.muted}>Add your first song to get started</Text>
</View>
```

### Modal Card
```tsx
<View style={[
  LAYOUT_PRESETS.card,
  SPACING.shadowXl,
  { borderRadius: SPACING.modalRadius, padding: SPACING.lg }
]}>
  <Text style={TEXT_STYLES.h4}>Dialog Title</Text>
  <Text style={[TEXT_STYLES.bodySm, { marginTop: SPACING.md }]}>
    Dialog content goes here
  </Text>
</View>
```

### Badge/Chip
```tsx
<View style={{
  backgroundColor: COLORS.accentFill25,
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.sm,
  borderRadius: 999,
}}>
  <Text style={TEXT_STYLES.label}>{ICONS.sparkles} New</Text>
</View>
```

## Pro Tips

✅ **Use TypeScript**: `ICONS` is typed, so you get autocomplete  
✅ **Combine Presets**: `[LAYOUT_PRESETS.card, LAYOUT_PRESETS.rowCenter]`  
✅ **Spread Styles**: `{ ...TEXT_STYLES.h4, marginBottom: SPACING.md }`  
✅ **Array Notation**: `style={[baseStyle, conditionalStyle]}`  
✅ **Create Aliases**: `const centerContainer = LAYOUT_PRESETS.centerFull`  

❌ **Don't**: Hardcode magic numbers (16, 24, 32)  
❌ **Don't**: Create custom color values (use COLORS)  
❌ **Don't**: Ignore text size scale  
❌ **Don't**: Mix preset and custom spacing  

## Troubleshooting

**Icons not showing?** → Check import path and use `ICONS.name`  
**Text too small/large?** → Use TEXT_SIZES constants  
**Spacing feels off?** → Use SPACING constants in multiples  
**Layout looks weird?** → Check LAYOUT_PRESETS for your pattern  

## Getting Help

1. Check `DESIGN_SYSTEM.md` for detailed explanation
2. Look at refactored files (HomeScreen, LibraryScreen, etc.)
3. Use the examples above as templates
4. Search for similar patterns in other files

---

**Remember:** Consistency creates beauty. Use the system! 🎨
