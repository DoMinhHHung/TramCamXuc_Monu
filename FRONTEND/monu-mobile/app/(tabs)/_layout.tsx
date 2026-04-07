import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useThemeColors } from '../../src/config/colors';
import { AnimatedDecorIcon } from '../../src/components/AnimatedDecorIcon';

const tabMeta = {
  Home: { label: 'Trang chủ', icon: 'home' },
  Discover: { label: 'Khám phá', icon: 'explore' },
  Create: { label: 'Tạo', icon: 'add' },
  Library: { label: 'Thư viện', icon: 'library-music' },
  Premium: { label: 'Premium', icon: 'redeem' },
} as const;

export default function TabsLayout() {
  const C = useThemeColors();

  return (
    <Tabs
      screenOptions={({ route }: any) => {
        const meta = tabMeta[route.name as keyof typeof tabMeta];
        const isCreate = route.name === 'Create';

        return {
          headerShown: false,
          tabBarLabel: meta?.label,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            height: 78,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: C.text,
          tabBarInactiveTintColor: C.muted,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={isCreate ? {
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: C.accentFill20,
                  alignItems: 'center',
                  justifyContent: 'center',
                } : undefined}
              >
                <AnimatedDecorIcon active={focused} intensity="medium">
                  <MaterialIcons
                    name={(meta?.icon ?? 'radio-button-unchecked') as never}
                    size={isCreate ? 20 : 18}
                    color={isCreate ? C.white : color}
                  />
                </AnimatedDecorIcon>
              </View>
            </View>
          ),
        };
      }}
    >
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="Discover" />
      <Tabs.Screen name="Create" />
      <Tabs.Screen name="Library" />
      <Tabs.Screen name="Premium" />
    </Tabs>
  );
}
