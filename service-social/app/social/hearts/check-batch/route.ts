import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { checkHeartedBatch } from '../../../_lib/social/queries';

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const body = await req.json();
    const songIds: string[] = Array.isArray(body?.songIds) ? body.songIds.slice(0, 200) : [];
    if (!songIds.length) return NextResponse.json(success({}));
    const result = await checkHeartedBatch({ userId, songIds });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
