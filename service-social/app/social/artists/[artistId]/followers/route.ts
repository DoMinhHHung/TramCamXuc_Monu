import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { parsePageable, handleError } from '../../../../_lib/helpers';
import { getArtistFollowers } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const { artistId } = await params;
    const { page, size } = parsePageable(req);
    const result = await getArtistFollowers({ artistId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
