'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import {
    Users, CreditCard, SpeakerHigh, TrendUp,
    Warning, CursorClick, Eye, ChartLine,
} from '@phosphor-icons/react';
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
    totalClicks: number;
    ctr: number;
    estimatedRevenueVnd: number;
    cpmVnd: number;
    budgetVnd: number;
    advertiserName: string;
    title: string;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
}

interface RevenuePoint {
    date: string;
    total: number;
}

// ─── Simple in-memory cache ───────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 120_000;

async function cachedFetch<T>(path: string, ttl = CACHE_TTL_MS): Promise<T> {
    const hit = cache.get(path);
    if (hit && Date.now() - hit.ts < ttl) return hit.data as T;
    const data = await apiFetch<T>(path);
    cache.set(path, { data, ts: Date.now() });
    return data;
}

// ─── Revenue Chart ─────────────────────────────────────────────────────────────
function RevenueStockChart({ data }: { data: RevenuePoint[] }) {
    if (!data.length) return (
        <div className="h-[180px] flex items-center justify-center text-[11px] text-zinc-500">
            Không có dữ liệu doanh thu
        </div>
    );

    const W = 660, H = 180;
    const pad = { top: 10, right: 14, bottom: 24, left: 52 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;
    const max = Math.max(...data.map(d => d.total), 1);
    const min = Math.min(...data.map(d => d.total), 0);
    const range = Math.max(1, max - min);
    const x = (i: number) => pad.left + (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW);
    const y = (v: number) => pad.top + cH - ((v - min) / range) * cH;
    const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ');
    const area = `${path} L ${x(data.length - 1)} ${pad.top + cH} L ${pad.left} ${pad.top + cH} Z`;
    const sample = Math.max(1, Math.ceil(data.length / 8));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" style={{ fontFamily: 'monospace' }}>
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
                        <line x1={pad.left} y1={yy} x2={W - pad.right} y2={yy}
                              stroke="currentColor" strokeOpacity="0.08" />
                        <text x={pad.left - 6} y={yy + 3} textAnchor="end" fontSize="8"
                              fill="currentColor" opacity="0.45">
                            {Math.round(value).toLocaleString('vi-VN')}
                        </text>
                    </g>
                );
            })}
            <path d={area} fill="url(#revenueFill)" />
            <path d={path} stroke="#22c55e" strokeWidth="2" fill="none" />
            {data.map((p, i) => (
                <circle key={p.date + i} cx={x(i)} cy={y(p.total)}
                        r={data.length > 40 ? 1.6 : 2.4} fill="#16a34a" />
            ))}
            {data.filter((_, i) => i % sample === 0).map((p, idx) => {
                const i = data.findIndex(v => v === p);
                return (
                    <text key={idx} x={x(i)} y={H - 6} textAnchor="middle" fontSize="8"
                          fill="currentColor" opacity="0.45">
                        {p.date.slice(5)}
                    </text>
                );
            })}
        </svg>
    );
}

