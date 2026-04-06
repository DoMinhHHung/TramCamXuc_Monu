'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { ArrowClockwise, MusicNotesPlus } from '@phosphor-icons/react';
import Link from 'next/link';

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
        <div className="border border-zinc-200 dark:border-white/10 rounded-xl p-5 bg-white shadow-sm dark:bg-white/[0.02]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{value ?? '—'}</p>
            {subtitle ? <p className="text-sm text-zinc-500 mt-2">{subtitle}</p> : null}
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
            // Modified unwrapping logic so it works with the new apiFetch that strips code & result
            const res = await apiFetch<Genre[]>('/genres');
            setGenres(res || []);
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
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Music Administration</h1>
                    <p className="text-base text-zinc-500 mt-1">Quản lý bài hát, playlist, album và nguồn Jamendo cho hệ thống.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/music/artists" className="px-5 py-2 text-sm font-medium border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                        Quản lý Nghệ Sĩ
                    </Link>
                    <Link href="/dashboard/music/albums" className="px-5 py-2 text-sm font-medium border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                        Quản lý Albums riêng
                    </Link>
                    <button
                        type="button"
                        onClick={refreshCurrentTab}
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <ArrowClockwise size={18} /> Làm mới
                    </button>
                </div>
            </div>

            {error ? <div className="text-sm font-medium text-red-600 border border-red-200 rounded-lg dark:border-red-900/40 px-4 py-3 bg-red-50 dark:bg-red-900/10 shadow-sm">{error}</div> : null}

            <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                {[
                    { id: 'songs', label: 'Danh sách bài hát' },
                    { id: 'genres', label: 'Danh sách Thể loại' },
                    { id: 'songs-top', label: 'BXH Bài hát' },
                    { id: 'playlists-top', label: 'BXH Playlist' },
                    { id: 'albums-top', label: 'BXH Album' },
                    { id: 'reports', label: 'Báo cáo vi phạm' },
                    { id: 'jamendo', label: 'Nạp nhạc Jamendo' }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id as MusicTab)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                            tab === item.id 
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'border-transparent hover:border-zinc-300 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className="pt-4">
                {tab === 'genres' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 px-6 py-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h2 className="text-lg font-bold">Danh sách thể loại nhạc (Genres)</h2>
                            <button
                                className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                                onClick={() => { setGenreModalOpen(true); setGenreEditing(null); setGenreForm({ name: '', description: '' }); }}
                            >
                                Thêm mới
                            </button>
                        </div>
                        {genreError && <div className="text-red-500 text-sm">{genreError}</div>}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                            {loadingGenres ? <div className="p-6 text-sm text-zinc-500 text-center">Đang tải dữ liệu...</div> : genres.length === 0 ? <div className="p-6 text-sm text-center">Chưa có thể loại nào</div> : (
                                <table className="min-w-full text-base">
                                    <thead>
                                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                                            <th className="p-4 text-left font-medium border-b border-zinc-200 dark:border-zinc-800">Tên T.Loại</th>
                                            <th className="p-4 text-left font-medium border-b border-zinc-200 dark:border-zinc-800">Mô tả</th>
                                            <th className="p-4 text-right font-medium border-b border-zinc-200 dark:border-zinc-800">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {genres.map(g => (
                                            <tr key={g.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="p-4 font-semibold text-zinc-900 dark:text-zinc-100">{g.name}</td>
                                                <td className="p-4 text-zinc-600 dark:text-zinc-400">{g.description || <span className="opacity-50 italic">Chưa có mô tả</span>}</td>
                                                <td className="p-4 flex justify-end gap-2">
                                                    <button className="px-4 py-1.5 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 text-blue-600" onClick={() => handleGenreEdit(g)}>Sửa</button>
                                                    <button className="px-4 py-1.5 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 dark:border-red-900/30 text-red-600 dark:hover:bg-red-900/10" onClick={() => handleGenreDelete(g.id)}>Xóa</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal thêm/sửa thể loại */}
                        {genreModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-8 min-w-[400px] relative max-w-md w-full">
                                    <button
                                        className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        onClick={handleGenreModalClose}
                                    >
                                        ×
                                    </button>
                                    <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">{genreEditing ? 'Cập nhật Thể loại' : 'Thêm Thể loại mới'}</h3>
                                    <form onSubmit={handleGenreSubmit} className="flex flex-col gap-5">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Tên Thể loại</label>
                                            <input
                                                className="w-full border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                                                placeholder="VD: Pop, Rock..."
                                                value={genreForm.name}
                                                onChange={e => setGenreForm(f => ({ ...f, name: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Mô tả (tùy chọn)</label>
                                            <textarea
                                                className="w-full border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent min-h-[100px]"
                                                placeholder="Chi tiết về thể loại này"
                                                value={genreForm.description}
                                                onChange={e => setGenreForm(f => ({ ...f, description: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex gap-3 justify-end mt-4">
                                            <button type="button" className="px-5 py-2.5 text-sm font-medium rounded-lg text-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700" onClick={handleGenreModalClose}>Hủy Bỏ</button>
                                            <button type="submit" className="px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm">{genreEditing ? 'Cập Nhật' : 'Thêm Mới'}</button>
                                        </div>
                                    </form>
                                </div>
                                {genreConfirmClose && (
                                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-6 min-w-[320px] max-w-sm">
                                            <h4 className="text-lg font-bold mb-2">Chưa lưu thay đổi</h4>
                                            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">Bạn có chắc chắn muốn thoát? Dữ liệu đang nhập sẽ bị mất hoàn toàn.</p>
                                            <div className="flex gap-3 justify-end">
                                                <button className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200" onClick={cancelGenreModalClose}>Tiếp tục chỉnh sửa</button>
                                                <button className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={confirmGenreModalClose}>Đồng ý Thoát</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'reports' && (
                    <div className="rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <iframe
                            src="/dashboard/reports"
                            style={{ width: '100%', minHeight: 700, border: 'none' }}
                            title="Báo cáo bài hát"
                            className="bg-zinc-50 dark:bg-zinc-900"
                        />
                    </div>
                )}

                {tab === 'songs' && (
                    <div className="space-y-6">
                        <div className="flex gap-3 p-1 inline-flex bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                            <button
                                className={`px-5 py-2.5 text-sm font-medium rounded-md transition-colors ${songSource === 'user' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                onClick={() => { setSongSource('user'); loadSongs('user'); }}
                            >Nhạc Do Người Dùng Tải Lên</button>
                            <button
                                className={`px-5 py-2.5 text-sm font-medium rounded-md transition-colors ${songSource === 'jamendo' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                onClick={() => { setSongSource('jamendo'); loadSongs('jamendo'); }}
                            >Hệ Thống Tự Động (Jamendo)</button>
                        </div>
                        <DataCard title={`Tổng số bài hát (${songSource === 'jamendo' ? 'Nguồn Jamendo' : 'Nguồn User Upload'})`} value={(totalSongs || 0).toLocaleString('vi-VN')} subtitle={`Kho chứa hiện tại cho nhạc ${songSource}`} />
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {loadingSongs ? <p className="text-sm font-medium text-zinc-500 py-8 col-span-3 text-center animate-pulse">Đang tải danh sách bài hát...</p> : songs.map((s) => (
                                <div key={s.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-base font-bold text-zinc-900 dark:text-white truncate mb-1" title={s.title}>{s.title}</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mb-3">{s.primaryArtist?.stageName ?? s.primaryArtistStageName ?? 'Nghệ sĩ ẩn danh'}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-xs font-mono font-medium">
                                            {fmtDuration(s.durationSeconds)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'songs-top' && (
                    <div className="space-y-6">
                        <div className="flex gap-3 p-1 inline-flex bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                            {(['WEEK', 'MONTH'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setSongPeriod(p)}
                                    className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${songPeriod === p ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                >
                                    Thống Kê {p === 'WEEK' ? 'Theo Tuần' : 'Theo Tháng'}
                                </button>
                            ))}
                        </div>
                        <DataCard title="Quán Quân Bảng Xếp Hạng Bài Hát" value={topSongTitle} subtitle={`Lượng truy cập tích lũy trong chu kỳ ${songPeriod === 'WEEK' ? '7 Ngày' : '30 Ngày'} gần nhất`} />
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {loadingTopSongs ? <p className="text-sm text-zinc-500 col-span-3 text-center py-8">Đang tính toán biểu đồ...</p> : topListen.map((row, idx) => (
                                <div key={row.songId} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-zinc-900 dark:text-white transition-opacity group-hover:opacity-20 pointer-events-none -mt-4 -mr-4">#{idx + 1}</div>
                                    <p className="text-lg font-bold text-zinc-900 dark:text-white truncate pr-8 mb-1" title={topSongMap[row.songId]?.title}>{topSongMap[row.songId]?.title ?? row.songId}</p>
                                    <p className="text-sm text-zinc-500 truncate mb-4">{topSongMap[row.songId]?.primaryArtistStageName ?? 'Nghệ sĩ ẩn danh'}</p>
                                    <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full text-sm font-medium">
                                        <span>🎧</span> {(row.listenCount || 0).toLocaleString('vi-VN')} lượt stream
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'playlists-top' && (
                    <div className="space-y-6">
                        <div className="flex gap-3 p-1 inline-flex bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                            {(['WEEK', 'MONTH'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPlaylistPeriod(p)}
                                    className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${playlistPeriod === p ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                >
                                    Theo {p === 'WEEK' ? 'Tuần' : 'Tháng'}
                                </button>
                            ))}
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <DataCard title="Playlist được săn đón nhất" value={playlists[0]?.name ?? 'Đang cập nhật'} subtitle={`Playlist dẫn đầu xu hướng (${playlistPeriod === 'WEEK' ? 'Tuần này' : 'Tháng này'})`} />
                            <DataCard title="Tổng kho Playlist" value={(totalPlaylists || 0).toLocaleString('vi-VN')} subtitle="Tất cả Playlist được tạo trên hệ thống" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-4">
                            {loadingPlaylists ? <p className="text-sm text-zinc-500 py-8 text-center col-span-3">Đang cập nhật dữ liệu...</p> : playlists.map((p) => (
                                <div key={p.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm">
                                    <p className="text-base font-bold text-zinc-900 dark:text-white truncate mb-2">{p.name}</p>
                                    <p className="text-sm text-zinc-500 bg-zinc-100 dark:bg-zinc-800 inline-block px-3 py-1 rounded-md font-medium">📦 {(p.totalSongs ?? 0).toLocaleString('vi-VN')} bài hát</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'albums-top' && (
                    <div className="space-y-6">
                        <div className="flex gap-3 p-1 inline-flex bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                            {(['WEEK', 'MONTH'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setAlbumPeriod(p)}
                                    className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${albumPeriod === p ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                >
                                    Khung Thời Gian: {p === 'WEEK' ? 'Tuần Này' : 'Tháng Này'}
                                </button>
                            ))}
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <DataCard
                                title="Siêu phẩm Album"
                                value={topAlbums[0]?.title ?? 'Chưa có dữ liệu'}
                                subtitle="Album được lưu và nghe nhiều nhất giới phê bình."
                            />
                            <DataCard title="Phát hành tổng số" value={(totalAlbums || 0).toLocaleString('vi-VN')} subtitle="Album public trên server" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mt-4">
                            {loadingAlbums ? <p className="text-sm text-zinc-500 text-center py-8 col-span-3">Đang quét kho lưu trữ...</p> : topAlbums.map((a) => (
                                <div key={a.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5 flex flex-col justify-center min-h-[100px] shadow-sm">
                                    <p className="text-base font-bold text-zinc-900 dark:text-white truncate mb-1">{a.title}</p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 truncate font-medium">👤 Phối khí: {a.ownerStageName ?? 'Ẩn danh'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tab === 'jamendo' && (
                    <div className="space-y-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                        <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <MusicNotesPlus weight="fill" className="text-green-600" /> Công Nạp Nhạc Tự Động Từ Jamendo
                            </h2>
                            <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Nhập thể loại nhạc yêu thích (Tags) để bot Jamendo crawl bài hát bản quyền miễn phí về hệ thống TramCamXuc. API sẽ tự động đẩy vào pipeline Transcode và Publish.</p>
                        </div>
                        <form className="flex flex-col md:flex-row gap-4" onSubmit={onImportJamendo}>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Thẻ (Tags)</label>
                                <input
                                    value={jamendoTags}
                                    onChange={(e) => setJamendoTags(e.target.value)}
                                    className="w-full h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-base focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Ví dụ: pop, rock, indie, lofi"
                                />
                            </div>
                            <div className="w-full md:w-32 space-y-2">
                                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 block">Giới hạn tải</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={jamendoLimit}
                                    onChange={(e) => setJamendoLimit(Number(e.target.value))}
                                    className="w-full h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-base focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>
                            <div className="md:self-end">
                                <button type="submit" disabled={importingJamendo} className="h-11 px-6 rounded-lg font-semibold inline-flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap min-w-[200px]">
                                    {importingJamendo ? (
                                        <span className="animate-pulse">Đang nạp nhạc...</span>
                                    ) : (
                                        <>Bắt đầu nạp ngay</>
                                    )}
                                </button>
                            </div>
                        </form>

                        {jamendoSummary && (
                            <div className="grid gap-4 md:grid-cols-3 max-w-3xl pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <DataCard title="Dữ Liệu Thu Thập" value={(jamendoSummary.fetched ?? 0).toLocaleString('vi-VN')} />
                                <DataCard title="Bỏ Qua (Đã tồn tại/Lỗi)" value={(jamendoSummary.skipped ?? 0).toLocaleString('vi-VN')} />
                                <DataCard title="Đẩy Vào Hàng Đợi (Enqueued)" value={(jamendoSummary.enqueued ?? 0).toLocaleString('vi-VN')} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}