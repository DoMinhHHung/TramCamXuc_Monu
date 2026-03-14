const FS = require('expo-file-system') as ExpoFileSystem;
import { apiClient } from './api';
import { Song } from './music';


interface DownloadProgressData {
    totalBytesWritten: number;
    totalBytesExpectedToWrite: number;
}

interface DownloadResult {
    uri: string;
    status: number;
    headers: Record<string, string>;
    md5?: string;
}

interface FileInfo {
    exists: boolean;
    uri: string;
    size?: number;
    isDirectory?: boolean;
    modificationTime?: number;
    md5?: string;
}

interface DownloadResumable {
    downloadAsync(): Promise<DownloadResult | null>;
    pauseAsync(): Promise<void>;
    resumeAsync(): Promise<DownloadResult | null>;
}

interface ExpoFileSystem {
    documentDirectory: string | null;
    cacheDirectory: string | null;
    getInfoAsync(uri: string, options?: { md5?: boolean; size?: boolean }): Promise<FileInfo>;
    makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<void>;
    writeAsStringAsync(uri: string, contents: string, options?: { encoding?: string }): Promise<void>;
    readAsStringAsync(uri: string, options?: { encoding?: string; position?: number; length?: number }): Promise<string>;
    deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
    copyAsync(options: { from: string; to: string }): Promise<void>;
    createDownloadResumable(
        uri: string,
        fileUri: string,
        options?: object,
        callback?: (data: DownloadProgressData) => void,
        resumeData?: string,
    ): DownloadResumable;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// documentDirectory có thể null trên web — dùng fallback rỗng
const DOC_DIR       = FS.documentDirectory ?? '';
const DOWNLOADS_DIR = `${DOC_DIR}monu_downloads/`;
const META_FILE     = `${DOC_DIR}monu_downloads_meta.json`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadedSong {
    song: Song;
    localUri: string;
    downloadedAt: string;
    /** bytes */
    size: number;
}

export type DownloadStatus =
    | { state: 'idle' }
    | { state: 'downloading'; progress: number }
    | { state: 'paused' }
    | { state: 'done' }
    | { state: 'error'; message: string };

// ─── In-memory map của active DownloadResumable ───────────────────────────────
const activeDownloads = new Map<string, DownloadResumable>();

// ─── Helpers: metadata ────────────────────────────────────────────────────────

const ensureDir = async (): Promise<void> => {
    const info = await FS.getInfoAsync(DOWNLOADS_DIR);
    if (!info.exists) {
        await FS.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
    }
};

const readMeta = async (): Promise<DownloadedSong[]> => {
    try {
        const info = await FS.getInfoAsync(META_FILE);
        if (!info.exists) return [];
        const raw = await FS.readAsStringAsync(META_FILE);
        return (JSON.parse(raw) as DownloadedSong[]) ?? [];
    } catch {
        return [];
    }
};

const writeMeta = async (list: DownloadedSong[]): Promise<void> => {
    await FS.writeAsStringAsync(META_FILE, JSON.stringify(list));
};

// ─── Public: đọc danh sách đã download ───────────────────────────────────────

/**
 * Lấy danh sách bài đã download.
 * Tự xoá metadata của bài mà file không còn tồn tại trên disk.
 */
export const getDownloadedSongs = async (): Promise<DownloadedSong[]> => {
    const list = await readMeta();
    const verified: DownloadedSong[] = [];
    const staleIds: string[] = [];

    for (const item of list) {
        const info = await FS.getInfoAsync(item.localUri);
        if (info.exists) {
            verified.push(item);
        } else {
            staleIds.push(item.song.id);
        }
    }

    // Clean up stale metadata
    if (staleIds.length > 0) {
        await writeMeta(verified);
    }

    return verified;
};

/**
 * Kiểm tra bài có đang offline không.
 * Trả về localUri nếu có, null nếu không.
 */
export const isSongDownloaded = async (songId: string): Promise<string | null> => {
    const list = await readMeta();
    const found = list.find((d) => d.song.id === songId);
    if (!found) return null;
    const info = await FS.getInfoAsync(found.localUri);
    return info.exists ? found.localUri : null;
};

/**
 * Tổng dung lượng bài đã download (bytes).
 */
export const getDownloadStorageUsed = async (): Promise<number> => {
    const list = await getDownloadedSongs();
    return list.reduce((sum, item) => sum + (item.size ?? 0), 0);
};

// ─── Public: download ─────────────────────────────────────────────────────────

/**
 * Download một bài hát từ backend.
 *
 * Flow:
 *   1. Kiểm tra đã download chưa → return ngay nếu có
 *   2. Xoá file dang dở từ lần trước (nếu có)
 *   3. Lấy presigned URL từ GET /songs/{id}/download
 *   4. Tạo DownloadResumable, track progress
 *   5. Lưu metadata sau khi xong
 *
 * Nếu mạng bị ngắt giữa chừng:
 *   - File dang dở bị xoá
 *   - onStatusChange báo { state: 'paused' }
 *   - DownloadContext sẽ tự retry khi mạng có lại
 */
export const downloadSong = async (
    song: Song,
    onProgress?: (pct: number) => void,
    onStatusChange?: (status: DownloadStatus) => void,
): Promise<string> => {
    await ensureDir();

    // Đã download rồi → return luôn
    const existing = await isSongDownloaded(song.id);
    if (existing) {
        onStatusChange?.({ state: 'done' });
        onProgress?.(100);
        return existing;
    }

    const localUri = `${DOWNLOADS_DIR}${song.id}.mp3`;

    // Xoá file cũ dang dở (nếu có)
    await FS.deleteAsync(localUri, { idempotent: true });

    onStatusChange?.({ state: 'downloading', progress: 0 });

    // Lấy presigned URL (5 phút TTL)
    let downloadUrl: string;
    try {
        const res = await apiClient.get<string>(`/songs/${song.id}/download`);
        downloadUrl = typeof res.data === 'string' ? res.data : String(res.data);
        if (!downloadUrl || !downloadUrl.startsWith('http')) {
            throw new Error('Backend trả về URL không hợp lệ.');
        }
    } catch (urlError: any) {
        onStatusChange?.({
            state: 'error',
            message: urlError?.message ?? 'Không lấy được URL tải xuống.',
        });
        throw urlError;
    }

    // Progress callback
    const progressCallback = (event: DownloadProgressData): void => {
        if (event.totalBytesExpectedToWrite <= 0) return;
        const pct = Math.round(
            (event.totalBytesWritten / event.totalBytesExpectedToWrite) * 100,
        );
        onProgress?.(pct);
        onStatusChange?.({ state: 'downloading', progress: pct });
    };

    const resumable = FS.createDownloadResumable(
        downloadUrl,
        localUri,
        {},
        progressCallback,
    );

    activeDownloads.set(song.id, resumable);

    try {
        const result = await resumable.downloadAsync();

        if (!result?.uri) {
            throw new Error('Download thất bại — không có file URI.');
        }

        // Lưu metadata
        const list     = await readMeta();
        const filtered = list.filter((d) => d.song.id !== song.id);
        const fileInfo = await FS.getInfoAsync(result.uri);

        filtered.unshift({
            song,
            localUri: result.uri,
            downloadedAt: new Date().toISOString(),
            size: (fileInfo as any).size ?? 0,
        });

        await writeMeta(filtered);
        activeDownloads.delete(song.id);

        onProgress?.(100);
        onStatusChange?.({ state: 'done' });
        return result.uri;

    } catch (error: any) {
        // Xoá file dang dở
        await FS.deleteAsync(localUri, { idempotent: true }).catch(() => {});
        activeDownloads.delete(song.id);

        // Phân biệt lỗi mạng vs lỗi khác
        const msg: string = error?.message ?? '';
        const isNetworkError =
            msg.toLowerCase().includes('network') ||
            msg.toLowerCase().includes('connection') ||
            msg.toLowerCase().includes('timeout') ||
            error?.code === 'ERR_NETWORK';

        if (isNetworkError) {
            // Đánh dấu paused để DownloadContext retry sau
            onStatusChange?.({ state: 'paused' });
        } else {
            onStatusChange?.({ state: 'error', message: msg || 'Lỗi không xác định.' });
        }

        throw error;
    }
};

/**
 * Pause download đang chạy (nếu có).
 * Vì presigned URL có TTL ngắn, không lưu snapshot.
 * Chỉ dừng và đánh dấu để retry sau.
 */
export const pauseActiveDownload = async (songId: string): Promise<void> => {
    const resumable = activeDownloads.get(songId);
    if (!resumable) return;
    try {
        await resumable.pauseAsync();
    } catch { /* ignore */ } finally {
        activeDownloads.delete(songId);
        const localUri = `${DOWNLOADS_DIR}${songId}.mp3`;
        await FS.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }
};

/**
 * Retry download (lấy URL mới + bắt đầu từ đầu).
 * Presigned URL có TTL ngắn nên không hỗ trợ HTTP Range resume.
 */
export const retryDownload = async (
    song: Song,
    onProgress?: (pct: number) => void,
    onStatusChange?: (status: DownloadStatus) => void,
): Promise<string> => {
    // downloadSong tự xoá file cũ và lấy URL mới
    return downloadSong(song, onProgress, onStatusChange);
};

// ─── Public: xoá ─────────────────────────────────────────────────────────────

/**
 * Xoá bài đã download khỏi disk và metadata.
 */
export const deleteSongDownload = async (songId: string): Promise<void> => {
    // Dừng nếu đang download
    await pauseActiveDownload(songId);

    const list = await readMeta();
    const found = list.find((d) => d.song.id === songId);
    if (found) {
        await FS.deleteAsync(found.localUri, { idempotent: true });
    }
    await writeMeta(list.filter((d) => d.song.id !== songId));
};

/**
 * Xoá toàn bộ bài đã download.
 */
export const deleteAllDownloads = async (): Promise<void> => {
    // Dừng tất cả active downloads
    for (const songId of activeDownloads.keys()) {
        await pauseActiveDownload(songId);
    }
    // Xoá thư mục và meta
    await FS.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
    await FS.deleteAsync(META_FILE, { idempotent: true });
};