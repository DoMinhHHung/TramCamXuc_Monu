import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { updateComment, deleteComment } from '../../../_lib/social/mutations';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;
    const userId = extractUserId(req);
    const body = await req.json();
    const result = await updateComment({
      userId,
      commentId,
      content: body.content,
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId } = await params;
    const userId = extractUserId(req);
    await deleteComment({ userId, commentId });
    return NextResponse.json({ code: 1000, message: 'Comment deleted', result: null });
  } catch (err) { return handleError(err); }
}
