import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export const HomeScreen = () => {
  const { authData, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xin chào {authData?.user.name ?? authData?.user.email}</Text>
      <Text style={styles.caption}>Bạn đã đăng nhập thành công vào Monu Mobile.</Text>
      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center'
  },
  caption: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20
  },
  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700'
  }
});
