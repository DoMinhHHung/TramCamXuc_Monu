import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { resendOtp, resetPassword } from '../services/auth-flow';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ navigation, route }: Props) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleReset = async () => {
    try {
      setLoading(true);
      await resetPassword({ email, otp, newPassword });
      Alert.alert('Đặt lại mật khẩu thành công', 'Vui lòng đăng nhập lại với mật khẩu mới.');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Đặt lại mật khẩu thất bại', error?.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
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
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <Text style={styles.subtitle}>Email: {email}</Text>

      <TextInput
        style={styles.input}
        placeholder="Mã OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleResendOtp} disabled={resending}>
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
