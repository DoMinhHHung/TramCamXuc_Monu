import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, FlatList,
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

export const FavoriteSongsScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [hearts, setHearts] = useState<HeartResponse[]>([]);
    const [songMap, setSongMap] = useState<Record<string, Song>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const hydrateSongDetails = useCallback(async (items: HeartResponse[]) => {
        const ids = [...new Set(items.map((it) => it.songId))];
        if (ids.length === 0) return;

        try {
            const songs = await getSongsByIds(ids);
            const mapping = songs.reduce<Record<string, Song>>((acc, song) => {
                acc[song.id] = song;
                return acc;
            }, {});
            setSongMap(mapping);
        } catch (e) {
            console.warn('FavoriteSongs hydrate:', e);
        }
    }, []);

    const load = useCallback(async (reset = false) => {
        try {
            const currentPage = reset ? 1 : page;
            const res = await getMyHearts({ page: currentPage, size: 20 });
            const items = res?.content ?? [];
            const merged = reset ? items : [...hearts, ...items];

            setHearts(merged);
            await hydrateSongDetails(merged);
            setHasMore(!res?.last);
            if (!reset) setPage(currentPage + 1);
        } catch (e) {
            console.warn('FavoriteSongs load:', e);
        }
    }, [page, hearts, hydrateSongDetails]);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        setPage(1);
        load(true).finally(() => setLoading(false));
    }, [load]));

    const onRefresh = async () => {
        setRefreshing(true);
        setPage(1);
        await load(true);
        setRefreshing(false);
    };

    const handleUnheart = async (songId: string) => {
        try {
            await unheartSong(songId);
            setHearts((prev) => prev.filter((h) => h.songId !== songId));
        } catch {}
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
                <Text style={styles.sub}>{hearts.length} bài hát</Text>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
            ) : hearts.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>♡</Text>
                    <Text style={styles.emptyTitle}>Chưa có bài hát yêu thích</Text>
                    <Text style={styles.emptyHint}>Bấm ♥ trên bài hát để thêm vào đây</Text>
                </View>
            ) : (
                <FlatList
                    data={hearts}
                    keyExtractor={(i) => i.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                    onEndReached={() => hasMore && load()}
                    onEndReachedThreshold={0.3}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            <View style={styles.thumb}>
                                <Text style={{ fontSize: 22 }}>🎵</Text>
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.songId} numberOfLines={1}>
                                    {songMap[item.songId]?.title ?? item.songId}
                                </Text>
                                <Text style={styles.meta}>
                                    {songMap[item.songId]?.primaryArtist?.stageName ?? 'Không rõ nghệ sĩ'} · ♥ {item.totalHearts}
                                </Text>
                            </View>
                            <Pressable onPress={() => handleUnheart(item.songId)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={{ fontSize: 22, color: '#ff4081' }}>♥</Text>
                            </Pressable>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingBottom: 20 },
    title: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 4 },
    sub: { color: COLORS.glass50, fontSize: 13 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
    },
    thumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    songId: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
    meta: { color: COLORS.glass45, fontSize: 12, marginTop: 3 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyTitle: { color: COLORS.glass60, fontSize: 17, fontWeight: '600' },
    emptyHint: { color: COLORS.glass35, fontSize: 13 },
});
