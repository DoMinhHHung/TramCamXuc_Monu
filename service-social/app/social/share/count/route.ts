import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { requiredParam, handleError } from '../../../_lib/helpers';
import { getSongShareCount } from '../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const songId = requiredParam(req, 'songId');
    const count = await getSongShareCount(songId);
    return NextResponse.json(success(count));
  } catch (err) { return handleError(err); }
}
