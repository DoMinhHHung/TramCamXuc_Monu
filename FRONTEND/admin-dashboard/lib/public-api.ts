/** Base URL API Gateway (public GET, không auth) — ví dụ https://phazelsound.oopsgolden.id.vn */
export function getPublicGatewayBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? '';
  return raw.replace(/\/$/, '');
}

export async function fetchPublicSong(id: string): Promise<Record<string, unknown> | null> {
  const base = getPublicGatewayBase();
  if (!base) return null;
  const res = await fetch(`${base}/songs/${id}`, {
    next: { revalidate: 120 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.result ?? body) as Record<string, unknown>;
}

export async function fetchPublicTrending(size = 40): Promise<Record<string, unknown>[]> {
  const base = getPublicGatewayBase();
  if (!base) return [];
  const res = await fetch(`${base}/songs/trending?page=1&size=${size}`, {
    next: { revalidate: 120 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const body = await res.json();
  const page = (body?.result ?? body) as { content?: Record<string, unknown>[] };
  return page?.content ?? [];
}

/** Playlist theo UUID — GET /playlists/id/{id} (public / collaborative) */
export async function fetchPublicPlaylist(id: string): Promise<Record<string, unknown> | null> {
  const base = getPublicGatewayBase();
  if (!base) return null;
  const res = await fetch(`${base}/playlists/id/${encodeURIComponent(id)}`, {
    next: { revalidate: 120 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.result ?? body) as Record<string, unknown>;
}

/** Album theo UUID — GET /albums/{id} */
export async function fetchPublicAlbum(id: string): Promise<Record<string, unknown> | null> {
  const base = getPublicGatewayBase();
  if (!base) return null;
  const res = await fetch(`${base}/albums/${encodeURIComponent(id)}`, {
    next: { revalidate: 120 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.result ?? body) as Record<string, unknown>;
}
