import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated, FlatList, Pressable,
    StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';

import { BackButton } from '../../components/BackButton';
import { VoiceSearchButton } from '../../components/VoiceSearchButton';
import { COLORS } from '../../config/colors';
import { usePlayer } from '../../context/PlayerContext';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import {
    Artist, getSongsByArtist, searchArtists, searchSongs, Song,
} from '../../services/music';
import {
    addSearchHistory, clearSearchHistory,
    getSearchHistory, removeSearchHistoryItem,
} from '../../utils/searchHistory';

type Tab = 'songs' | 'artists';

export const SearchScreen = () => {
    const insets     = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { playSong } = usePlayer();

    const [query,          setQuery]          = useState('');
    const [tab,            setTab]            = useState<Tab>('songs');
    const [loading,        setLoading]        = useState(false);
    const [songResults,    setSongResults]    = useState<Song[]>([]);
    const [artistResults,  setArtistResults]  = useState<Artist[]>([]);
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
            doSearch(text.trim(), tab);
        }
    }, [voice, tab]);

    // ── Mount: load history + focus input ────────────────────────────────────
    useEffect(() => {
        getSearchHistory().then(setHistory);
        setTimeout(() => inputRef.current?.focus(), 120);
    }, []);

    // ── Search ────────────────────────────────────────────────────────────────
    const doSearch = useCallback(async (q: string, currentTab: Tab) => {
        if (!q.trim()) {
            setSongResults([]);
            setArtistResults([]);
            setArtistDetail(null);
            return;
        }
        setLoading(true);
        setArtistDetail(null);
        try {
            if (currentTab === 'songs') {
                const res = await searchSongs({ keyword: q, size: 30 });
                setSongResults(res.content);
            } else {
                const res = await searchArtists({ keyword: q, size: 20 });
                setArtistResults(res.content);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    const scheduleSearch = (q: string, t: Tab) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(q, t), 380);
    };

    const handleQueryChange = (q: string) => {
        setQuery(q);
        if (!q.trim()) {
            setSongResults([]);
            setArtistResults([]);
            setArtistDetail(null);
        } else {
            scheduleSearch(q, tab);
        }
    };

    const handleSubmit = async () => {
        if (!query.trim()) return;
        await addSearchHistory(query.trim());
        setHistory(await getSearchHistory());
        doSearch(query.trim(), tab);
    };

    const handleTabChange = (t: Tab) => {
        setTab(t);
        setSongResults([]);
        setArtistResults([]);
        setArtistDetail(null);
        if (query.trim()) scheduleSearch(query, t);
    };

    // ── History actions ───────────────────────────────────────────────────────
    const handleHistoryItemPress = (q: string) => {
        setQuery(q);
        scheduleSearch(q, tab);
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

    // ── Helpers ───────────────────────────────────────────────────────────────
    const showHistory  = !query.trim();
    const showEmpty    = !loading && !!query.trim() && !artistDetail
        && (tab === 'songs' ? songResults.length === 0 : artistResults.length === 0);

    const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
        <Pressable
            style={styles.resultRow}
            onPress={() => handleSongPress(item, tab === 'songs' ? songResults : artistDetail?.songs ?? [])}
        >
            <View style={styles.resultIndex}>
                <Text style={styles.resultIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultSub}   numberOfLines={1}>{item.primaryArtist.stageName}</Text>
            </View>
            <AntDesign name="play-circle" size={26} color="#fff" />
        </Pressable>
    );

    const renderArtistItem = ({ item }: { item: Artist }) => (
        <Pressable style={styles.resultRow} onPress={() => handleArtistPress(item)}>
            <View style={[styles.resultIndex, styles.artistIconWrap]}>
                <Text style={{ fontSize: 18 }}>🎤</Text>
            </View>
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.stageName}</Text>
                <Text style={styles.resultSub}>Nghệ sĩ</Text>
            </View>
            <Text style={styles.playIcon}>›</Text>
        </Pressable>
    );

    // ── Voice state label ─────────────────────────────────────────────────────
    const voiceStateLabel = voice.state === 'recording'
        ? '🔴  Đang ghi âm... thả để tìm kiếm'
        : voice.state === 'processing'
            ? '⏳  Đang nhận dạng giọng nói...'
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
                    placeholder="Tìm bài hát, nghệ sĩ..."
                    placeholderTextColor={COLORS.glass35}
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
                    voice.state === 'error' && { color: COLORS.error },
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

            {/* ── Tabs (chỉ hiện khi có query) ── */}
            {!showHistory && (
                <View style={styles.tabs}>
                    {(['songs', 'artists'] as Tab[]).map(t => (
                        <Pressable
                            key={t}
                            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                            onPress={() => handleTabChange(t)}
                        >
                            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                                {t === 'songs' ? '🎵 Bài hát' : '🎤 Nghệ sĩ'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* ── Loading ── */}
            {loading && (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.accent} />
                </View>
            )}

            {/* ── History ── */}
            {!loading && showHistory && (
                <View style={{ flex: 1 }}>
                    {history.length > 0 ? (
                        <>
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyTitle}>Lịch sử tìm kiếm</Text>
                                <Pressable onPress={handleClearHistory} hitSlop={8}>
                                    <Text style={styles.historyClearAll}>Xóa tất cả</Text>
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
                                        <Text style={styles.historyIcon}>🕐</Text>
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
                                <Text style={styles.voiceHintTitle}>Tìm kiếm bằng giọng nói</Text>
                                <Text style={styles.voiceHintDesc}>
                                    Nhấn và giữ nút 🎤 ở góc phải để nói tên bài hát hoặc nghệ sĩ
                                </Text>
                            </View>
                            <Text style={styles.hintText}>Hoặc nhập từ khóa vào ô tìm kiếm</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── Empty ── */}
            {!loading && showEmpty && (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Không tìm thấy kết quả cho "{query}"</Text>
                </View>
            )}

            {/* ── Artist detail ── */}
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
                <>
                    {tab === 'songs' && songResults.length > 0 && (
                        <FlatList
                            data={songResults}
                            keyExtractor={s => s.id}
                            renderItem={renderSongItem}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    )}
                    {tab === 'artists' && artistResults.length > 0 && (
                        <FlatList
                            data={artistResults}
                            keyExtractor={a => a.artistId}
                            renderItem={renderArtistItem}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root:   { flex: 1, backgroundColor: COLORS.bg },

    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, gap: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass08,
    },
    input: {
        flex: 1, color: COLORS.white, fontSize: 16, paddingVertical: 10, fontWeight: '500',
    },
    clearIcon: { color: COLORS.glass45, fontSize: 18, paddingHorizontal: 2 },

    // ── Voice banner ─────────────────────────────────────────────────────────
    voiceBanner: {
        backgroundColor: COLORS.accentFill25,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.accentBorder25,
        paddingHorizontal: 20,
        paddingVertical: 11,
    },
    voiceBannerText: {
        color: COLORS.accent,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.errorDim,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.error,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
    },
    errorBannerText: {
        flex: 1,
        color: COLORS.error,
        fontSize: 13,
        fontWeight: '500',
    },
    errorBannerDismiss: {
        color: COLORS.error,
        fontSize: 16,
        fontWeight: '700',
    },

    // ── Tabs ─────────────────────────────────────────────────────────────────
    tabs:          { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    tabBtn:        { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: COLORS.glass15 },
    tabBtnActive:  { backgroundColor: COLORS.accentDim, borderColor: COLORS.accentDim },
    tabText:       { color: COLORS.glass60, fontWeight: '600', fontSize: 14 },
    tabTextActive: { color: COLORS.white },

    // ── Common ────────────────────────────────────────────────────────────────
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyText: { color: COLORS.glass40, textAlign: 'center', fontSize: 15, lineHeight: 22, fontWeight: '500' },
    hintText:  { color: COLORS.glass30, textAlign: 'center', fontSize: 13, marginTop: 14 },


    voiceHintBox: {
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.glass12,
        padding: 28,
        marginBottom: 24,
        width: '100%',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    voiceHintIcon:  { fontSize: 48, marginBottom: 14 },
    voiceHintTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
    voiceHintDesc:  {
        color: COLORS.glass50, fontSize: 14, textAlign: 'center', lineHeight: 21,
    },

    // ── History ───────────────────────────────────────────────────────────────
    historyHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    historyTitle:    { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
    historyClearAll: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
    historyRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
        gap: 12,
    },
    historyIcon:       { fontSize: 16, opacity: 0.6 },
    historyText:       { flex: 1, color: COLORS.glass75, fontSize: 15, fontWeight: '500' },
    historyRemoveBtn:  { padding: 5 },
    historyRemoveIcon: { color: COLORS.glass35, fontSize: 14, fontWeight: '700' },

    // ── Results ───────────────────────────────────────────────────────────────
    resultRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06, gap: 12,
    },
    resultIndex:    { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.glass08, alignItems: 'center', justifyContent: 'center' },
    artistIconWrap: { backgroundColor: COLORS.accentFill25 },
    resultIndexText: { color: COLORS.glass45, fontSize: 13, fontWeight: '700' },
    resultInfo:     { flex: 1 },
    resultTitle:    { color: COLORS.white, fontSize: 15, fontWeight: '600' },
    resultSub:      { color: COLORS.glass50, fontSize: 13, marginTop: 3, fontWeight: '500' },
    playIcon:       { color: COLORS.glass40, fontSize: 18 },

    // ── Artist detail ─────────────────────────────────────────────────────────
    artistDetailHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass08,
    },
    backToArtistsText: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },
    artistDetailSub:   { color: COLORS.glass45, fontSize: 13, fontWeight: '500' },
});
