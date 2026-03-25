import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../_lib/api';
import { extractUserId, tryExtractUserId, parsePageable, requiredParam, handleError } from '../../_lib/helpers';
import { getSongComments } from '../../_lib/social/queries';
import { addComment } from '../../_lib/social/mutations';

export async function GET(req: NextRequest) {
  try {
    const songId = requiredParam(req, 'songId');
    const currentUserId = tryExtractUserId(req);
    const { page, size } = parsePageable(req);
    const result = await getSongComments({ songId, currentUserId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const body = await req.json();
    const result = await addComment({
      userId,
      songId: body.songId,
      parentId: body.parentId ?? null,
      content: body.content,
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
