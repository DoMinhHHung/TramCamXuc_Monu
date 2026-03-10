import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RootStackParamList } from '../navigation/types';
import { createUser } from '../services/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation }: Props) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await createUser({ fullName, email, password, dob, gender });
      navigation.navigate('VerifyOtp', { email, from: 'registration' });
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error?.message ?? 'Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tạo tài khoản</Text>

      <TextInput placeholder="Họ và tên" style={styles.input} value={fullName} onChangeText={setFullName} />
      <TextInput autoCapitalize="none" placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />
      <TextInput secureTextEntry placeholder="Mật khẩu" style={styles.input} value={password} onChangeText={setPassword} />
      <TextInput placeholder="Ngày sinh (YYYY-MM-DD)" style={styles.input} value={dob} onChangeText={setDob} />

      <View style={styles.genderRow}>
        {(['MALE', 'FEMALE', 'OTHER'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setGender(item)}
            style={[styles.genderChip, gender === item && styles.genderChipActive]}
          >
            <Text style={gender === item ? styles.genderTextActive : styles.genderText}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryButton} onPress={onSubmit} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? 'Đang tạo...' : 'Tạo tài khoản'}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Quay lại đăng nhập</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12
  },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  genderChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  genderChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  genderText: { color: '#111827', fontWeight: '600' },
  genderTextActive: { color: '#fff', fontWeight: '600' },
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
