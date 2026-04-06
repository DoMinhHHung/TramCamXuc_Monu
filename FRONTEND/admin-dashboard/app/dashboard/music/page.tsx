'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { ArrowClockwise, MusicNotesPlus } from '@phosphor-icons/react';


type MusicTab = 'songs' | 'genres' | 'songs-top' | 'playlists-top' | 'albums-top' | 'reports' | 'jamendo';
// --- Genre types ---
interface Genre {
    id: string;
    name: string;
    description?: string;
}

interface GenreRequest {
    name: string;
    description?: string;
}


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

    // --- Genre state ---
    const [genres, setGenres] = useState<Genre[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(false);
    const [genreError, setGenreError] = useState<string | null>(null);
    const [genreModalOpen, setGenreModalOpen] = useState(false);
    const [genreEditing, setGenreEditing] = useState<Genre | null>(null);
    const [genreForm, setGenreForm] = useState<GenreRequest>({ name: '', description: '' });
    const [genreConfirmClose, setGenreConfirmClose] = useState(false);

    const fetchGenres = async () => {
        setLoadingGenres(true);
        try {
            const res = await apiFetch<{ result: Genre[] }>('/genres');
            setGenres(res.result || []);
            setGenreError(null);
        } catch (e) {
            setGenreError('Không thể tải danh sách thể loại');
        } finally {
            setLoadingGenres(false);
        }
    };

    useEffect(() => {
        if (tab === 'genres') fetchGenres();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const handleGenreEdit = (genre: Genre) => {
        setGenreEditing(genre);
        setGenreForm({ name: genre.name, description: genre.description });
        setGenreModalOpen(true);
    };

    const handleGenreDelete = async (id: string) => {
        if (!window.confirm('Xác nhận xóa thể loại?')) return;
        try {
            await apiFetch(`/genres/${id}`, { method: 'DELETE' });
            fetchGenres();
        } catch {
            setGenreError('Không thể xóa thể loại');
        }
    };

    const handleGenreModalClose = () => {
        if (genreForm.name || genreForm.description) {
            setGenreConfirmClose(true);
        } else {
            setGenreModalOpen(false);
            setGenreEditing(null);
            setGenreForm({ name: '', description: '' });
        }
    };

    const confirmGenreModalClose = () => {
        setGenreModalOpen(false);
        setGenreEditing(null);
        setGenreForm({ name: '', description: '' });
        setGenreConfirmClose(false);
    };

    const cancelGenreModalClose = () => {
        setGenreConfirmClose(false);
    };

    const handleGenreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (genreEditing) {
                await apiFetch(`/genres/${genreEditing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(genreForm),
                });
            } else {
                await apiFetch('/genres', {
                    method: 'POST',
                    body: JSON.stringify(genreForm),
                });
            }
            setGenreForm({ name: '', description: '' });
            setGenreEditing(null);
            setGenreModalOpen(false);
            fetchGenres();
        } catch {
            setGenreError('Không thể lưu thể loại');
        }
    };

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
    const [loadedTabs, setLoadedTabs] = useState<Record<MusicTab, boolean>>({
        songs: false,
        genres: false,
        'songs-top': false,
        'playlists-top': false,
        'albums-top': false,
        reports: false,
        jamendo: true,
    });

    const [songSource, setSongSource] = useState<'jamendo' | 'user'>('user');
    const loadSongs = useCallback(async (source: 'jamendo' | 'user' = songSource) => {
        setLoadingSongs(true);
        try {
            const result = await apiFetch<PageResult<Song>>(`/admin/songs?status=PUBLIC&page=1&size=24&showDeleted=false&source=${source}`, { ttlMs: 5_000 });
            setSongs(result?.content ?? []);
            setTotalSongs(result?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Không thể tải danh sách bài hát');
        } finally {
            setLoadingSongs(false);
        }
    }, [songSource]);

    const loadTopSongs = useCallback(async () => {
        setLoadingTopSongs(true);
        try {
            const period: ListenPeriod = songPeriod === 'WEEK' ? 'WEEK' : 'MONTH';
            const list = await apiFetch<TopListenEntry[]>(`/social/admin/listen/top-songs?period=${period}&limit=12`, { ttlMs: 8_000 });
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
            const top = await apiFetch<Album[]>(topEndpoint, { ttlMs: 8_000 });
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
        if (tab === 'songs') return void loadSongs(songSource);
        if (tab === 'songs-top') return void loadTopSongs();
        if (tab === 'playlists-top') return void loadPlaylists();
        if (tab === 'albums-top') return void loadAlbums();
    }, [tab, loadSongs, loadTopSongs, loadPlaylists, loadAlbums, songSource]);

    const loadByTab = useCallback((targetTab: MusicTab) => {
        if (targetTab === 'songs') return loadSongs(songSource);
        if (targetTab === 'songs-top') return loadTopSongs();
        if (targetTab === 'playlists-top') return loadPlaylists();
        if (targetTab === 'albums-top') return loadAlbums();
        // genres, reports, jamendo: no preload needed
        return Promise.resolve();
    }, [loadAlbums, loadPlaylists, loadSongs, loadTopSongs, songSource]);

    useEffect(() => {
        if (loadedTabs[tab]) return;
        void loadByTab(tab).finally(() => {
            setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
        });
    }, [tab, loadedTabs, loadByTab]);

    useEffect(() => {
        if (tab === 'songs-top') void loadTopSongs();
    }, [songPeriod, tab, loadTopSongs]);

    useEffect(() => {
        if (tab === 'playlists-top' && !loadedTabs['playlists-top']) void loadPlaylists();
    }, [playlistPeriod, tab, loadPlaylists, loadedTabs]);

    useEffect(() => {
        if (tab === 'albums-top') void loadAlbums();
    }, [albumPeriod, tab, loadAlbums]);

    useEffect(() => {
        const close = openAdminRealtime(() => {
            void refreshCurrentTab();
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
                {/* Tab order: songs, genres, songs-top, playlists-top, albums-top, reports, jamendo */}
                <button
                    onClick={() => setTab('songs')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'songs' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Danh sách bài hát
                </button>
                <button
                    onClick={() => setTab('genres')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'genres' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Danh sách thể loại nhạc
                </button>
                <button
                    onClick={() => setTab('songs-top')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'songs-top' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Bài hát yêu thích tuần/tháng
                </button>
                <button
                    onClick={() => setTab('playlists-top')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'playlists-top' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Playlist yêu thích + tổng số
                </button>
                <button
                    onClick={() => setTab('albums-top')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'albums-top' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Album yêu thích + tổng số
                </button>
                <button
                    onClick={() => setTab('reports')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'reports' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Báo cáo
                </button>
                <button
                    onClick={() => setTab('jamendo')}
                    className={`px-3 h-8 text-[11px] border ${tab === 'jamendo' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >
                    Thêm nhạc từ Jamendo
                </button>
            </div>

                        {tab === 'genres' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[13px] font-semibold">Danh sách thể loại nhạc</h2>
                                    <button
                                        className="px-2 py-1 text-xs border rounded bg-zinc-900 text-white dark:bg-white dark:text-black"
                                        onClick={() => { setGenreModalOpen(true); setGenreEditing(null); setGenreForm({ name: '', description: '' }); }}
                                    >
                                        Thêm mới
                                    </button>
                                </div>
                                {genreError && <div className="text-red-500 text-xs">{genreError}</div>}
                                <div className="border rounded mt-4">
                                    {loadingGenres ? <div className="p-2 text-xs">Đang tải...</div> : genres.length === 0 ? <div className="p-2 text-xs">Chưa có thể loại nào</div> : (
                                        <table className="min-w-full text-xs">
                                            <thead>
                                                <tr className="bg-zinc-100">
                                                    <th className="p-2 text-left">Tên</th>
                                                    <th className="p-2 text-left">Mô tả</th>
                                                    <th className="p-2">Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {genres.map(g => (
                                                    <tr key={g.id} className="border-t">
                                                        <td className="p-2">{g.name}</td>
                                                        <td className="p-2">{g.description}</td>
                                                        <td className="p-2 flex gap-2">
                                                            <button className="px-2 py-1 text-xs border rounded" onClick={() => handleGenreEdit(g)}>Sửa</button>
                                                            <button className="px-2 py-1 text-xs border rounded text-red-600 border-red-300" onClick={() => handleGenreDelete(g.id)}>Xóa</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Modal thêm/sửa thể loại */}
                                {genreModalOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                                        <div className="bg-white dark:bg-zinc-900 rounded shadow-lg p-6 min-w-[320px] relative">
                                            <button
                                                className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-900 text-lg"
                                                onClick={handleGenreModalClose}
                                                aria-label="Đóng"
                                            >
                                                ×
                                            </button>
                                            <h3 className="text-[14px] font-semibold mb-2">{genreEditing ? 'Cập nhật thể loại' : 'Thêm thể loại mới'}</h3>
                                            <form onSubmit={handleGenreSubmit} className="flex flex-col gap-2">
                                                <input
                                                    className="border px-2 py-1 text-sm"
                                                    placeholder="Tên thể loại"
                                                    value={genreForm.name}
                                                    onChange={e => setGenreForm(f => ({ ...f, name: e.target.value }))}
                                                    required
                                                />
                                                <input
                                                    className="border px-2 py-1 text-sm"
                                                    placeholder="Mô tả"
                                                    value={genreForm.description}
                                                    onChange={e => setGenreForm(f => ({ ...f, description: e.target.value }))}
                                                />
                                                <div className="flex gap-2 mt-2">
                                                    <button type="submit" className="px-3 py-1 text-xs rounded bg-zinc-900 text-white dark:bg-white dark:text-black">{genreEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                                                    <button type="button" className="px-3 py-1 text-xs rounded border" onClick={handleGenreModalClose}>Hủy</button>
                                                </div>
                                            </form>
                                        </div>
                                        {/* Modal xác nhận đóng nếu có dữ liệu nhập */}
                                        {genreConfirmClose && (
                                            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
                                                <div className="bg-white dark:bg-zinc-900 rounded shadow-lg p-6 min-w-[280px]">
                                                    <div className="mb-4">Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.</div>
                                                    <div className="flex gap-2 justify-end">
                                                        <button className="px-3 py-1 text-xs rounded border" onClick={cancelGenreModalClose}>Không</button>
                                                        <button className="px-3 py-1 text-xs rounded bg-red-600 text-white" onClick={confirmGenreModalClose}>Đồng ý</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

            {tab === 'reports' && (
                <iframe
                    src="/dashboard/reports"
                    style={{ width: '100%', minHeight: 700, border: 'none', background: 'white' }}
                    title="Báo cáo bài hát"
                />
            )}

            {tab === 'songs' && (
                <div className="space-y-3">
                    <div className="flex gap-2 mb-2">
                        <button
                            className={`px-3 py-1 text-xs border rounded ${songSource === 'user' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                            onClick={() => { setSongSource('user'); loadSongs('user'); }}
                        >Nhạc do người dùng tải lên</button>
                        <button
                            className={`px-3 py-1 text-xs border rounded ${songSource === 'jamendo' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                            onClick={() => { setSongSource('jamendo'); loadSongs('jamendo'); }}
                        >Hệ thống Jamendo</button>
                    </div>
                    <DataCard title={`Tổng số bài hát (${songSource === 'jamendo' ? 'Jamendo' : 'User'})`} value={totalSongs.toLocaleString('vi-VN')} subtitle={`Nguồn: /admin/songs?source=${songSource}`} />
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
