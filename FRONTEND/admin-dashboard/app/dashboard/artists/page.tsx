'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { queryCache, STALE_MS, STATS_STALE_MS } from '@/lib/query-cache';
import { ArrowClockwise, X, Warning, Check, ProhibitInset, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { TABLE_STYLES } from '@/lib/styles/constants';

type ArtistStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED_SUBSCRIPTION';

interface Artist {
    id: string;
    stageName: string;
    bio?: string;
    avatarUrl?: string;
    status?: ArtistStatus;
    isJamendo?: boolean;
    createdAt?: string;
    totalSongs?: number;
    totalAlbums?: number;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

interface StatsPage {
    totalElements: number;
}

interface ArtistStats { totalSongs: number; totalAlbums: number }

// ─── Cache key helpers ────────────────────────────────────────────────────────
const listKey = (page: number, q: string) => `artists:${page}:${q}`;
const statsKey = (id: string) => `artist-stats:${id}`;

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
    return (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-2.5 text-xs border shadow-lg
      animate-in fade-in slide-in-from-bottom-2 duration-200
      ${type === 'ok'
            ? 'bg-white dark:bg-emerald-950 border-zinc-200 dark:border-emerald-800 text-zinc-700 dark:text-emerald-300'
            : 'bg-white dark:bg-red-950 border-zinc-200 dark:border-red-800 text-zinc-700 dark:text-red-300'}`}>
            {type === 'ok'
                ? <Check size={12} weight="bold" className="text-emerald-500" />
                : <Warning size={12} className="text-red-500" />}
            {msg}
            <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><X size={11} /></button>
        </div>
    );
}

function StatusBadge({ status }: { status?: ArtistStatus }) {
    if (status === 'SUSPENDED') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-px text-[9px] bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
                Đình chỉ
            </span>
        );
    }
    if (status === 'EXPIRED_SUBSCRIPTION') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-px text-[9px] bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400">
                Hết hạn
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-px text-[9px] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            Hoạt động
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ArtistsPage() {
    const initList = queryCache.get<PageResult<Artist>>(listKey(1, ''));

    const [artists,      setArtists]      = useState<Artist[]>(() => initList?.content ?? []);
    const [totalArtists, setTotalArtists] = useState(() => initList?.totalElements ?? 0);
    const [totalPages,   setTotalPages]   = useState(() => initList?.totalPages ?? 1);
    const [loading,      setLoading]      = useState(() => queryCache.isStale(listKey(1, ''), STALE_MS));
    const [statsLoading, setStatsLoading] = useState(false);
    const [searchQuery,  setSearchQuery]  = useState('');
    const [page,         setPage]         = useState(1);
    const [pageSize]                      = useState(12);
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const notify = (msg: string, type: 'ok' | 'err') => {
        clearTimeout(timerRef.current);
        setToast({ msg, type });
        timerRef.current = setTimeout(() => setToast(null), 3500);
    };

    // ── Stats enrichment — only fetches artists without fresh cache ───────────
    const enrichWithStats = useCallback(async (list: Artist[]) => {
        if (list.length === 0) return;

        // Apply already-cached stats immediately (no spinner needed)
        setArtists(prev => prev.map(a => {
            const cached = queryCache.get<ArtistStats>(statsKey(a.id));
            return cached ? { ...a, ...cached } : a;
        }));

        const stale = list.filter(a => queryCache.isStale(statsKey(a.id), STATS_STALE_MS));
        if (stale.length === 0) return;

        setStatsLoading(true);
        try {
            await Promise.allSettled(
                stale.map(async (a) => {
                    const [songs, albums] = await Promise.allSettled([
                        apiFetch<StatsPage>(`/songs/by-artist/${a.id}?page=1&size=1`),
                        apiFetch<StatsPage>(`/albums?artistId=${a.id}&page=1&size=1`),
                    ]);
                    const stats: ArtistStats = {
                        totalSongs:  songs.status  === 'fulfilled' ? (songs.value?.totalElements  ?? 0) : 0,
                        totalAlbums: albums.status === 'fulfilled' ? (albums.value?.totalElements ?? 0) : 0,
                    };
                    queryCache.set(statsKey(a.id), stats);
                    setArtists(prev => prev.map(x => x.id === a.id ? { ...x, ...stats } : x));
                }),
            );
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ── Load artist list ──────────────────────────────────────────────────────
    const loadArtists = useCallback(async (force = false) => {
        const key = listKey(page, searchQuery);
        const cached = queryCache.get<PageResult<Artist>>(key);

        if (!force && cached && !queryCache.isStale(key, STALE_MS)) {
            setArtists(cached.content);
            setTotalArtists(cached.totalElements);
            setTotalPages(cached.totalPages);
            setLoading(false);
            void enrichWithStats(cached.content);
            return;
        }

        if (!cached) setLoading(true);

        try {
            const q = searchQuery ? `&keyword=${encodeURIComponent(searchQuery)}` : '';
            const result = await apiFetch<PageResult<Artist>>(
                `/artists?page=${page}&size=${pageSize}${q}`,
                { ttlMs: 0 },
            );
            const list = result?.content ?? [];
            queryCache.set(key, result);
            setArtists(list);
            setTotalArtists(result?.totalElements ?? 0);
            setTotalPages(result?.totalPages ?? 1);
            void enrichWithStats(list);
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
            setArtists([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page, pageSize, enrichWithStats]);

    useEffect(() => { void loadArtists(); }, [loadArtists]);

    useEffect(() => {
        const close = openAdminRealtime(() => {
            queryCache.invalidate('artists:');
            void loadArtists(true);
        });
        return () => close();
    }, [loadArtists]);

    const handleStatusToggle = async (artist: Artist) => {
        const isSuspended = artist.status === 'SUSPENDED';
        const newStatus   = isSuspended ? 'ACTIVE' : 'SUSPENDED';
        const confirmMsg  = isSuspended
            ? `Kích hoạt lại nghệ sĩ "${artist.stageName}"?`
            : `Đình chỉ nghệ sĩ "${artist.stageName}"?`;
        if (!confirm(confirmMsg)) return;
        try {
            await apiFetch(`/artists/${artist.id}/status?status=${newStatus}`, { method: 'PUT' });
            notify(isSuspended ? 'Đã kích hoạt nghệ sĩ' : 'Đã đình chỉ nghệ sĩ', 'ok');
            queryCache.invalidate('artists:');
            await loadArtists(true);
        } catch (e: unknown) {
            notify((e as Error).message, 'err');
        }
    };

    return (
        <>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Quản lý Nghệ sĩ</h1>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                        {loading ? '···' : `${totalArtists.toLocaleString()} nghệ sĩ`}
                    </p>
                </div>
                <Button variant="outline" size="icon-sm" disabled={loading} onClick={() => loadArtists(true)} title="Làm mới">
                    <ArrowClockwise size={12} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {/* Search */}
            <div className="mb-4 max-w-sm">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={() => loadArtists(true)}
                    placeholder="Tìm kiếm nghệ sĩ theo tên..."
                    label="Tìm kiếm"
                    clearable={true}
                />
            </div>

            {/* Table */}
            <div className={TABLE_STYLES.container + ' overflow-x-auto'}>
                <table className="w-full text-[11px] min-w-[640px]">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950">
                            {['Nghệ sĩ', 'Trạng thái', 'Thống kê', ''].map(h => (
                                <th key={h} className={TABLE_STYLES.headerCell}>
                                    {h.toUpperCase()}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.05]">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                            : artists.length === 0
                                ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
                                            Không tìm thấy nghệ sĩ nào.
                                        </td>
                                    </tr>
                                )
                                : artists.map(artist => (
                                    <tr key={artist.id}
                                        className="border-b border-zinc-100 dark:border-white/[0.05] hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {artist.avatarUrl ? (
                                                    <img src={artist.avatarUrl} alt={artist.stageName} className="size-8 rounded border border-white/10 object-cover" />
                                                ) : (
                                                    <div className="size-8 rounded bg-zinc-100 dark:bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-500 font-medium text-[10px]">
                                                        {artist.stageName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-zinc-900 dark:text-white">{artist.stageName}</p>
                                                    {artist.bio && (
                                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 max-w-[180px] truncate">{artist.bio}</p>
                                                    )}
                                                    {artist.isJamendo && (
                                                        <span className="text-[9px] text-violet-400">Jamendo</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={artist.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 items-center flex-wrap">
                                                <span className="inline-flex px-1.5 py-px text-[9px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                                                    {statsLoading && artist.totalSongs === undefined
                                                        ? '···'
                                                        : `${artist.totalSongs ?? 0} bài`}
                                                </span>
                                                <span className="inline-flex px-1.5 py-px text-[9px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                                                    {statsLoading && artist.totalAlbums === undefined
                                                        ? '···'
                                                        : `${artist.totalAlbums ?? 0} album`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleStatusToggle(artist)}
                                                    title={artist.status === 'SUSPENDED' ? 'Kích hoạt' : 'Đình chỉ'}
                                                >
                                                    {artist.status === 'SUSPENDED'
                                                        ? <ArrowCounterClockwise size={12} className="text-emerald-400" />
                                                        : <ProhibitInset size={12} className="text-amber-400" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                        Trang <span className="text-zinc-600 dark:text-zinc-400 font-medium">{page}</span> / {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <span className="text-[9px]">‹</span>
                        </Button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const p = Math.max(1, page - 2) + i;
                            if (p > totalPages) return null;
                            return (
                                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon-sm" onClick={() => setPage(p)}>
                                    {p}
                                </Button>
                            );
                        })}
                        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <span className="text-[9px]">›</span>
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
