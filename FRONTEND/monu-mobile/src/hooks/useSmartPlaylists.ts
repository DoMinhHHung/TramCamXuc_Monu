import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getListenHistory } from '../utils/listenHistory';
import type { Song } from '../services/music';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartPlaylist {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  songs: Song[];
  timeSlot: TimeSlot;
  generatedAt: number;
}

type TimeSlot = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'smart_playlists_v1_';

const TIME_SLOTS: Array<{
  slot: TimeSlot;
  fromH: number;
  toH: number;
  emoji: string;
  defaultName: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}> = [
  {
    slot: 'morning',
    fromH: 5, toH: 10,
    emoji: '🌅',
    defaultName: 'Buổi sáng tươi mới',
    description: 'Những bài bạn hay nghe lúc mới thức dậy',
    gradientFrom: '#3a2200',
    gradientTo: '#7a4800',
  },
  {
    slot: 'noon',
    fromH: 10, toH: 14,
    emoji: '☀️',
    defaultName: 'Năng lượng giữa ngày',
    description: 'Nhạc bạn nghe trong giờ nghỉ trưa',
    gradientFrom: '#1a3a00',
    gradientTo: '#2d6000',
  },
  {
    slot: 'afternoon',
    fromH: 14, toH: 18,
    emoji: '🌇',
    defaultName: 'Chiều buông',
    description: 'Giai điệu quen thuộc buổi chiều của bạn',
    gradientFrom: '#1a1a3a',
    gradientTo: '#3a1a4a',
  },
  {
    slot: 'evening',
    fromH: 18, toH: 22,
    emoji: '🌆',
    defaultName: 'Buổi tối',
    description: 'Nhạc bạn thường nghe khi về đêm',
    gradientFrom: '#1a0a2a',
    gradientTo: '#2d1040',
  },
  {
    slot: 'night',
    fromH: 22, toH: 29,
    emoji: '🌙',
    defaultName: 'Nghỉ ngơi',
    description: 'Có thể bạn sẽ thích những bài hát này khi nghỉ ngơi',
    gradientFrom: '#050510',
    gradientTo: '#101028',
  },
];

