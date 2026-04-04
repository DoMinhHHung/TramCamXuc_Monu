import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, FlatList, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

import { BackButton } from '../../components/BackButton';
import { VoiceSearchButton } from '../../components/VoiceSearchButton';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { usePlayer } from '../../context/PlayerContext';
import { useTranslation } from '../../context/LocalizationContext';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import {
    Artist, getSongsByArtist, getSoundCloudStreamUrl, isSoundCloudOwnedContent, isSpotifyOwnedContent, searchArtists,
    searchByLyric, searchSongs, searchSoundCloudTracks, searchSpotifyTracks, Song, SoundCloudTrack, SpotifyTrack,
} from '../../services/music';
import {
    addSearchHistory, clearSearchHistory,
    getSearchHistory, removeSearchHistoryItem,
} from '../../utils/searchHistory';
import { Octicons, MaterialIcons } from '@expo/vector-icons';

const normalizeText = (value?: string): string => {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
};

const scoreByQuery = (query: string, ...fields: Array<string | undefined>): number => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return 0;

    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    let score = 0;

    for (const field of fields) {
        const normalizedField = normalizeText(field);
        if (!normalizedField) continue;

        if (normalizedField === normalizedQuery) score += 200;
        else if (normalizedField.startsWith(normalizedQuery)) score += 120;
        else if (normalizedField.includes(normalizedQuery)) score += 80;

        for (const token of tokens) {
            if (normalizedField.includes(token)) score += 10;
        }
    }

    return score;
};

