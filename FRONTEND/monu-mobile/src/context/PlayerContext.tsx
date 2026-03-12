import React, {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

import { recordPlay, recordListen, Song } from '../services/music';

const MINIO_PUBLIC = 'https://minio.oopsgolden.id.vn/public-songs';

function buildHlsUrl(song: Song): string {
    if (song.streamUrl) return song.streamUrl;
    return `${MINIO_PUBLIC}/hls/${song.id}/stream_128k.m3u8`;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface PlayerContextValue {
    currentSong: Song | null;
    queue: Song[];
    isFullScreen: boolean;
    setFullScreen: (v: boolean) => void;
    isPlaying: boolean;
    isLoaded: boolean;
    currentTime: number;
    duration: number;
    playSong: (song: Song, queue?: Song[]) => void;
    togglePlay: () => void;
    seekTo: (seconds: number) => void;
    playNext: () => void;
    playPrev: () => void;
    /** Dừng hẳn player, xoá bài hiện tại */
    stopPlayer: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export const PlayerProvider = ({ children }: PropsWithChildren) => {
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [queue, setQueue]             = useState<Song[]>([]);
    const [queueIndex, setQueueIndex]   = useState(0);
    const [isFullScreen, setFullScreen] = useState(false);

    const shouldAutoPlayRef = useRef(false);
    const player            = useAudioPlayer(null);
    const status            = useAudioPlayerStatus(player);

    // ── Listen-time tracking (requirement 3) ─────────────────────────────────
    // Wall-clock không đủ: user có thể pause → resume → pause liên tục
    // → phải tích lũy thời gian THỰC SỰ nghe
    const listenTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playSegmentStartRef = useRef<number | null>(null);   // Date.now() khi bắt đầu đoạn play hiện tại
    const accumulatedMsRef    = useRef(0);                     // ms đã nghe thực sự
    const listenFiredRef      = useRef(false);                 // đã fire recordListen chưa
    const currentSongRef      = useRef<Song | null>(null);     // ref để dùng trong closure

    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    // ── Audio session setup ───────────────────────────────────────────────────
    useEffect(() => {
        setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        }).catch(e => console.warn('[PlayerContext] setAudioModeAsync failed:', e));
    }, []);

    // ── Autoplay khi source load xong ────────────────────────────────────────
    useEffect(() => {
        if (status.isLoaded && shouldAutoPlayRef.current) {
            shouldAutoPlayRef.current = false;
            console.log('[PlayerContext] isLoaded=true → play()');
            player.play();
        }
    }, [status.isLoaded]);

    // ── Theo dõi play/pause để track thời gian nghe thực sự ──────────────────
    useEffect(() => {
        if (status.playing) {
            // Bắt đầu đoạn nghe mới
            if (playSegmentStartRef.current === null) {
                playSegmentStartRef.current = Date.now();
            }

            // Nếu chưa fire và chưa có timer đang chạy → đặt timer cho phần còn lại
            if (!listenFiredRef.current && listenTimerRef.current === null) {
                const remaining = Math.max(0, 30_000 - accumulatedMsRef.current);
                console.log(`[PlayerContext] listen timer: ${remaining}ms remaining`);
                listenTimerRef.current = setTimeout(() => {
                    listenTimerRef.current = null;
                    if (listenFiredRef.current) return;
                    const song = currentSongRef.current;
                    if (!song) return;
                    listenFiredRef.current = true;
                    console.log('[PlayerContext] 30s reached → recordListen:', song.title);
                    recordListen(song.id, { durationSeconds: 30 }).catch(() => {});
                }, remaining);
            }
        } else {
            // Đang pause/stop → tích lũy thời gian đoạn vừa xong
            if (playSegmentStartRef.current !== null) {
                accumulatedMsRef.current += Date.now() - playSegmentStartRef.current;
                playSegmentStartRef.current = null;
                console.log(`[PlayerContext] paused — accumulated: ${accumulatedMsRef.current}ms`);
            }
            // Huỷ timer vì player đang pause (timer sẽ được tính lại khi resume)
            if (listenTimerRef.current !== null) {
                clearTimeout(listenTimerRef.current);
                listenTimerRef.current = null;
            }
        }
    }, [status.playing]);

    // ── Reset listen tracking khi đổi bài ────────────────────────────────────
    const resetListenTracking = useCallback(() => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
        listenTimerRef.current      = null;
        playSegmentStartRef.current = null;
        accumulatedMsRef.current    = 0;
        listenFiredRef.current      = false;
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const playSong = useCallback(
        (song: Song, newQueue?: Song[]) => {
            const url = buildHlsUrl(song);
            console.log('[PlayerContext] playSong —', { title: song.title, url });

            resetListenTracking();
            shouldAutoPlayRef.current = true;
            player.replace({ uri: url });
            setCurrentSong(song);

            if (newQueue) {
                setQueue(newQueue);
                setQueueIndex(newQueue.findIndex(s => s.id === song.id));
            }

            // play count: tính ngay khi bắt đầu stream
            recordPlay(song.id).catch(() => {});
        },
        [player, resetListenTracking],
    );

    const togglePlay = useCallback(() => {
        if (!currentSong) return;
        if (status.playing) {
            player.pause();
        } else {
            player.play();
        }
    }, [player, status.playing, currentSong]);

    const seekTo = useCallback((seconds: number) => {
        player.seekTo(seconds);
    }, [player]);

    /**
     * Dừng hẳn player và ẩn MiniPlayer.
     * Được gọi khi user vuốt xuống MiniPlayer.
     */
    const stopPlayer = useCallback(() => {
        console.log('[PlayerContext] stopPlayer called');
        resetListenTracking();
        player.pause();
        setCurrentSong(null);
        setQueue([]);
        setQueueIndex(0);
        setFullScreen(false);
    }, [player, resetListenTracking]);

    const playNext = useCallback(() => {
        if (!queue.length) return;
        const next = (queueIndex + 1) % queue.length;
        setQueueIndex(next);
        playSong(queue[next], queue);
    }, [queue, queueIndex, playSong]);

    const playPrev = useCallback(() => {
        if (!queue.length) return;
        if (status.currentTime > 3) { seekTo(0); return; }
        const prev = (queueIndex - 1 + queue.length) % queue.length;
        setQueueIndex(prev);
        playSong(queue[prev], queue);
    }, [queue, queueIndex, status.currentTime, seekTo, playSong]);

    // ─────────────────────────────────────────────────────────────────────────
    const value: PlayerContextValue = {
        currentSong,
        queue,
        isFullScreen,
        setFullScreen,
        isPlaying:   status.playing     ?? false,
        isLoaded:    status.isLoaded    ?? false,
        currentTime: status.currentTime ?? 0,
        duration:    status.duration    ?? 0,
        playSong,
        togglePlay,
        seekTo,
        playNext,
        playPrev,
        stopPlayer,
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = (): PlayerContextValue => {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
    return ctx;
};