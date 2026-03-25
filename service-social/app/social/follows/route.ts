import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../_lib/api';
import { extractUserId, handleError } from '../../_lib/helpers';
import { followArtist } from '../../_lib/social/mutations';

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const body = await req.json();
    const result = await followArtist({ followerId: userId, artistId: body.artistId });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
