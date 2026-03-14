import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { Song } from '../services/music';
import {
    deleteSongDownload,
    deleteAllDownloads,
    downloadSong,
    getDownloadedSongs,
    getDownloadStorageUsed,
    isSongDownloaded,
    pauseActiveDownload,
    retryDownload,
    DownloadedSong,
    DownloadStatus,
} from '../services/download';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadJob {
    song: Song;
    status: DownloadStatus;
}

interface DownloadContextValue {
    /** Map songId → job hiện tại (chỉ có khi đang download hoặc error) */
    jobs: Record<string, DownloadJob>;
    /** Danh sách bài đã download xong và còn trên disk */
    downloadedSongs: DownloadedSong[];
    /** Tổng dung lượng đã dùng (bytes) */
    storageUsed: number;

    startDownload: (song: Song) => Promise<void>;
    cancelDownload: (songId: string) => Promise<void>;
    deleteDownload: (songId: string) => Promise<void>;
    deleteAll: () => Promise<void>;
    /** Trả về localUri nếu đã download, null nếu chưa */
    getOfflineUri: (songId: string) => string | undefined;
    isDownloaded: (songId: string) => boolean;
    getJobStatus: (songId: string) => DownloadStatus;
    /** Reload danh sách từ disk */
    refreshDownloads: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DownloadContext = createContext<DownloadContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const DownloadProvider = ({ children }: PropsWithChildren) => {
    const [jobs, setJobs]         = useState<Record<string, DownloadJob>>({});
    const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
    const [storageUsed, setStorageUsed]         = useState(0);

    // Songs đang ở trạng thái 'paused' cần retry khi mạng có lại
    const pendingRetry = useRef<Map<string, Song>>(new Map());
    const appStateRef  = useRef<AppStateStatus>(AppState.currentState);

    // ── Load on mount ──────────────────────────────────────────────────────────

    const refreshDownloads = useCallback(async () => {
        const list  = await getDownloadedSongs();
        const bytes = await getDownloadStorageUsed();
        setDownloadedSongs(list);
        setStorageUsed(bytes);
    }, []);

    useEffect(() => {
        void refreshDownloads();
    }, []);

    // ── AppState: retry khi app vào foreground ─────────────────────────────────

    useEffect(() => {
        const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            const wasBackground =
                appStateRef.current === 'background' ||
                appStateRef.current === 'inactive';
            const isForeground = nextState === 'active';

            if (wasBackground && isForeground && pendingRetry.current.size > 0) {
                // Retry tất cả bài bị pause do lỗi mạng
                const toRetry = Array.from(pendingRetry.current.entries());
                pendingRetry.current.clear();

                for (const [, song] of toRetry) {
                    void handleRetry(song);
                }
            }

            appStateRef.current = nextState;
        });

        return () => sub.remove();
    }, []);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const setJobStatus = useCallback(
        (song: Song, status: DownloadStatus) => {
            setJobs((prev) => ({
                ...prev,
                [song.id]: { song, status },
            }));
        },
        [],
    );

    const removeJob = useCallback((songId: string) => {
        setJobs((prev) => {
            const next = { ...prev };
            delete next[songId];
            return next;
        });
    }, []);

    // ── Actions ────────────────────────────────────────────────────────────────

    const startDownload = useCallback(async (song: Song): Promise<void> => {
        // Đang chạy rồi → bỏ qua
        if (jobs[song.id]?.status.state === 'downloading') return;
        // Đã download rồi → bỏ qua
        const existing = await isSongDownloaded(song.id);
        if (existing) return;

        setJobStatus(song, { state: 'downloading', progress: 0 });
        pendingRetry.current.delete(song.id);

        try {
            await downloadSong(
                song,
                (pct) => setJobStatus(song, { state: 'downloading', progress: pct }),
                (status) => {
                    setJobStatus(song, status);

                    if (status.state === 'done') {
                        void refreshDownloads();
                        // Xoá job sau 2 giây để UI hiện tick ✓
                        setTimeout(() => removeJob(song.id), 2000);
                    }

                    if (status.state === 'paused') {
                        // Đánh dấu retry khi mạng có lại
                        pendingRetry.current.set(song.id, song);
                    }
                },
            );
        } catch {
            // onStatusChange đã handle state
            pendingRetry.current.set(song.id, song);
        }
    }, [jobs, setJobStatus, removeJob, refreshDownloads]);

    const handleRetry = useCallback(async (song: Song): Promise<void> => {
        setJobStatus(song, { state: 'downloading', progress: 0 });

        try {
            await retryDownload(
                song,
                (pct) => setJobStatus(song, { state: 'downloading', progress: pct }),
                (status) => {
                    setJobStatus(song, status);

                    if (status.state === 'done') {
                        void refreshDownloads();
                        setTimeout(() => removeJob(song.id), 2000);
                    }
                    if (status.state === 'paused') {
                        pendingRetry.current.set(song.id, song);
                    }
                },
            );
        } catch {
            pendingRetry.current.set(song.id, song);
        }
    }, [setJobStatus, removeJob, refreshDownloads]);

    const cancelDownload = useCallback(async (songId: string): Promise<void> => {
        await pauseActiveDownload(songId);
        pendingRetry.current.delete(songId);
        removeJob(songId);
    }, [removeJob]);

    const deleteDownload = useCallback(async (songId: string): Promise<void> => {
        await deleteSongDownload(songId);
        pendingRetry.current.delete(songId);
        removeJob(songId);
        await refreshDownloads();
    }, [removeJob, refreshDownloads]);

    const deleteAll = useCallback(async (): Promise<void> => {
        await deleteAllDownloads();
        pendingRetry.current.clear();
        setJobs({});
        await refreshDownloads();
    }, [refreshDownloads]);

    // ── Selectors ──────────────────────────────────────────────────────────────

    const getOfflineUri = useCallback(
        (songId: string): string | undefined =>
            downloadedSongs.find((d) => d.song.id === songId)?.localUri,
        [downloadedSongs],
    );

    const isDownloaded = useCallback(
        (songId: string): boolean =>
            downloadedSongs.some((d) => d.song.id === songId),
        [downloadedSongs],
    );

    const getJobStatus = useCallback(
        (songId: string): DownloadStatus =>
            jobs[songId]?.status ?? { state: 'idle' },
        [jobs],
    );

    // ─────────────────────────────────────────────────────────────────────────

    const value: DownloadContextValue = {
        jobs,
        downloadedSongs,
        storageUsed,
        startDownload,
        cancelDownload,
        deleteDownload,
        deleteAll,
        getOfflineUri,
        isDownloaded,
        getJobStatus,
        refreshDownloads,
    };

    return (
        <DownloadContext.Provider value={value}>
            {children}
        </DownloadContext.Provider>
    );
};

export const useDownload = (): DownloadContextValue => {
    const ctx = useContext(DownloadContext);
    if (!ctx) throw new Error('useDownload must be inside DownloadProvider');
    return ctx;
};