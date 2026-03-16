import * as SecureStore from 'expo-secure-store';

const KEY     = 'search.history';
const MAX     = 10;

export const getSearchHistory = async (): Promise<string[]> => {
    try {
        const raw = await SecureStore.getItemAsync(KEY);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
};

export const addSearchHistory = async (query: string): Promise<void> => {
    const q = query.trim();
    if (!q) return;
    try {
        const prev    = await getSearchHistory();
        const deduped = prev.filter(h => h.toLowerCase() !== q.toLowerCase());
        await SecureStore.setItemAsync(KEY, JSON.stringify([q, ...deduped].slice(0, MAX)));
    } catch { /* ignore */ }
};

export const removeSearchHistoryItem = async (query: string): Promise<string[]> => {
    try {
        const prev    = await getSearchHistory();
        const updated = prev.filter(h => h !== query);
        await SecureStore.setItemAsync(KEY, JSON.stringify(updated));
        return updated;
    } catch {
        return [];
    }
};

export const clearSearchHistory = async (): Promise<void> => {
    try { await SecureStore.deleteItemAsync(KEY); } catch { /* ignore */ }
};