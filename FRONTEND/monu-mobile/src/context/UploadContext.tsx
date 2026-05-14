import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useState,
} from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { confirmUploadSong, requestUploadSong, uploadLyric } from '../services/music';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadStage =
    | 'idle'
    | 'requesting'
    | 'uploading'
    | 'confirming'
    | 'done'
    | 'error';

export interface UploadJob {
    title: string;
    fileName: string;
    stage: UploadStage;
    progress: number;
    errorMessage?: string;
    error?: string;
}

interface UploadContextValue {
    job: UploadJob | null;
    startUpload: (params: {
        title: string;
        genreIds: string[];
        file: DocumentPicker.DocumentPickerAsset;
        coverFile?: { uri: string; name: string; mimeType?: string } | null;
        lyricFile?: DocumentPicker.DocumentPickerAsset | null;
    }) => Promise<void>;
    dismissJob: () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

// ─── Native file upload via expo-file-system ─────────────────────────────────
//
// Dùng FileSystem.createUploadTask thay vì XHR hack.
// FileSystem đọc file trực tiếp từ filesystem ở tầng native (ObjC/Java),
// không đi qua JS bridge → không treo với file lớn, hỗ trợ progress chuẩn.
//
async function uploadFileNative(params: {
    url: string;
    uri: string;
    mimeType: string;
    fileName: string;
    onProgress: (pct: number) => void;
}): Promise<void> {
    const { url, uri, mimeType, onProgress } = params;

    return new Promise((resolve, reject) => {
        const task = FileSystem.createUploadTask(
            url,
            uri,
            {
                httpMethod: 'PUT',
                uploadType: 0, 
                headers: { 'Content-Type': mimeType },
            },
            (progress) => {
                const { totalBytesExpectedToSend, totalBytesSent } = progress;
                if (totalBytesExpectedToSend > 0) {
                    const pct = Math.min(99, Math.round((totalBytesSent / totalBytesExpectedToSend) * 100));
                    onProgress(pct);
                }
            },
        );

        task.uploadAsync()
            .then((result: { status: number } | null | undefined) => {
                if (!result || result.status < 200 || result.status >= 300) {
                    reject(new Error(
                        `Upload thất bại HTTP ${result?.status ?? 'unknown'}. ` +
                        `Có thể presigned URL hết hạn hoặc lỗi CORS.`
                    ));
                } else {
                    onProgress(100);
                    resolve();
                }
            })
            .catch((err: Error) => reject(new Error(`Lỗi upload: ${err.message}`)));
    });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const UploadProvider = ({ children }: PropsWithChildren) => {
    const [job, setJob] = useState<UploadJob | null>(null);

    const updateJob = useCallback((patch: Partial<UploadJob>) => {
        setJob(prev => prev ? { ...prev, ...patch } : prev);
    }, []);

    const startUpload = useCallback(async ({
                                               title,
                                               genreIds,
                                               file,
                                               coverFile,
                                               lyricFile,
                                             }: {
        title: string;
        genreIds: string[];
        file: DocumentPicker.DocumentPickerAsset;
        coverFile?: { uri: string; name: string; mimeType?: string } | null;
        lyricFile?: DocumentPicker.DocumentPickerAsset | null;
    }) => {
        if (job?.stage === 'requesting' || job?.stage === 'uploading' || job?.stage === 'confirming') {
            return;
        }

        const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'mp3';
        const mimeType = file.mimeType ?? 'audio/mpeg';
        const coverExt = coverFile?.name?.split('.').pop()?.toLowerCase();
        const coverMimeType = coverFile?.mimeType ?? 'image/jpeg';

        setJob({ title, fileName: file.name, stage: 'requesting', progress: 0 });

        try {
            // Bước 1: lấy presigned URL
            console.log('[Upload] requesting upload URL...');
            const created = await requestUploadSong({
                title: title.trim(),
                fileExtension: ext,
                genreIds,
                coverFileExtension: coverExt,
            });

            if (!created.uploadUrl) throw new Error('Backend không trả về upload URL.');
            console.log('[Upload] got URL, starting native XHR upload...');

            updateJob({ stage: 'uploading', progress: 0 });

            // Bước 2: upload file lên MinIO
            await uploadFileNative({
                url:        created.uploadUrl,
                uri:        file.uri,
                mimeType,
                fileName:   file.name,
                onProgress: (pct) => updateJob({ progress: pct }),
            });

            if (coverFile && created.coverUploadUrl) {
                console.log('[Upload] uploading cover via presigned URL...');
                await uploadFileNative({
                    url: created.coverUploadUrl,
                    uri: coverFile.uri,
                    mimeType: coverMimeType,
                    fileName: coverFile.name,
                    onProgress: () => {},
                });
            }

            console.log('[Upload] file uploaded, confirming...');
            updateJob({ stage: 'confirming', progress: 100 });

            // Bước 3: confirm để trigger transcode
            await confirmUploadSong(created.id);

            // Bước 4: upload lyric nếu có
            if (lyricFile) {
                console.log('[Upload] uploading lyric file...');
                try {
                    await uploadLyric(created.id, {
                        uri: lyricFile.uri,
                        name: lyricFile.name,
                        type: lyricFile.mimeType ?? 'text/plain',
                    });
                    console.log('[Upload] lyric uploaded');
                } catch (lyricErr: any) {
                    console.warn('[Upload] lyric upload failed (song OK):', lyricErr?.message);
                }
            }

            updateJob({ stage: 'done', progress: 100 });
            console.log('[Upload] done:', title);

        } catch (err: any) {
            const msg = err?.message ?? 'Lỗi không xác định.';
            console.error('[Upload] failed:', msg);
            updateJob({ stage: 'error', errorMessage: msg, error: msg });
        }
    }, [job, updateJob]);

    const dismissJob = useCallback(() => setJob(null), []);

    return (
        <UploadContext.Provider value={{ job, startUpload, dismissJob }}>
            {children}
        </UploadContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useUpload = (): UploadContextValue => {
    const ctx = useContext(UploadContext);
    if (!ctx) throw new Error('useUpload must be used inside UploadProvider');
    return ctx;
};
