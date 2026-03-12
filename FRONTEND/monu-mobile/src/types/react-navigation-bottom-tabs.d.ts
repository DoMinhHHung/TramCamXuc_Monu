declare module '@react-navigation/bottom-tabs' {
  import type { ComponentType } from 'react';

  export function createBottomTabNavigator<T extends Record<string, object | undefined>>(): {
    Navigator: ComponentType<any>;
    Screen: ComponentType<any>;
  };
}
