import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '../config/colors';
import { AnimatedDecorIcon } from './AnimatedDecorIcon';

interface OfflineStateProps {
  onRetry: () => void;
}

export const OfflineState = ({ onRetry }: OfflineStateProps) => {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
      <AnimatedDecorIcon intensity="soft">
        <Text style={{ fontSize: 56, marginBottom: 16 }}>📡</Text>
      </AnimatedDecorIcon>
      <Text
        style={{
          color: colors.white,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        Mất kết nối rồi
      </Text>
      <Text
        style={{
          color: colors.glass50,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 21,
          marginBottom: 24,
        }}
      >
        Đừng lo, nhạc đã tải xuống vẫn phát được.{'\n'}Kiểm tra WiFi rồi thử lại nhé!
      </Text>
      <Pressable
        onPress={onRetry}
        style={{
          backgroundColor: colors.accentDim,
          borderRadius: 999,
          paddingHorizontal: 28,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>Thử lại</Text>
      </Pressable>
    </View>
  );
};
