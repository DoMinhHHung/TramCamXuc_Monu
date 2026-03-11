import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../config/colors';

export const SearchScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Tìm kiếm</Text>
    <Text style={styles.caption}>Khám phá bài hát, nghệ sĩ và playlist bạn yêu thích.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700', marginBottom: 10 },
  caption: { color: COLORS.muted, textAlign: 'center' },
});
