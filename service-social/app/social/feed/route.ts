import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../_lib/api';
import { extractUserId, extractRole, parsePageable, handleError } from '../../_lib/helpers';
import { getTimeline } from '../../_lib/social/queries';
import { createFeedPost } from '../../_lib/social/mutations';

export async function GET(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const { page, size } = parsePageable(req);
    const result = await getTimeline({ userId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const ownerType = extractRole(req);
    const ownerEmail = req.headers.get('X-User-Email');
    const body = await req.json();
    const result = await createFeedPost({
      ownerId: userId,
      ownerType,
      ownerDisplayName: ownerEmail ?? body.ownerDisplayName,
      ownerAvatarUrl: body.ownerAvatarUrl ?? null,
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
