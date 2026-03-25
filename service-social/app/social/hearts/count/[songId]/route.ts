import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { handleError } from '../../../../_lib/helpers';
import { getHeartCount } from '../../../../_lib/social/queries';

export async function GET(req: NextRequest, { params }: { params: Promise<{ songId: string }> }) {
  try {
    const { songId } = await params;
    const result = await getHeartCount(songId);
    return NextResponse.json(success(result));
  } catch (err) { return handleError(err); }
}
