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


export interface CreateAiMusicJobPayload {
  title: string;
  genreIds: string[];
  lyrics: string;
  stylePrompt?: string;
  durationSeconds: number;
}

export interface AiMusicQuota {
  remaining: number | null;
  limit: number | null;
  resetAt?: string | null;
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

export const getAiMusicQuota = async (): Promise<AiMusicQuota> => {
  const res = await apiClient.get<Partial<AiMusicQuota>>('/ai-music/quota');
  return {
    remaining: typeof res.data?.remaining === 'number' ? res.data.remaining : null,
    limit: typeof res.data?.limit === 'number' ? res.data.limit : null,
    resetAt: res.data?.resetAt ?? null,
  };
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
