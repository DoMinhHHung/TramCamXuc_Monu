import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { handleError } from '../../../_lib/helpers';
import { getArtistStatsBatch } from '../../../_lib/social/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const artistIds: string[] = Array.isArray(body?.artistIds) ? body.artistIds.slice(0, 100) : [];
    if (!artistIds.length) return NextResponse.json(success([]));
    const result = await getArtistStatsBatch(artistIds);
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
