import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { checkHearted, heartSong, unheartSong } from '../services/social';

interface HeartButtonProps {
    songId: string;
    size?: number;
    onToggle?: (hearted: boolean) => void;
}

export const HeartButton = ({ songId, size = 22, onToggle }: HeartButtonProps) => {
    const { authSession } = useAuth();
    const [hearted,  setHearted]  = useState(false);
    const [loading,  setLoading]  = useState(false);

    useEffect(() => {
        if (!authSession) return;
        let cancelled = false;
        checkHearted(songId)
            .then(v => { if (!cancelled) setHearted(v); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [songId, authSession?.tokens.accessToken]);

    const handlePress = async () => {
        if (!authSession || loading) return;
        setLoading(true);
        try {
            if (hearted) {
                await unheartSong(songId);
                setHearted(false);
                onToggle?.(false);
            } else {
                await heartSong(songId);
                setHearted(true);
                onToggle?.(true);
            }
        } catch (e) {
            console.warn('HeartButton error:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <ActivityIndicator size="small" color="#ff4081" />;
    }

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Text style={{ fontSize: size, color: hearted ? '#ff4081' : 'rgba(255,255,255,0.4)' }}>
                {hearted ? '♥' : '♡'}
            </Text>
        </Pressable>
    );
};