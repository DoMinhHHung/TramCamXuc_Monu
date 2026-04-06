import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AdNotice } from '../context/PlayerContext';

interface AdNoticeBannerProps {
  notice: AdNotice | null;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export const AdNoticeBanner = ({ notice }: AdNoticeBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const prevNoticeKeyRef = useRef<string | null>(null);
  const currentNoticeKey = useMemo(() => (
    notice ? `${notice.title}|${notice.message}|${notice.eventsRemaining}|${notice.secondsRemaining}` : null
  ), [notice]);

  const openNotice = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeNotice = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    if (!notice) {
      setIsDismissed(false);
      closeNotice();
      prevNoticeKeyRef.current = null;
      return;
    }

    if (prevNoticeKeyRef.current !== currentNoticeKey) {
      setIsDismissed(false);
      prevNoticeKeyRef.current = currentNoticeKey;
    }

    if (!isDismissed) {
      openNotice();
    } else {
      closeNotice();
    }
  }, [notice, currentNoticeKey, isDismissed, openNotice, closeNotice]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  if (!notice || isDismissed) return null;

  const noticeType: 'info' | 'warning' =
    notice.eventsRemaining <= 1 || notice.secondsRemaining <= 60 ? 'warning' : 'info';

  const bgColor = {
    info: 'rgba(59, 130, 246, 0.9)',
    warning: 'rgba(245, 158, 11, 0.9)',
  }[noticeType];

  const iconNameMap: Record<string, IconName> = {
    info: 'information',
    warning: 'alert',
  };
  const icon: IconName = iconNameMap[noticeType];

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
        <View style={styles.textWrap}>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.message}>{notice.message}</Text>
        </View>
        <Pressable onPress={handleDismiss}>
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
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