// Genre-based context names for evening slot
const GENRE_CONTEXT_NAMES: Array<{ keywords: string[]; name: string; emoji: string }> = [
  { keywords: ['edm', 'electronic', 'dance', 'hiphop', 'hip-hop', 'rap', 'rock'], name: 'Tập gym', emoji: '💪' },
  { keywords: ['jazz', 'lounge', 'acoustic', 'chill', 'lo-fi', 'lofi', 'ambient'], name: 'Quán bar thư giãn', emoji: '🍹' },
  { keywords: ['pop', 'rnb', 'r&b', 'soul', 'kpop', 'vpop'], name: 'Lái xe buổi tối', emoji: '🚗' },
  { keywords: ['ballad', 'slow', 'sad', 'buồn'], name: 'Tâm trạng đêm nay', emoji: '🌃' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const getHourSlot = (ts: number): TimeSlot => {
  const h = new Date(ts).getHours();
  for (const slot of TIME_SLOTS) {
    if (slot.toH <= 24) {
      if (h >= slot.fromH && h < slot.toH) return slot.slot;
    } else {
      // Night wraps past midnight
      if (h >= slot.fromH || h < (slot.toH - 24)) return slot.slot;
    }
  }
  return 'night';
};

const inferContextName = (songs: Song[], slot: TimeSlot): { name: string; emoji: string } => {
  if (slot !== 'evening') {
    const meta = TIME_SLOTS.find((s) => s.slot === slot)!;
    return { name: meta.defaultName, emoji: meta.emoji };
  }

  // For evening, detect dominant genre
  const genreFreq: Record<string, number> = {};
  for (const song of songs) {
    for (const g of (song.genres ?? [])) {
      const key = g.name.toLowerCase();
      genreFreq[key] = (genreFreq[key] ?? 0) + 1;
    }
  }

  const topGenre = Object.entries(genreFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  for (const ctx of GENRE_CONTEXT_NAMES) {
    if (ctx.keywords.some((kw) => topGenre.includes(kw))) {
      return { name: ctx.name, emoji: ctx.emoji };
    }
  }

  return { name: 'Buổi tối của bạn', emoji: '🌆' };
};

const deduplicateAndShuffle = (songs: Song[], seed: number): Song[] => {
  const seen = new Set<string>();
  const unique = songs.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  // Seeded shuffle for reproducible but varied order per generation
  let s = seed;
  const shuffled = [...unique];
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ─── Main Hook ────────────────────────────────────────────────────────────────

export const useSmartPlaylists = (userId: string | null | undefined) => {
  const [playlists, setPlaylists] = useState<SmartPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  const generate = useCallback(async (dismissedSlots: TimeSlot[] = [], seed?: number) => {
    setLoading(true);
    try {
      const history = await getListenHistory();
      if (history.length === 0) {
        setPlaylists([]);
        return;
      }

      const generationSeed = seed ?? Date.now();
      const grouped: Partial<Record<TimeSlot, Song[]>> = {};

      for (const item of history) {
        const slot = getHourSlot(item.listenedAt);
        if (!grouped[slot]) grouped[slot] = [];
        grouped[slot]!.push(item.song);
      }

      const generated: SmartPlaylist[] = [];

      for (const slotMeta of TIME_SLOTS) {
        const { slot } = slotMeta;
        if (dismissedSlots.includes(slot)) continue;

        const raw = grouped[slot] ?? [];
        if (raw.length < 3) continue; // Need at least 3 songs to make a playlist

        const songs = deduplicateAndShuffle(raw, generationSeed).slice(0, 20);
        const { name, emoji } = inferContextName(songs, slot);

        generated.push({
          id: `smart_${slot}_${generationSeed}`,
          name,
          emoji,
          description: slotMeta.description,
          gradientFrom: slotMeta.gradientFrom,
          gradientTo: slotMeta.gradientTo,
          songs,
          timeSlot: slot,
          generatedAt: generationSeed,
        });
      }

      setPlaylists(generated);

      if (storageKey) {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({ playlists: generated, dismissedSlots }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  const refresh = useCallback(async (dismissedSlots?: TimeSlot[]) => {
    await generate(dismissedSlots, Date.now());
  }, [generate]);

  const dismiss = useCallback(async (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    if (!storageKey) return;

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as { playlists: SmartPlaylist[]; dismissedSlots: TimeSlot[] };
      const dismissed = playlists.find((p) => p.id === playlistId);
      const dismissedSlots: TimeSlot[] = [
        ...(cached.dismissedSlots ?? []),
        ...(dismissed ? [dismissed.timeSlot] : []),
      ];
      await generate(dismissedSlots, Date.now());
    } catch {
      await generate([], Date.now());
    }
  }, [playlists, storageKey, generate]);

  const clearAll = useCallback(async () => {
    setPlaylists([]);
    if (storageKey) await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  // Load on mount — try cache first, then generate if stale
  useEffect(() => {
    if (!userId) {
      setPlaylists([]);
      setLoading(false);
      return;
    }

    const loadOrGenerate = async () => {
      if (!storageKey) return;
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const cached = JSON.parse(raw) as { playlists: SmartPlaylist[]; dismissedSlots: TimeSlot[] };
          const age = Date.now() - (cached.playlists[0]?.generatedAt ?? 0);
          // Regenerate if older than 6 hours
          if (age < 6 * 60 * 60 * 1000 && cached.playlists.length > 0) {
            setPlaylists(cached.playlists);
            setLoading(false);
            return;
          }
          await generate(cached.dismissedSlots ?? []);
        } else {
          await generate([]);
        }
      } catch {
        await generate([]);
      }
    };

    void loadOrGenerate();
  }, [userId, storageKey, generate]);

  return { playlists, loading, refresh, dismiss, clearAll };
};
