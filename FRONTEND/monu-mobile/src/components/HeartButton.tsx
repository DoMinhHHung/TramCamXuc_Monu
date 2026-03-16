import React, { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { checkHearted, heartSong, unheartSong } from '../services/social';

interface HeartButtonProps {
    songId: string;
    size?: number;
    onToggle?: (hearted: boolean) => void;
}

export const HeartButton = ({ songId, size = 22, onToggle }: HeartButtonProps) => {
    const { authSession } = useAuth();
    const [hearted, setHearted] = useState(false);

    useEffect(() => {
        if (!authSession) return;
        let cancelled = false;
        checkHearted(songId)
            .then(v => { if (!cancelled) setHearted(v); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [songId, authSession?.tokens.accessToken]);

    const handlePress = async () => {
        if (!authSession) return;

        const newHearted = !hearted;
        setHearted(newHearted);
        onToggle?.(newHearted);

        try {
            if (newHearted) {
                await heartSong(songId);
            } else {
                await unheartSong(songId);
            }
        } catch (e) {
            setHearted(!newHearted);
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