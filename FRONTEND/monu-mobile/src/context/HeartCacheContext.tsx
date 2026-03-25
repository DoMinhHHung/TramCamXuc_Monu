import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from './AuthContext';
import { apiClient } from '../services/api';

const STORAGE_KEY = 'heart_cache_ids';

interface HeartCacheValue {
  isHearted: (songId: string) => boolean;
  setHearted: (songId: string, value: boolean) => void;
  ready: boolean;
}

const HeartCacheCtx = createContext<HeartCacheValue>({
  isHearted: () => false,
  setHearted: () => {},
  ready: false,
});

export const useHeartCache = () => useContext(HeartCacheCtx);

export function HeartCacheProvider({ children }: { children: React.ReactNode }) {
  const { authSession } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const fetchedForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!authSession) {
      setIds(new Set());
      setReady(true);
      fetchedForToken.current = null;
      return;
    }

    const token = authSession.tokens.accessToken;
    if (fetchedForToken.current === token) return;
    fetchedForToken.current = token;

    let cancelled = false;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached && !cancelled) {
          setIds(new Set(JSON.parse(cached)));
          setReady(true);
        }
      } catch {}

      try {
        const res = await apiClient.get<string[]>('/social/hearts/my-ids');
        if (!cancelled) {
          const freshIds = Array.isArray(res.data) ? res.data : [];
          setIds(new Set(freshIds));
          setReady(true);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(freshIds)).catch(() => {});
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [authSession?.tokens.accessToken]);

  const isHearted = useCallback((songId: string) => ids.has(songId), [ids]);

  const setHearted = useCallback((songId: string, value: boolean) => {
    setIds(prev => {
      const next = new Set(prev);
      if (value) next.add(songId);
      else next.delete(songId);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  return (
    <HeartCacheCtx.Provider value={{ isHearted, setHearted, ready }}>
      {children}
    </HeartCacheCtx.Provider>
  );
}
