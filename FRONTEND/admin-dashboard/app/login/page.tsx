'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Eye, EyeSlash, LockKey } from '@phosphor-icons/react';

function normalizeRole(value: unknown): string {
    if (typeof value !== 'string') return '';
    const upper = value.trim().toUpperCase();
    return upper.startsWith('ROLE_') ? upper.slice(5) : upper;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const json = atob(padded);
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function extractRoles(input: unknown): string[] {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input
            .map(normalizeRole)
            .filter(Boolean);
    }
    return [normalizeRole(input)].filter(Boolean);
}

function isAdminUser(profileResult: Record<string, unknown> | undefined, accessToken: string): boolean {
    const profileRoles = [
        ...extractRoles(profileResult?.role),
        ...extractRoles(profileResult?.roles),
        ...extractRoles((profileResult?.authorities as unknown[] | undefined)?.map((a) =>
            typeof a === 'string' ? a : (a as { authority?: unknown })?.authority,
        )),
    ];

    if (profileRoles.includes('ADMIN')) return true;

    const payload = decodeJwtPayload(accessToken);
    const tokenRoles = [
        ...extractRoles(payload?.role),
        ...extractRoles(payload?.roles),
        ...extractRoles(payload?.authorities),
    ];

    return tokenRoles.includes('ADMIN');
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (data.code === 1000 && data.result?.authenticated) {
                const infoRes = await fetch('/api/users/myInfo', {
                    headers: { 'Authorization': `Bearer ${data.result.accessToken}` }
                });
                const infoData = await infoRes.json();
                const profileResult = (infoData?.result ?? {}) as Record<string, unknown>;

                if (isAdminUser(profileResult, data.result.accessToken)) {
                    localStorage.setItem('access_token', data.result.accessToken);
                    localStorage.setItem('refresh_token', data.result.refreshToken);
                    router.push('/dashboard');
                } else {
                    setError('Bạn không có quyền truy cập Admin Dashboard');
                }
            } else {
                setError(data.message ?? 'Sai email hoặc mật khẩu');
            }
        } catch {
            setError('Không thể kết nối tới server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="w-full max-w-[360px]">
                {/* Logo */}
                <div className="mb-10 flex items-center gap-2">
                    <div className="size-8 bg-white flex items-center justify-center">
                        <LockKey size={16} weight="bold" className="text-black" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold tracking-widest text-white">ADMIN PANEL</p>
                        <p className="text-[10px] text-zinc-600 tracking-wider">MUSIC SOCIAL NETWORK</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-[10px] font-medium tracking-widest text-zinc-500 block mb-1.5">
                            EMAIL
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                            className="w-full h-9 bg-zinc-950 border border-white/10 text-white text-xs px-3 outline-none focus:border-white/30 transition-colors placeholder:text-zinc-700"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-medium tracking-widest text-zinc-500 block mb-1.5">
                            PASSWORD
                        </label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full h-9 bg-zinc-950 border border-white/10 text-white text-xs px-3 pr-9 outline-none focus:border-white/30 transition-colors placeholder:text-zinc-700"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                            >
                                {showPw ? <EyeSlash size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-[11px] text-red-400 bg-red-400/5 border border-red-400/20 px-3 py-2">
                            {error}
                        </p>
                    )}

                    <Button type="submit" disabled={loading} className="w-full h-9 mt-1">
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="size-3 border border-white/30 border-t-white animate-spin" />
                                Đang đăng nhập...
                            </span>
                        ) : (
                            'ĐĂNG NHẬP'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}