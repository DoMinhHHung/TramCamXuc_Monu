// FRONTEND/monu-mobile/src/screens/(tabs)/SearchScreen.tsx
// Thay thế hoàn toàn file hiện tại

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, FlatList, Linking,
    Modal, Pressable, ScrollView, StyleSheet, Text,
    TextInput, View, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, MaterialIcons, Octicons } from '@expo/vector-icons';

import { BackButton } from '../../components/BackButton';
import { VoiceSearchButton } from '../../components/VoiceSearchButton';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { usePlayer } from '../../context/PlayerContext';
import { useTranslation } from '../../context/LocalizationContext';
import { useAuth } from '../../context/AuthContext';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import { Artist, getSongsByArtist, searchArtists, searchByLyric, searchSongs, Song } from '../../services/music';
import {
    SpotifyTrack, SoundCloudTrack,
    searchSpotify, searchSoundCloud,
    openInSpotify, soundCloudTrackToSong,
    saveAndAddSoundCloudToPlaylist,
} from '../../services/externalMusic';
import { addSearchHistory, clearSearchHistory, getSearchHistory, removeSearchHistoryItem } from '../../utils/searchHistory';
import { getMyPlaylists, Playlist } from '../../services/music';

type Source = 'monu' | 'spotify' | 'soundcloud';
type Tab = 'songs' | 'artists';

