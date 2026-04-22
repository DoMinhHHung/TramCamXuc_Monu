import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useThemeColors } from '../config/colors';
import { AppIcon } from '../config/appIcons';
import { RADIUS } from '../config/design';

interface BackButtonProps {
  onPress: () => void;
}

export const BackButton = ({ onPress }: BackButtonProps) => {
  const colors = useThemeColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? colors.surfaceMid : colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
    >
      <AppIcon name="chevronLeft" size={22} color={colors.text} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

