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
import { addListenHistory } from '../utils/listenHistory';
import { useAuth } from './AuthContext';
import { useNetworkQuality, suggestQuality, NetworkTier } from '../hooks/useNetworkQuality';
import { getSoundCloudStreamUrl } from '../services/externalMusic';

// ─── Quality ──────────────────────────────────────────────────────────────────

export type AudioQuality = 64 | 128 | 256 | 320;
export type RepeatMode = 'none' | 'one' | 'all';

export type AdNotice = {
    title: string;
    message: string;
    secondsRemaining: number;
    eventsRemaining: number;
};

const QUALITY_STREAM: Record<AudioQuality, string> = {
    64: 'stream_64k.m3u8',
    128: 'stream_128k.m3u8',
    256: 'stream_256k.m3u8',
    320: 'stream_320k.m3u8',
};

const MINIO_PUBLIC = 'https://minio.oopsgolden.id.vn/public-songs';

function buildStreamUri(song: Song, quality: AudioQuality): string {
    if (song.sourceType === 'SOUNDCLOUD' && song.streamUrl) {
        return song.streamUrl;
    }
    // Local / Jamendo: HLS
    if (song.streamUrl) return song.streamUrl;
    return `${MINIO_PUBLIC}/hls/${song.id}/${QUALITY_STREAM[quality]}`;
}

function shouldTrackBackendMetrics(song: Song | null): boolean {
    return !!song && song.sourceType !== 'SOUNDCLOUD';
}

function parseMaxQuality(features: Record<string, any>): AudioQuality {
    const bitrate = Number(features.maxBitrate ?? features.max_bitrate ?? 0);
    if (bitrate >= 320) return 320;
    if (bitrate >= 256) return 256;
    if (bitrate >= 128) return 128;
    if (bitrate > 0) return 64;

    const q = String(features.quality ?? '').toLowerCase();
    if (q.includes('320') || q.includes('lossless')) return 320;
    if (q.includes('256')) return 256;
    if (q.includes('128')) return 128;
    return 128;
}

