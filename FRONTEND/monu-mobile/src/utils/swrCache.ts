import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheEnvelope<T> = {
  data: T;
  updatedAt: number;
};

export async function loadCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.updatedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        data,
        updatedAt: Date.now(),
      } satisfies CacheEnvelope<T>),
    );
  } catch {
    // ignore cache write errors
  }
}

export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 600,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
