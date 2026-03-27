const BASE = '/api';
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();

function token() {
    return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Handles two backend response shapes:
 *
 * Shape A — ApiResponse wrapper { code, message, result }
 * Shape B — Raw response        { content, totalElements, ... }
 *
 * 404 → ApiError(status=404)  — caller can catch & show empty state
 * 503 → ApiError(status=503)  — caller can catch & show service down
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${BASE}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
export interface ApiFetchInit extends RequestInit {
    /** Client-side cache TTL (ms). Only applies to GET requests with empty body. */
    ttlMs?: number;
}

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
    const method = (init?.method ?? 'GET').toUpperCase();
    const cacheable = method === 'GET' && !init?.body && (init?.ttlMs ?? 0) > 0;
    const cacheKey = cacheable ? `${method}:${path}` : null;
    if (cacheable && cacheKey) {
        const hit = responseCache.get(cacheKey);
        if (hit && hit.expiresAt > Date.now()) {
            return hit.data as T;
        }
    }

            },
        });
    } catch {
        // Network error (no connection, CORS, etc.)
        throw new ApiError('Không thể kết nối tới server', 0);
    }

    // Try to parse JSON body regardless of status
    let data: Record<string, unknown> | null = null;
    try {
        data = await res.json();
    } catch {
        // Non-JSON response
    }

    // Non-2xx: use backend message if available, else generic
    if (!res.ok) {
        const msg =
            (data && typeof data.message === 'string' && data.message) ||
            httpStatusMsg(res.status);
        throw new ApiError(msg, res.status, data?.code as number | undefined);
    }

    if (!data) throw new ApiError('Phản hồi rỗng từ server', res.status);

    // Shape A: ApiResponse wrapper
    if (typeof data.code === 'number') {
        if (data.code !== 1000) {
            throw new ApiError(
                (data.message as string) ?? `Error code ${data.code}`,
                res.status,
                data.code,
            );
        }
        return (data.result ?? data) as T;
    }

    // Shape B: raw response (Page<T>, plain object, array)
    return data as T;
}

function httpStatusMsg(status: number): string {
    const map: Record<number, string> = {
        400: 'Yêu cầu không hợp lệ',
        401: 'Chưa đăng nhập',
        403: 'Không có quyền truy cập',
        404: 'Không tìm thấy',
        409: 'Dữ liệu đã tồn tại',
        422: 'Dữ liệu không hợp lệ',
        429: 'Quá nhiều yêu cầu',
        500: 'Lỗi server nội bộ',
        503: 'Service không khả dụng',
    };
    return map[status] ?? `HTTP ${status}`;
}        const parsed = (data.result ?? data) as T;
        if (cacheable && cacheKey) {
            responseCache.set(cacheKey, {
                expiresAt: Date.now() + (init?.ttlMs ?? 0),
                data: parsed,
            });
        }
        return parsed;
    const parsed = data as T;
    if (cacheable && cacheKey) {
        responseCache.set(cacheKey, {
            expiresAt: Date.now() + (init?.ttlMs ?? 0),
            data: parsed,
        });
    }
    return parsed;