// ─── Ad Click Bar Chart ────────────────────────────────────────────────────────
function AdClicksChart({ ads }: { ads: Ad[] }) {
    const top5 = [...ads]
        .sort((a, b) => (b.totalClicks ?? 0) - (a.totalClicks ?? 0))
        .slice(0, 5);

    if (!top5.length) return (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 py-4 text-center">
            Chưa có dữ liệu
        </p>
    );

    const maxClicks = Math.max(...top5.map(a => a.totalClicks ?? 0), 1);

    return (
        <div className="space-y-2.5">
            {top5.map((ad, i) => {
                const pct = ((ad.totalClicks ?? 0) / maxClicks) * 100;
                const ctr = ad.ctr?.toFixed(2) ?? '0.00';
                return (
                    <div key={ad.id}>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[160px] font-medium">
                                {ad.title || ad.advertiserName}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-zinc-400 dark:text-zinc-600">
                                    {(ad.totalClicks ?? 0).toLocaleString()} clicks
                                </span>
                                <span className={`px-1 py-px text-[9px] border font-medium ${
                                    Number(ctr) > 5
                                        ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20 bg-emerald-50 dark:bg-emerald-400/10'
                                        : Number(ctr) > 2
                                        ? 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/20 bg-amber-50 dark:bg-amber-400/10'
                                        : 'text-zinc-500 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
                                }`}>
                                    CTR {ctr}%
                                </span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-zinc-100 dark:bg-white/[0.06]">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${pct}%`,
                                    background: i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : i === 2 ? '#10b981' : i === 3 ? '#f59e0b' : '#6b7280',
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, bg, loading, badge }: {
    label: string; value: string; sub?: string; icon: React.ElementType;
    color: string; bg: string; loading: boolean; badge?: string;
}) {
    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-wider text-zinc-500 dark:text-zinc-600">{label.toUpperCase()}</span>
                <div className={`size-6 flex items-center justify-center ${bg}`}>
                    <Icon size={13} className={color} />
                </div>
            </div>
            {loading
                ? <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                : (
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>
                        {sub && <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{sub}</p>}
                        {badge && (
                            <span className="inline-flex items-center mt-1 px-1.5 py-px text-[9px] font-medium border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20">
                                {badge}
                            </span>
                        )}
                    </div>
                )}
        </div>
    );
}

// ─── Section ───────────────────────────────────────────────────────────────────
function Section({ title, sub, error, children, action }: {
    title: string; sub?: string; error?: string | null;
    children: React.ReactNode; action?: React.ReactNode;
}) {
    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-semibold tracking-widest text-zinc-500 dark:text-zinc-600">{title}</p>
                    {sub && <p className="text-[10px] text-zinc-400 dark:text-zinc-700 mt-0.5">{sub}</p>}
                </div>
                {action}
            </div>
            <div className="p-5">
                {error ? (
                    <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-500">
                        <Warning size={13} /><span>{error}</span>
                    </div>
                ) : children}
            </div>
        </div>
    );
}

// ─── Format helpers ────────────────────────────────────────────────────────────
const vnd = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

type RevenueWindow = '7D' | '1M' | '1Y';

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [totalUsers,    setTotalUsers]    = useState(0);
    const [plans,         setPlans]         = useState<Plan[]>([]);
    const [ads,           setAds]           = useState<Ad[]>([]);

    const [loadingUsers,   setLoadingUsers]   = useState(true);
    const [loadingPlans,   setLoadingPlans]   = useState(true);
    const [loadingAds,     setLoadingAds]     = useState(true);
    const [loadingRevenue, setLoadingRevenue] = useState(true);

    const [errorUsers,   setErrorUsers]   = useState<string | null>(null);
    const [errorPlans,   setErrorPlans]   = useState<string | null>(null);
    const [errorAds,     setErrorAds]     = useState<string | null>(null);
    const [errorRevenue, setErrorRevenue] = useState<string | null>(null);

    const [window_,    setWindow]    = useState<RevenueWindow>('1M');
    const [revenue,    setRevenue]   = useState<RevenuePoint[]>([]);

    // ── Load revenue ────────────────────────────────────────────────────────────
    const loadRevenue = useCallback(async (w: RevenueWindow) => {
        setLoadingRevenue(true);
        const to = new Date();
        const from = new Date(to);
        if (w === '7D') from.setDate(to.getDate() - 6);
        if (w === '1M') from.setDate(to.getDate() - 29);
        if (w === '1Y') from.setFullYear(to.getFullYear() - 1);

        const fromStr = from.toISOString().slice(0, 10);
        const toStr   = to.toISOString().slice(0, 10);

        try {
            const rows = await apiFetch<RevenuePoint[]>(
                `/admin/subscriptions/stats?from=${fromStr}&to=${toStr}`
            );
            setRevenue(Array.isArray(rows) ? rows : []);
            setErrorRevenue(null);
        } catch (e) {
            setRevenue([]);
            setErrorRevenue(e instanceof ApiError ? e.message : 'Không tải được doanh thu');
        } finally {
            setLoadingRevenue(false);
        }
    }, []);

    // ── Load all stats in parallel ──────────────────────────────────────────────
    useEffect(() => {
        // Parallel fetch để tránh waterfall
        Promise.all([
            // Users
            cachedFetch<PageResult<object>>('/users?page=1&size=1', 30_000)
                .then(r => setTotalUsers(r.totalElements))
                .catch((e: Error) => setErrorUsers(e.message))
                .finally(() => setLoadingUsers(false)),

            // Plans
            cachedFetch<PageResult<Plan>>('/admin/subscriptions/plans?page=0&size=100', 60_000)
                .then(r => setPlans(r.content ?? []))
                .catch((e: Error) => setErrorPlans(e.message))
                .finally(() => setLoadingPlans(false)),

            // Ads — lấy đủ data để vẽ biểu đồ clicks
            cachedFetch<PageResult<Ad>>('/admin/ads?page=0&size=50', 30_000)
                .then(r => setAds(r.content ?? []))
                .catch((e: Error) => setErrorAds(e.message))
                .finally(() => setLoadingAds(false)),
        ]);

        loadRevenue(window_);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch revenue khi đổi window
    useEffect(() => { loadRevenue(window_); }, [window_, loadRevenue]);

    // Realtime refresh
    useEffect(() => {
        const close = openAdminRealtime(() => loadRevenue(window_));
        return () => close();
    }, [loadRevenue, window_]);

    // ── Derived stats ──────────────────────────────────────────────────────────
    const totalImpressions = ads.reduce((s, a) => s + (a.totalImpressions ?? 0), 0);
    const totalClicks      = ads.reduce((s, a) => s + (a.totalClicks ?? 0), 0);
    const activeAds        = ads.filter(a => a.status === 'ACTIVE').length;
    const totalRevenue     = useMemo(() => revenue.reduce((s, x) => s + Number(x.total ?? 0), 0), [revenue]);
    const avgCtr           = totalImpressions > 0
        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
        : '0.00';

    const estimatedAdRevenue = ads.reduce((s, a) => s + (a.estimatedRevenueVnd ?? 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Overview</h1>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                    Tổng quan hệ thống và doanh thu payment theo dạng biểu đồ chứng khoán.
                </p>
            </div>

            {/* ── Row 1: Core metrics ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                    label="Người dùng"
                    value={errorUsers ? '—' : totalUsers.toLocaleString('vi-VN')}
                    icon={Users} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10"
                    loading={loadingUsers}
                />
                <StatCard
                    label="Gói subscription"
                    value={errorPlans ? '—' : String(plans.length)}
                    sub={`${plans.filter(p => p.isActive).length} đang active`}
                    icon={CreditCard} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10"
                    loading={loadingPlans}
                />
                <StatCard
                    label="Ads đang chạy"
                    value={errorAds ? '—' : String(activeAds)}
                    sub={`${ads.length} tổng`}
                    icon={SpeakerHigh} color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10"
                    loading={loadingAds}
                />
                <StatCard
                    label="Tổng impressions"
                    value={errorAds ? '—' : fmtNum(totalImpressions)}
                    sub={`CTR trung bình ${avgCtr}%`}
                    icon={Eye} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10"
                    loading={loadingAds}
                />
            </div>

            {/* ── Row 2: Ad engagement stats ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                    label="Tổng lượt click Ads"
                    value={errorAds ? '—' : fmtNum(totalClicks)}
                    sub="Tất cả quảng cáo"
                    icon={CursorClick} color="text-sky-500" bg="bg-sky-50 dark:bg-sky-500/10"
                    loading={loadingAds}
                />
                <StatCard
                    label="CTR trung bình"
                    value={errorAds ? '—' : `${avgCtr}%`}
                    sub="Click / Impression"
                    icon={ChartLine} color="text-violet-500" bg="bg-violet-50 dark:bg-violet-500/10"
                    loading={loadingAds}
                    badge={Number(avgCtr) > 3 ? '🔥 Tốt' : undefined}
                />
                <StatCard
                    label="Doanh thu Ads ước tính"
                    value={errorAds ? '—' : vnd(estimatedAdRevenue)}
                    sub="Dựa trên CPM × impressions"
                    icon={TrendUp} color="text-rose-500" bg="bg-rose-50 dark:bg-rose-500/10"
                    loading={loadingAds}
                />
                <StatCard
                    label="Doanh thu Subscription"
                    value={loadingRevenue ? '···' : vnd(totalRevenue)}
                    sub={`${window_ === '7D' ? '7 ngày' : window_ === '1M' ? '30 ngày' : '1 năm'} gần nhất`}
                    icon={CreditCard} color="text-teal-500" bg="bg-teal-50 dark:bg-teal-500/10"
                    loading={loadingRevenue}
                />
            </div>

            {/* ── Revenue chart ───────────────────────────────────────────────────── */}
            <Section
                title="PAYMENT OVERVIEW"
                sub="Doanh thu thực tế từ payment-service"
                error={errorRevenue}
                action={
                    <div className="flex gap-1">
                        {([
                            { key: '7D', label: '7N' },
                            { key: '1M', label: '1T' },
                            { key: '1Y', label: '1N' },
                        ] as const).map(x => (
                            <button
                                key={x.key}
                                onClick={() => setWindow(x.key)}
                                className={`px-2.5 py-1 text-[10px] border transition-all ${
                                    window_ === x.key
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent'
                                        : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20'
                                }`}
                            >
                                {x.label}
                            </button>
                        ))}
                    </div>
                }
            >
                <div className="space-y-4">
                    {loadingRevenue ? (
                        <div className="h-[180px] flex items-center justify-center text-[11px] text-zinc-500">
                            Đang tải doanh thu...
                        </div>
                    ) : (
                        <RevenueStockChart data={revenue} />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            { label: 'Tổng doanh thu', value: vnd(totalRevenue) },
                            { label: 'Số mốc dữ liệu', value: revenue.length.toLocaleString('vi-VN') },
                            { label: 'Giá trị gần nhất', value: vnd(Number(revenue[revenue.length - 1]?.total ?? 0)) },
                        ].map(item => (
                            <div key={item.label} className="border border-zinc-200 dark:border-white/10 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{item.label}</p>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ── Ad clicks section ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section
                    title="TOP 5 QUẢNG CÁO — LƯỢT CLICK"
                    sub="Xếp hạng theo tổng clicks"
                    error={errorAds}
                >
                    {loadingAds ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-4 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <AdClicksChart ads={ads} />
                    )}
                </Section>

                <Section
                    title="PHÂN BỐ IMPRESSIONS VS CLICKS"
                    sub="Tổng hợp hiệu suất quảng cáo"
                    error={errorAds}
                >
                    {loadingAds ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-4 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-white/[0.08]">
                                            {['Trạng thái', 'Số lượng', 'Impressions', 'Clicks', 'CTR'].map(h => (
                                                <th key={h} className="text-left py-2 pr-3 text-[10px] text-zinc-400 dark:text-zinc-600 font-medium tracking-wider">
                                                    {h.toUpperCase()}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(['ACTIVE', 'PAUSED', 'ARCHIVED'] as const).map(status => {
                                            const group = ads.filter(a => a.status === status);
                                            const impr  = group.reduce((s, a) => s + (a.totalImpressions ?? 0), 0);
                                            const clks  = group.reduce((s, a) => s + (a.totalClicks ?? 0), 0);
                                            const ctr   = impr > 0 ? ((clks / impr) * 100).toFixed(2) : '0.00';
                                            const cls   = status === 'ACTIVE'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : status === 'PAUSED'
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-zinc-400 dark:text-zinc-600';
                                            return (
                                                <tr key={status} className="border-b border-zinc-100 dark:border-white/[0.05]">
                                                    <td className={`py-2 pr-3 font-medium ${cls}`}>{status}</td>
                                                    <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-300">{group.length}</td>
                                                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">{fmtNum(impr)}</td>
                                                    <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">{fmtNum(clks)}</td>
                                                    <td className={`py-2 font-medium ${
                                                        Number(ctr) > 5 ? 'text-emerald-600 dark:text-emerald-400'
                                                        : Number(ctr) > 2 ? 'text-amber-600 dark:text-amber-400'
                                                        : 'text-zinc-500 dark:text-zinc-500'
                                                    }`}>{ctr}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Budget health */}
                            <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-2 tracking-wider">BUDGET UTILIZATION</p>
                                {ads
                                    .filter(a => a.status === 'ACTIVE' && a.budgetVnd > 0)
                                    .slice(0, 3)
                                    .map(ad => {
                                        const used = ad.estimatedRevenueVnd > 0 && ad.budgetVnd > 0
                                            ? Math.min(100, (ad.estimatedRevenueVnd / ad.budgetVnd) * 100)
                                            : 0;
                                        return (
                                            <div key={ad.id} className="mb-2">
                                                <div className="flex justify-between text-[10px] mb-1">
                                                    <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[160px]">
                                                        {ad.title || ad.advertiserName}
                                                    </span>
                                                    <span className={`font-medium ${
                                                        used > 80 ? 'text-red-500' : used > 50 ? 'text-amber-500' : 'text-emerald-500'
                                                    }`}>
                                                        {used.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="h-1 bg-zinc-100 dark:bg-white/[0.06]">
                                                    <div
                                                        className={`h-full transition-all ${
                                                            used > 80 ? 'bg-red-500' : used > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${used}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                {ads.filter(a => a.status === 'ACTIVE' && a.budgetVnd > 0).length === 0 && (
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600">Không có ads active với budget</p>
                                )}
                            </div>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
}