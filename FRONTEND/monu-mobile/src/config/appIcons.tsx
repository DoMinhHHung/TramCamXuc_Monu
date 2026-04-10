import React from 'react';
import { Text } from 'react-native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

type IconLib = 'MaterialCommunityIcons' | 'MaterialIcons' | 'Ionicons' | 'Feather' | 'emoji';

export const ICON_MAP = {
  // Player
  play: { lib: 'MaterialIcons', name: 'play-arrow' },
  pause: { lib: 'MaterialIcons', name: 'pause' },
  stop: { lib: 'MaterialIcons', name: 'stop' },
  skipNext: { lib: 'MaterialIcons', name: 'skip-next' },
  skipPrev: { lib: 'MaterialIcons', name: 'skip-previous' },
  close: { lib: 'MaterialIcons', name: 'close' },
  chevronDown: { lib: 'MaterialIcons', name: 'keyboard-arrow-down' },
  chevronRight: { lib: 'MaterialIcons', name: 'chevron-right' },
  musicNote: { lib: 'MaterialIcons', name: 'music-note' },
  headset: { lib: 'MaterialIcons', name: 'headset' },

  // Social
  heartOutline: { lib: 'MaterialCommunityIcons', name: 'heart-outline' },
  heartFilled: { lib: 'MaterialCommunityIcons', name: 'heart' },

  // Navigation
  home: { lib: 'MaterialCommunityIcons', name: 'home-variant' },
  discover: { lib: 'MaterialCommunityIcons', name: 'compass-outline' },
  library: { lib: 'MaterialCommunityIcons', name: 'music-box-multiple-outline' },
  create: { lib: 'MaterialCommunityIcons', name: 'plus-circle-outline' },
  premium: { lib: 'MaterialCommunityIcons', name: 'crown-outline' },
  back: { lib: 'MaterialCommunityIcons', name: 'arrow-left' },
  search: { lib: 'MaterialCommunityIcons', name: 'magnify' },

  // Actions
  more: { lib: 'MaterialCommunityIcons', name: 'dots-horizontal' },
  share: { lib: 'MaterialCommunityIcons', name: 'share-variant-outline' },
  download: { lib: 'MaterialCommunityIcons', name: 'download-outline' },
  addToPlaylist: { lib: 'MaterialCommunityIcons', name: 'playlist-plus' },
  report: { lib: 'MaterialCommunityIcons', name: 'flag-outline' },
  delete: { lib: 'MaterialCommunityIcons', name: 'trash-can-outline' },
  edit: { lib: 'MaterialCommunityIcons', name: 'pencil-outline' },
  settings: { lib: 'MaterialCommunityIcons', name: 'cog-outline' },
  shuffle: { lib: 'MaterialIcons', name: 'shuffle' },
  repeat: { lib: 'MaterialIcons', name: 'repeat' },
  repeatOne: { lib: 'MaterialIcons', name: 'repeat-one' },
  check: { lib: 'MaterialCommunityIcons', name: 'check-circle' },
  lock: { lib: 'MaterialCommunityIcons', name: 'lock-outline' },
  globe: { lib: 'MaterialCommunityIcons', name: 'web' },
  users: { lib: 'MaterialCommunityIcons', name: 'account-group-outline' },

  // Emoji (registered so JSX never hardcodes emoji strings)
  emojiMusic: { lib: 'emoji', char: '🎵' },
  emojiHeadphones: { lib: 'emoji', char: '🎧' },
  emojiGuitar: { lib: 'emoji', char: '🎸' },
  emojiDisc: { lib: 'emoji', char: '💿' },
  emojiNotePad: { lib: 'emoji', char: '📝' },
} as const satisfies Record<string, { lib: IconLib } & Record<string, string>>;

export type AppIconName = keyof typeof ICON_MAP;

export type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: any;
};

export const AppIcon: React.FC<AppIconProps> = ({ name, size = 24, color = '#fff', style }) => {
  const def: any = ICON_MAP[name];
  if (!def) return null;

  if (def.lib === 'emoji') {
    return (
      <Text
        style={[{ fontSize: size, color }, style]}
        accessibilityRole="image"
        accessibilityLabel={name}
      >
        {def.char}
      </Text>
    );
  }

  const common = { size, color, style } as const;
  switch (def.lib) {
    case 'MaterialCommunityIcons':
      return <MaterialCommunityIcons name={def.name} {...common} />;
    case 'MaterialIcons':
      return <MaterialIcons name={def.name} {...common} />;
    case 'Ionicons':
      return <Ionicons name={def.name} {...common} />;
    case 'Feather':
      return <Feather name={def.name} {...common} />;
    default:
      return <MaterialIcons name={def.name} {...common} />;
  }
};

