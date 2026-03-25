import { NextRequest, NextResponse } from 'next/server';
import { error } from '../../../_lib/api';

function notImplemented(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.json(
    error(9999, `Not implemented: ${req.method} ${url.pathname}`),
    { status: 501 },
  );
}

export async function GET(req: NextRequest) { return notImplemented(req); }
export async function POST(req: NextRequest) { return notImplemented(req); }
export async function PATCH(req: NextRequest) { return notImplemented(req); }
export async function DELETE(req: NextRequest) { return notImplemented(req); }
