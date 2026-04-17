import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useHeartCache } from '../context/HeartCacheContext';
import { heartSong, unheartSong } from '../services/social';
import { haptic } from '../utils/haptics';
import { useThemeColors } from '../config/colors';
import { AppIcon } from '../config/appIcons';

interface HeartButtonProps {
    songId: string;
    size?: number;
    onToggle?: (hearted: boolean) => void;
    variant?: 'plain' | 'card';
}

export const HeartButton = ({ songId, size = 24, onToggle, variant = 'plain' }: HeartButtonProps) => {
    const { authSession } = useAuth();
    const { isHearted, setHearted } = useHeartCache();
    const colors = useThemeColors();

    const hearted = isHearted(songId);

    const handlePress = async () => {
        if (!authSession) return;

        haptic.light();
        const newHearted = !hearted;
        setHearted(songId, newHearted);
        onToggle?.(newHearted);

        try {
            if (newHearted) {
                await heartSong(songId);
            } else {
                await unheartSong(songId);
            }
        } catch (e) {
            setHearted(songId, !newHearted);
            onToggle?.(!newHearted);
            console.warn('HeartButton error:', e);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[
              styles.base,
              variant === 'card' && [
                styles.card,
                {
                  backgroundColor: colors.glass08,
                  borderColor: hearted ? 'rgba(255,64,129,0.3)' : colors.glass12,
                },
              ],
            ]}
        >
            <View style={styles.iconWrap}>
              <AppIcon
                name={hearted ? 'heartFilled' : 'heartOutline'}
                size={size}
                color={hearted ? '#ff4081' : colors.glass40}
              />
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
  base: {
    width: 20,
    height: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
