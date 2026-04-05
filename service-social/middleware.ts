import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET ?? '';
const GATEWAY_INTERNAL_SECRET = process.env.GATEWAY_INTERNAL_SECRET ?? '';

function isPublicGet(pathname: string): boolean {
  if (pathname === '/social/comments') return true;
  if (pathname === '/social/comments/count') return true;
  if (pathname === '/social/comments/post') return true;
  if (pathname === '/social/comments/post/count') return true;
  if (/^\/social\/comments\/[^/]+\/replies$/.test(pathname)) return true;
  if (pathname === '/social/reactions/summary') return true;
  if (pathname === '/social/reactions/likers') return true;
  if (pathname === '/social/reactions/dislikers') return true;
  if (pathname === '/social/share') return true;
  if (pathname === '/social/share/qr') return true;
  if (pathname === '/social/share/count') return true;
  if (pathname === '/social/share/playlist') return true;
  if (pathname === '/social/share/playlist/qr') return true;
  if (pathname === '/social/share/album') return true;
  if (pathname === '/social/share/album/qr') return true;

  if (pathname === '/social/feed/public') return true;
  if (/^\/social\/feed\/owner\/[^/]+$/.test(pathname)) return true;

  if (/^\/social\/artists\/[^/]+\/stats$/.test(pathname)) return true;
  if (/^\/social\/artists\/[^/]+\/followers$/.test(pathname)) return true;

  if (/^\/social\/hearts\/count\/[^/]+$/.test(pathname)) return true;
  if (/^\/social\/listen-history\/count\/[^/]+$/.test(pathname)) return true;

  return false;
}

function jsonError(status: number, code: number, message: string) {
  return NextResponse.json({ code, message, result: null }, { status });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/internal/')) {
    const provided = req.headers.get('X-Internal-Secret') ?? '';
    if (!INTERNAL_SECRET || !provided || !secureEquals(INTERNAL_SECRET, provided)) {
      return jsonError(403, 9996, 'Forbidden');
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/social/')) {
    const method = req.method.toUpperCase();
    if (method === 'GET' && isPublicGet(pathname)) {
      return NextResponse.next();
    }

    const authenticated = req.headers.get('X-Authenticated');
    const userId = req.headers.get('X-User-Id') ?? '';
    const providedGatewaySecret = req.headers.get('X-Gateway-Secret') ?? '';

    const hasUser = authenticated === 'true' && userId.length > 0;
    const secretOk = GATEWAY_INTERNAL_SECRET
      ? secureEquals(GATEWAY_INTERNAL_SECRET, providedGatewaySecret)
      : false;

    if (!hasUser || !secretOk) {
      return jsonError(401, 9997, 'Unauthenticated');
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

function secureEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const config = {
  matcher: ['/social/:path*', '/internal/:path*'],
};
