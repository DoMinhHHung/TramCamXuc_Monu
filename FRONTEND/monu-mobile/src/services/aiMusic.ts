import { apiClient } from './api';
import type { Song } from './music';

export interface AiMusicJob {
  jobId: string;
  status: string;
  title: string;
  previewUrl?: string | null;
  errorMessage?: string | null;
  draftSongId?: string | null;
}

/** apiClient đã unwrap `ApiResponse.result` trong response interceptor — dùng `res.data` trực tiếp. */

export interface CreateAiMusicJobPayload {
  title: string;
  genreIds: string[];
  lyrics: string;
  stylePrompt?: string;
  durationSeconds: number;
}

export const createAiMusicJob = async (
  payload: CreateAiMusicJobPayload
): Promise<AiMusicJob> => {
  const res = await apiClient.post<AiMusicJob>('/ai-music/jobs', payload);
  return res.data;
};

export const getAiMusicJob = async (jobId: string): Promise<AiMusicJob> => {
  const res = await apiClient.get<AiMusicJob>(`/ai-music/jobs/${jobId}`);
  return res.data;
};

export const acceptAiMusicJob = async (jobId: string): Promise<Song> => {
  const res = await apiClient.post<Song>(`/ai-music/jobs/${jobId}/accept`);
  return res.data;
};

export const keepPrivateAiMusicJob = async (jobId: string): Promise<Song> => {
  const res = await apiClient.post<Song>(`/ai-music/jobs/${jobId}/keep-private`);
  return res.data;
};

export const rejectAiMusicJob = async (jobId: string): Promise<void> => {
  await apiClient.post(`/ai-music/jobs/${jobId}/reject`);
};

export const improveLyricsWithGoogle = async (
  lyrics: string,
  hint?: string
): Promise<string> => {
  const res = await apiClient.post<{ improvedLyrics: string }>('/ai-music/improve-lyrics', {
    lyrics,
    hint: hint?.trim() || undefined,
  });
  return res.data.improvedLyrics;
};
