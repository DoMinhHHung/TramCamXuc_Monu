import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../_lib/api';
import { parsePageable, handleError } from '../../../_lib/helpers';
import { getPublicFeed } from '../../../_lib/social/queries';

export async function GET(req: NextRequest) {
  try {
    const { page, size } = parsePageable(req);
    const result = await getPublicFeed({ page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
