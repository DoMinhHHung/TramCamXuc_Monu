import { useEffect, useState } from 'react';
import { apiClient } from './api';

/**
 * Waveform data from backend
 */
export interface WaveformData {
    amplitudes: number[];        
    sample_count: number;
    duration_seconds?: number;
    peak_amplitude: number;
    rms_amplitude: number;
    available_formats: string[];  
    format_urls: {
        png_url?: string;
        svg_url?: string;
        json_url?: string;
    };
}

export function useWaveformData(songId: string | undefined, enableFetch = true) {
    const [data, setData] = useState<WaveformData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!songId || !enableFetch) {
            setData(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        apiClient
            .get<WaveformData>(`/songs/${songId}/waveform/data`)
            .then(res => {
                setData(res.data);
                setError(null);
            })
            .catch(err => {
                console.warn(`[Waveform] Failed to fetch for song ${songId}:`, err.message);
                setData(null);
                setError(null);
            })
            .finally(() => setLoading(false));
    }, [songId, enableFetch]);

    return { data, loading, error };
}
