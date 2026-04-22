import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { checkFollowing, followArtist, unfollowArtist } from '../services/social';
import { useThemeColors } from '../config/colors';
import { SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../config/design';

interface FollowButtonProps {
    artistId: string;
    compact?: boolean;
    style?: ViewStyle;
    onToggle?: (following: boolean) => void;
}

export const FollowButton = ({ artistId, compact = false, style, onToggle }: FollowButtonProps) => {
    const { authSession } = useAuth();
    const colors = useThemeColors();
    const styles = useMemo(() => getStyles(colors), [colors]);
    const [following, setFollowing] = useState(false);
    const [loading,   setLoading]   = useState(false);

    useEffect(() => {
        if (!authSession) return;
        let cancelled = false;
        checkFollowing(artistId)
            .then(v => { if (!cancelled) setFollowing(v); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [artistId, authSession?.tokens.accessToken]);

    const handlePress = async () => {
        if (!authSession || loading) return;
        setLoading(true);
        try {
            if (following) {
                await unfollowArtist(artistId);
                setFollowing(false);
                onToggle?.(false);
            } else {
                await followArtist(artistId);
                setFollowing(true);
                onToggle?.(true);
            }
        } catch (e) {
            console.warn('FollowButton error:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="small" color={colors.accent} />;
    }

    if (compact) {
        return (
            <Pressable
                onPress={handlePress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={following ? 'Đang theo dõi' : 'Theo dõi'}
            >
                <Text style={[styles.compactText, following && styles.compactFollowing]}>
                    {following ? 'Đang theo dõi' : 'Theo dõi'}
                </Text>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.button,
                following ? styles.buttonFollowing : styles.buttonFollow,
                pressed && styles.buttonPressed,
                style,
            ]}
            accessibilityRole="button"
            accessibilityLabel={following ? 'Đang theo dõi' : 'Theo dõi nghệ sĩ'}
        >
            <Text style={[styles.text, following && styles.textFollowing]}>
                {following ? 'Đang theo dõi' : '+ Theo dõi'}
            </Text>
        </Pressable>
    );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
    button: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.sm + 2,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        minWidth: 100,
    },
    buttonFollow: {
        backgroundColor: colors.accent,
    },
    buttonFollowing: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.accentBorder35,
    },
    buttonPressed: {
        opacity: 0.75,
    },
    text: { color: colors.white, fontSize: FONT_SIZE.body_sm, fontWeight: FONT_WEIGHT.bold },
    textFollowing: { color: colors.accent },
    compactText: { fontSize: FONT_SIZE.sm, color: colors.accent, fontWeight: FONT_WEIGHT.semibold },
    compactFollowing: { color: colors.muted },
});