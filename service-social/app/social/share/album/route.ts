import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { requiredParam, param, handleError } from '../../../_lib/helpers';
import { buildAlbumShareUrl } from '../../../_lib/social/mutations';
import type { ShareResponse } from '../../../_lib/social/types';

export async function GET(req: NextRequest) {
  try {
    const albumId = requiredParam(req, 'albumId');
    const platform = param(req, 'platform') ?? 'direct';
    const shareUrl = buildAlbumShareUrl(albumId, platform);
    const result: ShareResponse = { shareUrl, platform };
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
