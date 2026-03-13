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
import { getMySubscription } from '../services/payment';

// ─── Quality ──────────────────────────────────────────────────────────────────
export type AudioQuality = 64 | 128 | 256 | 320;

const QUALITY_STREAM: Record<AudioQuality, string> = {
    64:  'stream_64k.m3u8',
    128: 'stream_128k.m3u8',
    256: 'stream_256k.m3u8',
    320: 'stream_320k.m3u8',
};

const MINIO_PUBLIC = 'https://minio.oopsgolden.id.vn/public-songs';

function buildHlsUrl(song: Song, quality: AudioQuality): string {
    if (song.streamUrl) return song.streamUrl;
    return `${MINIO_PUBLIC}/hls/${song.id}/${QUALITY_STREAM[quality]}`;
}

function parseMaxQuality(features: Record<string, any>): AudioQuality {
    const bitrate = Number(features.maxBitrate ?? features.max_bitrate ?? 0);
    if (bitrate >= 320) return 320;
    if (bitrate >= 256) return 256;
    if (bitrate >= 128) return 128;
    if (bitrate > 0)    return 64;

    const q = String(features.quality ?? '').toLowerCase();
    if (q.includes('320') || q.includes('lossless')) return 320;
    if (q.includes('256')) return 256;
    if (q.includes('128')) return 128;
    return 128;
}

