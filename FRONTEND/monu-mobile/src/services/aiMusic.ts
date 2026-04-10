import { apiClient } from './api';
import type { Song } from './music';

export interface AiMusicJob {
  jobId: string;
  status: string;
  title: string;
  previewUrl?: string | null;
  errorMessage?: string | null;
}

const unwrap = <T>(r: { data: { result: T } }): T => r.data.result;

export interface CreateAiMusicJobPayload {
  title: string;
  genreIds: string[];
  lyrics: string;
  stylePrompt?: string;
  durationSeconds: number;
}

export const createAiMusicJob = async (
  payload: CreateAiMusicJobPayload
): Promise<AiMusicJob> =>
  unwrap(await apiClient.post<{ result: AiMusicJob }>('/ai-music/jobs', payload));

export const getAiMusicJob = async (jobId: string): Promise<AiMusicJob> =>
  unwrap(await apiClient.get<{ result: AiMusicJob }>(`/ai-music/jobs/${jobId}`));

export const acceptAiMusicJob = async (jobId: string): Promise<Song> =>
  unwrap(await apiClient.post<{ result: Song }>(`/ai-music/jobs/${jobId}/accept`));

export const rejectAiMusicJob = async (jobId: string): Promise<void> => {
  await apiClient.post(`/ai-music/jobs/${jobId}/reject`);
};

export const improveLyricsWithGoogle = async (
  lyrics: string,
  hint?: string
): Promise<string> => {
  const res = unwrap(
    await apiClient.post<{ result: { improvedLyrics: string } }>('/ai-music/improve-lyrics', {
      lyrics,
      hint: hint?.trim() || undefined,
    })
  );
  return res.improvedLyrics;
};
