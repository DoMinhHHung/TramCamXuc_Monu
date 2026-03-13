import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, Pressable,
    StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../config/colors';
import { usePlayer } from '../../context/PlayerContext';
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
        // Lưu vào lịch sử khi user bấm search / enter
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
        // Lưu lại lịch sử (đưa lên đầu)
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
        // Lưu lịch sử khi chọn bài từ kết quả search
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
            <Text style={styles.playIcon}>▶</Text>
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
                />
                {query.length > 0 && (
                    <Pressable onPress={() => {
                        setQuery('');
                        setSongResults([]);
                        setArtistResults([]);
                        setArtistDetail(null);
                    }}>
                        <Text style={styles.clearIcon}>✕</Text>
                    </Pressable>
                )}
            </View>

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

            {/* ── Lịch sử tìm kiếm (hiện khi query rỗng) ── */}
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
                            <Text style={styles.hintText}>Nhập tên bài hát hoặc nghệ sĩ để tìm kiếm</Text>
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
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 12, gap: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    input:     { flex: 1, color: COLORS.white, fontSize: 16, paddingVertical: 8 },
    clearIcon: { color: COLORS.glass40, fontSize: 18, paddingHorizontal: 4 },

    tabs:          { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tabBtn:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    tabBtnActive:  { backgroundColor: COLORS.accentDim, borderColor: COLORS.accentDim },
    tabText:       { color: COLORS.muted, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: COLORS.white },

    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyText: { color: COLORS.glass35, textAlign: 'center', fontSize: 14, lineHeight: 22 },
    hintText:  { color: COLORS.glass25, textAlign: 'center', fontSize: 14 },

    // History
    historyHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    historyTitle:    { color: COLORS.white, fontSize: 15, fontWeight: '700' },
    historyClearAll: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
    historyRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
        gap: 12,
    },
    historyIcon:       { fontSize: 15, opacity: 0.5 },
    historyText:       { flex: 1, color: COLORS.glass70, fontSize: 14 },
    historyRemoveBtn:  { padding: 4 },
    historyRemoveIcon: { color: COLORS.glass30, fontSize: 14 },

    // Results
    resultRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06, gap: 12,
    },
    resultIndex:    { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.glass06, alignItems: 'center', justifyContent: 'center' },
    artistIconWrap: { backgroundColor: COLORS.accentFill20 },
    resultIndexText: { color: COLORS.glass40, fontSize: 12, fontWeight: '600' },
    resultInfo:     { flex: 1 },
    resultTitle:    { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    resultSub:      { color: COLORS.muted, fontSize: 12, marginTop: 2 },
    playIcon:       { color: COLORS.glass30, fontSize: 18 },

    // Artist detail
    artistDetailHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backToArtistsText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
    artistDetailSub:   { color: COLORS.glass35, fontSize: 12 },
});