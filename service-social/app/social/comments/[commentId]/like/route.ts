import { NextRequest, NextResponse } from 'next/server';
import { extractUserId, handleError } from '../../../../_lib/helpers';
import { likeComment, unlikeComment } from '../../../../_lib/social/mutations';

export async function POST(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;
    const userId = extractUserId(req);
    await likeComment({ userId, commentId });
    return NextResponse.json({ code: 1000, message: 'Liked', result: null });
  } catch (err) { return handleError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;
    const userId = extractUserId(req);
    await unlikeComment({ userId, commentId });
    return NextResponse.json({ code: 1000, message: 'Unliked', result: null });
  } catch (err) { return handleError(err); }
}
