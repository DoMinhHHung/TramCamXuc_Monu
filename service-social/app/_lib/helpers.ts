import { NextRequest, NextResponse } from 'next/server';
import { error as apiError } from './api';

export function extractUserId(req: NextRequest): string {
  return req.headers.get('X-User-Id') ?? '';
}

export function tryExtractUserId(req: NextRequest): string | null {
  const id = req.headers.get('X-User-Id');
  return id && id.length > 0 ? id : null;
}

export function extractRole(req: NextRequest): string {
  const role = req.headers.get('X-User-Role') ?? 'USER';
  return role.replace('ROLE_', '');
}

export function parsePageable(req: NextRequest, defaultSize = 20): { page: number; size: number } {
  const page = Math.max(0, toInt(req.nextUrl.searchParams.get('page'), 0));
  const size = Math.max(1, Math.min(100, toInt(req.nextUrl.searchParams.get('size'), defaultSize)));
  return { page, size };
}

export function param(req: NextRequest, key: string): string | null {
  return req.nextUrl.searchParams.get(key);
}

export function requiredParam(req: NextRequest, key: string): string {
  const v = req.nextUrl.searchParams.get(key);
  if (!v) throw new AppError(9998, `Missing required parameter: ${key}`, 400);
  return v;
}

function toInt(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export class AppError extends Error {
  constructor(
    public code: number,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
  }
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(apiError(err.code, err.message), { status: err.statusCode });
  }
  console.error('[unhandled]', err);
  return NextResponse.json(apiError(9999, 'Internal server error'), { status: 500 });
}
