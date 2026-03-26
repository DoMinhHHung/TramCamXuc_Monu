import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import type { AudioQuality } from '../context/PlayerContext';

export type NetworkTier = 'high' | 'medium' | 'low' | 'offline';

function classifyNetwork(type: NetInfoStateType | null, isConnected: boolean | null, downlink?: number): NetworkTier {
    if (!isConnected) return 'offline';

    if (downlink !== undefined) {
        if (downlink >= 5)  return 'high';
        if (downlink >= 1.5) return 'medium';
        return 'low';
    }

    if (type === NetInfoStateType.wifi || type === NetInfoStateType.ethernet) return 'high';
    if (type === NetInfoStateType.cellular) return 'medium';
    return 'low';
}

const TIER_TO_MAX_QUALITY: Record<NetworkTier, AudioQuality> = {
    high:    320,
    medium:  128,
    low:     64,
    offline: 64,
};

export function suggestQuality(networkTier: NetworkTier, subscriptionMax: AudioQuality): AudioQuality {
    const networkMax = TIER_TO_MAX_QUALITY[networkTier];
    return Math.min(networkMax, subscriptionMax) as AudioQuality;
}

export function useNetworkQuality() {
    const [tier, setTier] = useState<NetworkTier>('high');
    const tierRef = useRef<NetworkTier>('high');

    useEffect(() => {
        const unsub = NetInfo.addEventListener(state => {
            const t = classifyNetwork(
                state.type,
                state.isConnected,
                (state.details as any)?.downlink,
            );
            if (t !== tierRef.current) {
                tierRef.current = t;
                setTier(t);
            }
        });
        return () => unsub();
    }, []);

    return { tier, tierRef };
}
