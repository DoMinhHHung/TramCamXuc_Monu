import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { requiredParam, handleError } from '../../../../_lib/helpers';
import { getPostCommentCount } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const postId = requiredParam(req, 'postId');
    const count = await getPostCommentCount(postId);
    return NextResponse.json(success(count));
  } catch (err) { return handleError(err); }
}
