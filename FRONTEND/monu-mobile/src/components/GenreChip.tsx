import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../config/colors';

interface GenreChipProps {
  name: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const GenreChip: React.FC<GenreChipProps> = ({ name, selected, onPress, disabled }) => {
  const colors = useThemeColors();
  const dynamicStyles = StyleSheet.create({
    chip: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: selected ? colors.accent : colors.surface,
      borderWidth: 1,
      borderColor: selected ? colors.accent : colors.border,
      margin: 4,
      opacity: disabled ? 0.5 : 1,
    },
    chipText: {
      color: selected ? colors.white : colors.muted,
      fontSize: 14,
      fontWeight: '500',
    },
  });

  return (
    <Pressable
      style={dynamicStyles.chip}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={dynamicStyles.chipText}>
        {name}
      </Text>
    </Pressable>
  );
};

