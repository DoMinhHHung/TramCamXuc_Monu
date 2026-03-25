import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../../_lib/api';
import { getOrSetJson } from '../../../../../_lib/cache';
import { getFollowedUserIdsInternal } from '../../../../../_lib/social/internal';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const result = await getOrSetJson({
    key: `rec:follows:users:${userId}`,
    ttlSeconds: 600,
    fetcher: () => getFollowedUserIdsInternal(userId),
  });
  return NextResponse.json(success(result));
}