export const SearchScreen = () => {
    const insets     = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { playSong } = usePlayer();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const [query,          setQuery]          = useState('');
    const [loading,        setLoading]        = useState(false);
    const [songResults,    setSongResults]    = useState<Song[]>([]);
    const [artistResults,  setArtistResults]  = useState<Artist[]>([]);
    const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
    const [soundCloudResults, setSoundCloudResults] = useState<SoundCloudTrack[]>([]);
    const [artistDetail,   setArtistDetail]   = useState<{ artist: Artist; songs: Song[] } | null>(null);
    const [history,        setHistory]        = useState<string[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef    = useRef<TextInput>(null);

    // ── Voice search ─────────────────────────────────────────────────────────
    const voice = useVoiceSearch();
    const voiceBannerAnim = useRef(new Animated.Value(0)).current;

    // Hiện / ẩn banner trạng thái voice
    useEffect(() => {
        const shouldShow = voice.state === 'recording' || voice.state === 'processing';
        Animated.timing(voiceBannerAnim, {
            toValue: shouldShow ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [voice.state]);

    const handleVoicePressIn = useCallback(async () => {
        await voice.startRecording();
    }, [voice]);

    const handleVoicePressOut = useCallback(async () => {
        const text = await voice.stopAndTranscribe();
        if (text) {
            setQuery(text);
            await addSearchHistory(text.trim());
            setHistory(await getSearchHistory());
            doSearch(text.trim());
        }
    }, [voice]);

    // ── Mount: load history + focus input ────────────────────────────────────
    useEffect(() => {
        getSearchHistory().then(setHistory);
        setTimeout(() => inputRef.current?.focus(), 120);
    }, []);

    // ── Search ────────────────────────────────────────────────────────────────
    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setSongResults([]);
            setArtistResults([]);
            setSpotifyResults([]);
            setSoundCloudResults([]);
            setArtistDetail(null);
            return;
        }
        setLoading(true);
        setArtistDetail(null);
        try {
            const [titleRes, lyricRes, artistRes, spotifyRes, soundCloudRes] = await Promise.allSettled([
                searchSongs({ keyword: q, size: 30 }),
                searchByLyric({ keyword: q, size: 20 }),
                searchArtists({ keyword: q, size: 20 }),
                searchSpotifyTracks({ keyword: q, limit: 10, market: 'VN' }),
                searchSoundCloudTracks({ keyword: q, limit: 50 }),
            ]);

            const titleSongs = titleRes.status === 'fulfilled' ? titleRes.value.content : [];
            const lyricSongs = lyricRes.status === 'fulfilled' ? lyricRes.value : [];
            const seen = new Set(titleSongs.map((s) => s.id));
            const merged = [...titleSongs];
            for (const s of lyricSongs) {
                if (!seen.has(s.id)) {
                    seen.add(s.id);
                    merged.push(s);
                }
            }

            setSongResults(
                [...merged].sort(
                    (a, b) => scoreByQuery(q, b.title, b.primaryArtist?.stageName) - scoreByQuery(q, a.title, a.primaryArtist?.stageName),
                ),
            );
            setArtistResults(
                [...(artistRes.status === 'fulfilled' ? artistRes.value.content : [])].sort(
                    (a, b) => scoreByQuery(q, b.stageName) - scoreByQuery(q, a.stageName),
                ),
            );
            setSpotifyResults(
                [...(spotifyRes.status === 'fulfilled' ? spotifyRes.value : [])].sort(
                    (a, b) => scoreByQuery(q, b.name, b.artistName, b.albumName) - scoreByQuery(q, a.name, a.artistName, a.albumName),
                ),
            );
            setSoundCloudResults(
                [...(soundCloudRes.status === 'fulfilled' ? soundCloudRes.value : [])].sort(
                    (a, b) => scoreByQuery(q, b.title, b.uploaderName) - scoreByQuery(q, a.title, a.uploaderName),
                ),
            );
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    const DEBOUNCE_MS = 700;
    const MIN_QUERY_LENGTH = 2;

    const scheduleSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (q.trim().length < MIN_QUERY_LENGTH) return;
    
    debounceRef.current = setTimeout(() => doSearch(q), DEBOUNCE_MS);
    };

    const handleQueryChange = (q: string) => {
    setQuery(q);
    if (!q.trim() || q.trim().length < MIN_QUERY_LENGTH) {
        setSongResults([]);
        setArtistResults([]);
        setSpotifyResults([]);
        setSoundCloudResults([]);
        setArtistDetail(null);
        return;
    }
    scheduleSearch(q);
    };

    const handleSubmit = async () => {
        if (!query.trim()) return;
        await addSearchHistory(query.trim());
        setHistory(await getSearchHistory());
        doSearch(query.trim());
    };

    // ── History actions ───────────────────────────────────────────────────────
    const handleHistoryItemPress = (q: string) => {
        setQuery(q);
        scheduleSearch(q);
        addSearchHistory(q).then(() => getSearchHistory().then(setHistory));
    };

    const handleRemoveHistoryItem = async (q: string) => {
        const updated = await removeSearchHistoryItem(q);
        setHistory(updated);
    };

    const handleClearHistory = async () => {
        await clearSearchHistory();
        setHistory([]);
    };

    // ── Artist drill-down ─────────────────────────────────────────────────────
    const handleArtistPress = async (artist: Artist) => {
        setLoading(true);
        try {
            const res = await getSongsByArtist(artist.artistId, { size: 30 });
            setArtistDetail({ artist, songs: res.content });
        } catch {
            setArtistDetail({ artist, songs: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleSongPress = (song: Song, queue: Song[]) => {
        playSong(song, queue);
        if (query.trim()) {
            addSearchHistory(query.trim()).then(() => getSearchHistory().then(setHistory));
        }
    };

    const mapSoundCloudTrackToSong = useCallback((
        track: SoundCloudTrack,
        resolvedStreamUrl?: string,
        fallbackStreamUrl?: string,
    ): Song => {
        const safeDuration = Math.max(0, Math.floor((track.durationMs ?? 0) / 1000));
        return {
            id: track.urn,
            title: track.title,
            primaryArtist: {
                artistId: track.urn,
                stageName: track.uploaderName || 'SoundCloud Artist',
            },
            genres: track.genre ? [{ id: `soundcloud:${track.genre}`, name: track.genre }] : [],
            thumbnailUrl: track.artworkUrl ?? undefined,
            durationSeconds: safeDuration,
            playCount: track.playbackCount ?? 0,
            status: 'PUBLIC',
            transcodeStatus: 'COMPLETED',
            streamUrl: resolvedStreamUrl ?? track.streamUrl ?? track.previewUrl ?? undefined,
            uploadUrl: fallbackStreamUrl,
            sourceType: 'SOUNDCLOUD',
            soundcloudId: track.urn,
            soundcloudPermalink: track.permalinkUrl,
            soundcloudUsername: track.uploaderName,
            createdAt: '',
            updatedAt: '',
        };
    }, []);

    const handleSoundCloudPress = useCallback(async (track: SoundCloudTrack) => {
        console.log('[SoundCloud][Search] tap track', {
            urn: track.urn,
            title: track.title,
            hasDirectStream: !!track.streamUrl,
            hasPreview: !!track.previewUrl,
            hasPermalink: !!track.permalinkUrl,
        });

        let resolvedStreamUrl = track.streamUrl ?? undefined;
        let fallbackStreamUrl = track.previewUrl ?? undefined;

        if (!resolvedStreamUrl) {
            try {
                const stream = await getSoundCloudStreamUrl(track.urn);
                resolvedStreamUrl = stream.streamUrl ?? stream.streamUrlFallback ?? track.previewUrl ?? undefined;
                fallbackStreamUrl = stream.streamUrlFallback ?? track.previewUrl ?? undefined;
                console.log('[SoundCloud][Search] stream resolved', {
                    urn: track.urn,
                    primary: resolvedStreamUrl,
                    fallback: fallbackStreamUrl,
                });
            } catch {
                console.log('[SoundCloud][Search] stream resolve failed', { urn: track.urn });
                resolvedStreamUrl = undefined;
            }
        }

        const queue = soundCloudResults
            .map((row) => mapSoundCloudTrackToSong(
                row,
                row.urn === track.urn ? resolvedStreamUrl : undefined,
                row.urn === track.urn ? fallbackStreamUrl : row.previewUrl ?? undefined,
            ))
            .filter((row) => !!row.streamUrl);

        const selected = queue.find((row) => row.id === track.urn);
        console.log('[SoundCloud][Search] queue prepared', {
            urn: track.urn,
            queueSize: queue.length,
            selectedHasStream: !!selected?.streamUrl,
            selectedFallback: selected?.uploadUrl,
        });

        if (selected?.streamUrl) {
            playSong(selected, queue);
            if (query.trim()) {
                addSearchHistory(query.trim()).then(() => getSearchHistory().then(setHistory));
            }
            return;
        }

        if (track.permalinkUrl) {
            Linking.openURL(track.permalinkUrl);
        }
    }, [mapSoundCloudTrackToSong, playSong, query, soundCloudResults]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const showHistory  = !query.trim();
    const currentResultCount = songResults.length + artistResults.length + spotifyResults.length + soundCloudResults.length;
    const showEmpty    = !loading && !!query.trim() && !artistDetail
        && currentResultCount === 0;

    const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
        <Pressable
            style={styles.resultRow}
            onPress={() => handleSongPress(item, songResults)}
        >
            <View style={styles.resultIndex}>
                <Text style={styles.resultIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultSub}   numberOfLines={1}>{item.primaryArtist.stageName}</Text>
            </View>
            <AntDesign name="play-circle" size={26} color={themeColors.white} />
        </Pressable>
    );

    const renderArtistItem = ({ item }: { item: Artist }) => (
        <Pressable style={styles.resultRow} onPress={() => handleArtistPress(item)}>
            <View style={[styles.resultIndex, styles.artistIconWrap]}>
                <Text style={{ fontSize: 18 }}><MaterialIcons name="settings-voice" color="#000" size={24} /></Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.stageName}</Text>
                <Text style={styles.resultSub}>{t('screens.search.artistType')}</Text>
            </View>
            <Text style={styles.playIcon}>›</Text>
        </Pressable>
    );

    const renderSpotifyItem = ({ item, index }: { item: SpotifyTrack; index: number }) => (
        <Pressable
            style={styles.resultRow}
            onPress={() => item.externalUrl ? Linking.openURL(item.externalUrl) : null}
        >
            <View style={styles.resultIndex}>
                <Text style={styles.resultIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.resultSub} numberOfLines={1}>
                    {`${item.artistName} • ${item.albumName}`}
                </Text>
                {isSpotifyOwnedContent(item) && (
                    <Text style={styles.spotifyAttribution}>Provided by Spotify</Text>
                )}
            </View>
            <Text style={styles.playIcon}>{item.externalUrl ? '↗' : '•'}</Text>
        </Pressable>
    );

    const renderSoundCloudItem = ({ item, index }: { item: SoundCloudTrack; index: number }) => (
        <Pressable
            style={styles.resultRow}
            onPress={() => { void handleSoundCloudPress(item); }}
        >
            <View style={styles.resultIndex}>
                <Text style={styles.resultIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultSub} numberOfLines={1}>{item.uploaderName}</Text>
                {(isSoundCloudOwnedContent(item) || item.attributionText) && (
                    <Text style={styles.spotifyAttribution}>{item.attributionText ?? 'Provided by SoundCloud'}</Text>
                )}
            </View>
            <Text style={styles.playIcon}>{item.streamUrl || item.previewUrl ? '▶' : item.permalinkUrl ? '↗' : '•'}</Text>
        </Pressable>
    );

    // ── Voice state label ─────────────────────────────────────────────────────
    const voiceStateLabel = voice.state === 'recording'
        ? `🔴  ${t('screens.search.voiceRecording')}`
        : voice.state === 'processing'
            ? `⏳  ${t('screens.search.voiceProcessing')}`
            : voice.errorMessage ?? '';

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} />

                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder={t('screens.search.inputPlaceholder')}
                    placeholderTextColor={themeColors.glass35}
                    value={query}
                    onChangeText={handleQueryChange}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="search"
                    autoCorrect={false}
                    editable={voice.state !== 'recording' && voice.state !== 'processing'}
                />

                {/* Clear button (chỉ khi có text) */}
                {query.length > 0 && voice.state === 'idle' && (
                    <Pressable
                        onPress={() => {
                            setQuery('');
                            setSongResults([]);
                            setArtistResults([]);
                            setSpotifyResults([]);
                            setSoundCloudResults([]);
                            setArtistDetail(null);
                            voice.cancel();
                        }}
                        hitSlop={8}
                    >
                        <Text style={styles.clearIcon}>✕</Text>
                    </Pressable>
                )}

                {/* Voice search button */}
                <VoiceSearchButton
                    state={voice.state}
                    onPressIn={handleVoicePressIn}
                    onPressOut={handleVoicePressOut}
                />
            </View>

            {/* ── Voice status banner ── */}
            <Animated.View
                style={[
                    styles.voiceBanner,
                    {
                        opacity: voiceBannerAnim,
                        transform: [{
                            translateY: voiceBannerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-8, 0],
                            }),
                        }],
                    },
                ]}
                pointerEvents="none"
            >
                <Text style={[
                    styles.voiceBannerText,
                    voice.state === 'error' && { color: themeColors.error },
                ]}>
                    {voiceStateLabel}
                </Text>
            </Animated.View>

            {/* Error banner (ngoài recording/processing) */}
            {voice.state === 'error' && voice.errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>⚠️  {voice.errorMessage}</Text>
                    <Pressable onPress={voice.cancel} hitSlop={8}>
                        <Text style={styles.errorBannerDismiss}>✕</Text>
                    </Pressable>
                </View>
            )}

            {/* ── Loading ── */}
            {loading && (
                <View style={styles.center}>
                    <ActivityIndicator color={themeColors.accent} />
                </View>
            )}

            {/* ── History ── */}
            {!loading && showHistory && (
                <View style={{ flex: 1 }}>
                    {history.length > 0 ? (
                        <>
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyTitle}>{t('screens.search.historyTitle')}</Text>
                                <Pressable onPress={handleClearHistory} hitSlop={8}>
                                    <Text style={styles.historyClearAll}>{t('screens.search.clearAll')}</Text>
                                </Pressable>
                            </View>
                            <FlatList
                                data={history}
                                keyExtractor={item => item}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={styles.historyRow}
                                        onPress={() => handleHistoryItemPress(item)}
                                    >
                                        <Text style={styles.historyIcon}><Octicons name="history" color="#fff" size={24} /></Text>
                                        <Text style={styles.historyText} numberOfLines={1}>{item}</Text>
                                        <Pressable
                                            style={styles.historyRemoveBtn}
                                            hitSlop={10}
                                            onPress={() => handleRemoveHistoryItem(item)}
                                        >
                                            <Text style={styles.historyRemoveIcon}>✕</Text>
                                        </Pressable>
                                    </Pressable>
                                )}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />
                        </>
                    ) : (
                        <View style={styles.center}>
                            <View style={styles.voiceHintBox}>
                                <Text style={styles.voiceHintIcon}>🎙</Text>
                                <Text style={styles.voiceHintTitle}>{t('screens.search.voiceHintTitle')}</Text>
                                <Text style={styles.voiceHintDesc}>
                                    {t('screens.search.voiceHintDesc')}
                                </Text>
                            </View>
                            <Text style={styles.hintText}>{t('screens.search.voiceHintInput')}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── Empty ── */}
            {!loading && showEmpty && (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>{`${t('screens.search.noResultsPrefix')} "${query}"`}</Text>
                </View>
            )}

            {/* ── Artist detail ── */}
            {!loading && artistDetail && (
                <View style={{ flex: 1 }}>
                    <View style={styles.artistDetailHeader}>
                        <Pressable onPress={() => setArtistDetail(null)}>
                            <Text style={styles.backToArtistsText}>‹ {artistDetail.artist.stageName}</Text>
                        </Pressable>
                        <Text style={styles.artistDetailSub}>{`${artistDetail.songs.length} ${t('screens.search.songCountSuffix')}`}</Text>
                    </View>
                    <FlatList
                        data={artistDetail.songs}
                        keyExtractor={s => s.id}
                        renderItem={({ item, index }) => (
                            <Pressable
                                style={styles.resultRow}
                                onPress={() => handleSongPress(item, artistDetail.songs)}
                            >
                                <View style={styles.resultIndex}>
                                    <Text style={styles.resultIndexText}>{index + 1}</Text>
                                </View>
                                <View style={styles.resultInfo}>
                                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.resultSub}>{item.primaryArtist.stageName}</Text>
                                </View>
                                <Text style={styles.playIcon}>▶</Text>
                            </Pressable>
                        )}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                </View>
            )}

            {/* ── Song / Artist results ── */}
            {!loading && !artistDetail && !showHistory && (
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {songResults.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t('screens.search.tabSongs', 'Track')}</Text>
                            {songResults.map((item, index) => (
                                <View key={item.id}>{renderSongItem({ item, index })}</View>
                            ))}
                        </View>
                    )}

                    {artistResults.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t('screens.search.tabArtists', 'Artist')}</Text>
                            {artistResults.map((item) => (
                                <View key={item.artistId}>{renderArtistItem({ item })}</View>
                            ))}
                        </View>
                    )}

                    {soundCloudResults.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t('screens.search.tabSoundCloud', 'SoundCloud')}</Text>
                            {soundCloudResults.map((item, index) => (
                                <View key={`${item.urn}-${index}`}>{renderSoundCloudItem({ item, index })}</View>
                            ))}
                        </View>
                    )}

                    {spotifyResults.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>{t('screens.search.tabSpotify', 'Spotify')}</Text>
                            {spotifyResults.map((item, index) => (
                                <View key={`${item.id}-${index}`}>{renderSpotifyItem({ item, index })}</View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root:   { flex: 1, backgroundColor: colors.bg },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 12, gap: 8,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    input: {
        flex: 1, color: colors.white, fontSize: 16, paddingVertical: 8,
    },
    clearIcon: { color: colors.glass40, fontSize: 18, paddingHorizontal: 2 },

    // ── Voice banner ─────────────────────────────────────────────────────────
    voiceBanner: {
        backgroundColor: colors.accentFill20,
        borderBottomWidth: 1,
        borderBottomColor: colors.accentBorder25,
        paddingHorizontal: 20,
        paddingVertical: 9,
    },
    voiceBannerText: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(239,68,68,0.3)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    errorBannerText: {
        flex: 1,
        color: colors.error,
        fontSize: 13,
    },
    errorBannerDismiss: {
        color: colors.error,
        fontSize: 16,
        fontWeight: '700',
    },

    // ── Common ────────────────────────────────────────────────────────────────
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyText: { color: colors.glass35, textAlign: 'center', fontSize: 14, lineHeight: 22 },
    hintText:  { color: colors.glass25, textAlign: 'center', fontSize: 13, marginTop: 12 },
    sectionTitle: { color: colors.accent, fontSize: 13, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },


    voiceHintBox: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.accentBorder25,
        padding: 24,
        marginBottom: 20,
        width: '100%',
    },
    voiceHintIcon:  { fontSize: 42, marginBottom: 10 },
    voiceHintTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 6 },
    voiceHintDesc:  {
        color: colors.glass50, fontSize: 13, textAlign: 'center', lineHeight: 20,
    },

    // ── History ───────────────────────────────────────────────────────────────
    historyHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    historyTitle:    { color: colors.white, fontSize: 15, fontWeight: '700' },
    historyClearAll: { color: colors.accent, fontSize: 13, fontWeight: '600' },
    historyRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: colors.glass06,
        gap: 12,
    },
    historyIcon:       { fontSize: 15, opacity: 0.5 },
    historyText:       { flex: 1, color: colors.glass70, fontSize: 14 },
    historyRemoveBtn:  { padding: 4 },
    historyRemoveIcon: { color: colors.glass30, fontSize: 14 },

    // ── Results ───────────────────────────────────────────────────────────────
    resultRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.glass06, gap: 12,
    },
    resultIndex:    { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.glass06, alignItems: 'center', justifyContent: 'center' },
    artistIconWrap: { backgroundColor: colors.accentFill20 },
    resultIndexText: { color: colors.glass40, fontSize: 12, fontWeight: '600' },
    resultInfo:     { flex: 1 },
    resultTitle:    { color: colors.white, fontSize: 14, fontWeight: '600' },
    resultSub:      { color: colors.muted, fontSize: 12, marginTop: 2 },
    playIcon:       { color: colors.glass30, fontSize: 18 },
    spotifyAttribution: { color: colors.accent, fontSize: 11, marginTop: 3 },

    // ── Artist detail ─────────────────────────────────────────────────────────
    artistDetailHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backToArtistsText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
    artistDetailSub:   { color: colors.glass35, fontSize: 12 },
});
