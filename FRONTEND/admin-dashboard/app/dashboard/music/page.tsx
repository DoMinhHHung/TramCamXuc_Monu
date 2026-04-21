'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { openAdminRealtime } from '@/lib/realtime';
import { ArrowClockwise, MusicNotesPlus } from '@phosphor-icons/react';
import { SearchInput } from '@/components/ui/search-input';
import { BUTTON_STYLES, CARD_STYLES, INPUT_STYLES, TYPOGRAPHY, TABLE_STYLES } from '@/lib/styles/constants';


type MusicTab = 'songs' | 'genres' | 'songs-top' | 'playlists-top' | 'albums-top' | 'jamendo';
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
    sourceType?: string;
    transcodeStatus?: string;
    primaryArtist?: { stageName?: string };
    primaryArtistStageName?: string;
}

interface SongResponse {
    id: string;
    title: string;
    primaryArtist?: { stageName?: string };
}

interface TopListenEntry {
    songId: string;
    listenCount: number;
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

const SONG_PAGE_SIZE = 24;
const EMPTY_TEXT = 'Chưa có dữ liệu';

const fmtDuration = (sec?: number) => {
    if (sec == null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${`${s}`.padStart(2, '0')}`;
};

function DataCard({ title, subtitle, value }: { title: string; subtitle?: string; value?: string }) {
    return (
        <div className={`${CARD_STYLES.dataCard} rounded`}>
            <p className={TYPOGRAPHY.label}>{title}</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{value ?? '—'}</p>
            {subtitle ? <p className={`${TYPOGRAPHY.sm} text-zinc-500 mt-1`}>{subtitle}</p> : null}
        </div>
    );
}

function EmptyState({ text = EMPTY_TEXT }: { text?: string }) {
    return <p className={`${TYPOGRAPHY.sm} text-zinc-500`}>{text}</p>;
}

function isNotFoundLike(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;
    return err.status === 404 || err.message.toLowerCase().includes('không tìm thấy');
}

function normalizeError(err: unknown, fallback: string, silentOnNotFound = false): string | null {
    if (silentOnNotFound && isNotFoundLike(err)) return null;
    if (err instanceof ApiError) return err.message;
    return fallback;
}

function sameGenreForm(a: GenreRequest, b: GenreRequest): boolean {
    return a.name.trim() === b.name.trim() && (a.description ?? '').trim() === (b.description ?? '').trim();
}


export default function MusicPage() {
    const [tab, setTab] = useState<MusicTab>('songs');
    const [error, setError] = useState<string | null>(null);

    // --- Genre state ---
    const [genres, setGenres] = useState<Genre[]>([]);
    const [genreSearch, setGenreSearch] = useState('');
    const [loadingGenres, setLoadingGenres] = useState(false);
    const [genreError, setGenreError] = useState<string | null>(null);
    const [genreModalOpen, setGenreModalOpen] = useState(false);
    const [genreEditing, setGenreEditing] = useState<Genre | null>(null);
    const [genreForm, setGenreForm] = useState<GenreRequest>({ name: '', description: '' });
    const [genreInitialForm, setGenreInitialForm] = useState<GenreRequest>({ name: '', description: '' });
    const [genreConfirmClose, setGenreConfirmClose] = useState(false);

    const fetchGenres = async () => {
        setLoadingGenres(true);
        try {
            const query = genreSearch ? `?search=${encodeURIComponent(genreSearch)}` : '';
            const res = await apiFetch<Genre[]>(`/genres${query}`, { ttlMs: 60_000 });
            setGenres(Array.isArray(res) ? res : []);
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
        const next = { name: genre.name, description: genre.description ?? '' };
        setGenreEditing(genre);
        setGenreInitialForm(next);
        setGenreForm(next);
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
        if (!sameGenreForm(genreForm, genreInitialForm)) {
            setGenreConfirmClose(true);
        } else {
            setGenreModalOpen(false);
            setGenreEditing(null);
            setGenreForm({ name: '', description: '' });
            setGenreInitialForm({ name: '', description: '' });
        }
    };

    const confirmGenreModalClose = () => {
        setGenreModalOpen(false);
        setGenreEditing(null);
        setGenreForm({ name: '', description: '' });
        setGenreInitialForm({ name: '', description: '' });
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
            setGenreInitialForm({ name: '', description: '' });
            fetchGenres();
        } catch {
            setGenreError('Không thể lưu thể loại');
        }
    };

    const [songs, setSongs] = useState<Song[]>([]);
    const [songSearch, setSongSearch] = useState('');
    const [totalSongs, setTotalSongs] = useState(0);
    const [loadingSongs, setLoadingSongs] = useState(false);
    const [songsPage, setSongsPage] = useState(1);

    const [songPeriod, setSongPeriod] = useState<Period>('WEEK');
    const [topListen, setTopListen] = useState<TopListenEntry[]>([]);
    const [topSongMap, setTopSongMap] = useState<Record<string, SongResponse>>({});
    const [loadingTopSongs, setLoadingTopSongs] = useState(false);

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
        jamendo: true,
    });

    const totalSongPages = Math.max(1, Math.ceil(totalSongs / SONG_PAGE_SIZE));

    const loadSongs = useCallback(async (page = songsPage) => {
        setLoadingSongs(true);
        try {
            let endpoint = `/admin/songs?status=PUBLIC&page=${page}&size=${SONG_PAGE_SIZE}&showDeleted=false`;
            if (songSearch) {
                endpoint += `&search=${encodeURIComponent(songSearch)}`;
            }
            const result = await apiFetch<PageResult<Song>>(
                endpoint,
                { ttlMs: 0 } // Disable cache for search results
            );
            setSongs(result?.content ?? []);
            setTotalSongs(result?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setError(normalizeError(e, 'Không thể tải danh sách bài hát'));
        } finally {
            setLoadingSongs(false);
        }
    }, [songsPage, songSearch]);

    const loadTopSongs = useCallback(async () => {
        setLoadingTopSongs(true);
        try {
            const period: ListenPeriod = songPeriod === 'WEEK' ? 'WEEK' : 'MONTH';
            const list = await apiFetch<TopListenEntry[]>(`/social/admin/listen/top-songs?period=${period}&limit=12`, { ttlMs: 8_000 });
            const safe = Array.isArray(list) ? list : [];
            setTopListen(safe);
            const ids = safe.map((x) => x.songId).filter((id): id is string => Boolean(id));
            if (ids.length) {
                const params = new URLSearchParams();
                for (const id of ids) params.append('ids', id);
                const songs = await apiFetch<SongResponse[]>(`/songs/batch?${params.toString()}`, { ttlMs: 30_000 });
                const map: Record<string, SongResponse> = {};
                for (const s of songs ?? []) {
                    map[s.id] = s;
                }
                setTopSongMap(map);
            } else {
                setTopSongMap({});
            }
            setError(null);
        } catch (e) {
            setTopListen([]);
            setTopSongMap({});
            setError(normalizeError(e, 'Không thể tải top bài hát', true));
        } finally {
            setLoadingTopSongs(false);
        }
    }, [songPeriod]);

    const loadPlaylists = useCallback(async () => {
        setLoadingPlaylists(true);
        try {
            const result = await apiFetch<PageResult<Playlist>>('/playlists/my-playlists?page=1&size=12', { ttlMs: 20_000 });
            setPlaylists(result?.content ?? []);
            setTotalPlaylists(result?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setPlaylists([]);
            setTotalPlaylists(0);
            setError(normalizeError(e, 'Không thể tải playlist', true));
        } finally {
            setLoadingPlaylists(false);
        }
    }, []);

    const loadAlbums = useCallback(async () => {
        setLoadingAlbums(true);
        try {
            const topEndpoint = albumPeriod === 'MONTH' ? '/admin/albums/top-favorites-month?limit=12' : '/admin/albums/top-favorites-week?limit=12';
            const top = await apiFetch<Album[]>(topEndpoint, { ttlMs: 20_000 });
            const total = await apiFetch<PageResult<Album>>('/albums?page=1&size=1', { ttlMs: 30_000 });
            setTopAlbums(Array.isArray(top) ? top : []);
            setTotalAlbums(total?.totalElements ?? 0);
            setError(null);
        } catch (e) {
            setTopAlbums([]);
            setTotalAlbums(0);
            setError(normalizeError(e, 'Không thể tải album', true));
        } finally {
            setLoadingAlbums(false);
        }
    }, [albumPeriod]);

    const refreshCurrentTab = useCallback(() => {
        if (tab === 'songs') return void loadSongs(songsPage);
        if (tab === 'songs-top') return void loadTopSongs();
        if (tab === 'playlists-top') return void loadPlaylists();
        if (tab === 'albums-top') return void loadAlbums();
    }, [tab, loadSongs, loadTopSongs, loadPlaylists, loadAlbums, songsPage]);

    const loadByTab = useCallback((targetTab: MusicTab) => {
        if (targetTab === 'songs') return loadSongs(songsPage);
        if (targetTab === 'songs-top') return loadTopSongs();
        if (targetTab === 'playlists-top') return loadPlaylists();
        if (targetTab === 'albums-top') return loadAlbums();
        // genres, jamendo: no preload needed
        return Promise.resolve();
    }, [loadAlbums, loadPlaylists, loadSongs, loadTopSongs, songsPage]);

    const changeSongsPage = (nextPage: number) => {
        const safePage = Math.min(totalSongPages, Math.max(1, nextPage));
        setSongsPage(safePage);
        void loadSongs(safePage);
    };

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
    }, [tab, loadPlaylists, loadedTabs]);

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
                    <p className={`${TYPOGRAPHY.sm} text-zinc-500`}>Quản lý bài hát, playlist, album và nguồn Jamendo cho admin.</p>
                </div>
                <button
                    type="button"
                    onClick={refreshCurrentTab}
                    className={`${BUTTON_STYLES.secondary} inline-flex items-center gap-1.5 rounded`}
                >
                    <ArrowClockwise size={14} />
                    Làm mới
                </button>
            </div>

            {error ? <div className={`${TYPOGRAPHY.sm} text-red-500 border border-red-200 dark:border-red-900/30 px-3 py-2 rounded`}>{error}</div> : null}

            <div className="flex flex-wrap gap-2">
                {/* Tab order: songs, genres, songs-top, playlists-top, albums-top, jamendo */}
                <button
                    onClick={() => setTab('songs')}
                    className={`px-3 h-8 text-[11px] border rounded transition-colors ${tab === 'songs' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                    Danh sách bài hát
                </button>
                <button
                    onClick={() => setTab('genres')}
                    className={`px-3 h-8 text-[11px] border rounded transition-colors ${tab === 'genres' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                    Danh sách thể loại nhạc
                </button>
                <button
                    onClick={() => setTab('songs-top')}
                    className={`px-3 h-8 text-[11px] border rounded transition-colors ${tab === 'songs-top' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                    Bài hát yêu thích tuần/tháng
                </button>
                <button
                    onClick={() => setTab('playlists-top')}
                    className={`px-3 h-8 text-[11px] border rounded transition-colors ${tab === 'playlists-top' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                    Playlist yêu thích + tổng số
                </button>
                <button
                    onClick={() => setTab('albums-top')}
                    className={`px-3 h-8 text-[11px] border rounded transition-colors ${tab === 'albums-top' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                    Album yêu thích + tổng số
                </button>
        
                <button
                    onClick={() => setTab('jamendo')}
                    className={`px-3 h-8 text-[11px] border rounded transition-colors ${tab === 'jamendo' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                >
                    Thêm nhạc từ Jamendo
                </button>
            </div>

                        {tab === 'genres' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className={`${TYPOGRAPHY.heading4} text-zinc-900 dark:text-white`}>Danh sách thể loại nhạc</h2>
                                    <button
                                        className={`${BUTTON_STYLES.primary} rounded`}
                                        onClick={() => {
                                            const initial = { name: '', description: '' };
                                            setGenreModalOpen(true);
                                            setGenreEditing(null);
                                            setGenreInitialForm(initial);
                                            setGenreForm(initial);
                                        }}
                                    >
                                        Thêm mới
                                    </button>
                                </div>

                                {/* Genre Search */}
                                <div className="max-w-sm">
                                    <SearchInput
                                        value={genreSearch}
                                        onChange={setGenreSearch}
                                        onSearch={fetchGenres}
                                        placeholder="Tìm kiếm thể loại..."
                                        label="Tìm kiếm"
                                        clearable={true}
                                    />
                                </div>

                                {genreError && <div className={`${TYPOGRAPHY.sm} text-red-500 border border-red-300 dark:border-red-900 px-3 py-2 rounded`}>{genreError}</div>}
                                <div className={TABLE_STYLES.container + ' rounded'}>
                                    {loadingGenres ? <div className={`p-4 ${TYPOGRAPHY.sm} text-zinc-500`}>Đang tải...</div> : genres.length === 0 ? <div className={`p-4 ${TYPOGRAPHY.sm} text-zinc-500`}>Chưa có thể loại nào</div> : (
                                        <table className="min-w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950">
                                                    <th className={TABLE_STYLES.headerCell}>Tên</th>
                                                    <th className={TABLE_STYLES.headerCell}>Mô tả</th>
                                                    <th className={TABLE_STYLES.headerCell}>Hành động</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {genres.map(g => (
                                                    <tr key={g.id} className={TABLE_STYLES.row}>
                                                        <td className={TABLE_STYLES.bodyCell}>{g.name}</td>
                                                        <td className={TABLE_STYLES.bodyCell}>{g.description}</td>
                                                        <td className="px-3 py-2.5 border-b border-zinc-200 dark:border-white/5 flex gap-2">
                                                            <button className={`${BUTTON_STYLES.secondary} rounded`} onClick={() => handleGenreEdit(g)}>Sửa</button>
                                                            <button className={`${BUTTON_STYLES.danger} rounded`} onClick={() => handleGenreDelete(g.id)}>Xóa</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Modal thêm/sửa thể loại */}
                                {genreModalOpen && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 px-4 backdrop-blur-[2px]" onClick={() => setGenreModalOpen(false)}>
                                        <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/[0.08] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                                             onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.06]">
                                                <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                                                    {genreEditing ? 'Cập nhật thể loại' : 'Thêm thể loại mới'}
                                                </p>
                                                <button onClick={() => setGenreModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors text-lg">×</button>
                                            </div>
                                            <form onSubmit={handleGenreSubmit} className="px-5 py-4 space-y-3">
                                                <div>
                                                    <label className={TYPOGRAPHY.label}>TÊN THỂ LOẠI</label>
                                                    <input
                                                        className={INPUT_STYLES.base}
                                                        placeholder="Nhập tên thể loại..."
                                                        value={genreForm.name}
                                                        onChange={e => setGenreForm(f => ({ ...f, name: e.target.value }))}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className={TYPOGRAPHY.label}>MÔ TẢ</label>
                                                    <input
                                                        className={INPUT_STYLES.base}
                                                        placeholder="Nhập mô tả..."
                                                        value={genreForm.description}
                                                        onChange={e => setGenreForm(f => ({ ...f, description: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06] flex gap-2">
                                                    <button type="button" className={`${BUTTON_STYLES.secondary} flex-1 rounded`} onClick={() => setGenreModalOpen(false)}>Hủy</button>
                                                    <button type="submit" className={`${BUTTON_STYLES.primary} flex-1 rounded`}>{genreEditing ? 'Cập nhật' : 'Thêm mới'}</button>
                                                </div>
                                            </form>
                                        </div>
                                        {/* Modal xác nhận đóng nếu có dữ liệu nhập */}
                                        {genreConfirmClose && (
                                            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={() => setGenreConfirmClose(false)}>
                                                <div className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded shadow-lg p-6 border border-zinc-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
                                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-4">Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.</p>
                                                    <div className="flex gap-2 justify-end">
                                                        <button className={`${BUTTON_STYLES.secondary} rounded`} onClick={() => setGenreConfirmClose(false)}>Không</button>
                                                        <button className={`${BUTTON_STYLES.danger} rounded`} onClick={() => {setGenreModalOpen(false); setGenreConfirmClose(false);}}>Đồng ý</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

            {tab === 'songs' && (
                <div className="space-y-3">
                    <DataCard title="Tổng số bài hát" value={totalSongs.toLocaleString('vi-VN')} subtitle={`Trang ${songsPage}/${totalSongPages}`} />
                    
                    {/* Search Songs */}
                    <div className="max-w-sm">
                        <SearchInput
                            value={songSearch}
                            onChange={setSongSearch}
                            onSearch={loadSongs}
                            placeholder="Tìm kiếm bài hát theo tên..."
                            label="Tìm kiếm"
                            clearable={true}
                        />
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingSongs ? <EmptyState text="Đang tải..." /> : songs.length === 0 ? <EmptyState /> : songs.map((s) => (
                            <div key={s.id} className={`${CARD_STYLES.dataCard} rounded hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors`}>
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">{s.title}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{s.primaryArtist?.stageName ?? s.primaryArtistStageName ?? '—'}</p>
                                <p className="text-[11px] text-zinc-500 mt-1">{fmtDuration(s.durationSeconds)}</p>
                                <p className="text-[10px] uppercase tracking-wider text-zinc-400 mt-2">{s.sourceType ?? 'UNKNOWN'}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            className={`${BUTTON_STYLES.secondary} rounded`}
                            disabled={loadingSongs || songsPage <= 1}
                            onClick={() => changeSongsPage(songsPage - 1)}
                        >
                            Trang trước
                        </button>
                        <button
                            type="button"
                            className={`${BUTTON_STYLES.secondary} rounded`}
                            disabled={loadingSongs || songsPage >= totalSongPages}
                            onClick={() => changeSongsPage(songsPage + 1)}
                        >
                            Trang sau
                        </button>
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
                                className={`px-2.5 py-1 text-[11px] border rounded transition-colors ${songPeriod === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                            >
                                {p === 'WEEK' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                    <DataCard title="Bài hát được yêu thích nhất" value={topSongTitle} subtitle={`Khoảng thời gian: ${songPeriod === 'WEEK' ? 'Tuần' : 'Tháng'}`} />
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingTopSongs ? <EmptyState text="Đang tải..." /> : topListen.length === 0 ? <EmptyState /> : topListen.map((row, idx) => (
                            <div key={row.songId} className={`${CARD_STYLES.dataCard} rounded`}>
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">#{idx + 1} {topSongMap[row.songId]?.title ?? row.songId}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{topSongMap[row.songId]?.primaryArtist?.stageName ?? '—'}</p>
                                <p className="text-[11px] text-zinc-500 mt-1">{row.listenCount.toLocaleString('vi-VN')} lượt nghe</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'playlists-top' && (
                <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <DataCard title="Playlist được yêu thích nhất" value={playlists[0]?.name ?? EMPTY_TEXT} subtitle="Dữ liệu từ danh sách playlist hiện có." />
                        <DataCard title="Tổng số Playlist" value={totalPlaylists.toLocaleString('vi-VN')} subtitle="Nguồn hiện có: /playlists/my-playlists." />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingPlaylists ? <EmptyState text="Đang tải..." /> : playlists.length === 0 ? <EmptyState /> : playlists.map((p) => (
                            <div key={p.id} className={`${CARD_STYLES.dataCard} rounded`}>
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
                                className={`px-2.5 py-1 text-[11px] border rounded transition-colors ${albumPeriod === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5'}`}
                            >
                                {p === 'WEEK' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <DataCard
                            title="Album được yêu thích nhất"
                            value={topAlbums[0]?.title ?? EMPTY_TEXT}
                            subtitle={`Nguồn: ${albumPeriod === 'MONTH' ? '/admin/albums/top-favorites-month' : '/admin/albums/top-favorites-week'}.`}
                        />
                        <DataCard title="Tổng số Album" value={totalAlbums.toLocaleString('vi-VN')} subtitle="Nguồn: /albums?page=1&size=1." />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {loadingAlbums ? <EmptyState text="Đang tải..." /> : topAlbums.length === 0 ? <EmptyState /> : topAlbums.map((a) => (
                            <div key={a.id} className={`${CARD_STYLES.dataCard} rounded`}>
                                <p className="text-[12px] font-medium text-zinc-900 dark:text-white truncate">{a.title}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{a.ownerStageName ?? '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'jamendo' && (
                <div className="space-y-4 border border-zinc-200 dark:border-white/10 p-4 rounded">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Thêm nhạc từ Jamendo</h2>
                        <p className={`${TYPOGRAPHY.sm} text-zinc-500 mt-1`}>Nhập các tag nhạc và số lượng bài hát cần tải xuống. Sẽ được xếp hàng lặng vào hàng đợi xử lý.</p>
                    </div>
                    <form className="grid gap-3 md:grid-cols-3 items-end" onSubmit={onImportJamendo}>
                        <div>
                            <label className={TYPOGRAPHY.label}>CHỌN TAG</label>
                            <input
                                value={jamendoTags}
                                onChange={(e) => setJamendoTags(e.target.value)}
                                className={INPUT_STYLES.base}
                                placeholder="v.d: pop,rock,lofi"
                            />
                        </div>
                        <div>
                            <label className={TYPOGRAPHY.label}>SỐ LƯỢNG</label>
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={jamendoLimit}
                                onChange={(e) => setJamendoLimit(Number(e.target.value))}
                                className={INPUT_STYLES.base}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={importingJamendo} 
                            className={`${BUTTON_STYLES.primary} inline-flex items-center justify-center gap-2 rounded`}
                        >
                            <MusicNotesPlus size={14} />
                            {importingJamendo ? 'Đang gửi...' : 'Import Jamendo'}
                        </button>
                    </form>

                    {jamendoSummary && (
                        <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-zinc-200 dark:border-white/10">
                            <div className={`${CARD_STYLES.dataCard} rounded`}>
                                <p className={TYPOGRAPHY.label}>Từ Jamendo</p>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{String(jamendoSummary.fetched ?? 0)}</p>
                            </div>
                            <div className={`${CARD_STYLES.dataCard} rounded`}>
                                <p className={TYPOGRAPHY.label}>Bỏ qua (tồn tại)</p>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{String(jamendoSummary.skipped ?? 0)}</p>
                            </div>
                            <div className={`${CARD_STYLES.dataCard} rounded`}>
                                <p className={TYPOGRAPHY.label}>Xử lý</p>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{String(jamendoSummary.enqueued ?? 0)}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
