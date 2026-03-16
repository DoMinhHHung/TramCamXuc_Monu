import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config/colors';

type SocialProvider = 'google' | 'facebook';

interface SocialButtonProps {
  provider?: SocialProvider;
  variant?: SocialProvider;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}

const providerConfig: Record<SocialProvider, { defaultLabel: string; icon: string }> = {
  google: {
    defaultLabel: 'Tiếp tục bằng Google',
    icon: 'G',
  },
  facebook: {
    defaultLabel: 'Tiếp tục bằng Facebook',
    icon: 'f',
  },
};

export const SocialButton = ({ provider, variant, label, onPress, disabled = false }: SocialButtonProps) => {
  const resolvedProvider: SocialProvider = provider ?? variant ?? 'google';
  const config = providerConfig[resolvedProvider];

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <Text style={styles.text}>{label ?? config.defaultLabel}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  text: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
