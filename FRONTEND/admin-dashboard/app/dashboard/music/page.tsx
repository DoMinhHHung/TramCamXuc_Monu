'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { ArrowClockwise, MusicNotesPlus } from '@phosphor-icons/react';

type MusicTab = 'songs' | 'songs-top' | 'playlists-top' | 'albums-top' | 'jamendo';
type Period = 'WEEK' | 'MONTH';
type ListenPeriod = 'DAY' | 'WEEK' | 'MONTH';

interface PageResult<T> {
    content: T[];
    totalElements: number;
}

interface Song {
    id: string;
    title: string;
    durationSeconds?: number;
    primaryArtist?: { stageName?: string };
    primaryArtistStageName?: string;
}

interface TopListenEntry {
    songId: string;
    listenCount: number;
}

interface AdminSongBrief {
    id: string;
    title: string;
    primaryArtistStageName?: string;
}

interface Playlist {
    id: string;
    name: string;
    totalSongs?: number;
    ownerId?: string;
}

interface Album {
    id: string;
    title: string;
    ownerStageName?: string;
}

interface JamendoImportSummary {
    fetched?: number;
    skipped?: number;
    enqueued?: number;
}

const fmtDuration = (sec?: number) => {
    if (sec == null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${`${s}`.padStart(2, '0')}`;
};

function DataCard({ title, subtitle, value }: { title: string; subtitle?: string; value?: string }) {
    return (
        <div className="border border-zinc-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.02]">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{title}</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{value ?? '—'}</p>
            {subtitle ? <p className="text-[11px] text-zinc-500 mt-1">{subtitle}</p> : null}
        </div>
    );
}

export default function MusicPage() {
    const [tab, setTab] = useState<MusicTab>('songs');
    const [error, setError] = useState<string | null>(null);

    const [songs, setSongs] = useState<Song[]>([]);
    const [totalSongs, setTotalSongs] = useState(0);
    const [loadingSongs, setLoadingSongs] = useState(false);

    const [songPeriod, setSongPeriod] = useState<Period>('WEEK');
    const [topListen, setTopListen] = useState<TopListenEntry[]>([]);
    const [topSongMap, setTopSongMap] = useState<Record<string, AdminSongBrief>>({});
    const [loadingTopSongs, setLoadingTopSongs] = useState(false);

    const [playlistPeriod, setPlaylistPeriod] = useState<Period>('WEEK');
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [totalPlaylists, setTotalPlaylists] = useState(0);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);

    const [albumPeriod, setAlbumPeriod] = useState<Period>('WEEK');
    const [topAlbums, setTopAlbums] = useState<Album[]>([]);
    const [totalAlbums, setTotalAlbums] = useState(0);
    const [loadingAlbums, setLoadingAlbums] = useState(false);

    const [jamendoTags, setJamendoTags] = useState('pop');
    const [jamendoLimit, setJamendoLimit] = useState(50);
    const [importingJamendo, setImportingJamendo] = useState(false);
    const [jamendoSummary, setJamendoSummary] = useState<JamendoImportSummary | null>(null);

    const loadSongs = useCallback(async () => {
        setLoadingSongs(true);
        try {
            const result = await apiFetch<PageResult<Song>>('/admin/songs?status=PUBLIC&page=1&size=24&showDeleted=false', { ttlMs: 5_000 });
            setSongs(result?.content ?? []);
            setTotalSongs(result?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Không thể tải danh sách bài hát');
        } finally {
            setLoadingSongs(false);
        }
    }, []);

    const loadTopSongs = useCallback(async () => {
        setLoadingTopSongs(true);
        try {
            const period: ListenPeriod = songPeriod === 'WEEK' ? 'WEEK' : 'MONTH';
            const list = await apiFetch<TopListenEntry[]>(`/social/admin/listen/top-songs?period=${period}&limit=12`, { ttlMs: 0 });
            const safe = Array.isArray(list) ? list : [];
            setTopListen(safe);
            const ids = safe.map((x) => x.songId).filter(Boolean);
            if (ids.length) {
                const briefs = await apiFetch<AdminSongBrief[]>('/admin/songs/batch-lookup', {
                    method: 'POST',
                    body: JSON.stringify(ids),
                });
                const map: Record<string, AdminSongBrief> = {};
                for (const b of briefs ?? []) map[b.id] = b;
                setTopSongMap(map);
            } else {
                setTopSongMap({});
            }
            setError(null);
        } catch (e) {
            setTopListen([]);
            setTopSongMap({});
            setError(e instanceof ApiError ? e.message : 'Không thể tải top bài hát');
        } finally {
            setLoadingTopSongs(false);
        }
    }, [songPeriod]);

    const loadPlaylists = useCallback(async () => {
        setLoadingPlaylists(true);
        try {
            const result = await apiFetch<PageResult<Playlist>>('/playlists/my-playlists?page=1&size=12', { ttlMs: 5_000 });
            setPlaylists(result?.content ?? []);
            setTotalPlaylists(result?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setPlaylists([]);
            setTotalPlaylists(0);
            setError(e instanceof ApiError ? e.message : 'Không thể tải playlist');
        } finally {
            setLoadingPlaylists(false);
        }
    }, []);

    const loadAlbums = useCallback(async () => {
        setLoadingAlbums(true);
        try {
            const topEndpoint = albumPeriod === 'MONTH' ? '/admin/albums/top-favorites-month?limit=12' : '/admin/albums/top-favorites-week?limit=12';
            const top = await apiFetch<Album[]>(topEndpoint, { ttlMs: 0 });
            const total = await apiFetch<PageResult<Album>>('/albums?page=1&size=1', { ttlMs: 10_000 });
            setTopAlbums(Array.isArray(top) ? top : []);
            setTotalAlbums(total?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setTopAlbums([]);
            setTotalAlbums(0);
            setError(e instanceof ApiError ? e.message : 'Không thể tải album');
        } finally {
            setLoadingAlbums(false);
        }
    }, [albumPeriod]);

    const refreshCurrentTab = useCallback(() => {
        if (tab === 'songs') return void loadSongs();
        if (tab === 'songs-top') return void loadTopSongs();
        if (tab === 'playlists-top') return void loadPlaylists();
        if (tab === 'albums-top') return void loadAlbums();
    }, [tab, loadSongs, loadTopSongs, loadPlaylists, loadAlbums]);

    useEffect(() => {
        void Promise.allSettled([loadSongs(), loadTopSongs(), loadPlaylists(), loadAlbums()]);
    }, [loadSongs, loadTopSongs, loadPlaylists, loadAlbums]);

    useEffect(() => {
        if (tab === 'songs-top') void loadTopSongs();
    }, [songPeriod, tab, loadTopSongs]);

    useEffect(() => {
        if (tab === 'playlists-top') void loadPlaylists();
    }, [playlistPeriod, tab, loadPlaylists]);

    useEffect(() => {
        if (tab === 'albums-top') void loadAlbums();
    }, [albumPeriod, tab, loadAlbums]);

    useEffect(() => {
        const close = openAdminRealtime(() => {
            refreshCurrentTab();
        });
        return () => close();
    }, [refreshCurrentTab]);

    const topSongTitle = useMemo(() => {
        if (!topListen.length) return 'Chưa có dữ liệu';
        const first = topListen[0];
        const title = topSongMap[first.songId]?.title ?? first.songId;
        return `${title} (${first.listenCount.toLocaleString('vi-VN')} lượt nghe)`;
    }, [topListen, topSongMap]);

    const onImportJamendo = async (e: FormEvent) => {
        e.preventDefault();
        setImportingJamendo(true);
        try {
            const payload = await apiFetch<JamendoImportSummary>(`/admin/jamendo/import?tags=${encodeURIComponent(jamendoTags)}&limit=${jamendoLimit}`, {
                method: 'POST',
            });
            setJamendoSummary(payload ?? {});
            setError(null);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Không thể import Jamendo');
        } finally {
            setImportingJamendo(false);
        }
    };

    return (
        <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">Music</h1>
                    <p className="text-[11px] text-zinc-500">Quản lý bài hát, playlist, album và nguồn Jamendo cho admin.</p>
                </div>
                <button
                    type="button"
                    onClick={refreshCurrentTab}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
                >
                    <ArrowClockwise size={14} />
                    Làm mới
                </button>
            </div>

            {error ? <div className="text-[11px] text-red-500 border border-red-200 dark:border-red-900/30 px-3 py-2">{error}</div> : null}

            <div className="flex flex-wrap gap-2">
                {[
                    { key: 'songs', label: 'Danh sách bài hát' },
                    { key: 'songs-top', label: 'Bài hát yêu thích tuần/tháng' },
                    { key: 'playlists-top', label: 'Playlist yêu thích + tổng số' },
                    { key: 'albums-top', label: 'Album yêu thích + tổng số' },
                    { key: 'jamendo', label: 'Thêm nhạc từ Jamendo' },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as MusicTab)}
                        className={`px-3 h-8 text-[11px] border ${tab === t.key ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'songs' && (
                <div className="space-y-3">
                    <DataCard title="Tổng số bài hát (PUBLIC)" value={totalSongs.toLocaleString('vi-VN')} subtitle="Nguồn: /admin/songs" />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingSongs ? <p className="text-[11px] text-zinc-500">Đang tải...</p> : songs.map((s) => (
                            <div key={s.id} className="border border-zinc-200 dark:border-white/10 p-3">
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">{s.title}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{s.primaryArtist?.stageName ?? s.primaryArtistStageName ?? '—'}</p>
                                <p className="text-[11px] text-zinc-500 mt-1">{fmtDuration(s.durationSeconds)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'songs-top' && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        {(['WEEK', 'MONTH'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setSongPeriod(p)}
                                className={`px-2.5 py-1 text-[11px] border ${songPeriod === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                            >
                                {p === 'WEEK' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                    <DataCard title="Bài hát được yêu thích nhất" value={topSongTitle} subtitle={`Khoảng thời gian: ${songPeriod === 'WEEK' ? 'Tuần' : 'Tháng'}`} />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingTopSongs ? <p className="text-[11px] text-zinc-500">Đang tải...</p> : topListen.map((row, idx) => (
                            <div key={row.songId} className="border border-zinc-200 dark:border-white/10 p-3">
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">#{idx + 1} {topSongMap[row.songId]?.title ?? row.songId}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{topSongMap[row.songId]?.primaryArtistStageName ?? '—'}</p>
                                <p className="text-[11px] text-zinc-500 mt-1">{row.listenCount.toLocaleString('vi-VN')} lượt nghe</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'playlists-top' && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        {(['WEEK', 'MONTH'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPlaylistPeriod(p)}
                                className={`px-2.5 py-1 text-[11px] border ${playlistPeriod === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                            >
                                {p === 'WEEK' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <DataCard title="Playlist được yêu thích nhất" value={playlists[0]?.name ?? 'Chưa có dữ liệu'} subtitle={`Khoảng thời gian đang chọn: ${playlistPeriod === 'WEEK' ? 'Tuần' : 'Tháng'}.`} />
                        <DataCard title="Tổng số Playlist" value={totalPlaylists.toLocaleString('vi-VN')} subtitle="Nguồn hiện có: /playlists/my-playlists." />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingPlaylists ? <p className="text-[11px] text-zinc-500">Đang tải...</p> : playlists.map((p) => (
                            <div key={p.id} className="border border-zinc-200 dark:border-white/10 p-3">
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">{p.name}</p>
                                <p className="text-[11px] text-zinc-500">{p.totalSongs ?? 0} bài hát</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'albums-top' && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        {(['WEEK', 'MONTH'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setAlbumPeriod(p)}
                                className={`px-2.5 py-1 text-[11px] border ${albumPeriod === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                            >
                                {p === 'WEEK' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <DataCard
                            title="Album được yêu thích nhất"
                            value={topAlbums[0]?.title ?? 'Chưa có dữ liệu'}
                            subtitle={`Nguồn: ${albumPeriod === 'MONTH' ? '/admin/albums/top-favorites-month' : '/admin/albums/top-favorites-week'}.`}
                        />
                        <DataCard title="Tổng số Album" value={totalAlbums.toLocaleString('vi-VN')} subtitle="Nguồn: /albums?page=1&size=1." />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingAlbums ? <p className="text-[11px] text-zinc-500">Đang tải...</p> : topAlbums.map((a) => (
                            <div key={a.id} className="border border-zinc-200 dark:border-white/10 p-3">
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">{a.title}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{a.ownerStageName ?? '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'jamendo' && (
                <div className="space-y-4 border border-zinc-200 dark:border-white/10 p-4">
                    <div>
                        <h2 className="text-[12px] font-semibold text-zinc-900 dark:text-white">Thêm nhạc từ Jamendo</h2>
                        <p className="text-[11px] text-zinc-500">Gọi API admin để enqueue import từ Jamendo.</p>
                    </div>
                    <form className="grid gap-3 md:grid-cols-3" onSubmit={onImportJamendo}>
                        <input
                            value={jamendoTags}
                            onChange={(e) => setJamendoTags(e.target.value)}
                            className="h-9 border border-zinc-200 dark:border-white/10 bg-transparent px-3 text-[12px]"
                            placeholder="tags, vd: pop,rock,lofi"
                        />
                        <input
                            type="number"
                            min={1}
                            max={500}
                            value={jamendoLimit}
                            onChange={(e) => setJamendoLimit(Number(e.target.value))}
                            className="h-9 border border-zinc-200 dark:border-white/10 bg-transparent px-3 text-[12px]"
                        />
                        <button type="submit" disabled={importingJamendo} className="h-9 inline-flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-black text-[12px]">
                            <MusicNotesPlus size={14} />
                            {importingJamendo ? 'Đang gửi...' : 'Import Jamendo'}
                        </button>
                    </form>

                    {jamendoSummary && (
                        <div className="grid gap-3 md:grid-cols-3">
                            <DataCard title="Fetched" value={String(jamendoSummary.fetched ?? 0)} />
                            <DataCard title="Skipped" value={String(jamendoSummary.skipped ?? 0)} />
                            <DataCard title="Enqueued" value={String(jamendoSummary.enqueued ?? 0)} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
