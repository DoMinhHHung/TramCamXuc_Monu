import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '../config/colors';
import { RADIUS, SPACING, FONT_SIZE } from '../config/design';

interface GenreChipProps {
  name: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const GenreChip: React.FC<GenreChipProps> = ({ name, selected, onPress, disabled }) => {
  const colors = useThemeColors();

  const chipStyle = useMemo(() => ({
    backgroundColor: selected ? colors.accent : colors.surface,
    borderColor: selected ? colors.accent : colors.border,
    opacity: disabled ? 0.5 : 1,
  }), [selected, disabled, colors.accent, colors.surface, colors.border]);

  const textStyle = useMemo(() => ({
    color: selected ? colors.white : colors.muted,
  }), [selected, colors.white, colors.muted]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        chipStyle,
        pressed && !disabled && { opacity: 0.75 },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Text style={[styles.chipText, textStyle]}>
        {name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    margin: SPACING.xs,
  },
  chipText: {
    fontSize: FONT_SIZE.body_sm,
    fontWeight: '600',
  },
});

