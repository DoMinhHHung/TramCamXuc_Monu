import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AdNotice {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const AdNoticeBanner = () => {
  const [notice, setNotice] = useState<AdNotice | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const showNotice = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString();
    setNotice({ id, message, type });

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      closeNotice();
    }, 4000);

    return () => clearTimeout(timer);
  }, [slideAnim]);

  const closeNotice = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotice(null);
    });
  }, [slideAnim]);

  if (!notice) return null;

  const bgColor = {
    info: 'rgba(59, 130, 246, 0.9)',
    warning: 'rgba(245, 158, 11, 0.9)',
    success: 'rgba(34, 197, 94, 0.9)',
  }[notice.type];

  const iconNameMap: Record<string, IconName> = {
    info: 'information',
    warning: 'alert',
    success: 'check-circle',
  };
  const icon: IconName = iconNameMap[notice.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.banner, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon} size={20} color="#fff" />
        <Text style={styles.message}>{notice.message}</Text>
        <Pressable onPress={closeNotice}>
          <MaterialCommunityIcons name="close" size={20} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
