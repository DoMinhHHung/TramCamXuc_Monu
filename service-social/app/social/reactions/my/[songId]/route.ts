import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { extractUserId, handleError } from '../../../../_lib/helpers';
import { getUserReaction, getReactionSummary } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ songId: string }> }) {
  try {
    const { songId } = await params;
    const userId = extractUserId(req);
    const reaction = await getUserReaction({ userId, songId });
    const result = reaction ?? await getReactionSummary(songId);
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
