import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../_lib/api';
import { requiredParam, param, tryExtractUserId, handleError } from '../../_lib/helpers';
import { recordSongShare, getSongShareCount } from '../../_lib/social/queries';
import { buildShareUrl } from '../../_lib/social/mutations';
import type { ShareResponse } from '../../_lib/social/types';

export async function GET(req: NextRequest) {
  try {
    const songId = requiredParam(req, 'songId');
    const platform = param(req, 'platform') ?? 'direct';
    const userId = tryExtractUserId(req);

    await recordSongShare({ songId, userId, platform });

    const shareUrl = buildShareUrl(songId, platform);
    const shareCount = await getSongShareCount(songId);

    const result: ShareResponse = { shareUrl, platform, shareCount };
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
