const BASE = '/api';

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
                ...init?.headers,
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
}