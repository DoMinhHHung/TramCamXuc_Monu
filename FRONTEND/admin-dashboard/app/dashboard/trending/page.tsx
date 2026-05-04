'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import {
    ArrowClockwiseIcon,
    TrendUpIcon,
    TrendDownIcon,
    MinusIcon,
    MusicNoteIcon,
    FireIcon,
    ChartBarIcon,
    LightningIcon,
    ArrowUpIcon,
    ArrowDownIcon,
} from '@phosphor-icons/react';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreBreakdown {
    totalScore: number;
    listenContribution: number;
    engagementContribution: number;
    velocityContribution: number;
    freshnessMultiplier: number;
    freshnessBonusPct: number;
    rawListenScore: number;
    rawEngagementScore: number;
}

interface VelocityInfo {
    trend: 'RISING' | 'STABLE' | 'FALLING';
    velocityScore: number;
    description: string;
    growthRatePct: string;
}

interface TrendingEntry {
    rank: number;
    songId: string;
    title: string;
    artistStageName: string | null;
    artistId: string | null;
    thumbnailUrl: string | null;
    playCount: number;
    scoreBreakdown: ScoreBreakdown;
    velocity: VelocityInfo;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_LABELS = ['🥇', '🥈', '🥉'];

function rankLabel(rank: number) {
    return rank <= 3 ? RANK_LABELS[rank - 1] : `#${rank}`;
}

function freshnessLabel(m: number) {
    if (m >= 2.0) return { text: '< 24h', color: 'text-emerald-500' };
    if (m >= 1.5) return { text: '< 3 ngày', color: 'text-blue-500' };
    if (m >= 1.2) return { text: '< 1 tuần', color: 'text-purple-500' };
    return { text: 'Cũ', color: 'text-slate-400' };
}

function VelocityBadge({ info }: { info: VelocityInfo }) {
    if (info.trend === 'RISING') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <TrendUpIcon size={12} weight="bold" />
                {info.growthRatePct}
            </span>
        );
    }
    if (info.trend === 'FALLING') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <TrendDownIcon size={12} weight="bold" />
                {info.growthRatePct}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <MinusIcon size={12} weight="bold" />
            {info.growthRatePct}
        </span>
    );
}