/** Fisher-Yates shuffle không thay đổi mảng gốc */
function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ─── Context types ────────────────────────────────────────────────────────────

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
    stopPlayer: () => void;
    selectedQuality: AudioQuality;
    maxQuality: AudioQuality;
    setQuality: (q: AudioQuality) => void;
    autoQuality: boolean;
    setAutoQuality: (v: boolean) => void;
    networkTier: NetworkTier;
    // ── Repeat / Shuffle ──────────────────────────────────────────────────────
    repeatMode: RepeatMode;
    isShuffled: boolean;
    cycleRepeatMode: () => void;
    toggleShuffle: () => void;
    // ── Ads ──────────────────────────────────────────────────────────────────
    pendingAd: AdDelivery | null;
    isPlayingAd: boolean;
    adNotice: AdNotice | null;
    dismissAd: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const PlayerProvider = ({ children }: PropsWithChildren) => {
    const { authSession } = useAuth();
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [queue, setQueue] = useState<Song[]>([]);
    const [queueIndex, setQueueIndex] = useState(0);
    const [isFullScreen, setFullScreen] = useState(false);

    // ── Repeat / Shuffle ───────────────────────────────────────────────────────
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
    const [isShuffled, setIsShuffled] = useState(false);
    // Ref để dùng trong closures (tránh stale)
    const repeatModeRef = useRef<RepeatMode>('none');
    const isShuffledRef = useRef(false);
    const queueRef = useRef<Song[]>([]);
    const queueIndexRef = useRef(0);

    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { isShuffledRef.current = isShuffled; }, [isShuffled]);
    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);

    const cycleRepeatMode = useCallback(() => {
        setRepeatMode(prev => {
            const next: RepeatMode =
                prev === 'none' ? 'one' : prev === 'one' ? 'all' : 'none';
            repeatModeRef.current = next;
            return next;
        });
    }, []);

    const toggleShuffle = useCallback(() => {
        setIsShuffled(prev => {
            isShuffledRef.current = !prev;
            return !prev;
        });
    }, []);

    // ── Quality ────────────────────────────────────────────────────────────────
    const [maxQuality, setMaxQuality] = useState<AudioQuality>(128);
    const [selectedQuality, setSelectedQuality] = useState<AudioQuality>(128);
    const selectedQualityRef = useRef<AudioQuality>(128);
    useEffect(() => { selectedQualityRef.current = selectedQuality; }, [selectedQuality]);

    const [autoQuality, setAutoQuality] = useState(true);
    const autoQualityRef = useRef(true);
    useEffect(() => { autoQualityRef.current = autoQuality; }, [autoQuality]);

    const { tier: networkTier, tierRef: networkTierRef } = useNetworkQuality();
    const maxQualityRef = useRef<AudioQuality>(128);
    useEffect(() => { maxQualityRef.current = maxQuality; }, [maxQuality]);

    // ── Ads ────────────────────────────────────────────────────────────────────
    const [pendingAd, setPendingAd] = useState<AdDelivery | null>(null);
    const [isPlayingAd, setIsPlayingAd] = useState(false);
    const [adNotice, setAdNotice] = useState<AdNotice | null>(null);
    const noAdsRef = useRef(false);
    const checkingAdRef = useRef(false);
    const adEventsSinceResetRef = useRef(0);
    const adSecondsSinceResetRef = useRef(0);

    // ── Player ─────────────────────────────────────────────────────────────────
    const shouldAutoPlayRef = useRef(false);
    const pendingSeekRef = useRef<number | null>(null);
    const player = useAudioPlayer(null);
    const status = useAudioPlayerStatus(player);

    /** Tránh stale `status` trong effect chỉ phụ thuộc networkTier */
    const statusRef = useRef({ playing: false as boolean, currentTime: 0 });
    useEffect(() => {
        statusRef.current = {
            playing: status.playing ?? false,
            currentTime: status.currentTime ?? 0,
        };
    }, [status.playing, status.currentTime]);

    // ── Listen tracking refs ───────────────────────────────────────────────────
    const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playSegmentStartRef = useRef<number | null>(null);
    const accumulatedMsRef = useRef(0);
    const listenFiredRef = useRef(false);
    const completionFiredRef = useRef(false);
    const currentSongRef = useRef<Song | null>(null);
    const prevPlayingRef = useRef(false);

    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);

    const formatCountdown = useCallback((totalSeconds: number): string => {
        const safeSeconds = Math.max(0, Math.floor(totalSeconds));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        if (minutes <= 0) return `${seconds}s`;
        return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }, []);

    const resetAdSession = useCallback(() => {
        adEventsSinceResetRef.current = 0;
        adSecondsSinceResetRef.current = 0;
        setAdNotice(null);
    }, []);

    const refreshAdNotice = useCallback(() => {
        if (noAdsRef.current || isPlayingAd || pendingAd) {
            setAdNotice(null);
            return;
        }

        const eventsRemaining = Math.max(0, 5 - adEventsSinceResetRef.current);
        const secondsRemaining = Math.max(0, 30 * 60 - adSecondsSinceResetRef.current);

        if (eventsRemaining <= 0 || secondsRemaining <= 0) {
            setAdNotice(null);
            return;
        }

        const shouldWarn = eventsRemaining <= 1 || secondsRemaining <= 180;
        if (!shouldWarn) {
            setAdNotice(null);
            return;
        }

        setAdNotice({
            title: eventsRemaining <= 1 ? 'Quảng cáo sắp tới' : 'Sắp kiểm tra quảng cáo',
            message: secondsRemaining <= 180
                ? `Còn khoảng ${formatCountdown(secondsRemaining)} nữa hệ thống sẽ kiểm tra quảng cáo.`
                : 'Chỉ còn 1 lần ghi nhận nghe nữa trước lượt quảng cáo tiếp theo.',
            secondsRemaining,
            eventsRemaining,
        });
    }, [formatCountdown, isPlayingAd, pendingAd]);

    const registerAdListen = useCallback((durationSeconds: number) => {
        if (!authSession || noAdsRef.current) return;
        adEventsSinceResetRef.current += 1;
        adSecondsSinceResetRef.current += Math.max(0, durationSeconds);
        refreshAdNotice();
    }, [authSession, refreshAdNotice]);

    // ── Load subscription ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!authSession) {
            noAdsRef.current = false;
            resetAdSession();
            setMaxQuality(128);
            maxQualityRef.current = 128;
            const best = suggestQuality(networkTierRef.current, 128);
            setSelectedQuality(best);
            selectedQualityRef.current = best;
            return;
        }
        getMySubscription()
            .then((sub) => {
                if (sub?.plan?.features) {
                    const features = sub.plan.features;
                    noAdsRef.current = Boolean(features.no_ads);
                    const max = parseMaxQuality(features);
                    setMaxQuality(max);
                    maxQualityRef.current = max;
                    const best = autoQualityRef.current
                        ? suggestQuality(networkTierRef.current, max)
                        : Math.min(selectedQualityRef.current, max) as AudioQuality;
                    setSelectedQuality(best);
                    selectedQualityRef.current = best;
                }
            })
            .catch(() => { });
    }, [authSession]);

    useEffect(() => {
        resetAdSession();
    }, [authSession?.profile?.id, resetAdSession]);

    // ── Auto quality on network change (tier đã debounce trong useNetworkQuality) ─
    useEffect(() => {
        if (!autoQualityRef.current) return;
        const best = suggestQuality(networkTier, maxQualityRef.current);
        if (best !== selectedQualityRef.current) {
            setSelectedQuality(best);
            selectedQualityRef.current = best;
            const snap = statusRef.current;
            if (currentSongRef.current && snap.playing) {
                const pos = snap.currentTime;
                pendingSeekRef.current = pos > 0.35 ? pos : null;
                shouldAutoPlayRef.current = true;
                player.replace({ uri: buildStreamUri(currentSongRef.current, best) });
            }
        }
    }, [networkTier, player]);

    // ── Audio session ──────────────────────────────────────────────────────────
    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true }).catch(() => { });
    }, []);

    // ── Autoplay + seek sau khi HLS load: 2 frame defer để native gắn segment rồi mới play ─
    useEffect(() => {
        if (!status.isLoaded) return;

        const pos = pendingSeekRef.current;
        const wantPlay = shouldAutoPlayRef.current;
        pendingSeekRef.current = null;
        shouldAutoPlayRef.current = false;

        requestAnimationFrame(() => {
            try {
                if (pos !== null) player.seekTo(pos);
            } catch { /* ignore */ }
            requestAnimationFrame(() => {
                try {
                    if (wantPlay) player.play();
                } catch { /* ignore */ }
            });
        });
    }, [status.isLoaded, player]);

    // ── Check & show ads ───────────────────────────────────────────────────────
    const checkForAd = useCallback(async (): Promise<boolean> => {
        if (noAdsRef.current) return false;
        if (checkingAdRef.current) return false;
        if (isPlayingAd) return false;

        checkingAdRef.current = true;
        try {
            const ad = await getNextAd();
            if (!ad) return false;
            resetAdSession();
            player.pause();
            setPendingAd(ad);
            setIsPlayingAd(true);
            return true;
        } catch {
            return false;
        } finally {
            checkingAdRef.current = false;
        }
    }, [player, isPlayingAd]);

    // ── Dismiss ad ─────────────────────────────────────────────────────────────
    const dismissAd = useCallback((): void => {
        setPendingAd(null);
        setIsPlayingAd(false);
        resetAdSession();
        if (currentSongRef.current) {
            player.play();
        }
    }, [player, resetAdSession]);

    // ── Listen tracking ────────────────────────────────────────────────────────
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
                    if (!shouldTrackBackendMetrics(song)) return;
                    listenFiredRef.current = true;
                    const dur = status.duration ?? 0;
                    const pos = status.currentTime ?? 0;
                    const completed = dur > 0 && pos >= dur * 0.9;
                    registerAdListen(30);
                    recordListen(song.id, {
                        durationSeconds: 30,
                        completed,
                        artistId: song.primaryArtist?.artistId,
                        genreIds: song.genres?.map((g) => g.id).join(',') ?? '',
                    }).then(() => addListenHistory(song)).catch(() => { });
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

    // ── Phát hiện bài kết thúc + auto advance ─────────────────────────────────
    useEffect(() => {
        const wasPlaying = prevPlayingRef.current;
        prevPlayingRef.current = status.playing;

        if (!wasPlaying || status.playing) return;
        if (completionFiredRef.current) return;

        const dur = status.duration ?? 0;
        const pos = status.currentTime ?? 0;
        if (dur <= 0) return;

        const isCompleted = pos >= dur * 0.9;
        if (!isCompleted) return;

        const song = currentSongRef.current;
        if (!song) return;
        if (!shouldTrackBackendMetrics(song)) return;

        let totalMs = accumulatedMsRef.current;
        if (playSegmentStartRef.current !== null) {
            totalMs += Date.now() - playSegmentStartRef.current;
        }
        completionFiredRef.current = true;

        registerAdListen(Math.round(totalMs / 1000));

        recordListen(song.id, {
            durationSeconds: Math.round(totalMs / 1000),
            completed: true,
            artistId: song.primaryArtist?.artistId,
            genreIds: song.genres?.map((g) => g.id).join(',') ?? '',
        }).then(() => addListenHistory(song)).catch(() => { });

        // Auto advance theo repeatMode
        void (async () => {
            const adShown = await checkForAd();
            if (adShown) return;

            const curQueue = queueRef.current;
            const curIdx = queueIndexRef.current;
            const repeat = repeatModeRef.current;
            const shuffle = isShuffledRef.current;

            if (repeat === 'one') {
                const currentS = currentSongRef.current;
                if (currentS) {
                    resetListenTracking();
                    shouldAutoPlayRef.current = true;
                    player.replace({ uri: buildStreamUri(currentS, selectedQualityRef.current) });
                    if (shouldTrackBackendMetrics(currentS)) {
                        recordPlay(currentS.id).catch(() => { });
                    }
                }
                return;
            }

            if (curQueue.length === 0) return;

            let nextIdx: number;
            if (shuffle) {
                const others = curQueue.map((_, i) => i).filter(i => i !== curIdx);
                if (others.length === 0) {
                    nextIdx = 0;
                } else {
                    nextIdx = others[Math.floor(Math.random() * others.length)];
                }
            } else {
                nextIdx = curIdx + 1;
            }

            if (nextIdx >= curQueue.length) {
                if (repeat === 'all') {
                    nextIdx = 0;
                } else {
                    return;
                }
            }

            const nextSong = curQueue[nextIdx];
            if (!nextSong) return;

            setQueueIndex(nextIdx);
            resetListenTracking();
            shouldAutoPlayRef.current = true;
            try {
                let uri: string;
                if (nextSong.sourceType === 'SOUNDCLOUD' && nextSong.soundcloudId) {
                    uri = await getSoundCloudStreamUrl(nextSong.soundcloudId);
                } else {
                    const localUri = await isSongDownloaded(nextSong.id);
                    uri = localUri ?? buildStreamUri(nextSong, selectedQualityRef.current);
                }
                player.replace({ uri });
            } catch {
                player.replace({ uri: buildStreamUri(nextSong, selectedQualityRef.current) });
            }
            setCurrentSong(nextSong);
            if (shouldTrackBackendMetrics(nextSong)) {
                recordPlay(nextSong.id).catch(() => { });
            }
        })();
    }, [status.playing, checkForAd]);

    // ── Reset tracking ─────────────────────────────────────────────────────────
    const resetListenTracking = useCallback(() => {
        if (listenTimerRef.current) clearTimeout(listenTimerRef.current);
        listenTimerRef.current = null;
        playSegmentStartRef.current = null;
        accumulatedMsRef.current = 0;
        listenFiredRef.current = false;
        completionFiredRef.current = false;
        prevPlayingRef.current = false;
    }, []);

    // ── Actions ────────────────────────────────────────────────────────────────

    const playSong = useCallback(
        async (song: Song, newQueue?: Song[]) => {
            if (isPlayingAd) return;

            const quality = selectedQualityRef.current;
            let uri: string;
            try {
                if (song.sourceType === 'SOUNDCLOUD' && song.soundcloudId) {
                    uri = await getSoundCloudStreamUrl(song.soundcloudId);
                } else {
                    const localUri = await isSongDownloaded(song.id);
                    uri = localUri ?? buildStreamUri(song, quality);
                    if (localUri) console.log('[Player] Offline playback:', song.title);
                }
            } catch {
                uri = buildStreamUri(song, quality);
            }

            resetListenTracking();
            shouldAutoPlayRef.current = true;
            player.replace({ uri });
            setCurrentSong(song);

            if (newQueue) {
                setQueue(newQueue);
                const idx = newQueue.findIndex((s) => s.id === song.id);
                setQueueIndex(idx >= 0 ? idx : 0);
            }

            if (shouldTrackBackendMetrics(song)) {
                recordPlay(song.id).catch(() => { });
            }
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
        resetAdSession();
    }, [player, resetListenTracking, resetAdSession]);

    const playNext = useCallback(() => {
        if (!queueRef.current.length || isPlayingAd) return;
        const curQueue = queueRef.current;
        const curIdx = queueIndexRef.current;

        if (repeatModeRef.current === 'one') {
            const s = currentSongRef.current;
            if (s) void playSong(s, curQueue);
            return;
        }

        let next: number;
        if (isShuffledRef.current) {
            const others = curQueue.map((_, i) => i).filter(i => i !== curIdx);
            next = others.length > 0
                ? others[Math.floor(Math.random() * others.length)]
                : 0;
        } else {
            next = (curIdx + 1) % curQueue.length;
            if (next === 0 && repeatModeRef.current === 'none') return;
        }

        setQueueIndex(next);
        void playSong(curQueue[next], curQueue);
        void checkForAd();
    }, [isPlayingAd, playSong, checkForAd]);

    const playPrev = useCallback(() => {
        if (!queueRef.current.length || isPlayingAd) return;
        const curQueue = queueRef.current;
        const curIdx = queueIndexRef.current;

        if (status.currentTime > 3) { seekTo(0); return; }
        const prev = (curIdx - 1 + curQueue.length) % curQueue.length;
        setQueueIndex(prev);
        void playSong(curQueue[prev], curQueue);
        void checkForAd();
    }, [isPlayingAd, status.currentTime, seekTo, playSong, checkForAd]);

    const setQuality = useCallback((q: AudioQuality) => {
        if (q > maxQuality || isPlayingAd) return;
        setAutoQuality(false);
        autoQualityRef.current = false;
        setSelectedQuality(q);
        selectedQualityRef.current = q;
        if (currentSong) {
            const wasPlaying = status.playing;
            const pos = status.currentTime ?? 0;
            pendingSeekRef.current = pos > 0.35 ? pos : null;
            shouldAutoPlayRef.current = wasPlaying;
            player.replace({ uri: buildStreamUri(currentSong, q) });
        }
    }, [maxQuality, currentSong, player, status.playing, status.currentTime, isPlayingAd]);

    // ─────────────────────────────────────────────────────────────────────────

    const value: PlayerContextValue = {
        currentSong,
        queue,
        isFullScreen,
        setFullScreen,
        isPlaying: status.playing ?? false,
        isLoaded: status.isLoaded ?? false,
        currentTime: status.currentTime ?? 0,
        duration: status.duration ?? 0,
        playSong,
        togglePlay,
        seekTo,
        playNext,
        playPrev,
        stopPlayer,
        selectedQuality,
        maxQuality,
        setQuality,
        autoQuality,
        setAutoQuality,
        networkTier,
        repeatMode,
        isShuffled,
        cycleRepeatMode,
        toggleShuffle,
        pendingAd,
        isPlayingAd,
        adNotice,
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