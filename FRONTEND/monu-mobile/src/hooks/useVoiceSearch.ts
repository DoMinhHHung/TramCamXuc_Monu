import { useCallback, useRef, useState } from 'react';
import { AudioModule, useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { transcribeAudio } from '../services/whisper';

export type VoiceSearchState = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceSearchReturn {
    state:             VoiceSearchState;
    errorMessage:      string | null;
    startRecording:    () => Promise<void>;
    stopAndTranscribe: () => Promise<string | null>;
    cancel:            () => void;
}

export const useVoiceSearch = (): UseVoiceSearchReturn => {
    const [state,        setState]        = useState<VoiceSearchState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    const startRecording = useCallback(async () => {
        setErrorMessage(null);
        setState('idle');

        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
            setErrorMessage('Cần cấp quyền microphone để tìm kiếm bằng giọng nói');
            setState('error');
            return;
        }

        try {
            await setAudioModeAsync({
                allowsRecording:  true,
                playsInSilentMode: true,
            });

            await recorder.prepareToRecordAsync();
            recorder.record();
            setState('recording');
        } catch (e: any) {
            setErrorMessage(e?.message ?? 'Không thể bắt đầu ghi âm');
            setState('error');

            try {
                await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            } catch { /* ignore */ }
        }
    }, [recorder]);

    const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
        if (state !== 'recording') return null;

        try {
            setState('processing');
            await recorder.stop();
            const uri = recorder.uri;

            try {
                await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            } catch { /* ignore */ }

            if (!uri) throw new Error('Không có file âm thanh');

            const text = await transcribeAudio(uri);
            setState('idle');
            return text || null;

        } catch (e: any) {
            setErrorMessage(e?.message ?? 'Không nhận dạng được giọng nói');
            setState('error');

            try {
                await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            } catch { /* ignore */ }

            return null;
        }
    }, [state, recorder]);

    const cancel = useCallback(() => {
        if (state === 'recording') {
            recorder.stop().catch(() => {});
            setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        }
        setState('idle');
        setErrorMessage(null);
    }, [state, recorder]);

    return { state, errorMessage, startRecording, stopAndTranscribe, cancel };
};