import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { checkFollowing, followArtist, unfollowArtist } from '../services/social';
import { COLORS } from '../config/colors';

interface FollowButtonProps {
    artistId: string;
    compact?: boolean;
    style?: ViewStyle;
    onToggle?: (following: boolean) => void;
}

export const FollowButton = ({ artistId, compact = false, style, onToggle }: FollowButtonProps) => {
    const { authSession } = useAuth();
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
        return <ActivityIndicator size="small" color={COLORS.accent} />;
    }

    if (compact) {
        return (
            <Pressable onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.compactText, following && styles.compactFollowing]}>
                    {following ? 'Đang theo dõi' : 'Theo dõi'}
                </Text>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={handlePress}
            style={[
                styles.button,
                following ? styles.buttonFollowing : styles.buttonFollow,
                style,
            ]}
        >
            <Text style={[styles.text, following && styles.textFollowing]}>
                {following ? 'Đang theo dõi' : '+ Theo dõi'}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
    },
    buttonFollow: {
        backgroundColor: COLORS.accentDim,
    },
    buttonFollowing: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.accentDim,
    },
    text:          { color: '#fff', fontSize: 14, fontWeight: '700' },
    textFollowing: { color: COLORS.accent },
    compactText:      { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
    compactFollowing: { color: COLORS.glass50 },
});