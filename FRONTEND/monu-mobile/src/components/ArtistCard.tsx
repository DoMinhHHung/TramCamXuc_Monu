import React, { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../config/colors';
import { AppIcon } from '../config/appIcons';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

interface ArtistCardProps {
  id: string;
  stageName: string;
  avatarUrl?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
  id,
  stageName,
  avatarUrl,
  selected,
  onPress,
  disabled
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`Nghệ sĩ ${stageName}${selected ? ', đã chọn' : ''}`}
    >
      <View style={[styles.avatarContainer, selected && styles.avatarContainerSelected]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <AppIcon name="headset" size={28} color={selected ? colors.accent : colors.muted} />
          </View>
        )}
        {selected && (
          <View style={styles.checkmark}>
            <AppIcon name="check" size={14} color={colors.white} />
          </View>
        )}
      </View>
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={2}>
        {stageName}
      </Text>
    </Pressable>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    width: 110,
    margin: SPACING.sm,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentFill20,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardPressed: {
    opacity: 0.8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.sm,
  },
  avatarContainerSelected: {},
  avatar: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceMid,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceMid,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  name: {
    color: colors.muted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
  nameSelected: {
    color: colors.text,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
