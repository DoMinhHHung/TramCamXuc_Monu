'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { ArrowClockwise } from '@phosphor-icons/react';

type Tab = 'top' | 'genres' | 'songs' | 'albums';
type ListenPeriod = 'DAY' | 'WEEK' | 'MONTH';

interface Genre {
    id: string;
    name: string;
}

interface Song {
    id: string;
    title: string;
    primaryArtist?: { stageName?: string };
    primaryArtistStageName?: string;
    status?: string;
    durationSeconds?: number;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

interface TopListenEntry {
    songId: string;
    listenCount: number;
}

interface AdminSongBrief {
    id: string;
    title: string;
    primaryArtistStageName?: string;
    status?: string;
}

interface AdminAlbumBrief {
    id: string;
    title: string;
    status?: string;
    ownerStageName?: string;
    publishedAt?: string;
    credits?: string;
}

function fmtDuration(sec?: number) {
    if (sec == null || Number.isNaN(sec)) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicPage() {
    const [tab, setTab] = useState<Tab>('top');
    const [error, setError] = useState<string | null>(null);

    const [genres, setGenres] = useState<Genre[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(false);

    const [songs, setSongs] = useState<Song[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);

    const [period, setPeriod] = useState<ListenPeriod>('DAY');
    const [topListen, setTopListen] = useState<TopListenEntry[]>([]);
    const [topBriefs, setTopBriefs] = useState<Record<string, AdminSongBrief>>({});
    const [loadingTop, setLoadingTop] = useState(false);

    const [recentAlbums, setRecentAlbums] = useState<AdminAlbumBrief[]>([]);
    const [loadingRecentAlbums, setLoadingRecentAlbums] = useState(false);
    const [topFavAlbums, setTopFavAlbums] = useState<AdminAlbumBrief[]>([]);
    const [loadingTopFavAlbums, setLoadingTopFavAlbums] = useState(false);

    const loadGenres = useCallback(async () => {
        setLoadingGenres(true);
        try {
            const data = await apiFetch<Genre[]>('/genres', { ttlMs: 10_000 });
            setGenres(Array.isArray(data) ? data : []);
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof ApiError ? e.message : 'Không tải được genres');
        } finally {
            setLoadingGenres(false);
        }
    }, []);

    const loadSongs = useCallback(async () => {
        setLoadingSongs(true);
        try {
            const data = await apiFetch<PageResult<Song>>(
                '/admin/songs?status=PUBLIC&page=1&size=50&showDeleted=false',
                { ttlMs: 10_000 },
            );
            setSongs(data?.content ?? []);
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof ApiError ? e.message : 'Không tải được songs');
        } finally {
            setLoadingSongs(false);
        }
    }, []);

    const loadRecentAlbums = useCallback(async () => {
        setLoadingRecentAlbums(true);
        try {
            const data = await apiFetch<PageResult<AdminAlbumBrief>>(
                '/admin/albums/recently-published?withinDays=14&page=1&size=30',
                { ttlMs: 0 },
            );
            setRecentAlbums(data?.content ?? []);
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof ApiError ? e.message : 'Không tải được album mới phát hành');
            setRecentAlbums([]);
        } finally {
            setLoadingRecentAlbums(false);
        }
    }, []);

