import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RootStackParamList } from '../navigation/types';
import { resendOtp, verifyOtp } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

export const VerifyOtpScreen = ({ route, navigation }: Props) => {
  const { email, from } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    try {
      setLoading(true);
      await verifyOtp({ email, otp });
      Alert.alert('Thành công', from === 'registration' ? 'Xác thực tài khoản thành công.' : 'Xác thực OTP thành công.');
      if (from === 'registration') {
        navigation.navigate('Login', { presetEmail: email });
        return;
      }
      navigation.navigate('ResetPassword', { email });
    } catch (error: any) {
      Alert.alert('Xác thực thất bại', error?.message ?? 'OTP không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      setLoading(true);
      await resendOtp(email);
      Alert.alert('Đã gửi lại OTP', 'Vui lòng kiểm tra email của bạn.');
    } catch (error: any) {
      Alert.alert('Không thể gửi lại OTP', error?.message ?? 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác thực OTP</Text>
      <Text style={styles.subtitle}>Mã OTP đã gửi tới: {email}</Text>

      <TextInput
        keyboardType="number-pad"
        placeholder="Nhập OTP"
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
      />

      <Pressable style={styles.primaryButton} onPress={onVerify} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? 'Đang xử lý...' : 'Xác thực'}</Text>
      </Pressable>

      <Pressable onPress={onResend} disabled={loading}>
        <Text style={styles.link}>Gửi lại OTP</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#6b7280', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    marginBottom: 10
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: '#2563eb', textAlign: 'center', fontWeight: '600' }
});