function ScoreBar({ breakdown }: { breakdown: ScoreBreakdown }) {
    const total = breakdown.listenContribution + breakdown.engagementContribution + breakdown.velocityContribution;
    if (total <= 0) return null;
    const listenPct   = (breakdown.listenContribution / total) * 100;
    const engagePct   = (breakdown.engagementContribution / total) * 100;
    const velocityPct = (breakdown.velocityContribution / total) * 100;

    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex h-2 rounded-full overflow-hidden gap-px w-full min-w-[80px]">
                <div style={{ width: `${listenPct}%` }}   className="bg-blue-500" title={`Nghe: ${breakdown.listenContribution.toFixed(2)}`} />
                <div style={{ width: `${engagePct}%` }}   className="bg-pink-500" title={`Tương tác: ${breakdown.engagementContribution.toFixed(2)}`} />
                <div style={{ width: `${velocityPct}%` }} className="bg-amber-400" title={`Đà: ${breakdown.velocityContribution.toFixed(2)}`} />
            </div>
            <div className="flex gap-2 text-[9px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-blue-500 inline-block" />
                    {breakdown.listenContribution.toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-pink-500 inline-block" />
                    {breakdown.engagementContribution.toFixed(2)}
                </span>
                <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-400 inline-block" />
                    {breakdown.velocityContribution.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ data, loading }: { data: TrendingEntry[]; loading: boolean }) {
    const rising  = data.filter(d => d.velocity.trend === 'RISING').length;
    const falling = data.filter(d => d.velocity.trend === 'FALLING').length;
    const stable  = data.filter(d => d.velocity.trend === 'STABLE').length;
    const avgScore = data.length > 0
        ? data.reduce((sum, d) => sum + d.scoreBreakdown.totalScore, 0) / data.length
        : 0;
    const topGainer = data.filter(d => d.velocity.trend === 'RISING')
        .sort((a, b) => b.velocity.velocityScore - a.velocity.velocityScore)[0];

    const cards = [
        {
            label: 'Tổng trong bảng',
            value: data.length,
            sub: `Top ${data.length} bài hát`,
            icon: <ChartBarIcon size={18} weight="fill" className="text-blue-500" />,
            bg: 'bg-blue-50 dark:bg-blue-950/30',
            border: 'border-blue-200 dark:border-blue-800/50',
        },
        {
            label: 'Đang tăng 🔥',
            value: rising,
            sub: `${data.length > 0 ? Math.round((rising / data.length) * 100) : 0}% bài hát`,
            icon: <TrendUpIcon size={18} weight="bold" className="text-emerald-500" />,
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-800/50',
        },
        {
            label: 'Đang giảm',
            value: falling,
            sub: `${stable} ổn định`,
            icon: <TrendDownIcon size={18} weight="bold" className="text-red-500" />,
            bg: 'bg-red-50 dark:bg-red-950/30',
            border: 'border-red-200 dark:border-red-800/50',
        },
        {
            label: 'Điểm trung bình',
            value: avgScore.toFixed(3),
            sub: 'Trên toàn bảng',
            icon: <LightningIcon size={18} weight="fill" className="text-amber-500" />,
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-200 dark:border-amber-800/50',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(card => (
                <div
                    key={card.label}
                    className={`rounded-xl border ${card.border} ${card.bg} px-4 py-3 flex items-start gap-3`}
                >
                    <div className="mt-0.5 shrink-0">{card.icon}</div>
                    <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{card.label}</p>
                        {loading && data.length === 0 ? (
                            <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1" />
                        ) : (
                            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                                {card.value}
                            </p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
                    </div>
                </div>
            ))}

            {/* Top gainer highlight */}
            {topGainer && (
                <div className="col-span-2 lg:col-span-4 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/20 px-4 py-3 flex items-center gap-3">
                    <FireIcon size={20} weight="fill" className="text-orange-500 shrink-0" />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">Tăng mạnh nhất:</span>
                        {topGainer.thumbnailUrl && (
                            <Image
                                src={topGainer.thumbnailUrl}
                                alt={topGainer.title}
                                width={24}
                                height={24}
                                className="rounded size-6 object-cover shrink-0"
                                unoptimized
                            />
                        )}
                        <span className="font-semibold text-[13px] text-slate-900 dark:text-white truncate">
                            {topGainer.title}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            — {topGainer.artistStageName ?? ''}
                        </span>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        <ArrowUpIcon size={11} weight="bold" />
                        {topGainer.velocity.growthRatePct}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Score Chart ──────────────────────────────────────────────────────────────

function ScoreChart({ data }: { data: TrendingEntry[] }) {
    if (data.length === 0) return null;
    const top = data.slice(0, 10);
    const maxScore = Math.max(...top.map(d => d.scoreBreakdown.totalScore));

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon size={16} weight="fill" className="text-slate-500" />
                <h2 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                    Biểu đồ điểm Top {top.length}
                </h2>
                <div className="flex items-center gap-3 ml-auto text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-blue-500 inline-block" />Nghe</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-pink-500 inline-block" />Tương tác</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-400 inline-block" />Đà tăng</span>
                </div>
            </div>
            <div className="space-y-2">
                {top.map(entry => {
                    const listenW   = maxScore > 0 ? (entry.scoreBreakdown.listenContribution / maxScore) * 100 : 0;
                    const engageW   = maxScore > 0 ? (entry.scoreBreakdown.engagementContribution / maxScore) * 100 : 0;
                    const velocityW = maxScore > 0 ? (entry.scoreBreakdown.velocityContribution / maxScore) * 100 : 0;
                    const totalW    = listenW + engageW + velocityW;

                    return (
                        <div key={entry.songId} className="flex items-center gap-3">
                            <span
                                className="text-[11px] font-bold w-6 text-right shrink-0"
                                style={entry.rank <= 3 ? { color: RANK_COLORS[entry.rank - 1] } : undefined}
                            >
                                {entry.rank <= 3 ? RANK_LABELS[entry.rank - 1] : `#${entry.rank}`}
                            </span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 w-28 truncate shrink-0">
                                {entry.title}
                            </span>
                            <div className="flex-1 flex h-5 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${listenW}%` }}
                                />
                                <div
                                    className="h-full bg-pink-500 transition-all duration-500"
                                    style={{ width: `${engageW}%` }}
                                />
                                <div
                                    className="h-full bg-amber-400 transition-all duration-500"
                                    style={{ width: `${velocityW}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 w-14 text-right shrink-0 tabular-nums">
                                {entry.scoreBreakdown.totalScore.toFixed(3)}
                            </span>
                            <VelocityBadge info={entry.velocity} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrendingPage() {
    const [data, setData]           = useState<TrendingEntry[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);
    const [limit, setLimit]         = useState(10);
    const [view, setView]           = useState<'table' | 'chart'>('table');
    const timerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async (lim: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<TrendingEntry[]>(
                `/recommendations/admin/trending/analytics?limit=${lim}`,
            );
            setData(result ?? []);
            setLastFetch(new Date());
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(limit);
        timerRef.current = setInterval(() => void load(limit), 120_000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [load, limit]);

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
    };

    const lastFetchLabel = lastFetch
        ? lastFetch.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <FireIcon size={22} weight="fill" className="text-orange-500 shrink-0" />
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                            Xu Hướng Âm Nhạc
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                            Admin
                        </span>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                        Score breakdown · Nghe 50% · Tương tác 30% · Đà tăng 15% · Độ mới 5%
                        {lastFetchLabel && (
                            <span className="ml-3 text-slate-400 dark:text-slate-500">
                                · Cập nhật lúc {lastFetchLabel}
                            </span>
                        )}
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* View toggle */}
                    <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        <button
                            onClick={() => setView('table')}
                            className={`px-3 h-7 rounded-full text-[11px] font-semibold transition-colors ${
                                view === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Bảng
                        </button>
                        <button
                            onClick={() => setView('chart')}
                            className={`px-3 h-7 rounded-full text-[11px] font-semibold transition-colors ${
                                view === 'chart'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            Biểu đồ
                        </button>
                    </div>

                    {/* Limit selector */}
                    <div className="flex items-center gap-1">
                        {[10, 20, 50].map(n => (
                            <button
                                key={n}
                                onClick={() => handleLimitChange(n)}
                                className={`px-3 h-8 rounded-full text-[11px] font-semibold transition-colors ${
                                    limit === n
                                        ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                Top {n}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => void load(limit)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 h-9 rounded-full text-[12px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                        <ArrowClockwiseIcon size={14} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {[
                    { color: 'bg-blue-500',    label: 'Nghe (50%)' },
                    { color: 'bg-pink-500',    label: 'Tương tác (30%)' },
                    { color: 'bg-amber-400',   label: 'Đà tăng (15%)' },
                    { color: 'bg-emerald-500', label: 'Độ mới (+5%)' },
                ].map(item => (
                    <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className={`size-2.5 rounded-full ${item.color}`} />
                        {item.label}
                    </span>
                ))}
                <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                    Tự động làm mới mỗi 2 phút
                </span>
            </div>

            {/* Summary cards */}
            <SummaryCards data={data} loading={loading} />

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Chart view */}
            {view === 'chart' && !loading && data.length > 0 && (
                <ScoreChart data={data} />
            )}

            {/* Table view */}
            {view === 'table' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-12">#</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Bài hát</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-24">Lượt nghe</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-32">Tổng điểm</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-40">Score breakdown</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-28">Velocity</th>
                                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-24">Độ mới</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-40">Raw scores</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading && data.length === 0 ? (
                                    Array.from({ length: limit > 10 ? 10 : limit }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-4 py-4"><div className="h-4 w-6 rounded bg-slate-200 dark:bg-slate-700" /></td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                                                    <div className="space-y-1.5">
                                                        <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                                                        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                                                    </div>
                                                </div>
                                            </td>
                                            {Array.from({ length: 6 }).map((_, j) => (
                                                <td key={j} className="px-4 py-4"><div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700 mx-auto" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : data.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                                                <MusicNoteIcon size={40} weight="thin" />
                                                <p className="text-[13px]">Chưa có dữ liệu xu hướng</p>
                                                <p className="text-[11px]">Hãy để người dùng nghe nhạc để bảng xếp hạng hoạt động</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((entry) => {
                                        const freshInfo = freshnessLabel(entry.scoreBreakdown.freshnessMultiplier);
                                        return (
                                            <tr
                                                key={entry.songId}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                {/* Rank */}
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="text-base font-bold"
                                                        style={entry.rank <= 3 ? { color: RANK_COLORS[entry.rank - 1] } : undefined}
                                                    >
                                                        {rankLabel(entry.rank)}
                                                    </span>
                                                </td>

                                                {/* Song */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                                                            {entry.thumbnailUrl ? (
                                                                <Image
                                                                    src={entry.thumbnailUrl}
                                                                    alt={entry.title}
                                                                    width={40}
                                                                    height={40}
                                                                    className="object-cover size-full"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <div className="size-full flex items-center justify-center">
                                                                    <MusicNoteIcon size={16} className="text-slate-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                                                                {entry.title}
                                                            </p>
                                                            <p className="text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                                                {entry.artistStageName ?? '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Play count */}
                                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                                                    {(entry.playCount ?? 0).toLocaleString('vi-VN')}
                                                </td>

                                                {/* Total score */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-base font-bold bg-gradient-to-r from-yellow-500 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                                                        {entry.scoreBreakdown.totalScore.toFixed(3)}
                                                    </span>
                                                </td>

                                                {/* Score bar */}
                                                <td className="px-4 py-3">
                                                    <ScoreBar breakdown={entry.scoreBreakdown} />
                                                </td>

                                                {/* Velocity */}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <VelocityBadge info={entry.velocity} />
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                            {entry.velocity.description}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Freshness */}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`text-[11px] font-semibold ${freshInfo.color}`}>
                                                            ×{entry.scoreBreakdown.freshnessMultiplier.toFixed(1)}
                                                        </span>
                                                        <span className={`text-[10px] ${freshInfo.color} opacity-80`}>
                                                            {freshInfo.text}
                                                        </span>
                                                        {entry.scoreBreakdown.freshnessBonusPct > 0 && (
                                                            <span className="text-[10px] text-emerald-500">
                                                                +{entry.scoreBreakdown.freshnessBonusPct.toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Raw scores */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-col items-end gap-0.5 font-mono text-[10px]">
                                                        <span className="text-blue-500">
                                                            L:{entry.scoreBreakdown.rawListenScore.toFixed(1)}
                                                        </span>
                                                        <span className="text-pink-500">
                                                            E:{entry.scoreBreakdown.rawEngagementScore.toFixed(1)}
                                                        </span>
                                                        <span className="text-amber-500">
                                                            V:{entry.velocity.velocityScore.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {data.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50">
                            <span>{data.length} bài hát trong bảng xếp hạng</span>
                            <span>Redis decay ×0.85/giờ · Velocity = sigmoid(Δ24h)</span>
                        </div>
                    )}
                </div>
            )}

            {/* Chart view empty/loading */}
            {view === 'chart' && loading && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex items-center justify-center">
                    <ArrowClockwiseIcon size={24} className="animate-spin text-slate-400" />
                </div>
            )}
            {view === 'chart' && !loading && data.length === 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                    <MusicNoteIcon size={40} weight="thin" />
                    <p className="text-[13px]">Chưa có dữ liệu để vẽ biểu đồ</p>
                </div>
            )}
        </div>
    );
}
