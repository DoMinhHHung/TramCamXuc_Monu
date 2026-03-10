import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';

interface GenreChipProps {
  name: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const GenreChip: React.FC<GenreChipProps> = ({ name, selected, onPress, disabled }) => {
  return (
    <Pressable
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: 4,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.bg,
    fontWeight: '600',
  },
});
