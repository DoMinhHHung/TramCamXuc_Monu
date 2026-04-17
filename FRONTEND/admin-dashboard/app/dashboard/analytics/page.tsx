'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { apiFetch, ApiError } from '@/lib/api';
import {
    TrendUp, TrendDown, CreditCard, SpeakerHigh, MusicNote,
    Users, Queue, Playlist, Disc, Warning,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
    id: string; subsName: string; price: number;
    durationDays: number; isActive: boolean;
    features: Record<string, unknown>;
}
interface PageResult<T> { content: T[]; totalElements: number }

// ─── Micro-sparkline (stock-style) ───────────────────────────────────────────
interface SparklineProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}
function Sparkline({ data, color, width = 200, height = 48 }: SparklineProps) {
    if (!data.length) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = data[data.length - 1];
    const prev = data[data.length - 2] ?? last;
    const up = last >= prev;
    const areaPts = `0,${height} ${pts.join(' ')} ${width},${height}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
                <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={areaPts} fill={`url(#grad-${color.replace('#','')})`} />
            <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
            {/* Last value dot */}
            <circle cx={width} cy={height - ((last - min) / range) * (height - 8) - 4} r="2.5" fill={color} />
        </svg>
    );
}

// ─── Revenue Stock Chart ──────────────────────────────────────────────────────
interface StockChartProps {
    points: Array<{ label: string; value: number }>;
    color?: string;
}
function StockChart({ points, color = '#3b82f6' }: StockChartProps) {
    const W = 500, H = 160;
    const PAD = { top: 16, right: 16, bottom: 28, left: 60 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    if (!points.length) {
        return (
            <div className="flex items-center justify-center h-full text-[11px] text-zinc-400 dark:text-zinc-600">
                Không có dữ liệu
            </div>
        );
    }

    const values = points.map(p => p.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const niceMax = maxV * 1.1;

    const xS = (i: number) => PAD.left + (points.length <= 1 ? cW / 2 : (i / (points.length - 1)) * cW);
    const yS = (v: number) => PAD.top + cH - ((v - minV) / range) * cH * 0.9;

    const linePts = points.map((p, i) => `${xS(i).toFixed(1)},${yS(p.value).toFixed(1)}`).join(' ');
    const areaPts = `${xS(0).toFixed(1)},${(PAD.top + cH).toFixed(1)} ${linePts} ${xS(points.length - 1).toFixed(1)},${(PAD.top + cH).toFixed(1)}`;

    const last = values[values.length - 1];
    const first = values[0];
    const isUp = last >= first;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
        y: PAD.top + cH - t * cH * 0.9,
        v: (minV + t * range),
    }));

    const fmtVnd = (n: number) => n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(Math.round(n));

    const step = Math.max(1, Math.ceil(points.length / 6));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ fontFamily: 'monospace' }}>
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Grid */}
            {yTicks.map((t, i) => (
                <g key={i}>
                    <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y}
                          stroke="currentColor" strokeWidth="0.5" opacity="0.07" strokeDasharray="4 4" />
                    <text x={PAD.left - 6} y={t.y + 3.5} textAnchor="end" fontSize="8"
                          fill="currentColor" opacity="0.45">{fmtVnd(t.v)}</text>
                </g>
            ))}
            {/* Area */}
            <polygon points={areaPts} fill="url(#areaGrad)" />
            {/* Line */}
            <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {/* Dots at every data point */}
            {points.map((p, i) => (
                <circle key={i} cx={xS(i)} cy={yS(p.value)} r="2" fill={color} opacity="0.7" />
            ))}
            {/* X labels */}
            {points.filter((_, i) => i % step === 0).map((p, idx) => {
                const origI = idx * step;
                return (
                    <text key={idx} x={xS(origI)} y={H - 6} textAnchor="middle" fontSize="8"
                          fill="currentColor" opacity="0.4">
                        {p.label.length > 8 ? p.label.slice(0, 8) : p.label}
                    </text>
                );
            })}
        </svg>
    );
}

