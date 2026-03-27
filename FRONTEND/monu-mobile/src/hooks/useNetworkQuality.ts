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

function tierRank(t: NetworkTier): number {
    switch (t) {
        case 'high':
            return 3;
        case 'medium':
            return 2;
        case 'low':
            return 1;
        case 'offline':
            return 0;
    }
}

/** Hạ bậc mạng → đổi chất lượng nhanh; lên bậc → chờ ổn định để tránh nhảy 64↔320 liên tục. */
function debounceMsForTransition(from: NetworkTier, to: NetworkTier): number {
    if (tierRank(to) < tierRank(from)) return 1_200;
    if (tierRank(to) > tierRank(from)) return 4_500;
    return 0;
}

export function useNetworkQuality() {
    const [tier, setTier] = useState<NetworkTier>('high');
    const tierRef = useRef<NetworkTier>('high');
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTargetRef = useRef<NetworkTier | null>(null);

    useEffect(() => {
        const clearDebounce = () => {
            if (debounceTimerRef.current !== null) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };

        const commitTier = (t: NetworkTier) => {
            if (t === tierRef.current) return;
            tierRef.current = t;
            setTier(t);
            pendingTargetRef.current = null;
        };

        const scheduleTierChange = (t: NetworkTier) => {
            if (t === tierRef.current) {
                clearDebounce();
                pendingTargetRef.current = null;
                return;
            }
            pendingTargetRef.current = t;
            clearDebounce();
            const ms = debounceMsForTransition(tierRef.current, t);
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                const pending = pendingTargetRef.current;
                if (pending !== null && pending !== tierRef.current) {
                    commitTier(pending);
                }
            }, ms);
        };

        NetInfo.fetch()
            .then((state) => {
                const t = classifyNetwork(
                    state.type,
                    state.isConnected,
                    (state.details as any)?.downlink,
                );
                commitTier(t);
            })
            .catch(() => {});

        const unsub = NetInfo.addEventListener((state) => {
            const t = classifyNetwork(
                state.type,
                state.isConnected,
                (state.details as any)?.downlink,
            );
            scheduleTierChange(t);
        });

        return () => {
            unsub();
            clearDebounce();
        };
    }, []);

    return { tier, tierRef };
}
