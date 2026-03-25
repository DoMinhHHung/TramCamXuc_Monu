import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { tryExtractUserId, parsePageable, handleError } from '../../../../_lib/helpers';
import { getCommentReplies } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const { commentId: parentId } = await params;
    const currentUserId = tryExtractUserId(req);
    const { page, size } = parsePageable(req, 10);
    const result = await getCommentReplies({ parentId, currentUserId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
