// src/services/download.ts
//
// FIX: Import from 'expo-file-system/legacy' to suppress the deprecation warning
// introduced in Expo SDK 54.  The legacy module is API-identical to the old
// default import, so no other changes are required.

import * as FS from 'expo-file-system/legacy';
import { apiClient } from './api';
import { Song } from './music';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── In-memory map of active DownloadResumable ─────────────────────────────

const activeDownloads = new Map<string, FS.DownloadResumable>();

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

// ─── Public: read downloaded list ─────────────────────────────────────────────

/**
 * Returns the list of already-downloaded songs, pruning entries whose file
 * no longer exists on disk.
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

    if (staleIds.length > 0) {
        await writeMeta(verified);
    }

    return verified;
};

/**
 * Returns the local URI if the song is on disk, otherwise null.
 */
export const isSongDownloaded = async (songId: string): Promise<string | null> => {
    const list  = await readMeta();
    const found = list.find((d) => d.song.id === songId);
    if (!found) return null;
    const info = await FS.getInfoAsync(found.localUri);
    return info.exists ? found.localUri : null;
};

/**
 * Total bytes used by all downloaded songs.
 */
export const getDownloadStorageUsed = async (): Promise<number> => {
    const list = await getDownloadedSongs();
    return list.reduce((sum, item) => sum + (item.size ?? 0), 0);
};

// ─── Public: download ─────────────────────────────────────────────────────────

export const downloadSong = async (
    song: Song,
    onProgress?: (pct: number) => void,
    onStatusChange?: (status: DownloadStatus) => void,
): Promise<string> => {
    await ensureDir();

    const existing = await isSongDownloaded(song.id);
    if (existing) {
        onStatusChange?.({ state: 'done' });
        onProgress?.(100);
        return existing;
    }

    const localUri = `${DOWNLOADS_DIR}${song.id}.mp3`;

    // Remove any partial file from a previous attempt
    await FS.deleteAsync(localUri, { idempotent: true });

    onStatusChange?.({ state: 'downloading', progress: 0 });

    // Fetch a presigned download URL from the backend
    let downloadUrl: string;
    try {
        const res = await apiClient.get<string>(`/songs/${song.id}/download`);
        downloadUrl = typeof res.data === 'string' ? res.data : String(res.data);
        if (!downloadUrl || !downloadUrl.startsWith('http')) {
            throw new Error('Backend trả về URL không hợp lệ.');
        }
    } catch (urlError: any) {
        onStatusChange?.({ state: 'error', message: urlError?.message ?? 'Không lấy được URL tải xuống.' });
        throw urlError;
    }

    const progressCallback = (event: FS.DownloadProgressData): void => {
        if (event.totalBytesExpectedToWrite <= 0) return;
        const pct = Math.round((event.totalBytesWritten / event.totalBytesExpectedToWrite) * 100);
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
        await FS.deleteAsync(localUri, { idempotent: true }).catch(() => {});
        activeDownloads.delete(song.id);

        const msg: string  = error?.message ?? '';
        const isNetworkError =
            msg.toLowerCase().includes('network') ||
            msg.toLowerCase().includes('connection') ||
            msg.toLowerCase().includes('timeout') ||
            error?.code === 'ERR_NETWORK';

        if (isNetworkError) {
            onStatusChange?.({ state: 'paused' });
        } else {
            onStatusChange?.({ state: 'error', message: msg || 'Lỗi không xác định.' });
        }

        throw error;
    }
};

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

export const retryDownload = async (
    song: Song,
    onProgress?: (pct: number) => void,
    onStatusChange?: (status: DownloadStatus) => void,
): Promise<string> => {
    return downloadSong(song, onProgress, onStatusChange);
};

// ─── Public: delete ───────────────────────────────────────────────────────────

export const deleteSongDownload = async (songId: string): Promise<void> => {
    await pauseActiveDownload(songId);
    const list  = await readMeta();
    const found = list.find((d) => d.song.id === songId);
    if (found) {
        await FS.deleteAsync(found.localUri, { idempotent: true });
    }
    await writeMeta(list.filter((d) => d.song.id !== songId));
};

export const deleteAllDownloads = async (): Promise<void> => {
    for (const songId of activeDownloads.keys()) {
        await pauseActiveDownload(songId);
    }
    await FS.deleteAsync(DOWNLOADS_DIR, { idempotent: true });
    await FS.deleteAsync(META_FILE,     { idempotent: true });
};