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
import { getNextAd, AdDelivery } from '../services/ads';
import { isSongDownloaded } from '../services/download';
import { EXTERNAL_LINKS } from '../components/LinkComponent';

// ─── Quality ──────────────────────────────────────────────────────────────────

export type AudioQuality = 64 | 128 | 256 | 320;

const QUALITY_STREAM: Record<AudioQuality, string> = {
    64:  'stream_64k.m3u8',
    128: 'stream_128k.m3u8',
    256: 'stream_256k.m3u8',
    320: 'stream_320k.m3u8',
};

const MINIO_PUBLIC = EXTERNAL_LINKS.minioPublicSongs;

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
    // ── Ads ──────────────────────────────────────────────────────────────────
    /** Quảng cáo đang chờ phát — null nếu không có */
    pendingAd:  AdDelivery | null;
    /** true khi đang block player để phát quảng cáo */
    isPlayingAd: boolean;
    /** Gọi từ AdPlayerModal khi quảng cáo kết thúc → resume nhạc */
    dismissAd:   () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const PlayerProvider = ({ children }: PropsWithChildren) => {
    const [currentSong,  setCurrentSong]  = useState<Song | null>(null);
    const [queue,        setQueue]        = useState<Song[]>([]);
    const [queueIndex,   setQueueIndex]   = useState(0);
    const [isFullScreen, setFullScreen]   = useState(false);

    // ── Quality ────────────────────────────────────────────────────────────────
    const [maxQuality,       setMaxQuality]      = useState<AudioQuality>(128);
    const [selectedQuality,  setSelectedQuality] = useState<AudioQuality>(128);
    const selectedQualityRef = useRef<AudioQuality>(128);
    useEffect(() => { selectedQualityRef.current = selectedQuality; }, [selectedQuality]);

    // ── Ads ────────────────────────────────────────────────────────────────────
    const [pendingAd,   setPendingAd]   = useState<AdDelivery | null>(null);
    const [isPlayingAd, setIsPlayingAd] = useState(false);
    /** true = user có gói no_ads → không bao giờ hiện quảng cáo */
    const noAdsRef   = useRef(false);
    /** Tránh check ads khi đang check rồi */
    const checkingAdRef = useRef(false);

    // ── Player ─────────────────────────────────────────────────────────────────
    const shouldAutoPlayRef = useRef(false);
    const player            = useAudioPlayer(null);
    const status            = useAudioPlayerStatus(player);

    // ── Listen tracking refs ───────────────────────────────────────────────────
    const listenTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playSegmentStartRef  = useRef<number | null>(null);
    const accumulatedMsRef     = useRef(0);
    const listenFiredRef       = useRef(false);
    const completionFiredRef   = useRef(false);
    const currentSongRef       = useRef<Song | null>(null);
    const prevPlayingRef       = useRef(false);

    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    // ── Load subscription → maxQuality + noAds flag ────────────────────────────
    useEffect(() => {
        getMySubscription()
            .then((sub) => {
                if (sub?.plan?.features) {
                    const features = sub.plan.features;

                    // No-ads flag
                    noAdsRef.current = Boolean(features.no_ads);

                    // Max quality
                    const max = parseMaxQuality(features);
                    setMaxQuality(max);
                    setSelectedQuality((prev) => (prev > max ? max : prev) as AudioQuality);
                    selectedQualityRef.current = Math.min(
                        selectedQualityRef.current,
                        max,
                    ) as AudioQuality;
                }
            })
            .catch(() => { /* free user — defaults */ });
    }, []);

    // ── Audio session ──────────────────────────────────────────────────────────
    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }, []);

    // ── Autoplay khi source load xong ─────────────────────────────────────────
    useEffect(() => {
        if (status.isLoaded && shouldAutoPlayRef.current) {
            shouldAutoPlayRef.current = false;
            player.play();
        }
    }, [status.isLoaded]);

    // ── Check & show ads ───────────────────────────────────────────────────────
    const checkForAd = useCallback(async (): Promise<void> => {
        if (noAdsRef.current) return;          // premium user
        if (checkingAdRef.current) return;     // đang check rồi
        if (isPlayingAd) return;              // đang phát ad

        checkingAdRef.current = true;
        try {
            const ad = await getNextAd();
            if (!ad) return;

            // Có ad → pause nhạc, set pending ad
            player.pause();
            setPendingAd(ad);
            setIsPlayingAd(true);
        } catch {
            // Silent fail — không block nhạc
        } finally {
            checkingAdRef.current = false;
        }
    }, [player, isPlayingAd]);

    // ── Dismiss ad (gọi từ AdPlayerModal) ─────────────────────────────────────
    const dismissAd = useCallback((): void => {
        setPendingAd(null);
        setIsPlayingAd(false);
        // Resume nhạc nếu còn bài đang chờ
        if (currentSongRef.current) {
            player.play();
        }
    }, [player]);

    // ── Theo dõi play/pause — tích lũy thời gian + timer 30s ──────────────────
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

                    const dur = status.duration    ?? 0;
                    const pos = status.currentTime ?? 0;
                    const completed = dur > 0 && pos >= dur * 0.9;

                    recordListen(song.id, {
                        durationSeconds: 30,
                        completed,
                        artistId:  song.primaryArtist?.artistId,
                        genreIds:  song.genres?.map((g) => g.id).join(',') ?? '',
                    }).catch(() => {});

                    if (completed) completionFiredRef.current = true;
                }, remaining);
            }
        } else {
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

    // ── Phát hiện bài kết thúc tự nhiên ───────────────────────────────────────
    useEffect(() => {
        const wasPlaying = prevPlayingRef.current;
        prevPlayingRef.current = status.playing;

        if (!wasPlaying || status.playing) return;
        if (completionFiredRef.current)     return;

        const dur = status.duration    ?? 0;
        const pos = status.currentTime ?? 0;
        if (dur <= 0) return;

        const isCompleted = pos >= dur * 0.9;
        if (!isCompleted) return;

        const song = currentSongRef.current;
        if (!song) return;

        let totalMs = accumulatedMsRef.current;
        if (playSegmentStartRef.current !== null) {
            totalMs += Date.now() - playSegmentStartRef.current;
        }

        completionFiredRef.current = true;

        recordListen(song.id, {
            durationSeconds: Math.round(totalMs / 1000),
            completed: true,
            artistId:  song.primaryArtist?.artistId,
            genreIds:  song.genres?.map((g) => g.id).join(',') ?? '',
        }).catch(() => {});

        // Check ad sau khi bài kết thúc tự nhiên
        void checkForAd();
    }, [status.playing, checkForAd]);

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

    // ── Actions ────────────────────────────────────────────────────────────────

    const playSong = useCallback(
        async (song: Song, newQueue?: Song[]) => {
            // Không phát nhạc khi đang phát quảng cáo
            if (isPlayingAd) return;

            const quality = selectedQualityRef.current;

            // Ưu tiên file offline nếu có
            let uri: string;
            try {
                const localUri = await isSongDownloaded(song.id);
                uri = localUri ?? buildHlsUrl(song, quality);
                if (localUri) {
                    console.log('[Player] Offline playback:', song.title);
                }
            } catch {
                uri = buildHlsUrl(song, quality);
            }

            resetListenTracking();
            shouldAutoPlayRef.current = true;
            player.replace({ uri });
            setCurrentSong(song);

            if (newQueue) {
                setQueue(newQueue);
                setQueueIndex(newQueue.findIndex((s) => s.id === song.id));
            }

            recordPlay(song.id).catch(() => {});
        },
        [player, isPlayingAd, resetListenTracking],
    );

    const togglePlay = useCallback(() => {
        if (!currentSong || isPlayingAd) return;
        if (status.playing) { player.pause(); } else { player.play(); }
    }, [player, status.playing, currentSong, isPlayingAd]);

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
        setPendingAd(null);
        setIsPlayingAd(false);
    }, [player, resetListenTracking]);

    const playNext = useCallback(() => {
        if (!queue.length || isPlayingAd) return;
        const next = (queueIndex + 1) % queue.length;
        setQueueIndex(next);
        void playSong(queue[next], queue);
    }, [queue, queueIndex, isPlayingAd, playSong]);

    const playPrev = useCallback(() => {
        if (!queue.length || isPlayingAd) return;
        if (status.currentTime > 3) { seekTo(0); return; }
        const prev = (queueIndex - 1 + queue.length) % queue.length;
        setQueueIndex(prev);
        void playSong(queue[prev], queue);
    }, [queue, queueIndex, status.currentTime, isPlayingAd, seekTo, playSong]);

    const setQuality = useCallback((q: AudioQuality) => {
        if (q > maxQuality || isPlayingAd) return;
        setSelectedQuality(q);
        selectedQualityRef.current = q;
        if (currentSong) {
            const wasPlaying = status.playing;
            shouldAutoPlayRef.current = wasPlaying;
            player.replace({ uri: buildHlsUrl(currentSong, q) });
        }
    }, [maxQuality, currentSong, player, status.playing, isPlayingAd]);

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
        selectedQuality,
        maxQuality,
        setQuality,
        pendingAd,
        isPlayingAd,
        dismissAd,
    };

    return (
        <PlayerContext.Provider value={value}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = (): PlayerContextValue => {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer must be inside PlayerProvider');
    return ctx;
};