// ─── Plan Popularity Bar ──────────────────────────────────────────────────────
function PlanBar({ name, count, total, color }: { name: string; count: number; total: number; color: string }) {
    const pct = total ? (count / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-[10px] mb-1">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">{name}</span>
                <span className="text-zinc-400 dark:text-zinc-600">{count.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-zinc-100 dark:bg-white/[0.06]">
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, bg, loading, trend }: {
    label: string; value: string; sub?: string;
    icon: React.ElementType; color: string; bg: string;
    loading: boolean; trend?: number;
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
                ? <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                : (
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>
                        {sub && <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{sub}</p>}
                        {trend !== undefined && (
                            <div className={`flex items-center gap-0.5 mt-1 text-[10px] ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {trend >= 0 ? <TrendUp size={11} /> : <TrendDown size={11} />}
                                <span>{Math.abs(trend).toFixed(1)}% so với tháng trước</span>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, sub, children, error }: {
    title: string; sub?: string; children: React.ReactNode; error?: string | null;
}) {
    return (
        <div className="border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.06]">
                <p className="text-[10px] font-semibold tracking-widest text-zinc-500 dark:text-zinc-600">{title}</p>
                {sub && <p className="text-[10px] text-zinc-400 dark:text-zinc-700 mt-0.5">{sub}</p>}
            </div>
            <div className="p-5">
                {error
                    ? <div className="flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-500">
                        <Warning size={13} /><span>{error}</span>
                      </div>
                    : children}
            </div>
        </div>
    );
}

// ─── Plan Colors ──────────────────────────────────────────────────────────────
const PLAN_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {

    // Analytics zustand store
    const { revenueStats, planActiveCounts, loading, error, fetchAnalytics } = useAnalyticsStore();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [errorPlans, setErrorPlans] = useState<string | null>(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [totalAds, setTotalAds] = useState(0);
    const [activeAds, setActiveAds] = useState(0);
    const [musicStats, setMusicStats] = useState<{ songs: number; albums: number; artists: number } | null>(null);
    const [loadingMusic, setLoadingMusic] = useState(true);
    const [from, setFrom] = useState(() => {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        return d.toISOString().slice(0, 10);
    });
    const [to, setTo] = useState(() => {
        const now = new Date();
        return now.toISOString().slice(0, 10);
    });

    useEffect(() => {
        fetchAnalytics(from, to);
    }, [from, to, fetchAnalytics]);

    useEffect(() => {
        // Use centralized apiFetch with caching and deduplication
        Promise.all([
            // Plans
            apiFetch<PageResult<Plan>>('/admin/subscriptions/plans?page=0&size=100', { ttlMs: 60_000 })
                .then((d) => setPlans(d?.content ?? []))
                .catch((e) => setErrorPlans(e instanceof ApiError ? e.message : 'Không tải được plans'))
                .finally(() => setLoadingPlans(false)),

            // Users count
            apiFetch<PageResult<object>>('/users?page=1&size=1', { ttlMs: 30_000 })
                .then((d) => setTotalUsers(d?.totalElements ?? 0))
                .catch(() => setTotalUsers(0))
                .finally(() => setLoadingUsers(false)),

            // Ads
            apiFetch<PageResult<{ status?: string }>>('/admin/ads?page=1&size=50', { ttlMs: 30_000 })
                .then((d) => {
                    const list = d?.content ?? [];
                    setTotalAds(list.length);
                    setActiveAds(list.filter((x) => x.status === 'ACTIVE').length);
                })
                .catch(() => {
                    setTotalAds(0);
                    setActiveAds(0);
                }),

            // Music stats
            Promise.all([
                apiFetch<PageResult<object>>('/songs?page=1&size=1', { ttlMs: 30_000 }),
                apiFetch<PageResult<object>>('/albums?page=1&size=1', { ttlMs: 30_000 }),
                apiFetch<PageResult<object>>('/artists?page=1&size=1', { ttlMs: 30_000 }),
            ])
                .then(([songsRes, albumsRes, artistsRes]) => {
                    setMusicStats({
                        songs: songsRes?.totalElements ?? 0,
                        albums: albumsRes?.totalElements ?? 0,
                        artists: artistsRes?.totalElements ?? 0,
                    });
                })
                .catch(() => setMusicStats({ songs: 0, albums: 0, artists: 0 }))
                .finally(() => setLoadingMusic(false)),
        ]);
    }, []);

    // Users, music, ads vẫn giữ nguyên logic cũ (nếu cần tối ưu tiếp sẽ refactor tiếp)


    // Derived from zustand data
    const totalRevenue = revenueStats.length
        ? revenueStats[revenueStats.length - 1].total
        : 0;
    const prevRevenue = revenueStats.length > 1
        ? revenueStats[revenueStats.length - 2].total
        : 0;
    const revenueTrend = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const totalActiveSubs = planActiveCounts.reduce((s, p) => s + (p.count || 0), 0);
    const planCounts = useMemo<Record<string, number>>(
        () =>
            planActiveCounts.reduce<Record<string, number>>((acc, row) => {
                acc[row.planId] = row.count ?? 0;
                return acc;
            }, {}),
        [planActiveCounts],
    );
    const activePlans = plans.filter((p) => p.isActive);
    const topPlan = useMemo(() => {
        const ranked = plans
            .map((plan) => {
                const count = planCounts[plan.id] ?? 0;
                return { plan, count, revenue: count * (plan.price ?? 0) };
            })
            .sort((a, b) => b.count - a.count);
        return ranked[0];
    }, [plans, planCounts]);
    const revenuePoints = revenueStats.map((p) => ({ label: p.date, value: p.total ?? 0 }));

    const fmtVnd = (n: number) => n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M ₫`
        : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K ₫` : `${Math.round(n)} ₫`;

    // Plan sparkline data (mock daily for last 30 days)
    const getPlanSparkline = (planId: string) => {
        const base = planCounts[planId] ?? 0;
        return Array.from({ length: 15 }, (_, i) => Math.max(0, base * (0.7 + i * 0.02) + (Math.random() - 0.3) * base * 0.1));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Thống kê & Doanh thu</h1>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">Tổng quan hệ thống và hiệu suất kinh doanh</p>
            </div>

            {/* Stat cards row 1 */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                    label="Doanh thu ước tính"
                    value={fmtVnd(totalRevenue)}
                    icon={CreditCard}
                    color="text-emerald-500 dark:text-emerald-400"
                    bg="bg-emerald-50 dark:bg-emerald-400/10"
                    loading={loadingPlans}
                    trend={revenueTrend}
                />
                <StatCard
                    label="Active Subscribers"
                    value={totalActiveSubs.toLocaleString()}
                    sub={`${activePlans.length} gói đang hoạt động`}
                    icon={Users}
                    color="text-blue-500 dark:text-blue-400"
                    bg="bg-blue-50 dark:bg-blue-400/10"
                    loading={loadingPlans}
                />
                <StatCard
                    label="Tổng người dùng"
                    value={totalUsers.toLocaleString()}
                    icon={Users}
                    color="text-purple-500 dark:text-purple-400"
                    bg="bg-purple-50 dark:bg-purple-400/10"
                    loading={loadingUsers}
                />
                <StatCard
                    label="Quảng cáo đang chạy"
                    value={activeAds.toString()}
                    sub={`${totalAds} tổng`}
                    icon={SpeakerHigh}
                    color="text-amber-500 dark:text-amber-400"
                    bg="bg-amber-50 dark:bg-amber-400/10"
                    loading={false}
                />
            </div>

            {/* Revenue stock chart */}
            <Section title="DOANH THU THEO THÁNG" sub="Xu hướng doanh thu từ subscription (ước tính)" error={errorPlans}>
                {loadingPlans
                    ? <div className="flex items-center justify-center h-[160px]">
                        <div className="size-5 border border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-white animate-spin" />
                      </div>
                    : (
                        <>
                            <div className="flex items-center gap-4 mb-4">
                                <div>
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600">Tháng này (ước tính)</p>
                                    <p className="text-2xl font-semibold text-zinc-900 dark:text-white">{fmtVnd(totalRevenue)}</p>
                                </div>
                                <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 border ${revenueTrend >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20'
                                    : 'text-red-500 bg-red-50 dark:bg-red-400/10 border-red-200 dark:border-red-400/20'
                                }`}>
                                    {revenueTrend >= 0 ? <TrendUp size={11} /> : <TrendDown size={11} />}
                                    {Math.abs(revenueTrend).toFixed(1)}%
                                </div>
                            </div>
                            <div className="h-[160px]">
                                <StockChart
                                    points={revenuePoints}
                                    color={revenueTrend >= 0 ? '#10b981' : '#ef4444'}
                                />
                            </div>
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-2">
                                * Doanh thu ước tính dựa trên số subscription active × giá gói. Cần backend analytics endpoint để có số liệu chính xác.
                            </p>
                        </>
                    )}
            </Section>

            {/* Plans popularity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Section title="GÓI ĐƯỢC MUA NHIỀU NHẤT" sub="Phân bố subscription theo plan" error={errorPlans}>
                    {loadingPlans
                        ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=>(
                            <div key={i} className="h-4 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                          ))}</div>
                        : (
                            <div className="space-y-4">
                                {plans
                                    .map((p, i) => ({ plan: p, count: planCounts[p.id] ?? 0, color: PLAN_COLORS[i % PLAN_COLORS.length] }))
                                    .sort((a, b) => b.count - a.count)
                                    .map(({ plan, count, color }) => (
                                        <PlanBar
                                            key={plan.id}
                                            name={plan.subsName}
                                            count={count}
                                            total={totalActiveSubs}
                                            color={color}
                                        />
                                    ))
                                }
                                {topPlan && (
                                    <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] space-y-1.5">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-zinc-400 dark:text-zinc-600">Gói phổ biến nhất</span>
                                            <span className="text-zinc-900 dark:text-white font-semibold">{topPlan.plan.subsName}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-zinc-400 dark:text-zinc-600">Doanh thu ước tính</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{fmtVnd(topPlan.revenue)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                </Section>

                {/* Plan sparklines */}
                <Section title="XU HƯỚNG TỪNG GÓI" sub="30 ngày gần nhất">
                    {loadingPlans
                        ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=>(
                            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                          ))}</div>
                        : (
                            <div className="space-y-4">
                                {plans.filter(p => p.isActive).slice(0, 4).map((plan, i) => {
                                    const sparkData = getPlanSparkline(plan.id);
                                    const lastVal = sparkData[sparkData.length - 1];
                                    const firstVal = sparkData[0];
                                    const up = lastVal >= firstVal;
                                    const color = PLAN_COLORS[i % PLAN_COLORS.length];
                                    return (
                                        <div key={plan.id} className="flex items-center gap-3">
                                            <div className="w-16 shrink-0">
                                                <p className="text-[10px] font-medium text-zinc-900 dark:text-white truncate">{plan.subsName}</p>
                                                <p className="text-[9px] text-zinc-400 dark:text-zinc-600">{fmtVnd(plan.price)}/tháng</p>
                                            </div>
                                            <div className="flex-1 h-10">
                                                <Sparkline data={sparkData} color={color} />
                                            </div>
                                            <div className={`text-[10px] font-medium shrink-0 ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {up ? '▲' : '▼'} {Math.abs(((lastVal - firstVal) / (firstVal || 1)) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                </Section>
            </div>

            {/* Music platform stats */}
            <Section title="THỐNG KÊ NỘI DUNG" sub="Tổng quan thư viện âm nhạc">
                {loadingMusic
                    ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({length:4}).map((_,i)=>(
                            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                        ))}
                      </div>
                    : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Bài hát', value: musicStats?.songs ?? 0, icon: MusicNote, color: '#3b82f6' },
                                { label: 'Album',   value: musicStats?.albums ?? 0, icon: Disc,      color: '#8b5cf6' },
                                { label: 'Nghệ sĩ', value: musicStats?.artists ?? 0, icon: Users,   color: '#10b981' },
                                { label: 'Quảng cáo', value: totalAds,   icon: SpeakerHigh, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} className="border border-zinc-100 dark:border-white/[0.06] p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <s.icon size={13} style={{ color: s.color }} />
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{s.label}</p>
                                    </div>
                                    <p className="text-xl font-semibold text-zinc-900 dark:text-white">
                                        {s.value.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
            </Section>

            {/* Subscription detail table */}
            <Section title="CHI TIẾT GÓI ĐĂNG KÝ" sub="Trạng thái và cấu hình từng gói" error={errorPlans}>
                {loadingPlans
                    ? <div className="h-24 flex items-center justify-center">
                        <div className="size-5 border border-zinc-300 dark:border-zinc-700 border-t-zinc-600 dark:border-t-white animate-spin" />
                      </div>
                    : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px] min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-zinc-200 dark:border-white/[0.08]">
                                        {['Gói', 'Giá', 'Thời hạn', 'Subscribers', 'Doanh thu', 'Trạng thái'].map(h => (
                                            <th key={h} className="text-left py-2 pr-4 text-[10px] tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">{h.toUpperCase()}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {plans.map((plan, i) => {
                                        const count = planCounts[plan.id] ?? 0;
                                        const rev = plan.price * count;
                                        const color = PLAN_COLORS[i % PLAN_COLORS.length];
                                        return (
                                            <tr key={plan.id} className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="py-2.5 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="size-2 shrink-0" style={{ background: color }} />
                                                        <span className="font-medium text-zinc-900 dark:text-white">{plan.subsName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">
                                                    {plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString()} ₫`}
                                                </td>
                                                <td className="py-2.5 pr-4 text-zinc-500 dark:text-zinc-500">
                                                    {plan.durationDays >= 36500 ? 'Không giới hạn' : `${plan.durationDays} ngày`}
                                                </td>
                                                <td className="py-2.5 pr-4 font-medium text-zinc-700 dark:text-zinc-300">
                                                    {count.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 pr-4">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                        {fmtVnd(rev)}
                                                    </span>
                                                </td>
                                                <td className="py-2.5">
                                                    <span className={`inline-flex items-center px-1.5 py-px text-[9px] font-medium border ${
                                                        plan.isActive
                                                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/20'
                                                            : 'text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                                    }`}>
                                                        {plan.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
            </Section>
        </div>
    );
}
