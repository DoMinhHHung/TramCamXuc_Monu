/**
 * Module-level cache that persists across Next.js client-side navigations.
 * Data is keyed by string, stored with a timestamp for staleness checks.
 */

interface Entry { data: unknown; fetchedAt: number }

const store = new Map<string, Entry>();

export const queryCache = {
    get<T>(key: string): T | undefined {
        return store.get(key)?.data as T | undefined;
    },

    set<T>(key: string, data: T): void {
        store.set(key, { data, fetchedAt: Date.now() });
    },

    /** Returns true when there is no entry or the entry is older than maxAgeMs. */
    isStale(key: string, maxAgeMs: number): boolean {
        const e = store.get(key);
        return !e || Date.now() - e.fetchedAt > maxAgeMs;
    },

    /** Removes all keys that start with `prefix`. */
    invalidate(prefix: string): void {
        for (const k of store.keys()) {
            if (k.startsWith(prefix)) store.delete(k);
        }
    },

    invalidateAll(): void {
        store.clear();
    },
};

export const STALE_MS = 2 * 60 * 1000;   // 2 min — default for list pages
export const STATS_STALE_MS = 5 * 60 * 1000; // 5 min — for per-item stat enrichment
