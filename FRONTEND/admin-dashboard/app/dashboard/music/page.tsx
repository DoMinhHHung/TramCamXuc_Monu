'use client';
import { openAdminRealtime } from '@/lib/realtime';
type Tab = 'genres' | 'songs' | 'favorites';

interface Album {
    id: string;
    title: string;
    ownerStageName?: string;
    totalSongs?: number;
}
export default function MusicPage() {
    const [loadingFav, setLoadingFav] = useState(false);
    const [topSongs, setTopSongs] = useState<Song[]>([]);
    const [topAlbums, setTopAlbums] = useState<Album[]>([]);
            const data = await apiFetch<Genre[]>('/genres', { ttlMs: 10_000 });
            const data = await apiFetch<PageResult<Song>>('/admin/songs?status=PUBLIC&page=1&size=50&showDeleted=false', { ttlMs: 10_000 });
    const loadFavorites = useCallback(async () => {
        setLoadingFav(true);
        try {
            const [songRes, albumRes] = await Promise.all([
                apiFetch<PageResult<Song>>('/songs/trending?page=1&size=8', { ttlMs: 10_000 }),
                apiFetch<PageResult<Album>>('/albums?page=1&size=8', { ttlMs: 10_000 }),
            ]);
            setTopSongs(songRes?.content ?? []);
            setTopAlbums(albumRes?.content ?? []);
            setError(null);
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setLoadingFav(false);
        }
    }, []);

        void Promise.allSettled([loadGenres(), loadSongs(), loadFavorites()]);
            void Promise.allSettled([loadGenres(), loadSongs(), loadFavorites()]);
        const closeRealtime = openAdminRealtime(() => {
            void Promise.allSettled([loadGenres(), loadSongs(), loadFavorites()]);
        });
        return () => {
            clearInterval(id);
            closeRealtime();
        };
    }, [loadGenres, loadSongs, loadFavorites]);

            {/* Text */}
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Music Management</h2>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center max-w-xs">
                Quản lý songs, albums, genres, artists.
                <br />
                Tính năng này đang được phát triển.
            </p>

            {/* Coming soon badge */}
            <div className="mt-5 px-3 py-1 border border-zinc-200 dark:border-white/[0.08] text-[10px] tracking-widest text-zinc-400 dark:text-zinc-600 font-medium">
                COMING SOON
            </div>

            {/* Placeholder nav grid */}
            <div className="mt-8 grid grid-cols-2 gap-2 w-full max-w-xs">
                {['Songs','Albums','Artists','Genres'].map(item => (
                    <div
                        key={item}
                        className="border border-dashed border-zinc-200 dark:border-white/[0.06] px-4 py-3 text-[11px] text-zinc-300 dark:text-zinc-700 text-center"
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}                <button
                    onClick={() => setTab('favorites')}
                    className={`px-3 h-8 border ${tab === 'favorites' ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400'}`}
                >Top bài hát/album</button>

            {tab === 'favorites' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="border border-zinc-200 dark:border-white/10">
                        <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">Bài hát nổi bật</div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {loadingFav && <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>}
                            {!loadingFav && topSongs.map((s, idx) => (
                                <div key={s.id} className="px-3 py-2 text-[11px] flex items-center justify-between">
                                    <div>
                                        <p className="text-zinc-900 dark:text-white">{idx + 1}. {s.title}</p>
                                        <p className="text-zinc-500">{s.primaryArtist?.stageName ?? 'Unknown'}</p>
                                    </div>
                                    <span className="text-zinc-500">{fmt(s.durationSeconds)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border border-zinc-200 dark:border-white/10">
                        <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 text-[11px] text-zinc-500">Album yêu thích</div>
                        <div className="divide-y divide-zinc-200 dark:divide-white/10">
                            {loadingFav && <div className="p-3 text-[11px] text-zinc-500">Đang tải...</div>}
                            {!loadingFav && topAlbums.map((a, idx) => (
                                <div key={a.id} className="px-3 py-2 text-[11px] flex items-center justify-between">
                                    <div>
                                        <p className="text-zinc-900 dark:text-white">{idx + 1}. {a.title}</p>
                                        <p className="text-zinc-500">{a.ownerStageName ?? '-'}</p>
                                    </div>
                                    <span className="text-zinc-500">{a.totalSongs ?? 0} songs</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
