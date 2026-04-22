import { apiClient } from './api';

/**
 * Transcribe audio file sang text qua backend proxy.
 * API keys GROQ/AssemblyAI chỉ tồn tại server-side trong integration-service.
 */
export const transcribeAudio = async (uri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
    } as any);

    const response = await apiClient.post<{ text: string }>('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 70_000,
    });

    return response.data.text?.trim() ?? '';
};
