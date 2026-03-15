import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export const APP_ICONS = {
  tab: {
    home: 'home',
    discover: 'explore',
    create: 'add',
    library: 'library-music',
    premium: 'redeem',
  },
  auth: {
    email: 'email',
    password: 'lock',
  },
  emoji: {
    favorite: '❤️',
    follow: '🎤',
    download: '⬇️',
  },
} as const;

export const AppIcon = (props: React.ComponentProps<typeof MaterialIcons>) => (
  <MaterialIcons {...props} />
);
