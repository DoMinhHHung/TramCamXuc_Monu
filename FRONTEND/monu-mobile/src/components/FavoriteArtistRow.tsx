import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config/colors';

interface FavoriteArtistRowProps {
  name: string;
  avatarUrl?: string;
}

export const FavoriteArtistRow = ({ name, avatarUrl }: FavoriteArtistRowProps) => {
  return (
    <View style={styles.row}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]}>
          <Text style={styles.placeholderText}>🎤</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>Nghệ sĩ</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.surface },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 22 },
  meta: { marginLeft: 12 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
});
