import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { extractUserId, handleError } from '../../../../_lib/helpers';
import { isHearted } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ songId: string }> }) {
  try {
    const { songId } = await params;
    const userId = extractUserId(req);
    const result = await isHearted({ userId, songId });
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
