import { createClient } from 'redis';

type CacheEntry<T> = { value: T; expiresAtMs: number };
type RedisClient = ReturnType<typeof createClient>;

const memory = new Map<string, CacheEntry<unknown>>();
const globalForRedis = globalThis as unknown as { _redisClient?: RedisClient };

async function getRedis(): Promise<RedisClient | null> {
  if (!process.env.REDIS_HOST) return null;
  if (globalForRedis._redisClient?.isOpen) return globalForRedis._redisClient;

  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT ?? 6379),
      ...(process.env.REDIS_SSL !== 'false' ? { tls: true } : {}),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error', () => {});
  await client.connect();
  globalForRedis._redisClient = client;
  return client;
}

export async function getOrSetJson<T>(params: {
  key: string;
  ttlSeconds: number;
  fetcher: () => Promise<T>;
}): Promise<T> {
  const now = Date.now();
  const mem = memory.get(params.key);
  if (mem && mem.expiresAtMs > now) return mem.value as T;

  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(params.key);
      if (raw) {
        const value = JSON.parse(raw) as T;
        memory.set(params.key, { value, expiresAtMs: now + params.ttlSeconds * 1000 });
        return value;
      }
    } catch {}
  }

  const value = await params.fetcher();
  memory.set(params.key, { value, expiresAtMs: now + params.ttlSeconds * 1000 });

  if (redis) {
    try { await redis.setEx(params.key, params.ttlSeconds, JSON.stringify(value)); } catch {}
  }
  return value;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expiresAtMs > now) return mem.value as T;

  const redis = await getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  memory.set(key, { value, expiresAtMs: Date.now() + ttlSeconds * 1000 });
  const redis = await getRedis();
  if (redis) {
    try { await redis.setEx(key, ttlSeconds, JSON.stringify(value)); } catch {}
  }
}

export async function deleteKey(key: string): Promise<void> {
  memory.delete(key);
  const redis = await getRedis();
  if (redis) { try { await redis.del(key); } catch {} }
}

export async function sMembers(key: string): Promise<Set<string>> {
  const redis = await getRedis();
  if (!redis) return new Set();
  try {
    const members = await redis.sMembers(key);
    return new Set(members);
  } catch { return new Set(); }
}

export async function sAdd(key: string, ...members: string[]): Promise<void> {
  if (members.length === 0) return;
  const redis = await getRedis();
  if (redis) { try { await redis.sAdd(key, members); } catch {} }
}

export async function sRem(key: string, ...members: string[]): Promise<void> {
  if (members.length === 0) return;
  const redis = await getRedis();
  if (redis) { try { await redis.sRem(key, members); } catch {} }
}
