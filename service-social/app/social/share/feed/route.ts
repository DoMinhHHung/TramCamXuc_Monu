import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, extractRole, handleError } from '../../../_lib/helpers';
import { createFeedPost } from '../../../_lib/social/mutations';

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const ownerType = extractRole(req);
    const body = await req.json();
    const result = await createFeedPost({
      ownerId: userId,
      ownerType,
      contentType: body.contentType,
      contentId: body.contentId,
      title: body.title,
      caption: body.caption,
      coverImageUrl: body.coverImageUrl,
      visibility: body.visibility,
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
