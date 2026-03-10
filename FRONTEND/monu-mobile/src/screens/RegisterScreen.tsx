import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createUser } from '../services/auth-flow';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);
      await createUser({
        fullName,
        email,
        password,
        dob,
        gender
      });
      Alert.alert('Đăng ký thành công', 'Vui lòng nhập OTP để xác thực tài khoản.');
      navigation.navigate('VerifyOtp', { email });
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error?.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tạo tài khoản</Text>
      <TextInput style={styles.input} placeholder="Họ và tên" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Ngày sinh (yyyy-mm-dd)" value={dob} onChangeText={setDob} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Giới tính (MALE/FEMALE/OTHER)" value={gender} onChangeText={(value) => setGender((value || 'OTHER') as 'MALE' | 'FEMALE' | 'OTHER')} autoCapitalize="characters" />

      <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'Đăng ký'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Quay lại đăng nhập</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  button: { borderRadius: 10, paddingVertical: 12, backgroundColor: '#111827', alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { textAlign: 'center', marginTop: 16, color: '#2563eb', fontWeight: '600' }
});
