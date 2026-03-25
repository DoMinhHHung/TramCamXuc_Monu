import { NextRequest, NextResponse } from 'next/server';
import { extractUserId, handleError } from '../../../_lib/helpers';
import { unheartSong } from '../../../_lib/social/mutations';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ songId: string }> }) {
  try {
    const { songId } = await params;
    const userId = extractUserId(req);
    await unheartSong({ userId, songId });
    return NextResponse.json({ code: 1000, message: 'Unhearted', result: null });
  } catch (err) { return handleError(err); }
}
