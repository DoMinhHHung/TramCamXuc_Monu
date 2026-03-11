import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS } from '../config/colors';

interface BackButtonProps {
  onPress: () => void;
}

export const BackButton = ({ onPress }: BackButtonProps) => {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.icon}>‹</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 24,
  },
});
