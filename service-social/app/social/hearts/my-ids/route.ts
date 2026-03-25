import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { getMyHeartedSongIds } from '../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const ids = await getMyHeartedSongIds(userId);
    return NextResponse.json(success(ids));
  } catch (err) { return handleError(err); }
}
