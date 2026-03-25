import { NextRequest, NextResponse } from 'next/server';

function notFound(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.json(
    { code: 9998, message: `Not found: ${req.method} ${url.pathname}`, result: null },
    { status: 404 },
  );
}

export async function GET(req: NextRequest) { return notFound(req); }
export async function POST(req: NextRequest) { return notFound(req); }
export async function PATCH(req: NextRequest) { return notFound(req); }
export async function DELETE(req: NextRequest) { return notFound(req); }
