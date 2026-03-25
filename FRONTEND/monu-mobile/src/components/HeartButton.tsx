import React from 'react';
import { Pressable, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useHeartCache } from '../context/HeartCacheContext';
import { heartSong, unheartSong } from '../services/social';

interface HeartButtonProps {
    songId: string;
    size?: number;
    onToggle?: (hearted: boolean) => void;
}

export const HeartButton = ({ songId, size = 22, onToggle }: HeartButtonProps) => {
    const { authSession } = useAuth();
    const { isHearted, setHearted } = useHeartCache();

    const hearted = isHearted(songId);

    const handlePress = async () => {
        if (!authSession) return;

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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Text style={{ fontSize: size, color: hearted ? '#ff4081' : 'rgba(255,255,255,0.4)' }}>
                {hearted ? '♥' : '♡'}
            </Text>
        </Pressable>
    );
};
