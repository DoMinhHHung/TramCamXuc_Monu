import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '../config/colors';

interface BackButtonProps {
  onPress: () => void;
}

export const BackButton = ({ onPress }: BackButtonProps) => {
  const colors = useThemeColors();
  return (
    <Pressable style={{
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    }} onPress={onPress}>
      <Text style={{
        color: colors.white,
        fontSize: 24,
        lineHeight: 24,
      }}>‹</Text>
    </Pressable>
  );
};

