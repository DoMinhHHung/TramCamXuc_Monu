import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { requiredParam, handleError } from '../../../_lib/helpers';
import { getReactionSummary } from '../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const songId = requiredParam(req, 'songId');
    const result = await getReactionSummary(songId);
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
