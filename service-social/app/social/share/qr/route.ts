import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { requiredParam, tryExtractUserId, handleError } from '../../../_lib/helpers';
import { recordSongShare, getSongShareCount } from '../../../_lib/social/queries';
import { rawSongUrl } from '../../../_lib/social/mutations';
import type { ShareResponse } from '../../../_lib/social/types';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  try {
    const songId = requiredParam(req, 'songId');
    const userId = tryExtractUserId(req);
    const url = rawSongUrl(songId);

    await recordSongShare({ songId, userId, platform: 'qr' });
    const shareCount = await getSongShareCount(songId);

    let qrCodeBase64: string | undefined;
    try {
      qrCodeBase64 = await QRCode.toDataURL(url, { width: 300 });
    } catch {}

    const result: ShareResponse = { shareUrl: url, qrCodeBase64, platform: 'qr', shareCount };
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
