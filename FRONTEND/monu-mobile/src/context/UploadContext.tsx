import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useState,
} from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { confirmUploadSong, requestUploadSong } from '../services/music';

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
    }) => Promise<void>;
    dismissJob: () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

// ─── Native XHR upload ────────────────────────────────────────────────────────
//
// BUG CŨ: fetch(file.uri).blob() load toàn bộ file vào JS memory qua bridge
// → treo với file > vài MB vì JS bridge bị block.
//
// FIX: xhr.send({ uri, type, name }) — React Native nhận dạng object này
// và đọc file natively từ filesystem, KHÔNG qua JS bridge.
// Kết quả: không treo, upload.onprogress hoạt động đúng.
//
function uploadFileNative(params: {
    url: string;
    uri: string;
    mimeType: string;
    fileName: string;
    onProgress: (pct: number) => void;
    timeoutMs?: number;
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const { url, uri, mimeType, fileName, onProgress, timeoutMs = 10 * 60 * 1000 } = params;

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', mimeType);
        xhr.timeout = timeoutMs;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
                const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
                onProgress(pct);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(100);
                resolve();
            } else {
                reject(new Error(
                    `Upload thất bại HTTP ${xhr.status}. ` +
                    `Có thể presigned URL hết hạn hoặc lỗi CORS.`
                ));
            }
        };

        xhr.onerror   = () => reject(new Error('Lỗi mạng khi upload. Kiểm tra kết nối.'));
        xhr.ontimeout = () => reject(new Error(`Upload timeout sau ${timeoutMs / 60000} phút.`));

        // ── Đây là fix chính ──────────────────────────────────────────────
        // Truyền object { uri, type, name } thay vì blob.
        // React Native XHR runtime xử lý natively, đọc file từ filesystem
        // mà không load vào JS memory.
        xhr.send({ uri, type: mimeType, name: fileName } as unknown as Document);
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
                                           }: {
        title: string;
        genreIds: string[];
        file: DocumentPicker.DocumentPickerAsset;
    }) => {
        if (job?.stage === 'requesting' || job?.stage === 'uploading' || job?.stage === 'confirming') {
            return;
        }

        const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'mp3';
        const mimeType = file.mimeType ?? 'audio/mpeg';

        setJob({ title, fileName: file.name, stage: 'requesting', progress: 0 });

        try {
            // Bước 1: lấy presigned URL
            console.log('[Upload] requesting upload URL...');
            const created = await requestUploadSong({
                title: title.trim(),
                fileExtension: ext,
                genreIds,
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

            console.log('[Upload] file uploaded, confirming...');
            updateJob({ stage: 'confirming', progress: 100 });

            // Bước 3: confirm để trigger transcode
            await confirmUploadSong(created.id);

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