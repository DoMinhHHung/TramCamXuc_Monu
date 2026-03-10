import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RootStackParamList } from '../navigation/types';
import { resetPassword } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen = ({ route, navigation }: Props) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await resetPassword({ email, otp, newPassword });
      Alert.alert('Thành công', 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigation.navigate('Login', { presetEmail: email });
    } catch (error: any) {
      Alert.alert('Đặt lại mật khẩu thất bại', error?.message ?? 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <Text style={styles.subtitle}>Email: {email}</Text>

      <TextInput
        keyboardType="number-pad"
        placeholder="OTP"
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
      />
      <TextInput
        secureTextEntry
        placeholder="Mật khẩu mới"
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? 'Đang xử lý...' : 'Xác nhận đặt lại'}</Text>
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
  primaryText: { color: '#fff', fontWeight: '700' }
});
