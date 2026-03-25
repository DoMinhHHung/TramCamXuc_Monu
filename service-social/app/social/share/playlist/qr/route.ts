import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { requiredParam, handleError } from '../../../../_lib/helpers';
import { rawPlaylistUrl } from '../../../../_lib/social/mutations';
import type { ShareResponse } from '../../../../_lib/social/types';
import QRCode from 'qrcode';

export async function GET(req: NextRequest) {
  try {
    const playlistId = requiredParam(req, 'playlistId');
    const url = rawPlaylistUrl(playlistId);

    let qrCodeBase64: string | undefined;
    try {
      qrCodeBase64 = await QRCode.toDataURL(url, { width: 300 });
    } catch {}

    const result: ShareResponse = { shareUrl: url, qrCodeBase64, platform: 'qr' };
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
