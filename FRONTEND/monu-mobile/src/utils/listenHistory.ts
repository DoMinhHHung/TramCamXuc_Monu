import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../services/music';

const KEY = 'listen.history.songs';
const MAX_ITEMS = 100;

type ListenHistoryItem = {
  song: Song;
  listenedAt: number;
};

export const getListenHistory = async (): Promise<ListenHistoryItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ListenHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addListenHistory = async (song: Song): Promise<void> => {
  try {
    const prev = await getListenHistory();
    const next: ListenHistoryItem[] = [
      { song, listenedAt: Date.now() },
      ...prev.filter((item) => item.song.id !== song.id),
    ].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // silent
  }
};

export const clearListenHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // silent
  }
};

export type { ListenHistoryItem };