const SOURCE_META: Record<Source, { label: string; icon: string; color: string }> = {
    monu:       { label: 'Monu',       icon: '🎵', color: '#C9A84C' },
    spotify:    { label: 'Spotify',    icon: '🟢', color: '#1DB954' },
    soundcloud: { label: 'SoundCloud', icon: '🔶', color: '#FF5500' },
};

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SearchScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { playSong } = usePlayer();
    const { t } = useTranslation();
    const { authSession } = useAuth();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    const [query, setQuery] = useState('');
    const [source, setSource] = useState<Source>('monu');
    const [tab, setTab] = useState<Tab>('songs');
    const [loading, setLoading] = useState(false);

    // Monu results
    const [songResults, setSongResults] = useState<Song[]>([]);
    const [artistResults, setArtistResults] = useState<Artist[]>([]);
    const [artistDetail, setArtistDetail] = useState<{ artist: Artist; songs: Song[] } | null>(null);

    // External results
    const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
    const [soundcloudResults, setSoundcloudResults] = useState<SoundCloudTrack[]>([]);

    // History
    const [history, setHistory] = useState<string[]>([]);

    // Playlist picker (SoundCloud)
    const [scPlaylistPickerTrack, setScPlaylistPickerTrack] = useState<SoundCloudTrack | null>(null);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInput>(null);
    const voice = useVoiceSearch();
    const voiceBannerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        getSearchHistory().then(setHistory);
        setTimeout(() => inputRef.current?.focus(), 120);
        // Load playlists cho SoundCloud add-to-playlist
        if (authSession) {
            getMyPlaylists({ page: 1, size: 50 })
                .then(r => setPlaylists(r.content ?? []))
                .catch(() => {});
        }
    }, []);

    useEffect(() => {
        const shouldShow = voice.state === 'recording' || voice.state === 'processing';
        Animated.timing(voiceBannerAnim, {
            toValue: shouldShow ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [voice.state]);

    // ── Search ────────────────────────────────────────────────────────────────

    const clearResults = () => {
        setSongResults([]);
        setArtistResults([]);
        setArtistDetail(null);
        setSpotifyResults([]);
        setSoundcloudResults([]);
    };

    const doSearch = useCallback(async (q: string, currentSource: Source, currentTab: Tab) => {
        if (!q.trim()) { clearResults(); return; }
        setLoading(true);
        setArtistDetail(null);

        try {
            if (currentSource === 'monu') {
                if (currentTab === 'songs') {
                    const [titleRes, lyricRes] = await Promise.allSettled([
                        searchSongs({ keyword: q, size: 30 }),
                        searchByLyric({ keyword: q, size: 20 }),
                    ]);
                    const titleSongs = titleRes.status === 'fulfilled' ? titleRes.value.content : [];
                    const lyricSongs = lyricRes.status === 'fulfilled' ? lyricRes.value : [];
                    const seen = new Set(titleSongs.map(s => s.id));
                    const merged = [...titleSongs];
                    for (const s of lyricSongs) {
                        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
                    }
                    setSongResults(merged);
                } else {
                    const res = await searchArtists({ keyword: q, size: 20 });
                    setArtistResults(res.content);
                }
            } else if (currentSource === 'spotify') {
                const results = await searchSpotify(q, 30);
                setSpotifyResults(results);
            } else if (currentSource === 'soundcloud') {
                const results = await searchSoundCloud(q, 30);
                setSoundcloudResults(results);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    const scheduleSearch = (q: string, s: Source, t: Tab) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q, s, t), 380);
    };

    const handleQueryChange = (q: string) => {
        setQuery(q);
        if (!q.trim()) { clearResults(); }
        else { scheduleSearch(q, source, tab); }
    };

    const handleSourceChange = (newSource: Source) => {
        setSource(newSource);
        clearResults();
        if (query.trim()) scheduleSearch(query, newSource, tab);
    };

    const handleTabChange = (t: Tab) => {
        setTab(t);
        setSongResults([]);
        setArtistResults([]);
        setArtistDetail(null);
        if (query.trim() && source === 'monu') scheduleSearch(query, source, t);
    };

    const handleSubmit = async () => {
        if (!query.trim()) return;
        await addSearchHistory(query.trim());
        setHistory(await getSearchHistory());
        doSearch(query.trim(), source, tab);
    };

    // ── Voice ─────────────────────────────────────────────────────────────────

    const handleVoicePressIn = useCallback(async () => {
        await voice.startRecording();
    }, [voice]);

    const handleVoicePressOut = useCallback(async () => {
        const text = await voice.stopAndTranscribe();
        if (text) {
            setQuery(text);
            await addSearchHistory(text.trim());
            setHistory(await getSearchHistory());
            doSearch(text.trim(), source, tab);
        }
    }, [voice, source, tab]);

    // ── Artist drill-down ─────────────────────────────────────────────────────

    const handleArtistPress = async (artist: Artist) => {
        setLoading(true);
        try {
            const res = await getSongsByArtist(artist.artistId, { size: 30 });
            setArtistDetail({ artist, songs: res.content });
        } catch {
            setArtistDetail({ artist, songs: [] });
        } finally { setLoading(false); }
    };

    // ── SoundCloud: add to playlist ───────────────────────────────────────────

    const handleSoundCloudAddToPlaylist = (track: SoundCloudTrack) => {
        if (!authSession) {
            Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để thêm vào playlist.');
            return;
        }
        setScPlaylistPickerTrack(track);
    };

    const handleAddToPlaylistConfirm = async (playlistId: string) => {
        if (!scPlaylistPickerTrack) return;
        try {
            await saveAndAddSoundCloudToPlaylist(playlistId, scPlaylistPickerTrack);
            Alert.alert('✅ Thành công', `Đã thêm "${scPlaylistPickerTrack.title}" vào playlist.`);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message || 'Không thể thêm vào playlist');
        } finally {
            setScPlaylistPickerTrack(null);
        }
    };

    // ── Render helpers ────────────────────────────────────────────────────────

    const showHistory = !query.trim();
    const isEmpty = !loading && !!query.trim() && !artistDetail;

    const renderMonuSong = ({ item, index }: { item: Song; index: number }) => (
        <Pressable
            style={styles.resultRow}
            onPress={() => playSong(item, tab === 'songs' ? songResults : artistDetail?.songs ?? [])}
        >
            {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                    <Text style={{ fontSize: 16 }}>🎵</Text>
                </View>
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultSub} numberOfLines={1}>{item.primaryArtist.stageName}</Text>
            </View>
            <AntDesign name="play-circle" size={26} color={themeColors.white} />
        </Pressable>
    );

    const renderSpotifyTrack = ({ item }: { item: SpotifyTrack }) => (
        <Pressable style={styles.resultRow} onPress={() => openInSpotify(item)}>
            {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
                <View style={[styles.thumbnail, { backgroundColor: '#1DB95430' }]}>
                    <Text style={{ fontSize: 16 }}>🟢</Text>
                </View>
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.resultSub} numberOfLines={1}>
                    {item.artistName}
                    {item.explicit ? '  🅴' : ''}
                </Text>
                <Text style={styles.resultDuration}>{formatDuration(item.durationSeconds)}</Text>
            </View>
            {/* Open in Spotify button */}
            <View style={styles.spotifyOpenBtn}>
                <Text style={styles.spotifyOpenText}>Mở Spotify</Text>
            </View>
        </Pressable>
    );

    const renderSoundCloudTrack = ({ item }: { item: SoundCloudTrack }) => (
        <Pressable
            style={styles.resultRow}
            onPress={() => {
                const song = soundCloudTrackToSong(item);
                playSong(song as any, soundcloudResults.map(t => soundCloudTrackToSong(t) as any));
            }}
        >
            {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
                <View style={[styles.thumbnail, { backgroundColor: '#FF550030' }]}>
                    <Text style={{ fontSize: 16 }}>🔶</Text>
                </View>
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.resultSub} numberOfLines={1}>{item.artistUsername}</Text>
                    {/* Attribution badge — BẮT BUỘC theo SoundCloud Terms */}
                    <View style={styles.scBadge}>
                        <Text style={styles.scBadgeText}>SoundCloud</Text>
                    </View>
                </View>
                <Text style={styles.resultDuration}>{formatDuration(item.durationSeconds)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Pressable
                    hitSlop={8}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleSoundCloudAddToPlaylist(item);
                    }}
                >
                    <AntDesign name="pluscircleo" size={22} color={themeColors.accent} />

                </Pressable>
                <Pressable
                    hitSlop={8}
                    onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(item.permalink);
                    }}
                >
                    <MaterialIcons name="open-in-new" size={20} color={themeColors.glass40} />
                </Pressable>
            </View>
        </Pressable>
    );

    const renderArtistItem = ({ item }: { item: Artist }) => (
        <Pressable style={styles.resultRow} onPress={() => handleArtistPress(item)}>
            <View style={[styles.thumbnail, { backgroundColor: themeColors.accentFill20 }]}>
                <Text style={{ fontSize: 20 }}>🎤</Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.stageName}</Text>
                <Text style={styles.resultSub}>Nghệ sĩ</Text>
            </View>
            <Text style={{ color: themeColors.glass30, fontSize: 18 }}>›</Text>
        </Pressable>
    );

    const voiceStateLabel =
        voice.state === 'recording' ? `🔴  Đang nghe...`
            : voice.state === 'processing' ? `⏳  Đang xử lý...`
                : voice.errorMessage ?? '';

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Tìm kiếm bài hát, nghệ sĩ..."
                    placeholderTextColor={themeColors.glass35}
                    value={query}
                    onChangeText={handleQueryChange}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="search"
                    autoCorrect={false}
                    editable={voice.state !== 'recording' && voice.state !== 'processing'}
                />
                {query.length > 0 && voice.state === 'idle' && (
                    <Pressable onPress={() => { setQuery(''); clearResults(); }} hitSlop={8}>
                        <Text style={styles.clearIcon}>✕</Text>
                    </Pressable>
                )}
                <VoiceSearchButton
                    state={voice.state}
                    onPressIn={handleVoicePressIn}
                    onPressOut={handleVoicePressOut}
                />
            </View>

            {/* Voice banner */}
            <Animated.View
                style={[styles.voiceBanner, {
                    opacity: voiceBannerAnim,
                    transform: [{ translateY: voiceBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
                }]}
                pointerEvents="none"
            >
                <Text style={styles.voiceBannerText}>{voiceStateLabel}</Text>
            </Animated.View>

            {/* Source selector */}
            {!showHistory && (
                <View style={styles.sourceTabs}>
                    {(Object.keys(SOURCE_META) as Source[]).map(s => {
                        const meta = SOURCE_META[s];
                        const active = source === s;
                        return (
                            <Pressable
                                key={s}
                                style={[styles.sourceTab, active && { borderColor: meta.color, backgroundColor: meta.color + '20' }]}
                                onPress={() => handleSourceChange(s)}
                            >
                                <Text style={styles.sourceTabIcon}>{meta.icon}</Text>
                                <Text style={[styles.sourceTabText, active && { color: meta.color }]}>
                                    {meta.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {/* Monu: song/artist tabs */}
            {!showHistory && source === 'monu' && (
                <View style={styles.tabs}>
                    {(['songs', 'artists'] as Tab[]).map(tabKey => (
                        <Pressable
                            key={tabKey}
                            style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
                            onPress={() => handleTabChange(tabKey)}
                        >
                            <Text style={styles.tabIcon}>{tabKey === 'songs' ? '🎵' : '🎤'}</Text>
                            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
                                {tabKey === 'songs' ? 'Bài hát' : 'Nghệ sĩ'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Spotify notice */}
            {!showHistory && source === 'spotify' && (
                <View style={styles.noticeBanner}>
                    <Text style={styles.noticeText}>
                        🎵 Nhạc Spotify — nhấn để mở trong app Spotify
                    </Text>
                </View>
            )}

            {/* SoundCloud notice */}
            {!showHistory && source === 'soundcloud' && (
                <View style={[styles.noticeBanner, { borderLeftColor: '#FF5500' }]}>
                    <Text style={styles.noticeText}>
                        🔶 Stream trực tiếp từ SoundCloud — nhấn ➕ để thêm vào playlist
                    </Text>
                </View>
            )}

            {loading && (
                <View style={styles.center}>
                    <ActivityIndicator color={themeColors.accent} />
                </View>
            )}

            {/* History */}
            {!loading && showHistory && (
                <View style={{ flex: 1 }}>
                    {history.length > 0 ? (
                        <>
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyTitle}>Tìm kiếm gần đây</Text>
                                <Pressable onPress={async () => { await clearSearchHistory(); setHistory([]); }} hitSlop={8}>
                                    <Text style={styles.historyClearAll}>Xóa tất cả</Text>
                                </Pressable>
                            </View>
                            <FlatList
                                data={history}
                                keyExtractor={item => item}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={styles.historyRow}
                                        onPress={() => {
                                            setQuery(item);
                                            scheduleSearch(item, source, tab);
                                            addSearchHistory(item).then(() => getSearchHistory().then(setHistory));
                                        }}
                                    >
                                        <Text style={{ fontSize: 15, opacity: 0.5 }}>
                                            <Octicons name="history" color={themeColors.white} size={20} />
                                        </Text>
                                        <Text style={styles.historyText} numberOfLines={1}>{item}</Text>
                                        <Pressable
                                            hitSlop={10}
                                            onPress={async () => {
                                                const updated = await removeSearchHistoryItem(item);
                                                setHistory(updated);
                                            }}
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
                            <Text style={styles.emptyText}>Chưa có tìm kiếm nào</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Empty state */}
            {isEmpty && !loading && (
                <>
                    {source === 'monu' && tab === 'songs' && songResults.length === 0 && !artistDetail && (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>{`Không tìm thấy kết quả cho "${query}"`}</Text>
                        </View>
                    )}
                    {source === 'spotify' && spotifyResults.length === 0 && (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>{`Không có kết quả Spotify cho "${query}"`}</Text>
                        </View>
                    )}
                    {source === 'soundcloud' && soundcloudResults.length === 0 && (
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>{`Không có kết quả SoundCloud cho "${query}"`}</Text>
                        </View>
                    )}
                </>
            )}

            {/* Artist detail */}
            {!loading && artistDetail && (
                <View style={{ flex: 1 }}>
                    <View style={styles.artistDetailHeader}>
                        <Pressable onPress={() => setArtistDetail(null)}>
                            <Text style={styles.backToArtistsText}>‹ {artistDetail.artist.stageName}</Text>
                        </Pressable>
                        <Text style={styles.artistDetailSub}>{artistDetail.songs.length} bài hát</Text>
                    </View>
                    <FlatList
                        data={artistDetail.songs}
                        keyExtractor={s => s.id}
                        renderItem={renderMonuSong}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                </View>
            )}

            {/* Results */}
            {!loading && !artistDetail && !showHistory && (
                <>
                    {source === 'monu' && tab === 'songs' && songResults.length > 0 && (
                        <FlatList
                            data={songResults}
                            keyExtractor={s => s.id}
                            renderItem={renderMonuSong}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    )}
                    {source === 'monu' && tab === 'artists' && artistResults.length > 0 && (
                        <FlatList
                            data={artistResults}
                            keyExtractor={a => a.artistId}
                            renderItem={renderArtistItem}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    )}
                    {source === 'spotify' && spotifyResults.length > 0 && (
                        <FlatList
                            data={spotifyResults}
                            keyExtractor={t => t.id}
                            renderItem={renderSpotifyTrack}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            ListFooterComponent={() => (
                                <View style={styles.attributionFooter}>
                                    <Text style={styles.attributionText}>🎵 Kết quả từ Spotify</Text>
                                </View>
                            )}
                        />
                    )}
                    {source === 'soundcloud' && soundcloudResults.length > 0 && (
                        <FlatList
                            data={soundcloudResults}
                            keyExtractor={t => t.id}
                            renderItem={renderSoundCloudTrack}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            ListFooterComponent={() => (
                                <View style={styles.attributionFooter}>
                                    <Text style={styles.attributionText}>🔶 Powered by SoundCloud</Text>
                                </View>
                            )}
                        />
                    )}
                </>
            )}

            {/* SoundCloud: Add to Playlist Modal */}
            <Modal
                visible={!!scPlaylistPickerTrack}
                transparent
                animationType="slide"
                onRequestClose={() => setScPlaylistPickerTrack(null)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setScPlaylistPickerTrack(null)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Thêm vào playlist</Text>
                        <Text style={styles.modalSubtitle} numberOfLines={1}>
                            {scPlaylistPickerTrack?.title}
                        </Text>
                        {playlists.length === 0 ? (
                            <Text style={{ color: themeColors.glass40, textAlign: 'center', marginVertical: 20 }}>
                                Bạn chưa có playlist nào.
                            </Text>
                        ) : (
                            <ScrollView style={{ maxHeight: 300 }}>
                                {playlists.map(p => (
                                    <Pressable
                                        key={p.id}
                                        style={styles.playlistItem}
                                        onPress={() => handleAddToPlaylistConfirm(p.id)}
                                    >
                                        <Text style={styles.playlistItemText}>{p.name}</Text>
                                        <Text style={styles.playlistItemCount}>{p.totalSongs ?? 0} bài</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 12, gap: 8,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    input: { flex: 1, color: colors.white, fontSize: 16, paddingVertical: 8 },
    clearIcon: { color: colors.glass40, fontSize: 18, paddingHorizontal: 2 },

    voiceBanner: {
        backgroundColor: colors.accentFill20,
        borderBottomWidth: 1, borderBottomColor: colors.accentBorder25,
        paddingHorizontal: 20, paddingVertical: 9,
    },
    voiceBannerText: { color: colors.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' },

    // Source tabs
    sourceTabs: {
        flexDirection: 'row', gap: 8,
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    sourceTab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    },
    sourceTabIcon: { fontSize: 13 },
    sourceTabText: { color: colors.muted, fontSize: 12, fontWeight: '700' },

    // Notice
    noticeBanner: {
        borderLeftWidth: 3, borderLeftColor: colors.accent,
        backgroundColor: colors.surface,
        paddingHorizontal: 14, paddingVertical: 10,
        marginHorizontal: 16, marginTop: 10, borderRadius: 8,
    },
    noticeText: { color: colors.glass60, fontSize: 12 },

    // Monu tabs
    tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tabBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    },
    tabBtnActive: { backgroundColor: colors.accentDim, borderColor: colors.accentDim },
    tabIcon: { fontSize: 13 },
    tabText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: colors.white },

    // Results
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyText: { color: colors.glass35, textAlign: 'center', fontSize: 14, lineHeight: 22 },

    resultRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.glass06, gap: 12,
    },
    thumbnail: { width: 46, height: 46, borderRadius: 8, backgroundColor: colors.surface },
    thumbnailFallback: { alignItems: 'center', justifyContent: 'center' },
    resultInfo: { flex: 1 },
    resultTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
    resultSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
    resultDuration: { color: colors.glass30, fontSize: 11, marginTop: 2 },

    // Spotify
    spotifyOpenBtn: {
        backgroundColor: '#1DB95420',
        borderRadius: 12, borderWidth: 1, borderColor: '#1DB954',
        paddingHorizontal: 10, paddingVertical: 5,
    },
    spotifyOpenText: { color: '#1DB954', fontSize: 11, fontWeight: '700' },

    // SoundCloud
    scBadge: {
        backgroundColor: '#FF550020',
        borderRadius: 6, borderWidth: 1, borderColor: '#FF5500',
        paddingHorizontal: 5, paddingVertical: 1,
    },
    scBadgeText: { color: '#FF5500', fontSize: 9, fontWeight: '700' },

    // Attribution footer
    attributionFooter: {
        alignItems: 'center', padding: 20,
        borderTopWidth: 1, borderTopColor: colors.glass10,
    },
    attributionText: { color: colors.glass30, fontSize: 12 },

    // History
    historyHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    historyTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
    historyClearAll: { color: colors.accent, fontSize: 13, fontWeight: '600' },
    historyRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: colors.glass06, gap: 12,
    },
    historyText: { flex: 1, color: colors.glass70, fontSize: 14 },
    historyRemoveIcon: { color: colors.glass30, fontSize: 14 },

    // Artist detail
    artistDetailHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backToArtistsText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
    artistDetailSub: { color: colors.glass35, fontSize: 12 },

    // Playlist modal
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: {
        backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, gap: 8,
    },
    modalTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
    modalSubtitle: { color: colors.glass50, fontSize: 13, marginBottom: 8 },
    playlistItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.glass10,
    },
    playlistItemText: { color: colors.white, fontSize: 15 },
    playlistItemCount: { color: colors.glass40, fontSize: 12 },
});