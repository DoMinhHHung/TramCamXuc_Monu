/**
 * useOfflineCache
 *
 * Bọc một async fetcher: khi offline hoặc fetch lỗi mạng,
 * tự động trả dữ liệu từ AsyncStorage thay vì throw error.
 *
 * Cách dùng:
 *   const { data, isOffline, isStale } = useOfflineCache('rec_cache_v2', fetchFn);
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — dữ liệu cũ vẫn hiện khi offline

interface CacheEnvelope<T> {
    data: T;
    savedAt: number;
}

interface OfflineCacheResult<T> {
    data: T | null;
    isLoading: boolean;
    isOffline: boolean;
    /** true khi đang dùng dữ liệu cache (mạng lỗi hoặc offline) */
    isStale: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
}

export function useOfflineCache<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    options?: { disabled?: boolean },
): OfflineCacheResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const [isStale, setIsStale] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const loadFromCache = useCallback(async (): Promise<T | null> => {
        try {
            const raw = await AsyncStorage.getItem(cacheKey);
            if (!raw) return null;
            const envelope: CacheEnvelope<T> = JSON.parse(raw);
            if (Date.now() - envelope.savedAt > CACHE_TTL_MS) return null;
            return envelope.data;
        } catch {
            return null;
        }
    }, [cacheKey]);

    const saveToCache = useCallback(async (value: T) => {
        try {
            const envelope: CacheEnvelope<T> = { data: value, savedAt: Date.now() };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(envelope));
        } catch {}
    }, [cacheKey]);

    const doFetch = useCallback(async () => {
        if (options?.disabled) return;
        if (!mountedRef.current) return;

        setIsLoading(true);
        setError(null);

        // Kiểm tra network trước
        const netState = await NetInfo.fetch();
        const online = netState.isConnected && netState.isInternetReachable !== false;

        if (!online) {
            const cached = await loadFromCache();
            if (mountedRef.current) {
                setIsOffline(true);
                setIsStale(true);
                setData(cached);
                setIsLoading(false);
            }
            return;
        }

        setIsOffline(false);

        try {
            const fresh = await fetcher();
            await saveToCache(fresh);
            if (mountedRef.current) {
                setData(fresh);
                setIsStale(false);
                setError(null);
            }
        } catch (err) {
            // Fetch thất bại dù có mạng → fallback cache
            const cached = await loadFromCache();
            if (mountedRef.current) {
                setIsStale(true);
                setData(cached);
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        } finally {
            if (mountedRef.current) setIsLoading(false);
        }
    }, [fetcher, loadFromCache, saveToCache, options?.disabled]);

    useEffect(() => {
        void doFetch();
    }, [doFetch]);

    // Re-fetch khi mạng trở lại
    useEffect(() => {
        const unsub = NetInfo.addEventListener((state) => {
            const backOnline = state.isConnected && state.isInternetReachable !== false;
            if (backOnline && isOffline) {
                void doFetch();
            }
        });
        return unsub;
    }, [isOffline, doFetch]);

    return {
        data,
        isLoading,
        isOffline,
        isStale,
        error,
        refresh: doFetch,
    };
}
