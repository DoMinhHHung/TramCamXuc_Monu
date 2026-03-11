import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../config/colors';

export const PremiumScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Premium</Text>
    <Text style={styles.caption}>Nâng cấp để nghe nhạc không giới hạn và không quảng cáo.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700', marginBottom: 10 },
  caption: { color: COLORS.muted, textAlign: 'center' },
});
