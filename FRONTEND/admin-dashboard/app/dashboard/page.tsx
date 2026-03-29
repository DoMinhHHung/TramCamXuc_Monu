'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Users, CreditCard, SpeakerHigh, TrendUp, Warning } from '@phosphor-icons/react';
import { openAdminRealtime } from '@/lib/realtime';

interface Plan {
    id: string;
    subsName: string;
    isActive: boolean;
}

interface Ad {
    id: string;
    status: string;
    totalImpressions: number;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
}

interface RevenuePoint {
    date: string;
    total: number;
}

type RevenueWindow = '7D' | '1M' | '1Y';

function Section({ title, sub, error, children }: { title: string; sub?: string; error?: string | null; children: React.ReactNode }) {
    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.06]">
                <p className="text-[10px] font-semibold tracking-widest text-zinc-500 dark:text-zinc-600">{title}</p>
                {sub && <p className="text-[10px] text-zinc-400 dark:text-zinc-700 mt-0.5">{sub}</p>}
            </div>
            <div className="p-5">
                {error ? (
                    <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-500">
                        <Warning size={13} />
                        <span>{error}</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg, loading }: {
    label: string;
    value: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    loading: boolean;
}) {
    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-wider text-zinc-500 dark:text-zinc-600">{label.toUpperCase()}</span>
                <div className={`size-6 flex items-center justify-center ${bg}`}>
                    <Icon size={13} className={color} />
                </div>
            </div>
            {loading ? <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse" /> : <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>}
        </div>
    );
}

function RevenueStockChart({ data }: { data: RevenuePoint[] }) {
    if (!data.length) return <div className="h-[180px] flex items-center justify-center text-[11px] text-zinc-500">Không có dữ liệu doanh thu</div>;

    const width = 660;
    const height = 180;
    const pad = { top: 10, right: 14, bottom: 24, left: 42 };
    const cW = width - pad.left - pad.right;
    const cH = height - pad.top - pad.bottom;

    const max = Math.max(...data.map((d) => d.total), 1);
    const min = Math.min(...data.map((d) => d.total), 0);
    const range = Math.max(1, max - min);

    const x = (i: number) => pad.left + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW);
    const y = (v: number) => pad.top + cH - ((v - min) / range) * cH;

    const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ');
    const area = `${path} L ${x(data.length - 1)} ${pad.top + cH} L ${pad.left} ${pad.top + cH} Z`;

    const sample = Math.max(1, Math.ceil(data.length / 8));

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px]" style={{ fontFamily: 'monospace' }}>
            <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const value = min + range * t;
                const yy = y(value);
                return (
                    <g key={i}>
                        <line x1={pad.left} y1={yy} x2={width - pad.right} y2={yy} stroke="currentColor" strokeOpacity="0.08" />
                        <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="8" fill="currentColor" opacity="0.45">
                            {Math.round(value).toLocaleString('vi-VN')}
                        </text>
                    </g>
                );
            })}
            <path d={area} fill="url(#revenueFill)" />
            <path d={path} stroke="#22c55e" strokeWidth="2" fill="none" />
            {data.map((p, i) => (
                <circle key={p.date + i} cx={x(i)} cy={y(p.total)} r={data.length > 40 ? 1.6 : 2.4} fill="#16a34a" />
            ))}
            {data.filter((_, i) => i % sample === 0).map((p, idx) => {
                const i = data.findIndex((v) => v === p);
                return (
                    <text key={idx} x={x(i)} y={height - 6} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.45">
                        {p.date.slice(5)}
                    </text>
                );
            })}
        </svg>
    );
}

