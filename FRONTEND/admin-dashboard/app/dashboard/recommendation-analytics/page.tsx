'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
    ArrowClockwiseIcon,
    ClockIcon,
    UsersThreeIcon,
    BrainIcon,
    MagnifyingGlassIcon,
    HeartIcon,
    SkipForwardIcon,
    RepeatIcon,
} from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContextStats {
    timeSlot: string;
    label: string;
    requestCount: number;
    avgSectionSize: number;
}

interface SessionStats {
    signalType: string;
    count: number;
    percentage: number;
}

interface DiscoveryStats {
    familiarCount: number;
    discoveryCount: number;
    familiarPct: number;
    discoveryPct: number;
    avgDiscoveryAcceptance: number; // % user nghe qua discovery songs
}

interface SocialGraphStats {
    crowdPicksDelivered: number;
    avgCrowdPicksPerUser: number;
    topCrowdGenres: { genreId: string; genreName: string; pickCount: number }[];
}

interface RecommendationAnalytics {
    contextStats: ContextStats[];
    sessionStats: SessionStats[];
    discoveryStats: DiscoveryStats;
    socialGraphStats: SocialGraphStats;
    generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIME_SLOT_LABELS: Record<string, string> = {
    EARLY_MORNING: 'Sáng sớm (5-8h) 🌅',
    MORNING:       'Buổi sáng (8-12h) ☀️',
    AFTERNOON:     'Buổi chiều (12-17h) 🎶',
    EVENING:       'Buổi tối (17-20h) 🌆',
    NIGHT:         'Đêm (20-23h) 🌙',
    LATE_NIGHT:    'Khuya (23-5h) 🌃',
};

const SIGNAL_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PLAYED:     { label: 'Nghe bình thường', color: 'text-blue-400',  icon: <HeartIcon size={16} /> },
    COMPLETED:  { label: 'Nghe hết bài',     color: 'text-green-400', icon: <HeartIcon size={16} /> },
    REPEATED:   { label: 'Nghe lại (super)', color: 'text-amber-400', icon: <RepeatIcon size={16} /> },
    SKIPPED:    { label: 'Skip',             color: 'text-zinc-400',  icon: <SkipForwardIcon size={16} /> },
    SKIP_EARLY: { label: 'Skip sớm < 10s',  color: 'text-red-400',   icon: <SkipForwardIcon size={16} /> },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecommendationAnalyticsPage() {
    const [data, setData] = useState<RecommendationAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch<{ result: RecommendationAnalytics }>(
                '/admin/recommendations/analytics',
            );
            setData(res.result);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Recommendation Analytics</h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Context · Session · Discovery · Social Graph
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors disabled:opacity-50"
                >
                    <ArrowClockwiseIcon size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {loading && !data && (
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-48 bg-zinc-800/50 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {data && (
                <div className="space-y-6">

                    {/* Feature 1: Context Stats */}
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ClockIcon size={20} className="text-indigo-400" />
                            <h2 className="text-lg font-semibold text-white">
                                Context-Aware · Phân bổ theo thời gian
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {data.contextStats.map((stat) => (
                                <div
                                    key={stat.timeSlot}
                                    className="bg-zinc-800/60 rounded-lg p-4 space-y-1"
                                >
                                    <p className="text-xs text-zinc-400">
                                        {TIME_SLOT_LABELS[stat.timeSlot] ?? stat.timeSlot}
                                    </p>
                                    <p className="text-2xl font-bold text-white">
                                        {stat.requestCount.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-zinc-500">requests</p>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-zinc-400">Avg section size</span>
                                            <span className="text-indigo-400">{stat.avgSectionSize}</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{
                                                    width: `${Math.min((stat.requestCount / Math.max(...data.contextStats.map(s => s.requestCount))) * 100, 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Feature 2 & 3: Session Signals */}
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <BrainIcon size={20} className="text-cyan-400" />
                            <h2 className="text-lg font-semibold text-white">
                                Session Signals · Hành vi real-time
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {data.sessionStats.map((stat) => {
                                const meta = SIGNAL_LABELS[stat.signalType] ?? {
                                    label: stat.signalType,
                                    color: 'text-zinc-400',
                                    icon: null,
                                };
                                return (
                                    <div key={stat.signalType} className="flex items-center gap-3">
                                        <div className={`w-5 ${meta.color}`}>{meta.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className={meta.color}>{meta.label}</span>
                                                <span className="text-zinc-400">
                                                    {stat.count.toLocaleString()} ({stat.percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        stat.signalType === 'REPEATED'  ? 'bg-amber-500' :
                                                        stat.signalType === 'COMPLETED' ? 'bg-green-500' :
                                                        stat.signalType === 'SKIP_EARLY' ? 'bg-red-500' :
                                                        stat.signalType === 'SKIPPED'   ? 'bg-zinc-500' :
                                                        'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${stat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-zinc-500 mt-3">
                            * SKIP_EARLY (&lt;10s) và REPEAT ảnh hưởng trực tiếp đến trending score
                        </p>
                    </section>

                    {/* Feature 5: Discovery Stats */}
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <MagnifyingGlassIcon size={20} className="text-emerald-400" />
                            <h2 className="text-lg font-semibold text-white">
                                Discovery Engine · 70% quen + 30% khám phá
                            </h2>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-zinc-800/60 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-blue-400">
                                    {data.discoveryStats.familiarPct.toFixed(1)}%
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Quen thuộc</p>
                            </div>
                            <div className="bg-zinc-800/60 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-emerald-400">
                                    {data.discoveryStats.discoveryPct.toFixed(1)}%
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Khám phá</p>
                            </div>
                            <div className="bg-zinc-800/60 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-amber-400">
                                    {(data.discoveryStats.avgDiscoveryAcceptance * 100).toFixed(1)}%
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Acceptance rate</p>
                            </div>
                        </div>
                        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${data.discoveryStats.familiarPct}%` }}
                            />
                            <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${data.discoveryStats.discoveryPct}%` }}
                            />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Quen
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Khám phá
                            </span>
                        </div>
                    </section>

                    {/* Feature 4: Social Graph Stats */}
                    <section className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <UsersThreeIcon size={20} className="text-pink-400" />
                            <h2 className="text-lg font-semibold text-white">
                                Social Graph · Crowd Picks
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-zinc-800/60 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-pink-400">
                                    {data.socialGraphStats.crowdPicksDelivered.toLocaleString()}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Crowd picks delivered</p>
                            </div>
                            <div className="bg-zinc-800/60 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-pink-300">
                                    {data.socialGraphStats.avgCrowdPicksPerUser.toFixed(1)}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Avg per user</p>
                            </div>
                        </div>
                        {data.socialGraphStats.topCrowdGenres.length > 0 && (
                            <div>
                                <p className="text-xs text-zinc-500 mb-2">Top genres trong crowd picks</p>
                                <div className="space-y-1">
                                    {data.socialGraphStats.topCrowdGenres.slice(0, 5).map((g) => (
                                        <div key={g.genreId} className="flex justify-between text-sm">
                                            <span className="text-zinc-300">{g.genreName}</span>
                                            <span className="text-zinc-500">{g.pickCount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {data.generatedAt && (
                        <p className="text-xs text-zinc-600 text-right">
                            Generated: {new Date(data.generatedAt).toLocaleString('vi-VN')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
