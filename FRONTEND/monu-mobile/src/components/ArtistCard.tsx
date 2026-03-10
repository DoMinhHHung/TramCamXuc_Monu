import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';

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
  return (
    <Pressable
      style={[
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.avatarContainer, selected && styles.avatarContainerSelected]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>🎤</Text>
          </View>
        )}
        {selected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={2}>
        {stageName}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    width: 110,
    margin: 6,
  },
  cardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarContainerSelected: {
    // Additional styling if needed
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.bg,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 32,
  },
  checkmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: 'bold',
  },
  name: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  nameSelected: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