    const loadTopFavAlbums = useCallback(async () => {
        setLoadingTopFavAlbums(true);
        try {
            const data = await apiFetch<AdminAlbumBrief[]>('/admin/albums/top-favorites-week?limit=30', { ttlMs: 0 });
            setTopFavAlbums(Array.isArray(data) ? data : []);
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof ApiError ? e.message : 'Không tải được album yêu thích tuần');
            setTopFavAlbums([]);
        } finally {
            setLoadingTopFavAlbums(false);
        }
    }, []);

    const loadTopListened = useCallback(async () => {
        setLoadingTop(true);
        try {
            const raw = await apiFetch<TopListenEntry[]>(
                `/social/admin/listen/top-songs?period=${period}&limit=50`,
                { ttlMs: 0 },
            );
            const list = Array.isArray(raw) ? raw : [];
            setTopListen(list);

            const ids = list.map((r) => r.songId).filter(Boolean);
            if (ids.length === 0) {
                setTopBriefs({});
                setError(null);
                return;
            }

            const briefs = await apiFetch<AdminSongBrief[]>('/admin/songs/batch-lookup', {
                method: 'POST',
                body: JSON.stringify(ids),
            });
            const map: Record<string, AdminSongBrief> = {};
            for (const b of briefs ?? []) {
                map[b.id] = b;
            }
            setTopBriefs(map);
            setError(null);
        } catch (e: unknown) {
            setError(e instanceof ApiError ? e.message : 'Không tải được thống kê lượt nghe');
            setTopListen([]);
            setTopBriefs({});
        } finally {
            setLoadingTop(false);
        }
    }, [period]);

    useEffect(() => {
        void Promise.allSettled([loadGenres(), loadSongs()]);
    }, [loadGenres, loadSongs]);

    useEffect(() => {
        if (tab === 'top') {
            void loadTopListened();
        }
        if (tab === 'albums') {
            void Promise.allSettled([loadRecentAlbums(), loadTopFavAlbums()]);
        }
    }, [tab, loadTopListened, loadRecentAlbums, loadTopFavAlbums]);

    useEffect(() => {
        const closeRealtime = openAdminRealtime(() => {
            void Promise.allSettled([
                loadGenres(),
                loadSongs(),
                tab === 'top' ? loadTopListened() : Promise.resolve(),
                tab === 'albums' ? Promise.allSettled([loadRecentAlbums(), loadTopFavAlbums()]) : Promise.resolve(),
            ]);
        });
        return () => {
            closeRealtime();
        };
    }, [loadGenres, loadSongs, loadTopListened, tab]);

    return (
        <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Music</h1>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500">Bài hát, genres và lượt nghe theo thời gian.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        void Promise.allSettled([
                            loadGenres(),
                            loadSongs(),
                            tab === 'top' ? loadTopListened() : Promise.resolve(),
                            tab === 'albums' ? Promise.allSettled([loadRecentAlbums(), loadTopFavAlbums()]) : Promise.resolve(),
                        ]);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
                >
                    <ArrowClockwise size={14} />
                    Làm mới
                </button>
            </div>

            {error && (
                <div className="text-[11px] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 px-3 py-2">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {(['top', 'genres', 'songs', 'albums'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`px-3 h-8 text-[11px] border ${
                            tab === t
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
                        }`}
                    >
                        {t === 'top'
                            ? 'Nghe nhiều nhất'
                            : t === 'genres'
                              ? 'Genres'
                              : t === 'songs'
                                ? 'Songs (public)'
                                : 'Albums'}
                    </button>
                ))}
            </div>

            {tab === 'top' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] text-zinc-500">Khoảng thời gian:</span>
                        {(['DAY', 'WEEK', 'MONTH'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className={`px-2.5 py-1 text-[11px] border ${
                                    period === p
                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
                                        : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
                                }`}
                            >
                                {p === 'DAY' ? 'Ngày' : p === 'WEEK' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>

                    <div className="border border-zinc-200 dark:border-white/10 overflow-hidden">
                        <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">
                            Top bài hát (theo listen_history MongoDB — ngày = 24h, tuần = 7 ngày, tháng = 30 ngày)
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {loadingTop && (
                                <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>
                            )}
                            {!loadingTop && topListen.length === 0 && (
                                <div className="p-3 text-[11px] text-zinc-500">Chưa có dữ liệu nghe trong khoảng này.</div>
                            )}
                            {!loadingTop &&
                                topListen.map((row, idx) => {
                                    const b = topBriefs[row.songId];
                                    return (
                                        <div key={row.songId} className="px-3 py-2 text-[11px] flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-zinc-900 dark:text-white font-medium">
                                                    {idx + 1}. {b?.title ?? row.songId}
                                                </p>
                                                <p className="text-zinc-500 truncate">
                                                    {b?.primaryArtistStageName ?? '—'}
                                                    {b?.status ? ` · ${b.status}` : ''}
                                                </p>
                                            </div>
                                            <span className="text-zinc-600 dark:text-zinc-400 shrink-0 tabular-nums">
                                                {row.listenCount.toLocaleString('vi-VN')} lượt
                                            </span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'genres' && (
                <div className="border border-zinc-200 dark:border-white/10">
                    <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">Genres</div>
                    <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-[480px] overflow-y-auto">
                        {loadingGenres && <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>}
                        {!loadingGenres &&
                            genres.map((g) => (
                                <div key={g.id} className="px-3 py-2 text-[11px] text-zinc-800 dark:text-zinc-200">
                                    {g.name}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {tab === 'songs' && (
                <div className="border border-zinc-200 dark:border-white/10">
                    <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">
                        Public songs (trang 1, 50 mục)
                    </div>
                    <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-[480px] overflow-y-auto">
                        {loadingSongs && <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>}
                        {!loadingSongs &&
                            songs.map((s) => (
                                <div key={s.id} className="px-3 py-2 text-[11px] flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-zinc-900 dark:text-white truncate">{s.title}</p>
                                        <p className="text-zinc-500 truncate">
                                            {s.primaryArtist?.stageName ?? s.primaryArtistStageName ?? '—'}
                                        </p>
                                    </div>
                                    <span className="text-zinc-500 shrink-0">{fmtDuration(s.durationSeconds)}</span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {tab === 'albums' && (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="border border-zinc-200 dark:border-white/10">
                        <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">
                            Album mới phát hành (14 ngày, theo publishedAt)
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-[420px] overflow-y-auto">
                            {loadingRecentAlbums && (
                                <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>
                            )}
                            {!loadingRecentAlbums && recentAlbums.length === 0 && (
                                <div className="p-3 text-[11px] text-zinc-500">Chưa có dữ liệu.</div>
                            )}
                            {!loadingRecentAlbums &&
                                recentAlbums.map((a) => (
                                    <div key={a.id} className="px-3 py-2 text-[11px]">
                                        <p className="text-zinc-900 dark:text-white font-medium">{a.title}</p>
                                        <p className="text-zinc-500 truncate">
                                            {a.ownerStageName ?? '—'}
                                            {a.publishedAt ? ` · ${a.publishedAt}` : ''}
                                        </p>
                                        {a.credits ? <p className="text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{a.credits}</p> : null}
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="border border-zinc-200 dark:border-white/10">
                        <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">
                            Album được yêu thích nhiều (7 ngày)
                        </div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10 max-h-[420px] overflow-y-auto">
                            {loadingTopFavAlbums && (
                                <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>
                            )}
                            {!loadingTopFavAlbums && topFavAlbums.length === 0 && (
                                <div className="p-3 text-[11px] text-zinc-500">Chưa có dữ liệu.</div>
                            )}
                            {!loadingTopFavAlbums &&
                                topFavAlbums.map((a) => (
                                    <div key={a.id} className="px-3 py-2 text-[11px]">
                                        <p className="text-zinc-900 dark:text-white font-medium">{a.title}</p>
                                        <p className="text-zinc-500 truncate">{a.ownerStageName ?? '—'}</p>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
