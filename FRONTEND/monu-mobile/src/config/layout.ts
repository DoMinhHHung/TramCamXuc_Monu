import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MAIN_TAB_BAR_BASE_HEIGHT,
  MINI_PLAYER_HEIGHT,
  getTabBarBottomOffset,
} from './design';

/**
 * Shared layout constants that adapt to safe areas (iOS home indicator, Android nav bar).
 * Single source of truth for bottom padding — import these instead of hardcoding heights.
 */
export const useLayoutConstants = () => {
  const insets = useSafeAreaInsets();

  // Distance from screen bottom to the top edge of the floating tab bar pill
  const tabBarTopEdge = getTabBarBottomOffset(insets.bottom) + MAIN_TAB_BAR_BASE_HEIGHT;

  // Actual rendered height of the MiniPlayer container (see MiniPlayer.tsx: height + 4)
  const miniPlayerContainerHeight = MINI_PLAYER_HEIGHT + 4;

  return {
    insets,
    // paddingBottom for tab screens when a mini player may be visible
    playerOffset: tabBarTopEdge + 8 + miniPlayerContainerHeight + 12,
    // paddingBottom for stack screens (no tab bar) when a mini player may be visible
    nonTabPlayerOffset: Math.max(insets.bottom, 8) + 8 + miniPlayerContainerHeight + 12,
    headerHeight: 56 + insets.top,
  } as const;
};
