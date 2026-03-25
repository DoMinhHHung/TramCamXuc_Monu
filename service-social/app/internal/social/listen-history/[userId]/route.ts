import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { getOrSetJson } from '../../../../_lib/cache';
import { getListenHistoryInternal } from '../../../../_lib/social/internal';

function toIntParam(req: NextRequest, key: string, fallback: number) {
  const raw = req.nextUrl.searchParams.get(key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const limit = Math.max(1, toIntParam(req, 'limit', 50));
  const days = Math.max(1, toIntParam(req, 'days', 90));

  const cacheKey = `rec:listen:${userId}:${limit}:${days}`;
  const result = await getOrSetJson({
    key: cacheKey,
    ttlSeconds: 300,
    fetcher: () => getListenHistoryInternal({ userId, limit, days }),
  });

  return NextResponse.json(success(result));
}
