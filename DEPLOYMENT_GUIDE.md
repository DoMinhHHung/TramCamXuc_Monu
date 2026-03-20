# Deployment Guide - Theme & I18n System

## Pre-Deployment Checklist

### Code Quality
- [ ] All 32 screens refactored following REFACTORING_TEMPLATE.md
- [ ] No hardcoded colors remaining (except where intentional)
- [ ] No hardcoded English text in screens
- [ ] All new i18n keys added to both en.json and vi.json
- [ ] Code follows project conventions
- [ ] Code reviewed by team lead

### Testing Completion
- [ ] All 192 theme tests passed (32 screens × 6 themes)
- [ ] All 64 language tests passed (32 screens × 2 languages)
- [ ] Accessibility compliance verified (WCAG AA)
- [ ] Performance testing passed
- [ ] No console errors or warnings
- [ ] Bug reports resolved or documented

### Documentation
- [ ] QUICK_START_REFACTORING.md provided to team
- [ ] REFACTORING_TEMPLATE.md available for reference
- [ ] COLOR_MIGRATION_GUIDE.md completed
- [ ] SCREENS_PRIORITY.md documented
- [ ] IMPLEMENTATION_ROADMAP.md finalized
- [ ] TESTING_GUIDE.md completed

### Dependencies
- [ ] All new packages installed (if any)
- [ ] No deprecated dependencies
- [ ] Package versions compatible with project
- [ ] Lock file updated

---

## Deployment Steps

### Step 1: Final Code Review (30 min)
```bash
# Review all changes
git log --oneline [current-branch] -20

# Check for remaining COLORS references (should be minimal)
grep -r "COLORS\." src/screens/ | grep -v "themeColors\|const COLORS"

# Check for remaining hardcoded text (should be none)
grep -r "\"[A-Z]" src/screens/ | grep "<Text" | head -20
```

### Step 2: Build Verification (15 min)
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules
rm package-lock.json

# Reinstall dependencies
npm install

# Check for build errors
npm run build

# If using Expo
expo prebuild --clean
```

### Step 3: Version Bump (5 min)
```bash
# Update version in package.json
# Example: 1.0.0 → 1.1.0 (for feature release)

npm version minor --message "Add theme and i18n system"
```

### Step 4: Create Release Notes (15 min)

**Template:**
```markdown
# Release v1.1.0 - Theme & Internationalization System

## Features
- Added 6 beautiful theme variants:
  - Dark, Light, Classic (existing)
  - Sunset (warm luxury theme)
  - Ocean (cool modern theme)
  - Neon Gen Z (high contrast vibrant theme)
  
- Added internationalization support:
  - English (en)
  - Vietnamese (vi)
  - 300+ translated strings
  
- Dynamic theme switching without app restart
- Theme and language preferences persist
- New components:
  - GlassCard, LuxuryButton, PremiumBadge
  - PlaylistCard, AlbumCard, ArtistCardEnhanced
  - GenreCard, DraggablePlaylistList

## Improvements
- Enhanced HomeScreen with dynamic content
- Improved visual depth with luxury touches
- Modern Gen Z aesthetic
- Full accessibility compliance (WCAG AA)

## Bug Fixes
- [List any bugs fixed during implementation]

## Breaking Changes
- None

## Migration Guide
No migration needed. Existing users get themes automatically.

## Contributors
- [Team names]

## Testing
- Tested on 32 screens
- All 6 themes verified
- Both languages verified
- Accessibility compliance confirmed
```

### Step 5: Staging Deployment (30 min)

**iOS:**
```bash
# Build for TestFlight
eas build --platform ios

# Wait for build to complete
# Upload to TestFlight
# Test on real devices for 24 hours
```

**Android:**
```bash
# Build for Google Play Console
eas build --platform android

# Wait for build to complete
# Upload to internal testing track
# Test on real devices for 24 hours
```

### Step 6: Internal Testing (24 hours)

**Testing Team Verification:**
- [ ] All themes work on iOS real device
- [ ] All themes work on Android real device
- [ ] Both languages work correctly
- [ ] Performance is acceptable
- [ ] No crashes or major bugs
- [ ] User experience is smooth

**Device Matrix:**
```
iOS:
  [ ] iPhone SE (small screen)
  [ ] iPhone 12 (medium screen)
  [ ] iPhone 14 Pro Max (large screen)

Android:
  [ ] Pixel 5a (small screen)
  [ ] Samsung Galaxy A50 (medium)
  [ ] Samsung Galaxy S21 Ultra (large)
```

### Step 7: Production Deployment

**Phased Rollout (Recommended):**
```
Day 1: 10% of users
Day 2: 25% of users
Day 3: 50% of users
Day 4: 100% of users
```

**Manual Rollout:**
```bash
# iOS - App Store
eas submit --platform ios --latest

# Android - Google Play Store
eas submit --platform android --latest
```

### Step 8: Post-Deployment Monitoring (24-48 hours)

**Monitor Metrics:**
- [ ] Crash rate normal (< 0.1%)
- [ ] No spike in support tickets
- [ ] User ratings stable or improving
- [ ] Performance metrics normal
- [ ] No unusual error logs

**Monitoring Tools:**
- Sentry/Bugsnag (error tracking)
- Firebase Analytics (usage metrics)
- App Store Analytics (ratings, reviews)
- Support system (user reports)

---

## Rollback Plan (If Needed)

### Immediate Rollback
```bash
# If critical issue found, rollback immediately