const vnd = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
    const [totalUsers, setTotalUsers] = useState(0);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [ads, setAds] = useState<Ad[]>([]);

    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingAds, setLoadingAds] = useState(true);
    const [loadingRevenue, setLoadingRevenue] = useState(true);

    const [errorUsers, setErrorUsers] = useState<string | null>(null);
    const [errorPlans, setErrorPlans] = useState<string | null>(null);
    const [errorAds, setErrorAds] = useState<string | null>(null);
    const [errorRevenue, setErrorRevenue] = useState<string | null>(null);

    const [window, setWindow] = useState<RevenueWindow>('1M');
    const [revenue, setRevenue] = useState<RevenuePoint[]>([]);

    const loadRevenue = useCallback(async (w: RevenueWindow, ttlMs = 0) => {
        setLoadingRevenue(true);
        const to = new Date();
        const from = new Date(to);
        if (w === '7D') from.setDate(to.getDate() - 6);
        if (w === '1M') from.setDate(to.getDate() - 29);
        if (w === '1Y') from.setFullYear(to.getFullYear() - 1);

        const fromStr = from.toISOString().slice(0, 10);
        const toStr = to.toISOString().slice(0, 10);

        try {
            const rows = await apiFetch<RevenuePoint[]>(`/admin/subscriptions/stats?from=${fromStr}&to=${toStr}`, { ttlMs });
            setRevenue(Array.isArray(rows) ? rows : []);
            setErrorRevenue(null);
        } catch (e) {
            setRevenue([]);
            setErrorRevenue(e instanceof ApiError ? e.message : 'Không tải được doanh thu');
        } finally {
            setLoadingRevenue(false);
        }
    }, []);

    useEffect(() => {
        apiFetch<PageResult<object>>('/users?page=1&size=1', { ttlMs: 20_000 })
            .then((r) => setTotalUsers(r.totalElements))
            .catch((e: ApiError | Error) => setErrorUsers(e.message))
            .finally(() => setLoadingUsers(false));

        apiFetch<PageResult<Plan>>('/admin/subscriptions/plans?page=0&size=100', { ttlMs: 20_000 })
            .then((r) => setPlans(r.content ?? []))
            .catch((e: ApiError | Error) => setErrorPlans(e.message))
            .finally(() => setLoadingPlans(false));

        apiFetch<PageResult<Ad>>('/admin/ads?page=1&size=50', { ttlMs: 20_000 })
            .then((r) => setAds(r.content ?? []))
            .catch((e: ApiError | Error) => setErrorAds(e.message))
            .finally(() => setLoadingAds(false));

        void loadRevenue(window, 0);
    }, [loadRevenue, window]);

    useEffect(() => {
        const close = openAdminRealtime(() => {
            void loadRevenue(window, 0);
        });
        return () => close();
    }, [loadRevenue, window]);

    const totalImpr = ads.reduce((sum, a) => sum + (a.totalImpressions ?? 0), 0);
    const activeAds = ads.filter((a) => a.status === 'ACTIVE').length;
    const totalRevenue = useMemo(() => revenue.reduce((sum, x) => sum + Number(x.total ?? 0), 0), [revenue]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Overview</h1>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">Tổng quan hệ thống và doanh thu payment theo dạng biểu đồ chứng khoán.</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard label="Người dùng" value={errorUsers ? '—' : totalUsers.toLocaleString('vi-VN')} icon={Users} color="text-blue-500" bg="bg-blue-50" loading={loadingUsers} />
                <StatCard label="Gói subscription" value={errorPlans ? '—' : `${plans.length}`} icon={CreditCard} color="text-purple-500" bg="bg-purple-50" loading={loadingPlans} />
                <StatCard label="Ads đang chạy" value={errorAds ? '—' : `${activeAds}`} icon={SpeakerHigh} color="text-emerald-500" bg="bg-emerald-50" loading={loadingAds} />
                <StatCard label="Tổng impressions" value={errorAds ? '—' : totalImpr.toLocaleString('vi-VN')} icon={TrendUp} color="text-amber-500" bg="bg-amber-50" loading={loadingAds} />
            </div>

            <Section title="PAYMENT OVERVIEW" sub="Doanh thu thực tế từ payment-service" error={errorRevenue}>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {([
                            { key: '7D', label: '7 ngày' },
                            { key: '1M', label: '1 tháng' },
                            { key: '1Y', label: '1 năm' },
                        ] as const).map((x) => (
                            <button
                                key={x.key}
                                onClick={() => setWindow(x.key)}
                                className={`px-3 py-1.5 text-[11px] border ${window === x.key ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                            >
                                {x.label}
                            </button>
                        ))}
                    </div>

                    {loadingRevenue ? (
                        <div className="h-[180px] flex items-center justify-center text-[11px] text-zinc-500">Đang tải doanh thu...</div>
                    ) : (
                        <RevenueStockChart data={revenue} />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="border border-zinc-200 dark:border-white/10 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tổng doanh thu</p>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white">{vnd(totalRevenue)}</p>
                        </div>
                        <div className="border border-zinc-200 dark:border-white/10 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Số mốc dữ liệu</p>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white">{revenue.length.toLocaleString('vi-VN')}</p>
                        </div>
                        <div className="border border-zinc-200 dark:border-white/10 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Giá trị gần nhất</p>
                            <p className="text-lg font-semibold text-zinc-900 dark:text-white">{vnd(Number(revenue[revenue.length - 1]?.total ?? 0))}</p>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
}
