import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { handleError } from '../../../../_lib/helpers';
import { getOrSetJson } from '../../../../_lib/cache';
import { getArtistStats } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const { artistId } = await params;
    const result = await getOrSetJson({
      key: `social:stats:artist:${artistId}`,
      ttlSeconds: 120,
      fetcher: () => getArtistStats({ artistId }),
    });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
