import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { requiredParam, parsePageable, handleError } from '../../../_lib/helpers';
import { getReactionLikers } from '../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const songId = requiredParam(req, 'songId');
    const { page, size } = parsePageable(req);
    const result = await getReactionLikers({ songId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
