import { NextRequest, NextResponse } from 'next/server';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { unfollowArtist } from '../../../_lib/social/mutations';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const { artistId } = await params;
    const userId = extractUserId(req);
    await unfollowArtist({ followerId: userId, artistId });
    return NextResponse.json({ code: 1000, message: 'Unfollowed', result: null });
  } catch (err) { return handleError(err); }
}
