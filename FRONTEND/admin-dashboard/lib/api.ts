const BASE = '/api';
function token() {
    return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
            ...init?.headers,
        },
    });
    const data = await res.json();
    if (data.code !== 1000) throw new Error(data.message ?? 'Lỗi không xác định');
    return data.result as T;
}