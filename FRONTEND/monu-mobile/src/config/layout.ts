import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Shared layout constants that adapt to safe areas (iOS home indicator, Android nav bar).
 * Keep these numbers small and intentional — avoid “magic” hardcoded heights in screens.
 */
export const useLayoutConstants = () => {
  const insets = useSafeAreaInsets();

  const tabBarBaseHeight = 58;
  const miniPlayerHeight = 64;

  return {
    insets,
    tabBarBaseHeight,
    tabBarHeight: tabBarBaseHeight + insets.bottom,
    miniPlayerHeight,
    playerOffset: tabBarBaseHeight + miniPlayerHeight + insets.bottom,
    headerHeight: 56 + insets.top,
  } as const;
};

