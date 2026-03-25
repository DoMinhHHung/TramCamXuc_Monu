import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { requiredParam, param, handleError } from '../../../_lib/helpers';
import { buildPlaylistShareUrl } from '../../../_lib/social/mutations';
import type { ShareResponse } from '../../../_lib/social/types';

export async function GET(req: NextRequest) {
  try {
    const playlistId = requiredParam(req, 'playlistId');
    const platform = param(req, 'platform') ?? 'direct';
    const shareUrl = buildPlaylistShareUrl(playlistId, platform);
    const result: ShareResponse = { shareUrl, platform };
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
