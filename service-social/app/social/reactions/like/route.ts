import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { likeReaction } from '../../../_lib/social/mutations';

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const body = await req.json();
    const result = await likeReaction({
      userId,
      songId: body.songId,
      artistId: body.artistId,
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
