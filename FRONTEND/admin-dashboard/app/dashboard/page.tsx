'use client';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { Users, CreditCard, SpeakerHigh, TrendUp, Warning } from '@phosphor-icons/react';
import { openAdminRealtime } from '@/lib/realtime';

interface Plan { id: string; subsName: string; price: number; isActive: boolean }
interface Ad   { id: string; title: string; advertiserName: string; status: string; totalImpressions: number; totalClicks: number }
interface PageResult<T> { content: T[]; totalElements: number }

const PIE_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];
const CHART_BLUE   = '#3b82f6';
const CHART_PURPLE = '#8b5cf6';

// ─── Donut Chart ──────────────────────────────────────────────────────────────
interface Slice { label: string; value: number; color: string }

function DonutChart({ data, total }: { data: Slice[]; total: string }) {
    const sum = data.reduce((s, d) => s + (d.value || 0), 0);
    if (sum === 0) return (
        <div className="flex items-center justify-center h-[160px] text-[11px] text-zinc-400 dark:text-zinc-600">Không có dữ liệu</div>
    );

    const cx = 80, cy = 80, R = 65, r = 42;
    let cur = -90;

    const arc = (start: number, sweep: number) => {
        const rad = (d: number) => (d * Math.PI) / 180;
        const end = start + sweep;
        const large = sweep > 180 ? 1 : 0;
        const x1 = cx + R * Math.cos(rad(start)), y1 = cy + R * Math.sin(rad(start));
        const x2 = cx + R * Math.cos(rad(end)),   y2 = cy + R * Math.sin(rad(end));
        const ix1 = cx + r * Math.cos(rad(end)),   iy1 = cy + r * Math.sin(rad(end));
        const ix2 = cx + r * Math.cos(rad(start)), iy2 = cy + r * Math.sin(rad(start));
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
    };

    const slices = data.map(d => {
        const sweep = (d.value / sum) * 358;
        const path = arc(cur, sweep);
        cur += sweep + 0.5;
        return { ...d, path };
    });

    return (
        <div className="flex items-center gap-6 w-full">
            <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
                {slices.map((s, i) => (
                    <path key={i} d={s.path} fill={s.color} className="hover:opacity-75 transition-opacity" />
                ))}
                <text x="80" y="76" textAnchor="middle" fontSize="15" fontWeight="600" fontFamily="monospace"
                      fill="currentColor">{total}</text>
                <text x="80" y="90" textAnchor="middle" fontSize="9" fontFamily="monospace"
                      fill="currentColor" opacity="0.4">PLANS</text>
            </svg>
            <div className="flex-1 space-y-1.5 min-w-0">
                {slices.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="size-2 shrink-0" style={{ background: s.color }} />
                        <span className="text-zinc-600 dark:text-zinc-400 truncate">{s.label}</span>
                        <span className="ml-auto text-zinc-900 dark:text-white font-medium shrink-0">{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
interface ChartPoint { label: string; impressions: number; clicks: number }

function StockAreaChart({ data }: { data: ChartPoint[] }) {
    if (data.length === 0) return (
        <div className="flex items-center justify-center h-full text-[11px] text-zinc-400 dark:text-zinc-600">Không có dữ liệu</div>
    );

    const W = 460, H = 140;
    const PAD = { top: 12, right: 12, bottom: 28, left: 48 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;
    const maxY = Math.max(...data.map(d => d.impressions), ...data.map(d => d.clicks), 1);
    const niceMax = Math.ceil(maxY / 10) * 10 || 10;

    const xS = (i: number) => PAD.left + (data.length <= 1 ? cW / 2 : (i / (data.length - 1)) * cW);
    const yS = (v: number) => PAD.top + cH - (v / niceMax) * cH;

    const line = (key: 'impressions' | 'clicks') =>
        data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(d[key]).toFixed(1)}`).join(' ');

    const area = (key: 'impressions' | 'clicks') =>
        `${line(key)} L ${xS(data.length - 1).toFixed(1)} ${(PAD.top + cH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + cH).toFixed(1)} Z`;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ y: yS(niceMax * t), label: (niceMax * t).toFixed(0) }));
    const step = Math.max(1, Math.ceil(data.length / 6));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ fontFamily: 'monospace' }}>
            <defs>
                <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_BLUE}   stopOpacity="0.25" />
                    <stop offset="100%" stopColor={CHART_BLUE} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gClk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_PURPLE}   stopOpacity="0.20" />
                    <stop offset="100%" stopColor={CHART_PURPLE} stopOpacity="0" />
                </linearGradient>
            </defs>
            {yTicks.map((t, i) => (
                <g key={i}>
                    <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
                    <text x={PAD.left - 6} y={t.y + 3.5} textAnchor="end" fontSize="8" fill="currentColor" opacity="0.4">{t.label}</text>
                </g>
            ))}
            <path d={area('impressions')} fill="url(#gImp)" />
            <path d={area('clicks')}     fill="url(#gClk)" />
            <path d={line('impressions')} fill="none" stroke={CHART_BLUE}   strokeWidth="1.5" />
            <path d={line('clicks')}      fill="none" stroke={CHART_PURPLE} strokeWidth="1.5" strokeDasharray="3 2" />
            {data.length <= 12 && data.map((d, i) => (
                <g key={i}>
                    <circle cx={xS(i)} cy={yS(d.impressions)} r="2.5" fill={CHART_BLUE} />
                    <circle cx={xS(i)} cy={yS(d.clicks)}      r="2.5" fill={CHART_PURPLE} />
                </g>
            ))}
            {data.filter((_, i) => i % step === 0).map((d, idx) => {
                const i = data.findIndex(x => x === d);
                return (
                    <text key={idx} x={xS(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">
                        {d.label.length > 8 ? d.label.slice(0, 8) + '…' : d.label}
                    </text>
                );
            })}
        </svg>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg, loading }: {
    label: string; value: string; icon: React.ElementType;
    color: string; bg: string; loading: boolean;
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
                : <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>
            }
        </div>
    );
}

// ─── Section with error state ─────────────────────────────────────────────────
function Section({ title, sub, error, loading, children }: {
    title: string; sub?: string; error?: string | null;
    loading?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.06]">
                <p className="text-[10px] font-semibold tracking-widest text-zinc-500 dark:text-zinc-600">{title}</p>
                {sub && <p className="text-[10px] text-zinc-400 dark:text-zinc-700 mt-0.5">{sub}</p>}
            </div>
            <div className="p-5">
                {error
                    ? (
                        <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-500">
                            <Warning size={13} />
                            <span>{error}</span>
                        </div>
                    )
                    : children
                }
            </div>
        </div>
    );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <div className="flex items-center justify-center h-[160px]">
            <div className="size-5 border border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-white animate-spin" />
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    // Users
    const [totalUsers,    setTotalUsers]    = useState(0);
    const [loadingUsers,  setLoadingUsers]  = useState(true);
    const [errorUsers,    setErrorUsers]    = useState<string | null>(null);

    // Plans
    const [plans,         setPlans]         = useState<Plan[]>([]);
    const [loadingPlans,  setLoadingPlans]  = useState(true);
    const [errorPlans,    setErrorPlans]    = useState<string | null>(null);

    // Ads
    const [ads,           setAds]           = useState<Ad[]>([]);
    const [loadingAds,    setLoadingAds]    = useState(true);
    const [errorAds,      setErrorAds]      = useState<string | null>(null);
    const [loadingRevenue, setLoadingRevenue] = useState(false);

    const loadRevenue = (days: 7 | 30, ttlMs = 5_000) => {
        setLoadingRevenue(true);
        const to = new Date();
        const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
        const q = `/admin/subscriptions/stats?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
        return apiFetch<RevenuePoint[]>(q, { ttlMs })
            .then((r) => setRevenueStats(r ?? []))
            .catch(() => setRevenueStats([]))
            .finally(() => setLoadingRevenue(false));
    };

    useEffect(() => {
        // ── Users ──────────────────────────────────────────────
        apiFetch<PageResult<object>>('/users?page=1&size=1', { ttlMs: 20_000 })
            .then(r => setTotalUsers(r.totalElements))
            .catch((e: ApiError | Error) => setErrorUsers(e.message))
            .finally(() => setLoadingUsers(false));

        // payment-service: 0-indexed Pageable
        apiFetch<PageResult<Plan>>('/admin/subscriptions/plans?page=0&size=100', { ttlMs: 30_000 })
            .then(r => setPlans(r.content ?? []))
            .catch((e: ApiError | Error) => {
                const status = (e as ApiError).status;
                if (status === 404 || status === 503 || status === 0) {
                    setErrorPlans('Payment service không khả dụng');
                } else {
                    setErrorPlans(e.message);
                }
            })
            .finally(() => setLoadingPlans(false));

        // ── Ads ────────────────────────────────────────────────
        // ads-service: 0-indexed Pageable. May 404 if gateway route not yet configured.
        apiFetch<PageResult<Ad>>('/admin/ads?page=1&size=50', { ttlMs: 20_000 })
            apiFetch<PageResult<SongLite>>('/songs/trending?page=1&size=5', { ttlMs: 20_000 }).then((r) => setTopSongs(r.content ?? [])),
            apiFetch<PageResult<AlbumLite>>('/albums?page=1&size=5', { ttlMs: 20_000 }).then((r) => setTopAlbums(r.content ?? [])),
            loadRevenue(windowDays, 0),
        const closeRealtime = openAdminRealtime(() => {
            void Promise.allSettled([
                loadRevenue(windowDays, 0),
                apiFetch<PageResult<SongLite>>('/songs/trending?page=1&size=5', { ttlMs: 0 }).then((r) => setTopSongs(r.content ?? [])),
                apiFetch<PageResult<AlbumLite>>('/albums?page=1&size=5', { ttlMs: 0 }).then((r) => setTopAlbums(r.content ?? [])),
            ]);
        });
        return () => closeRealtime();
        void loadRevenue(windowDays, 0);
        const id = setInterval(() => {
            void loadRevenue(windowDays);
        }, 5000);
        return () => clearInterval(id);
        clicks: p.total,
            })
            .finally(() => setLoadingAds(false));
    }, []);

    // Derived
    const activeAds  = ads.filter(a => a.status === 'ACTIVE').length;
    const totalImpr  = ads.reduce((s, a) => s + (a.totalImpressions ?? 0), 0);
    const totalClicks = ads.reduce((s, a) => s + (a.totalClicks ?? 0), 0);

    const pieData: Slice[] = plans.map((p, i) => ({
        label: p.subsName,
        value: 1,
        color: p.isActive ? PIE_COLORS[i % PIE_COLORS.length] : '#71717a',
    }));

    const chartData: ChartPoint[] = ads.slice(0, 20).map(a => ({
        label: a.advertiserName || a.title,
        impressions: a.totalImpressions ?? 0,
        clicks: a.totalClicks ?? 0,
    }));

    const activePlans   = plans.filter(p => p.isActive).length;
    const inactivePlans = plans.length - activePlans;

    const cards = [
        { label: 'Người dùng',      value: errorUsers ? '—' : totalUsers.toLocaleString(),  icon: Users,       color: 'text-blue-500 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-400/10',     loading: loadingUsers },
        { label: 'Gói subscription', value: errorPlans ? '—' : plans.length.toString(),      icon: CreditCard,  color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-400/10', loading: loadingPlans },
        { label: 'Ads đang chạy',    value: errorAds   ? '—' : activeAds.toString(),         icon: SpeakerHigh, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/10', loading: loadingAds },
        { label: 'Tổng impressions', value: errorAds   ? '—' : totalImpr.toLocaleString(),   icon: TrendUp,     color: 'text-amber-500 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-400/10',   loading: loadingAds },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Overview</h1>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">Tổng quan hệ thống</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {cards.map(c => <StatCard key={c.label} {...c} />)}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Donut — Plans */}
                <Section title="SUBSCRIPTION PLANS" sub="Phân bố gói đăng ký" error={errorPlans}>
                    {loadingPlans
                        ? <Spinner />
                        : (
                            <>
                                <DonutChart data={pieData} total={plans.length.toString()} />
                                {plans.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/[0.06] grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Active</p>
                                            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{activePlans}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Inactive</p>
                                            <p className="text-lg font-semibold text-zinc-500">{inactivePlans}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    }
                </Section>

                {/* Area — Ads */}
                <Section title="ADS PERFORMANCE" sub="Impressions vs Clicks" error={errorAds}>
                    {loadingAds
                        ? <Spinner />
                        : (
                            <>
                                <div className="h-[140px]"><StockAreaChart data={chartData} /></div>
                                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/[0.06]">
                                    <div className="flex items-center gap-5 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-block w-6 h-0.5" style={{ background: CHART_BLUE }} />
                                            <span className="text-[10px] text-zinc-500">Impressions</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-block w-6 h-px border-t border-dashed" style={{ borderColor: CHART_PURPLE }} />
                                            <span className="text-[10px] text-zinc-500">Clicks</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Total Ads</p>
                                            <p className="text-base font-semibold text-zinc-900 dark:text-white">{ads.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Impressions</p>
                                            <p className="text-base font-semibold text-blue-600 dark:text-blue-400">{totalImpr.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Avg CTR</p>
                                            <p className="text-base font-semibold text-purple-600 dark:text-purple-400">
                                                {totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(1) + '%' : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    }
                </Section>
            </div>

            {/* Services */}
            <Section title="TRẠNG THÁI SERVICES">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['Identity','Music','Payment','Social','Ads'].map(s => (
                        <div key={s} className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
                            <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                            {s}
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}                        {loadingRevenue ? <Spinner /> : <StockAreaChart data={paymentChartData} />}
