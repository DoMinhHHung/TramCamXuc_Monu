import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { extractUserId, handleError } from '../../../../_lib/helpers';
import { isFollowing } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const { artistId } = await params;
    const userId = extractUserId(req);
    const result = await isFollowing({ followerId: userId, artistId });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
