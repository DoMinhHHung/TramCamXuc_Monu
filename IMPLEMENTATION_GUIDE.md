# TramCamXuc Monu - Implementation Guide

## Quick Start

### Phase-by-Phase Integration

#### Phase 1: Internationalization & Theme System
These changes provide the foundation for all subsequent enhancements.

**Files Modified:**
- `src/context/ThemeContext.tsx` - Extended color system
- `src/context/LocalizationContext.tsx` - Enhanced translations
- `src/config/colors.ts` - New semantic color tokens
- `src/config/themeUtils.ts` - Spacing, shadows, and sizing utilities
- `src/locales/en.json` & `src/locales/vi.json` - Translation keys

**What to Test:**
- Theme colors display correctly across all screens
- Language switching works for Vietnamese/English
- All new translation keys are defined

#### Phase 2: Dynamic Home Screen Components
These new components create an engaging home page experience.

**Files Modified:**
- `src/screens/(tabs)/HomeScreen.tsx` - Integrated new components
- `src/components/HomeScreenHeader.tsx` - New header component
- `src/components/MostPlayedPlaylists.tsx` - New playlist carousel
- `src/components/FavoriteAlbums.tsx` - New album grid
- `src/components/TopArtists.tsx` - New artist list
- `src/components/TrendingGenres.tsx` - New genre tags
- `src/components/RecommendedForYou.tsx` - New recommendations

**What to Test:**
- Each component loads data correctly
- Horizontal/vertical scrolling works smoothly
- Navigation from component cards works
- Loading states display properly
- Error states show helpful messages

#### Phase 3: Navigation & Filtered Views
Enhanced navigation structure with new filtering capabilities.

**Files Modified:**
- Navigation configuration in `src/navigation/`
- Filter screens in `src/screens/`

**What to Test:**
- Tab navigation works smoothly
- Deep linking functions correctly
- Back button behavior is consistent
- Filtered views apply correctly
- Search functionality works

#### Phase 4: Modern UI/UX Refinement
Visual and interaction improvements throughout the app.

**Files Modified:**
- Component styling in respective component files
- `src/config/animations.ts` - Animation definitions

**What to Test:**
- Button press animations feel responsive
- Loading spinners display correctly
- Transitions between screens are smooth
- Color contrast passes accessibility checks
- Touch targets are at least 44x44 pixels

#### Phase 5: Drag-and-Drop Playlist Management
Interactive playlist reordering in the Library screen.

**New Files:**
- `src/components/DraggablePlaylistList.tsx` - Reorderable playlist component

**Files Modified:**
- `src/screens/(tabs)/LibraryScreen.tsx` - Integrated drag-and-drop UI
- `src/services/music.ts` - Added reorder API function

**What to Test:**
1. Toggle reorder mode in Library
2. Use up/down arrows to reorder playlists
3. Undo functionality restores previous order
4. Save operations call backend correctly
5. Error handling shows appropriate messages
6. Animations play smoothly during interactions

#### Phase 6: Cross-Screen Consistency & Polish
Final polish pass ensuring consistency throughout.

**Files Modified:**
- All component files for visual consistency
- `src/components/DraggablePlaylistList.tsx` - Enhanced animations

**What to Test:**
- All screens use consistent spacing
- Button styles are uniform
- Modal presentations are consistent
- Animations use similar timing
- Color usage follows design system

---

## Backend Integration Checklist

### Required Endpoint
- `PATCH /playlists/reorder` - Must accept `{ playlistIds: string[] }`

### Expected Response
```json
{
  "success": true,
  "message": "Playlists reordered successfully"
}
```

### Error Handling
The frontend handles these error scenarios:
- 400: Invalid playlist IDs
- 401: Unauthorized (not user's playlists)
- 409: Conflict (playlist deleted)
- 500: Server error

---

## Component Integration Examples

### Using DraggablePlaylistList
```jsx
import { DraggablePlaylistList, PlaylistItem } from '@/components/DraggablePlaylistList';

const playlists: PlaylistItem[] = [
  { id: '1', name: 'Favorites', songCount: 42, coverUrl: 'url' },
  { id: '2', name: 'Chill', songCount: 23, coverUrl: 'url' },
];

<DraggablePlaylistList
  playlists={playlists}
  onReorder={async (ids) => {
    await api.patch('/playlists/reorder', { playlistIds: ids });
  }}
  onPlaylistPress={(id) => navigate('PlaylistDetail', { id })}
/>
```

### Using Theme Colors
```jsx
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { colors } = useTheme();
  
  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

### Using Translations
```jsx
import { useTranslation } from '@/context/LocalizationContext';

function MyComponent() {
  const { t } = useTranslation();
  
  return <Text>{t('libraryPlaylist.dragToReorder')}</Text>;
}
```

---

## Performance Optimization Tips

1. **Memoize Components**
   ```jsx
   const MemoizedPlaylist = React.memo(PlaylistCard);
   ```

2. **Use useCallback for Handlers**
   ```jsx
   const handlePress = useCallback((id) => {
     navigate('Detail', { id });
   }, [navigate]);
   ```

3. **Optimize Lists**
   - Use FlatList with `removeClippedSubviews`
   - Set `initialNumToRender` appropriately
   - Use `maxToRenderPerBatch` for batching

4. **Image Loading**
   - Use cached images where possible
   - Set explicit width/height
   - Use placeholder backgrounds

---

## Debugging Guide

### Common Issues

**Problem: Theme colors not applying**
- Verify ThemeContext is wrapping your component tree
- Check that useTheme() hook is called inside context
- Confirm colors object has expected properties

**Problem: Translations showing as keys**
- Check JSON files have correct keys
- Verify LocalizationContext is initialized
- Confirm language is set correctly

**Problem: Animations not smooth**
- Check device performance
- Reduce animation duration on low-end devices
- Use `useNativeDriver` where possible

**Problem: Reorder not saving**
- Verify backend endpoint is implemented
- Check network request in DevTools
- Confirm user has permission to reorder
- Verify playlist IDs are correct format

### Debug Utilities

Add to your App.tsx:
```jsx
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values',
    'Animated:',
  ]);
}
```

---

## Deployment Checklist

- [ ] All phases integrated and tested
- [ ] No console errors or warnings
- [ ] All translations keys present
- [ ] Accessibility features working
- [ ] Network requests tested
- [ ] Error handling verified
- [ ] Performance metrics acceptable
- [ ] App size hasn't increased significantly
- [ ] Backward compatibility confirmed
- [ ] User testing completed

---

## Support Resources

### Documentation
- Theme System: See `src/config/themeUtils.ts`
- Components: See individual component files with JSDoc comments
- Navigation: See `src/navigation/` configuration
- Localization: See translation keys in `src/locales/`

### Getting Help
1. Check ENHANCEMENT_LOG.md for detailed feature info
2. Review component JSDoc comments
3. Check Git history for implementation examples
4. Run tests: `npm test`

---

## Future Enhancements

Consider for future phases:
1. Animated list reordering with gesture handlers
2. Collaborative playlist editing
3. Offline mode with local caching
4. Advanced search with saved searches
5. Social features (following, sharing)
6. Analytics integration
7. A/B testing framework
8. Performance monitoring

---

## Notes

- All components use TypeScript for type safety
- Theme system uses CSS-in-JS via React Native StyleSheet
- Animations use native driver when possible
- Accessibility is built-in throughout
- Error boundaries recommended at screen level
