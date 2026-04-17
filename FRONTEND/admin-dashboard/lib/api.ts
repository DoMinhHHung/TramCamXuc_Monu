const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function accessToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

function refreshToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
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

export interface ApiFetchInit extends RequestInit {
    ttlMs?: number;
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
}

async function tryRefreshAndStoreTokens(): Promise<boolean> {
    const rt = refreshToken();
    if (!rt) return false;
    let res: Response;
    try {
        res = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
        });
    } catch {
        return false;
    }
    let data: Record<string, unknown> | null = null;
    try {
        data = (await res.json()) as Record<string, unknown>;
    } catch {
        return false;
    }
    if (!res.ok || typeof data.code !== 'number' || data.code !== 1000) {
        return false;
    }
    const result = data.result as Record<string, unknown> | undefined;
    const at = result?.accessToken as string | undefined;
    const newRt = result?.refreshToken as string | undefined;
    if (!at) return false;
    localStorage.setItem('access_token', at);
    if (newRt) localStorage.setItem('refresh_token', newRt);
    return true;
}

function redirectToLogin(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    } catch {
        /* ignore */
    }
    window.location.href = '/login';
}

/**
 * Handles two backend response shapes:
 *
 * Shape A — ApiResponse wrapper { code, message, result }
 * Shape B — Raw response        { content, totalElements, ... }
 *
 * 401 → refresh token once, then retry; if still failing → redirect /login
 */
export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
    const method = (init?.method ?? 'GET').toUpperCase();
    const cacheable = method === 'GET' && !init?.body && (init?.ttlMs ?? 0) > 0;
    const cacheKey = cacheable ? `${method}:${path}` : null;
    
    // Check cache first
    if (cacheable && cacheKey) {
        const hit = responseCache.get(cacheKey);
        if (hit && hit.expiresAt > Date.now()) {
            return hit.data as T;
        }
    }

    // Deduplicate in-flight requests for GET requests
    if (method === 'GET' && cacheKey && inFlightRequests.has(cacheKey)) {
        return inFlightRequests.get(cacheKey) as Promise<T>;
    }

    const doFetch = (): Promise<Response> =>
        fetch(`${BASE}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}),
                ...(init?.headers ?? {}),
            },
        });

    // Create promise and store in inFlight
    const fetchPromise = (async () => {
        let res = await doFetch().catch(() => {
            throw new ApiError('Không thể kết nối tới server', 0);
        });

        const canRefresh = !path.startsWith('/auth/');
        if (res.status === 401 && canRefresh) {
            const refreshed = await tryRefreshAndStoreTokens();
            if (refreshed) {
                res = await doFetch().catch(() => {
                    redirectToLogin();
                    throw new ApiError('Phiên đăng nhập hết hạn', 401);
                });
            } else {
                redirectToLogin();
                throw new ApiError('Phiên đăng nhập hết hạn', 401);
            }
            if (res.status === 401) {
                redirectToLogin();
                throw new ApiError('Phiên đăng nhập hết hạn', 401);
            }
        }

        let data: Record<string, unknown> | null = null;
        try {
            data = (await res.json()) as Record<string, unknown>;
        } catch {
            // Non-JSON response
        }

        if (!res.ok) {
            const msg =
                (data && typeof data.message === 'string' && data.message) ||
                httpStatusMsg(res.status);
            throw new ApiError(msg, res.status, data?.code as number | undefined);
        }

        if (!data) throw new ApiError('Phản hồi rỗng từ server', res.status);

        if (typeof data.code === 'number') {
            if (data.code !== 1000) {
                throw new ApiError(
                    (data.message as string) ?? `Error code ${data.code}`,
                    res.status,
                    data.code,
                );
            }
            const parsed = (data.result ?? data) as T;
            if (cacheable && cacheKey) {
                responseCache.set(cacheKey, {
                    expiresAt: Date.now() + (init?.ttlMs ?? 0),
                    data: parsed,
                });
            }
            return parsed;
        }

        const parsed = data as T;
        if (cacheable && cacheKey) {
            responseCache.set(cacheKey, {
                expiresAt: Date.now() + (init?.ttlMs ?? 0),
                data: parsed,
            });
        }
        return parsed;
    })().finally(() => {
        // Remove from in-flight when complete
        if (cacheKey) {
            inFlightRequests.delete(cacheKey);
        }
    });

    // Store in-flight request for deduplication
    if (cacheKey) {
        inFlightRequests.set(cacheKey, fetchPromise);
    }

    return fetchPromise as Promise<T>;
}
