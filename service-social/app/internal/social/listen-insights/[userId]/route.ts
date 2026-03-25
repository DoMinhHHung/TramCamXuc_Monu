import { NextRequest, NextResponse } from 'next/server';
import { success } from '../../../../_lib/api';
import { getListenInsightsRawInternal } from '../../../../_lib/social/internal';

function toIntParam(req: NextRequest, key: string, fallback: number) {
  const raw = req.nextUrl.searchParams.get(key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const days = toIntParam(req, 'days', 30);
  const result = await getListenInsightsRawInternal({ userId, days });
  return NextResponse.json(success(result));
}
