# Full Theme & I18n Implementation Roadmap

## Current Status
✓ **Completed:**
- Phase 1: Preparation & Audit
  - Expanded i18n keys (controls, labels, messages added to en.json & vi.json)
  - Created COLOR_MIGRATION_GUIDE.md
  - Created REFACTORING_TEMPLATE.md
  - Created SCREENS_PRIORITY.md
  - HomeScreen fully refactored ✓
  - All 6 new themes added to theme system
  - useHomeStats hook created for dynamic data

**In Progress:**
- Phase 2: Priority Group 1 Migration

**Remaining:**
- Complete LibraryScreen (138 style refs to update)
- Refactor 30 more screens systematically

---

## Recommended Approach for Remaining Work

### Option A: Manual Systematic Refactoring
**Best for:** Quality control, learning, customization
**Effort:** 155 hours across 4 weeks
**Process:**
1. Follow REFACTORING_TEMPLATE.md for each screen
2. Use COLOR_MIGRATION_GUIDE.md for color mappings
3. Test each screen with all 6 themes
4. Commit progress incrementally

### Option B: Hire Developer for Bulk Refactoring
**Best for:** Speed, consistency across large codebase
**Effort:** 40-50 hours (experienced developer)
**Process:**
1. Provide developer with this roadmap + templates
2. Developer works through SCREENS_PRIORITY.md order
3. Code review + testing in parallel
4. Deploy incrementally by screen group

### Option C: Hybrid Approach (RECOMMENDED)
**Best for:** Balance of speed and quality
**Process:**
1. **Week 1:** You refactor top 5 screens (Group 1)
   - LibraryScreen, ProfileScreen, DiscoverScreen, CreateScreen, SearchScreen
   - Use automated find-replace where possible
2. **Weeks 2-3:** Developer handles Groups 2 & 3 (18 screens)
3. **Week 4:** Final testing, validation, and polish

---

## Automated Refactoring Tools

### VS Code Find & Replace Patterns
These regex patterns can speed up refactoring significantly:

**1. Find hardcoded icon colors:**
```
color=["']#([0-9A-Fa-f]{6})["']
```
Replace with: `color={themeColors.$1}` (then manually map to correct token)

**2. Find hardcoded background colors:**
```
backgroundColor: ["']#([0-9A-Fa-f]{6})["']
```

**3. Add useTheme hook to component:**
```
const \{ (.+) \} = useTranslation\(\);
```
Replace with: `const { $1 } = useTranslation();\n  const { COLORS: themeColors } = useTheme();`

### Manual Spot-Checks Needed
- Verify color token mappings are contextually correct
- Test strings with i18n parameters (like `{count}`)
- Ensure style functions are called with `getStyles(themeColors)`

---

## Week-by-Week Implementation Plan

### Week 1: Core Screens (Group 1)
**Target:** 5 screens, 12-16 hours
- [ ] LibraryScreen - 1731 lines, 138 style refs (4-5h)
- [ ] ProfileScreen - medium complexity (2-3h)
- [ ] DiscoverScreen - medium complexity (2-3h)
- [ ] CreateScreen - lighter complexity (1-2h)
- [ ] SearchScreen - medium complexity (2-3h)

**Deliverables:**
- All 5 screens fully theme-aware
- All UI updates dynamically with theme/language change
- Full test coverage with all 6 themes

### Week 2: Detail Screens (Group 2)
**Target:** 8 screens, 15-20 hours
- [ ] PlaylistDetailScreen
- [ ] AlbumDetailScreen
- [ ] ArtistProfileScreen
- [ ] SettingsScreen
- [ ] PremiumScreen
- [ ] ProfileEditScreen
- [ ] HistoryScreen
- [ ] InsightsScreen

### Week 3: Other Screens (Group 3)
**Target:** 13 screens, 18-25 hours
- Auth screens (LoginScreen, RegisterScreen, onboarding screens)
- Artist screens
- Favorite/Following screens
- Other utility screens

### Week 4: Testing & Validation
**Target:** Full app testing, 10-15 hours
- [ ] Test all 32 screens with all 6 themes
- [ ] Test language switching (en ↔ vi)
- [ ] Verify WCAG AA contrast compliance
- [ ] Performance optimization
- [ ] Final UI polish

---

## Quality Checklist per Screen

```
[ ] Theme hooks imported (useTheme)
[ ] Theme hooks called (const { COLORS: themeColors } = useTheme())
[ ] Styles converted to getStyles(colors) function
[ ] Styles initialized in component (const styles = getStyles(themeColors))
[ ] All hardcoded colors replaced (6+ usually found per screen)
[ ] All hardcoded text replaced with t() calls
[ ] Missing i18n keys added to en.json
[ ] Missing i18n keys added to vi.json
[ ] Tested with dark theme
[ ] Tested with light theme
[ ] Tested with classic theme
[ ] Tested with sunset theme
[ ] Tested with ocean theme
[ ] Tested with neonGen theme
[ ] Tested language switching (en → vi → en)
[ ] No console errors or warnings
```

---

## Critical Success Factors

1. **Consistency:** Use templates and guides - no shortcuts
2. **Testing:** Every screen must work with all 6 themes
3. **i18n:** All text must be translatable
4. **Performance:** Memoize styles where used frequently
5. **Accessibility:** Ensure contrast meets WCAG AA standards

---

## Files Already Prepared

- ✓ `/vercel/share/v0-project/COLOR_MIGRATION_GUIDE.md` - Color token mapping
- ✓ `/vercel/share/v0-project/REFACTORING_TEMPLATE.md` - Step-by-step process
- ✓ `/vercel/share/v0-project/SCREENS_PRIORITY.md` - Prioritized screen list
- ✓ `/vercel/share/v0-project/src/locales/en.json` - Expanded i18n keys
- ✓ `/vercel/share/v0-project/src/locales/vi.json` - Vietnamese translations
- ✓ `/vercel/share/v0-project/src/config/themes.ts` - 6 theme variants

---

## Next Immediate Actions

1. **Read** REFACTORING_TEMPLATE.md
2. **Start** LibraryScreen refactoring (use Group 1 as template)
3. **Test** with all 6 themes after each screen
4. **Commit** progress after each Group completion
5. **Plan** for Weeks 2-4 accordingly

---

## Estimated Timeline

| Group | Duration | Hours | Start |
|-------|----------|-------|-------|
| Group 1 | Week 1 | 12-16 | Day 1 |
| Group 2 | Week 2 | 15-20 | Day 8 |
| Group 3 | Week 3 | 18-25 | Day 15 |
| Testing | Week 4 | 10-15 | Day 22 |
| **TOTAL** | 4 weeks | ~155 | - |

Or with developer assistance: 2 weeks at 50-60% faster pace.
