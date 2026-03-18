import { useEffect, useRef, useState } from 'react';
import { getSimilarSongs, RecommendedSong } from '../services/recommendation';

export function useSimilarSongs(songId: string | undefined, limit = 10) {
  const [songs, setSongs] = useState<RecommendedSong[]>([]);
  const [loading, setLoading] = useState(false);
  const lastId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!songId || songId === lastId.current) return;
    lastId.current = songId;

    let cancelled = false;
    setLoading(true);

    getSimilarSongs(songId, limit)
      .then((res) => {
        if (!cancelled) setSongs(res);
      })
      .catch(() => {
        if (!cancelled) setSongs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [songId, limit]);

  return { songs, loading };
}
