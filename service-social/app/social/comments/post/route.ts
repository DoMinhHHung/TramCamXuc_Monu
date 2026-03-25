import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, tryExtractUserId, parsePageable, requiredParam, handleError } from '../../../_lib/helpers';
import { getPostComments } from '../../../_lib/social/queries';
import { addPostComment } from '../../../_lib/social/mutations';

export async function GET(req: NextRequest) {
  try {
    const postId = requiredParam(req, 'postId');
    const currentUserId = tryExtractUserId(req);
    const { page, size } = parsePageable(req);
    const result = await getPostComments({ postId, currentUserId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const body = await req.json();
    const result = await addPostComment({
      userId,
      postId: body.postId,
      parentId: body.parentId ?? null,
      content: body.content,
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
