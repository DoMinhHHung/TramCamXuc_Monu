import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface SocialButtonProps {
  label: string;
  variant: 'google' | 'facebook';
  onPress: () => void;
}

export const SocialButton = ({ label, variant, onPress }: SocialButtonProps) => {
  return (
    <Pressable style={[styles.button, variant === 'google' ? styles.google : styles.facebook]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center'
  },
  google: {
    backgroundColor: '#db4437'
  },
  facebook: {
    backgroundColor: '#1877f2'
  },
  text: {
    color: '#fff',
    fontWeight: '700'
  }
});
