import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../config/colors';

type SocialProvider = 'google' | 'facebook';

interface SocialButtonProps {
  provider?: SocialProvider;
  variant?: SocialProvider;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  styleOverrides?: any;
}

const providerConfig: Record<SocialProvider, { defaultLabel: string; icon: string }> = {
  google: {
    defaultLabel: 'Google',
    icon: 'G',
  },
  facebook: {
    defaultLabel: 'Facebook',
    icon: 'f',
  },
};

export const SocialButton = ({ provider, variant, label, onPress, disabled = false, styleOverrides }: SocialButtonProps) => {
  const colors = useThemeColors();
  const resolvedProvider: SocialProvider = provider ?? variant ?? 'google';
  const config = providerConfig[resolvedProvider];

  const dynamicStyles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 56,
    borderRadius: 999,
    marginTop: 14,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 18,

    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },

    elevation: 3,
  },

  iconWrap: {
    position: 'absolute',
    left: 18,

    width: 30,
    height: 30,
    borderRadius: 999,

    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',

    // nhẹ nhàng thôi cho nổi icon
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  icon: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.text,
    paddingLeft: 48,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  disabled: {
    opacity: 0.45,
  },
});

  return (
    <Pressable
      style={({ pressed }) => [dynamicStyles.button, styleOverrides, pressed && dynamicStyles.pressed, disabled && dynamicStyles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={dynamicStyles.iconWrap}>
        <Text style={dynamicStyles.icon}>{config.icon}</Text>
      </View>
      <Text style={dynamicStyles.text}>{label ?? config.defaultLabel}</Text>
    </Pressable>
  );
};

