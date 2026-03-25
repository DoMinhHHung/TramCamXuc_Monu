import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { tryExtractUserId, parsePageable, handleError } from '../../../../_lib/helpers';
import { getOwnerFeed } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ownerId: string }> }) {
  try {
    const { ownerId } = await params;
    const viewerId = tryExtractUserId(req);
    const { page, size } = parsePageable(req);
    const result = await getOwnerFeed({ ownerId, viewerId, page, size });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
