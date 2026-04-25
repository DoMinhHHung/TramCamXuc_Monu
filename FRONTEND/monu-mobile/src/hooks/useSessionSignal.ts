import { useCallback, useRef } from 'react';
import { postSessionSignal, SessionSignal, SessionSignalType } from '../services/recommendation';

export const useSessionSignal = () => {
  const lastCompletedSongId = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const send = useCallback((signal: SessionSignal) => {
    postSessionSignal(signal);
  }, []);

  /** Gọi khi player bắt đầu phát bài */
  const onSongStart = useCallback(
    (songId: string, genreIds: string[], artistId?: string) => {
      startTimeRef.current = Date.now();
      send({ songId, type: 'PLAYED', genreIds, artistId });
    },
    [send],
  );

  /**
   * Gọi khi user skip bài.
   * @param playedSeconds số giây đã nghe khi skip
   */
  const onSongSkip = useCallback(
    (songId: string, playedSeconds: number, genreIds: string[], artistId?: string) => {
      const type: SessionSignalType = playedSeconds < 10 ? 'SKIP_EARLY' : 'SKIPPED';
      send({ songId, type, genreIds, artistId, playedSeconds });
    },
    [send],
  );

  /** Gọi khi bài nghe đến cuối */
  const onSongComplete = useCallback(
    (songId: string, genreIds: string[], artistId?: string) => {
      lastCompletedSongId.current = songId;
      const playedSeconds = startTimeRef.current
        ? Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000))
        : undefined;
      send({ songId, type: 'COMPLETED', genreIds, artistId, playedSeconds });
    },
    [send],
  );

  /**
   * Gọi khi user chủ động replay bài.
   * Nếu là bài vừa complete → REPEATED (super like).
   */
  const onSongRepeat = useCallback(
    (songId: string, genreIds: string[], artistId?: string) => {
      const type: SessionSignalType =
        lastCompletedSongId.current === songId ? 'REPEATED' : 'PLAYED';
      startTimeRef.current = Date.now();
      send({ songId, type, genreIds, artistId });
    },
    [send],
  );

  return { onSongStart, onSongSkip, onSongComplete, onSongRepeat };
};