# Revert to previous version tag
git checkout [previous-version-tag]

# Rebuild and redeploy
npm install
npm run build
eas build --platform ios --latest
eas build --platform android --latest
```

### Known Issues & Workarounds
```markdown
# Known Issues with Theme System

## Issue: Theme not persisting after app restart
**Workaround:** Check AsyncStorage permissions in app.json
**Status:** Fixed in build #2

## Issue: Vietnamese text overflow in some screens
**Workaround:** Increase line-height temporarily
**Status:** Fixed in build #3
```

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor user feedback
- [ ] Check crash logs
- [ ] Verify theme usage analytics
- [ ] Verify language selection distribution

### Week 2
- [ ] Create optimization roadmap based on usage
- [ ] Plan additional theme variants if requested
- [ ] Plan additional language support
- [ ] Document lessons learned

### Month 1
- [ ] Analyze user adoption of themes
- [ ] Collect feedback on new features
- [ ] Plan next iteration improvements
- [ ] Update documentation based on real usage

---

## Success Metrics

### Technical Metrics
- Crash rate: < 0.1%
- Performance: 60 FPS on all screens
- Load time: < 2 seconds per screen
- Memory: < 150 MB usage

### User Metrics
- Theme adoption: > 50% of users selecting themes
- Language adoption: > 30% of Vietnamese users
- Feature rating: ≥ 4.5/5 stars
- Support tickets: No significant increase

### Business Metrics
- User retention: Maintained or improved
- Session length: Maintained or improved
- App rating: Maintained or improved
- User satisfaction: Improved feedback

---

## Support Documentation

### User Documentation
```
# How to Change Theme
1. Tap Settings
2. Find "Theme" option
3. Select preferred theme
4. Changes apply instantly

# How to Change Language
1. Tap Settings
2. Find "Language" option
3. Select English or Vietnamese
4. Changes apply instantly
```

### Developer Documentation
- QUICK_START_REFACTORING.md
- REFACTORING_TEMPLATE.md
- COLOR_MIGRATION_GUIDE.md
- SYSTEM_SUMMARY.md
- This DEPLOYMENT_GUIDE.md

### Support Team Briefing
```
Key Points to Communicate:
1. Users can choose from 6 themes
2. Two languages available (English, Vietnamese)
3. Settings are saved automatically
4. Themes don't affect functionality
5. All themes are equally accessible
```

---

## Announcement Template

**Social Media:**
```
We've launched 6 beautiful new themes and Vietnamese language support! 

Themes include Dark, Light, Classic, Sunset, Ocean, and Neon Gen Z. 
Change your theme in Settings to match your mood. Choose between English 
or Vietnamese in Language settings. 

Enjoy a more personalized Monu experience!
```

**Email to Users:**
```
Subject: Monu v1.1 - Pick Your Theme & Choose Your Language

Hi [User],

We're excited to announce Monu v1.1 with 6 stunning new themes and 
Vietnamese language support!

NEW FEATURES:
• Sunset theme - warm, luxurious vibes
• Ocean theme - cool, modern aesthetic
• Neon Gen Z - high contrast, trendy
• Vietnamese language support
• Dynamic theme switching without restart

HOW TO USE:
Go to Settings → Theme to choose your favorite look
Go to Settings → Language to select English or Vietnamese

Your theme and language preferences are saved automatically.

Happy listening!
The Monu Team
```

---

## Deployment Checklist Summary

### Pre-Deployment (24 hours before)
- [ ] All code changes completed
- [ ] All tests passing
- [ ] Version bumped
- [ ] Release notes prepared
- [ ] Team briefed
- [ ] Rollback plan documented

### Deployment Day
- [ ] Final build test
- [ ] Staging deployment
- [ ] Internal testing completed
- [ ] Production deployment initiated
- [ ] Phased rollout started
- [ ] Monitoring setup

### Post-Deployment (24-48 hours)
- [ ] No critical bugs reported
- [ ] Metrics normal
- [ ] User feedback positive
- [ ] Support team ready
- [ ] Documentation updated

### Follow-Up (Week 1)
- [ ] Usage analytics reviewed
- [ ] User feedback compiled
- [ ] Performance verified
- [ ] Team retrospective held
- [ ] Lessons documented

---

## Emergency Contact

**If Critical Issue Found:**

1. **Immediate:** Start rollback process
2. **Notify:** Team lead, product manager, dev team
3. **Communicate:** Update users via app notification
4. **Document:** Record issue details for post-mortem
5. **Implement:** Fix issue and prepare hotfix

**Support:**
- Slack channel: #monu-incidents
- On-call engineer: [Name]
- Backup engineer: [Name]

---

## Completion

Deployment is considered successful when:

✓ All 32 screens work with all 6 themes
✓ Both languages function correctly
✓ No crash rate spike
✓ User feedback is positive
✓ No critical bugs reported
✓ Metrics remain healthy

Once these criteria are met, the Theme & Internationalization System is officially deployed and ready for the next phase of improvements.
