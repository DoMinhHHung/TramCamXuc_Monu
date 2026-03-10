import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { resendOtp, verifyOtp } from '../services/auth-flow';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;

export const VerifyOtpScreen = ({ navigation, route }: Props) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { email } = route.params;

  const handleVerify = async () => {
    try {
      setLoading(true);
      await verifyOtp({ email, otp });
      Alert.alert('Xác thực thành công', 'Bạn có thể đăng nhập ngay bây giờ.');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Xác thực thất bại', error?.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await resendOtp(email);
      Alert.alert('Đã gửi lại OTP', `Vui lòng kiểm tra email ${email}`);
    } catch (error: any) {
      Alert.alert('Gửi lại OTP thất bại', error?.message || 'Lỗi không xác định');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác thực OTP</Text>
      <Text style={styles.subtitle}>Email: {email}</Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập mã OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />

      <Pressable style={styles.button} onPress={handleVerify} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'Xác thực'}</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleResend} disabled={resending}>
        <Text style={styles.secondaryButtonText}>{resending ? 'Đang gửi lại...' : 'Gửi lại OTP'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
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
  button: { borderRadius: 10, paddingVertical: 12, backgroundColor: '#111827', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 12, borderRadius: 10, paddingVertical: 12, backgroundColor: '#e5e7eb', alignItems: 'center' },
  secondaryButtonText: { color: '#111827', fontWeight: '700' }
});
