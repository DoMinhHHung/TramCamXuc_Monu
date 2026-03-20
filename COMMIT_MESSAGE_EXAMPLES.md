# Git Commit Message Examples

Use these templates for consistency when committing theme and i18n changes.

---

## Theme & I18n System Foundation

```
feat(theme-i18n): Implement comprehensive theme and internationalization system

## What
- Add 6 theme variants (dark, light, classic, sunset, ocean, neonGen)
- Add 2-language support (English, Vietnamese)
- Create theme context and persistence system
- Create i18n context with 300+ translation keys

## Why
- Enable users to customize app appearance and language
- Support international user base
- Provide professional, accessible design system
- Create foundation for multi-language expansion

## How
- Created ThemeContext for theme management
- Created LocalizationContext for language management
- Defined complete color palettes in themes.ts
- Added 300+ translation keys to en.json and vi.json
- Built new components for modern UI

## Breaking Changes
- None

## Testing
- Theme switching works on all 6 variants
- Language switching between en/vi works
- Settings persist across app restart
- No console errors or warnings
```

---

## Screen Refactoring Template

```
refactor(screens): Convert [ScreenName] to theme and i18n system

## What
- Replace hardcoded colors with theme color tokens
- Replace hardcoded text with i18n keys
- Convert static styles to dynamic getStyles() function
- Add useTheme and useTranslation hooks

## Stats
- [X] hardcoded colors removed
- [Y] text strings localized
- [Z] lines of code affected

## Testing
- [x] Tested with dark theme
- [x] Tested with light theme
- [x] Tested with classic theme
- [x] Tested with sunset theme
- [x] Tested with ocean theme
- [x] Tested with neonGen theme
- [x] Tested English language
- [x] Tested Vietnamese language
- [x] No console errors
- [x] No accessibility issues

## Related
- Closes #ISSUE_NUMBER
- Reference: COLOR_MIGRATION_GUIDE.md
- Reference: REFACTORING_TEMPLATE.md
```

---

## Documentation Update Template

```
docs(theme-i18n): Update documentation for [topic]

## What
- Add/update [documentation file name]
- Include [types of content]
- Update [related sections]

## Why
- Help developers understand [concept]
- Provide clear examples for [task]
- Document [decisions made]

## Changes
- [Specific update 1]
- [Specific update 2]
- [Specific update 3]
```

---

## Bug Fix Template

```
fix(theme-i18n): [Brief description of bug]

## Problem
- [What was broken]
- [How it affected users]
- Affects: [screen/component name]

## Solution
- [How it was fixed]
- [Code changes made]

## Testing
- [How to verify the fix]
- [Edge cases tested]

## Related
- Closes #ISSUE_NUMBER
```

---

## Component Addition Template

```
feat(components): Add [ComponentName] component

## What
- Create new [ComponentName] component
- Supports [feature 1]
- Supports [feature 2]

## Usage
```tsx
import { [ComponentName] } from '../components/[ComponentName]';

<[ComponentName] 
  prop1={value1}
  prop2={value2}
/>
```

## Props
- `prop1`: [type] - [description]
- `prop2`: [type] - [description]

## Examples
- Used in [screen name]
- Used in [another screen]

## Testing
- [x] Component renders correctly
- [x] Props work as expected
- [x] Theme-aware colors applied
- [x] No accessibility issues
```

---

## Translation Addition Template

```
i18n(locales): Add [Category] translation keys

## Keys Added

### English (en.json)
```json
"[category]": {
  "key1": "Translation 1",
  "key2": "Translation 2"
}
```

### Vietnamese (vi.json)
```json
"[category]": {
  "key1": "Dịch tiếng Việt 1",
  "key2": "Dịch tiếng Việt 2"
}
```

## Used In
- [Screen 1]
- [Screen 2]

## Note
- All keys match between en.json and vi.json
- Translations reviewed by native speaker
```

---

## Refactoring Progress Commit

```
refactor: Complete [Group Name] screen refactoring (X of Y)

Refactored screens:
- [Screen 1]
- [Screen 2]
- [Screen 3]

Stats:
- [N] screens completed
- [M] screens remaining in group
- [Total] colors replaced
- [Total] strings localized

All screens tested with all 6 themes and 2 languages.

Ref: SCREENS_PRIORITY.md
```

