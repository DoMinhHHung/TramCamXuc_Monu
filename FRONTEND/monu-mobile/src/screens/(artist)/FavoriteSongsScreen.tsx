// src/screens/(artist)/FavoriteSongsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, FlatList, Image,
    Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { getMyHearts, unheartSong, HeartResponse } from '../../services/social';
import { getSongsByIds, Song } from '../../services/music';
import { usePlayer } from '../../context/PlayerContext';

interface FavoriteSongItem extends HeartResponse {
    songDetail?: Song;
}

export const FavoriteSongsScreen = () => {
    const navigation = useNavigation<any>();
    const insets     = useSafeAreaInsets();
    const { play }   = usePlayer();
    const [items, setItems]           = useState<FavoriteSongItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage]             = useState(0);
    const [hasMore, setHasMore]       = useState(true);

    const load = useCallback(async (reset = false) => {
        try {
            const p = reset ? 0 : page;
            const res = await getMyHearts({ page: p, size: 20 });
            const hearts = res?.content ?? [];

            // Batch-fetch song details
            const songIds = hearts.map(h => h.songId).filter(Boolean);
            let songMap: Record<string, Song> = {};
            if (songIds.length > 0) {
                try {
                    const songs = await getSongsByIds(songIds);
                    songs.forEach(s => { songMap[s.id] = s; });
                } catch { /* keep empty map, fall back to IDs */ }
            }

            const enriched: FavoriteSongItem[] = hearts.map(h => ({
                ...h,
                songDetail: songMap[h.songId],
            }));

            setItems(prev => reset ? enriched : [...prev, ...enriched]);
            setHasMore(!res?.last);
            setPage(p + 1);
        } catch (e) { console.warn('FavoriteSongs load:', e); }
    }, [page]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        setPage(0);
        load(true).finally(() => setLoading(false));
    }, [load]));

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(0);
        await load(true);
        setRefreshing(false);
    };

    const handleUnheart = async (songId: string) => {
        try {
            await unheartSong(songId);
            setItems(prev => prev.filter(h => h.songId !== songId));
        } catch {}
    };

    const handlePlay = (item: FavoriteSongItem) => {
        if (item.songDetail) {
            play(item.songDetail, items.map(i => i.songDetail).filter((s): s is Song => !!s));
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <BackButton onPress={() => navigation.goBack()} />
                <Text style={styles.title}>Bài hát yêu thích</Text>
                <Text style={styles.sub}>{items.length} bài hát</Text>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
            ) : items.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>♡</Text>
                    <Text style={styles.emptyTitle}>Chưa có bài hát yêu thích</Text>
                    <Text style={styles.emptyHint}>Bấm ♥ trên bài hát để thêm vào đây</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={i => i.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                    onEndReached={() => hasMore && load()}
                    onEndReachedThreshold={0.3}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    renderItem={({ item }) => {
                        const song = item.songDetail;
                        return (
                            <Pressable style={styles.row} onPress={() => handlePlay(item)}>
                                {song?.thumbnailUrl ? (
                                    <Image source={{ uri: song.thumbnailUrl }} style={styles.thumb} />
                                ) : (
                                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                                        <Text style={{ fontSize: 22 }}>🎵</Text>
                                    </View>
                                )}
                                <View style={styles.info}>
                                    <Text style={styles.songTitle} numberOfLines={1}>
                                        {song?.title ?? item.songId}
                                    </Text>
                                    <Text style={styles.meta} numberOfLines={1}>
                                        {song?.primaryArtist?.stageName
                                            ? `${song.primaryArtist.stageName} · ♥ ${item.totalHearts}`
                                            : `♥ ${item.totalHearts} lượt thích`}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => handleUnheart(item.songId)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={{ fontSize: 22, color: '#ff4081' }}>♥</Text>
                                </Pressable>
                            </Pressable>
                        );
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root:   { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingBottom: 20 },
    title:  { color: COLORS.white, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 4 },
    sub:    { color: COLORS.glass50, fontSize: 13 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
    },
    thumb:            { width: 50, height: 50, borderRadius: 8 },
    thumbPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    info:      { flex: 1 },
    songTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    meta:      { color: COLORS.glass45, fontSize: 12, marginTop: 3 },
    empty:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyTitle: { color: COLORS.glass60, fontSize: 17, fontWeight: '600' },
    emptyHint:  { color: COLORS.glass35, fontSize: 13 },
});