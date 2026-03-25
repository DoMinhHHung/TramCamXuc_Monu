import { NextRequest, NextResponse } from 'next/server';
import { extractUserId, handleError } from '../../../../_lib/helpers';
import { likeFeedPost, unlikeFeedPost } from '../../../../_lib/social/mutations';

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const userId = extractUserId(req);
    await likeFeedPost({ userId, postId });
    return NextResponse.json({ code: 1000, message: 'Liked', result: null });
  } catch (err) { return handleError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const userId = extractUserId(req);
    await unlikeFeedPost({ userId, postId });
    return NextResponse.json({ code: 1000, message: 'Unliked', result: null });
  } catch (err) { return handleError(err); }
}
