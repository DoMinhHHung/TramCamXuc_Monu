# Screen Refactoring Priority List

## Phase 2: Priority Group 1 - Core Screens (Week 1)
These are the most frequently used screens and highest impact.

### 1. **LibraryScreen** ✓ Partially Done (needs full refactoring)
- Status: 1731 lines, heavy styling  
- Impact: HIGH (user spends most time here)
- Complexity: HIGH
- Effort: 4-5 hours

### 2. **ProfileScreen** (NEW)
- Impact: HIGH (user identity + settings)
- Complexity: MEDIUM
- Effort: 2-3 hours

### 3. **DiscoverScreen** (NEW)
- Impact: HIGH (music exploration)
- Complexity: MEDIUM
- Effort: 2-3 hours

### 4. **CreateScreen** (NEW)
- Impact: MEDIUM
- Complexity: MEDIUM
- Effort: 1-2 hours

### 5. **SearchScreen** (NEW)
- Impact: MEDIUM
- Complexity: MEDIUM
- Effort: 2-3 hours

---

## Phase 3: Priority Group 2 & 3 - Detail & Support Screens (Weeks 2-3)

### Detail Screens
- PlaylistDetailScreen (complex, many interactive elements)
- AlbumDetailScreen
- ArtistProfileScreen
- GenreDetailScreen ✓ (newly created)

### Settings & Premium Screens
- SettingsScreen
- PremiumScreen
- ProfileEditScreen

### History & Insights
- HistoryScreen
- InsightsScreen

### Auth & Onboarding
- LoginScreen
- RegisterScreen
- SelectGenresScreen
- SelectArtistsScreen
- OnboardingScreen

### Artist Screens
- ArtistRegisterScreen
- ArtistTermsScreen
- ArtistDiscoveryScreen

### Other Screens
- FavoriteSongsScreen
- FollowingScreen
- FollowersScreen
- FollowedArtistsScreen
- AlbumAddSongScreen

---

## Refactoring Effort Breakdown

| Group | Screens | Hours | Priority |
|-------|---------|-------|----------|
| Group 1 | 5 core | 12-16 | CRITICAL |
| Group 2 | 8 detail | 15-20 | HIGH |
| Group 3 | 13 other | 18-25 | MEDIUM |
| Group 4 | 6 auth | 10-15 | HIGH |
| **Total** | **32** | **155** | - |

---

## Next Steps

1. Start with Group 1 screens (this week)
2. Use REFACTORING_TEMPLATE.md for consistency
3. Test each screen with all 6 themes
4. Commit progress incrementally
5. Move to Group 2 & 3 next week

---

## Notes
- HomeScreen is already refactored ✓
- DraggablePlaylistList component created for LibraryScreen
- All i18n keys are in place (controls, labels, messages)
- Color mapping documented in COLOR_MIGRATION_GUIDE.md