// ─── Context types ────────────────────────────────────────────────────────────
interface PlayerContextValue {
    currentSong:     Song | null;
    queue:           Song[];
    isFullScreen:    boolean;
    setFullScreen:   (v: boolean) => void;
    isPlaying:       boolean;
    isLoaded:        boolean;
    currentTime:     number;
    duration:        number;
    playSong:        (song: Song, queue?: Song[]) => void;
    togglePlay:      () => void;
    seekTo:          (seconds: number) => void;
    playNext:        () => void;
    playPrev:        () => void;
    stopPlayer:      () => void;
    selectedQuality: AudioQuality;
    maxQuality:      AudioQuality;
    setQuality:      (q: AudioQuality) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export const PlayerProvider = ({ children }: PropsWithChildren) => {
    const [currentSong,  setCurrentSong]  = useState<Song | null>(null);
    const [queue,        setQueue]        = useState<Song[]>([]);
    const [queueIndex,   setQueueIndex]   = useState(0);
    const [isFullScreen, setFullScreen]   = useState(false);

    // Quality
    const [maxQuality,      setMaxQuality]      = useState<AudioQuality>(128);
    const [selectedQuality, setSelectedQuality] = useState<AudioQuality>(128);
    const selectedQualityRef = useRef<AudioQuality>(128);
    useEffect(() => { selectedQualityRef.current = selectedQuality; }, [selectedQuality]);

    const shouldAutoPlayRef = useRef(false);
    const player            = useAudioPlayer(null);
    const status            = useAudioPlayerStatus(player);

    // ── Listen tracking refs ───────────────────────────────────────────────────
    // Tracking thời gian nghe thực sự (không tính khi pause)
    const listenTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playSegmentStartRef = useRef<number | null>(null);
    const accumulatedMsRef    = useRef(0);
    const listenFiredRef      = useRef(false);    // đã fire 30s event chưa
    const completionFiredRef  = useRef(false);    // đã fire completion event chưa
    const currentSongRef      = useRef<Song | null>(null);
    const prevPlayingRef      = useRef(false);    // giá trị playing của frame trước

    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    // ── Fetch subscription → maxQuality ───────────────────────────────────────
    useEffect(() => {
        getMySubscription()
            .then(sub => {
                if (sub?.plan?.features) {
                    const max = parseMaxQuality(sub.plan.features);
                    setMaxQuality(max);
                    setSelectedQuality(prev => (prev > max ? max : prev) as AudioQuality);
                    selectedQualityRef.current = Math.min(
                        selectedQualityRef.current, max,
                    ) as AudioQuality;
                }
            })
            .catch(() => { /* free user — default 128k */ });
    }, []);

    // ── Audio session ─────────────────────────────────────────────────────────
    useEffect(() => {
        setAudioModeAsync({
            playsInSilentMode: true,
        }).catch(e =>
            console.warn('[PlayerContext] setAudioModeAsync failed:', e)
        );
    }, []);
    // ── Autoplay khi source load xong ─────────────────────────────────────────
    useEffect(() => {
        if (status.isLoaded && shouldAutoPlayRef.current) {
            shouldAutoPlayRef.current = false;
            player.play();
        }
    }, [status.isLoaded]);

    // ── Theo dõi play/pause — tích lũy thời gian + timer 30s ─────────────────
    useEffect(() => {
        if (status.playing) {
            if (playSegmentStartRef.current === null) {
                playSegmentStartRef.current = Date.now();
            }
            if (!listenFiredRef.current && listenTimerRef.current === null) {
                const remaining = Math.max(0, 30_000 - accumulatedMsRef.current);
                listenTimerRef.current = setTimeout(() => {
                    listenTimerRef.current = null;
                    if (listenFiredRef.current) return;
                    const song = currentSongRef.current;
                    if (!song) return;
                    listenFiredRef.current = true;

                    // Tính xem user đã nghe xong bài chưa tại thời điểm này
                    const dur = status.duration ?? 0;
                    const pos = status.currentTime ?? 0;
                    const completed = dur > 0 && pos >= dur * 0.9;

                    console.log('[PlayerContext] 30s listen →', song.title, { completed });
                    recordListen(song.id, {
                        durationSeconds: 30,
                        completed,
                        artistId:  song.primaryArtist?.artistId,
                        genreIds:  song.genres?.map(g => g.id).join(',') ?? '',
                    }).catch(() => {});

                    if (completed) completionFiredRef.current = true;
                }, remaining);
            }
        } else {
            // Pause / stop — tích lũy đoạn hiện tại
            if (playSegmentStartRef.current !== null) {
                accumulatedMsRef.current += Date.now() - playSegmentStartRef.current;
                playSegmentStartRef.current = null;
            }
            if (listenTimerRef.current !== null) {
                clearTimeout(listenTimerRef.current);
                listenTimerRef.current = null;
            }
        }
    }, [status.playing]);

    // ── Phát hiện bài kết thúc tự nhiên (playing: true → false, pos ≥ 90%) ───
    useEffect(() => {
        const wasPlaying = prevPlayingRef.current;
        prevPlayingRef.current = status.playing;

        if (!wasPlaying || status.playing) return; // chỉ xử lý khi vừa dừng
        if (completionFiredRef.current) return;

        const dur = status.duration ?? 0;
        const pos = status.currentTime ?? 0;
        if (dur <= 0) return;

        const isCompleted = pos >= dur * 0.9;
        if (!isCompleted) return;

        const song = currentSongRef.current;
        if (!song) return;

        // Tích lũy đoạn cuối nếu còn
        let totalMs = accumulatedMsRef.current;
        if (playSegmentStartRef.current !== null) {
            totalMs += Date.now() - playSegmentStartRef.current;
        }

        completionFiredRef.current = true;
        console.log('[PlayerContext] completion →', song.title, { totalMs });

        // Nếu bài ngắn hơn 30s và chưa fire listen → fire luôn với completed: true
        if (!listenFiredRef.current) {
            listenFiredRef.current = true;
            if (listenTimerRef.current) {
                clearTimeout(listenTimerRef.current);
                listenTimerRef.current = null;
            }
            recordListen(song.id, {
                durationSeconds: Math.round(totalMs / 1000),
                completed: true,
                artistId:  song.primaryArtist?.artistId,
                genreIds:  song.genres?.map(g => g.id).join(',') ?? '',
            }).catch(() => {});
        } else {
            // 30s đã fire rồi — gửi event riêng cho completion
            recordListen(song.id, {
                durationSeconds: Math.round(totalMs / 1000),
                completed: true,
                artistId:  song.primaryArtist?.artistId,
                genreIds:  song.genres?.map(g => g.id).join(',') ?? '',
            }).catch(() => {});
        }
    }, [status.playing]);

    // ── Reset tracking khi đổi bài ─────────────────────────────────────────────
    const resetListenTracking = useCallback(() => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
        listenTimerRef.current      = null;
        playSegmentStartRef.current = null;
        accumulatedMsRef.current    = 0;
        listenFiredRef.current      = false;
        completionFiredRef.current  = false;
        prevPlayingRef.current      = false;
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const playSong = useCallback(
        (song: Song, newQueue?: Song[]) => {
            const quality = selectedQualityRef.current;
            const url     = buildHlsUrl(song, quality);
            console.log('[PlayerContext] playSong —', { title: song.title, url, quality });

            resetListenTracking();
            shouldAutoPlayRef.current = true;
            player.replace({ uri: url });
            setCurrentSong(song);

            if (newQueue) {
                setQueue(newQueue);
                setQueueIndex(newQueue.findIndex(s => s.id === song.id));
            }

            recordPlay(song.id).catch(() => {});
        },
        [player, resetListenTracking],
    );

    const togglePlay = useCallback(() => {
        if (!currentSong) return;
        if (status.playing) { player.pause(); } else { player.play(); }
    }, [player, status.playing, currentSong]);

    const seekTo = useCallback((seconds: number) => {
        player.seekTo(seconds);
    }, [player]);

    const stopPlayer = useCallback(() => {
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

    const setQuality = useCallback((q: AudioQuality) => {
        if (q > maxQuality) return;
        setSelectedQuality(q);
        selectedQualityRef.current = q;
        if (currentSong) {
            const wasPlaying = status.playing;
            shouldAutoPlayRef.current = wasPlaying;
            player.replace({ uri: buildHlsUrl(currentSong, q) });
            console.log('[PlayerContext] Quality →', q, 'kbps');
        }
    }, [maxQuality, currentSong, player, status.playing]);

    // ─────────────────────────────────────────────────────────────────────────
    const value: PlayerContextValue = {
        currentSong,
        queue,
        isFullScreen,
        setFullScreen,
        isPlaying:       status.playing     ?? false,
        isLoaded:        status.isLoaded    ?? false,
        currentTime:     status.currentTime ?? 0,
        duration:        status.duration    ?? 0,
        playSong,
        togglePlay,
        seekTo,
        playNext,
        playPrev,
        stopPlayer,
        selectedQuality,
        maxQuality,
        setQuality,
    };

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = (): PlayerContextValue => {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
    return ctx;
};