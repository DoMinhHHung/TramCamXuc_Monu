import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../../config/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>🎧</Text>
          </View>
          <Text style={styles.brand}>Monu</Text>
          <Text style={styles.tagline}>Tận hưởng không gian riêng của bạn. Âm nhạc chữa lành cảm xúc</Text>
        </View>

        <View style={styles.bottomActions}>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('RegisterOptions')}>
            <Text style={styles.primaryText}>Đăng ký</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('LoginOptions')}>
            <Text style={styles.secondaryText}>Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 28 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoIcon: { fontSize: 46 },
  brand: { fontSize: 32, fontWeight: '800', color: COLORS.text, marginBottom: 14, letterSpacing: 0.5 },
  tagline: {
    fontSize: 17,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 330,
    paddingHorizontal: 6,
  },
  bottomActions: { gap: 14 },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  primaryText: { color: COLORS.bg, fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  secondaryText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
