import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SocialButton } from '../../components/SocialButton';
import { COLORS } from '../../config/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RegisterOptions'>;

const HeaderBack = ({ onPress }: { onPress: () => void }) => (
  <Pressable style={styles.backBtn} onPress={onPress}>
    <Text style={styles.backIcon}>‹</Text>
  </Pressable>
);

export const RegisterOptionsScreen = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <HeaderBack onPress={() => navigation.navigate('Welcome')} />

        <View style={styles.content}>
          <Text style={styles.title}>Tạo tài khoản Monu</Text>
          <Text style={styles.subtitle}>Bắt đầu trải nghiệm âm nhạc theo cách của riêng bạn</Text>

          <Pressable style={styles.emailBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.emailText}>Tiếp tục bằng Email</Text>
          </Pressable>

          <SocialButton provider="google" onPress={() => {}} />
          <SocialButton provider="facebook" onPress={() => {}} />
        </View>

        <Pressable style={styles.footer} onPress={() => navigation.navigate('LoginOptions')}>
          <Text style={styles.footerText}>
            Bạn đã có tài khoản? <Text style={styles.footerLink}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  backIcon: { color: COLORS.text, fontSize: 24, lineHeight: 24 },
  content: { flex: 1, justifyContent: 'center' },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  emailBtn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginBottom: 2,
  },
  emailText: { color: COLORS.bg, fontSize: 15, fontWeight: '800' },
  footer: { alignItems: 'center', paddingVertical: 10 },
  footerText: { color: COLORS.muted, fontSize: 14 },
  footerLink: { color: COLORS.accent, fontWeight: '700' },
});
