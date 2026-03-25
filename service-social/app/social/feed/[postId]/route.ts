import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { updateFeedPost, deleteFeedPost } from '../../../_lib/social/mutations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const userId = extractUserId(req);
    const body = await req.json();
    const result = await updateFeedPost({
      userId,
      postId,
      caption: body.caption,
      visibility: body.visibility,
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    const userId = extractUserId(req);
    await deleteFeedPost({ userId, postId });
    return NextResponse.json({ code: 1000, message: 'Post deleted', result: null });
  } catch (err) { return handleError(err); }
}