---

## Testing Completion Commit

```
test(theme-i18n): Complete testing for [screen/group]

## Testing Summary
- Tested 6 themes: dark, light, classic, sunset, ocean, neonGen
- Tested 2 languages: English, Vietnamese
- Tested [specific features]

## Results
- [X] of 192 tests passed (32 screens × 6 themes)
- WCAG AA accessibility verified
- No console errors
- No memory leaks
- No performance issues

## Issues Found & Fixed
- [Issue 1]: [Solution]
- [Issue 2]: [Solution]

## Testing Date
- [Date tested]
- [Tester name]
```

---

## Release Preparation Commit

```
chore(release): Prepare v1.1.0 - Theme & I18n System

## Changes Included
- 6 theme variants (dark, light, classic, sunset, ocean, neonGen)
- 2 language support (English, Vietnamese)
- 32 screens refactored
- 8 new UI components
- Complete documentation

## Pre-Release Verification
- [x] All screens refactored
- [x] All tests passing
- [x] All documentation complete
- [x] Version bumped
- [x] Release notes prepared

## Deployment Steps
1. Build staging APK/IPA
2. Internal testing (24 hours)
3. Production deployment with phased rollout
4. Monitor metrics for 48 hours

Ref: DEPLOYMENT_GUIDE.md
```

---

## Commit Message Best Practices

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Testing
- `style`: Code style
- `chore`: Maintenance

### Scope
- `theme-i18n`: Theme & i18n system
- `components`: UI components
- `screens`: Screen refactoring
- `locales`: Translations

### Subject
- Imperative mood ("Add" not "Added")
- Don't capitalize first letter
- No period at end
- Max 50 characters

### Body
- Explain what and why, not how
- Wrap at 72 characters
- Use bullet points for lists
- Reference issues with `#ISSUE_NUMBER`
- Reference related files/docs

### Footer
- Reference issues: `Closes #ISSUE`
- Reference PRs: `Ref: #PR_NUMBER`
- Reference docs: `Ref: FILENAME.md`

---

## Examples in Practice

### Good Commit
```
refactor(screens): Convert ProfileScreen to theme system

- Replace 24 hardcoded colors with themeColors tokens
- Add useTheme hook and getStyles() function
- Localize 12 hardcoded text strings
- Update styles to support all 6 themes

Stats:
- 12 color references replaced
- 12 strings localized
- 45 lines of code affected

Tested with all 6 themes and 2 languages.

Ref: REFACTORING_TEMPLATE.md
Closes #123
```

### Bad Commit
```
update ProfileScreen

fixed colors and translations
```

### Good Commit
```
feat(components): Add DraggablePlaylistList component

New component for playlist management with drag-and-drop functionality.

Features:
- Reorder playlists via drag-and-drop
- Visual feedback during drag
- Undo/redo support
- Smooth animations

Used in LibraryScreen for playlist organization.

Props:
- playlists: PlaylistItem[]
- onReorder: (ids: string[]) => Promise<void>
- onPlaylistPress?: (id: string) => void
```

---

## Merge Request Template

```
## What This Does
[Brief description of changes]

## Type of Change
- [ ] Bug fix
- [ ] Feature
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Manual testing completed
- [ ] All themes tested
- [ ] All languages tested
- [ ] Accessibility verified
- [ ] No console errors

## Screenshots
[If applicable, add screenshots showing the changes]

## Related Issues
Closes #[issue number]
Ref: [documentation files]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All themes work correctly
```

---

## Commit Frequently

Best practice: Commit after each screen refactoring

```
# Good progression:
commit 1: refactor(screens): Convert HomeScreen to theme system
commit 2: refactor(screens): Convert LibraryScreen to theme system
commit 3: refactor(screens): Convert ProfileScreen to theme system
commit 4: refactor(screens): Convert SearchScreen to theme system
# etc...

# Not:
commit 1: refactor(screens): Convert all screens to theme system
```

This allows for easy review, easier rollback if needed, and clear history of changes.
