import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../../_lib/api';
import { getOrSetJson } from '../../../../../_lib/cache';
import { getLikedSongIdsInternal } from '../../../../../_lib/social/internal';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const result = await getOrSetJson({
    key: `rec:reactions:liked:${userId}`,
    ttlSeconds: 300,
    fetcher: () => getLikedSongIdsInternal({ userId, type: 'LIKE' }),
  });
  return NextResponse.json(success(result));
}
