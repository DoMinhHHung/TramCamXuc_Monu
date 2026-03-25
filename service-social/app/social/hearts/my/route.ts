import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { extractUserId, parsePageable, handleError } from '../../../_lib/helpers';
import { getMyHearts } from '../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const userId = extractUserId(req);
    const { page, size } = parsePageable(req);
    const result = await getMyHearts({ userId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
