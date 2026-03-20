// src/screens/(artist)/FollowedArtistsScreen.tsx
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
import { FollowButton } from '../../components/FollowButton';
import { getMyFollowedArtists, FollowResponse } from '../../services/social';
import { apiClient } from '../../services/api';

interface ArtistInfo {
    id: string;
    stageName: string;
    avatarUrl?: string;
    followId: string;
    followedAt: string;
}

export const FollowingScreen = () => {
    const navigation = useNavigation<any>();
    const insets     = useSafeAreaInsets();
    const [artists, setArtists]       = useState<ArtistInfo[]>([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage]             = useState(0);
    const [hasMore, setHasMore]       = useState(true);

    const load = useCallback(async (reset = false) => {
        try {
            const p = reset ? 0 : page;
            const res = await getMyFollowedArtists({ page: p, size: 20 });
            const follows: FollowResponse[] = res?.content ?? [];

            // Fetch artist details for each follow
            const artistInfos: ArtistInfo[] = await Promise.all(
                follows.map(async (f) => {
                    try {
                        const a = await apiClient.get<any>(`/artists/${f.artistId}`);
                        const data = a.data as any;
                        return {
                            id:         data?.id ?? f.artistId,
                            stageName:  data?.stageName ?? f.artistId,
                            avatarUrl:  data?.avatarUrl,
                            followId:   f.id,
                            followedAt: f.createdAt,
                        };
                    } catch {
                        return { id: f.artistId, stageName: f.artistId, followId: f.id, followedAt: f.createdAt };
                    }
                })
            );

            setArtists(prev => reset ? artistInfos : [...prev, ...artistInfos]);
            setHasMore(!res?.last);
            setPage(p + 1);
        } catch (e) { console.warn('FollowedArtists load:', e); }
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

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerRow}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Pressable
                        style={styles.discoverBtn}
                        onPress={() => navigation.navigate('ArtistDiscovery')}
                    >
                        <Text style={styles.discoverBtnText}>Khám phá nghệ sĩ</Text>
                    </Pressable>
                </View>
                <Text style={styles.title}>Đang theo dõi</Text>
                <Text style={styles.sub}>{artists.length} nghệ sĩ</Text>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
            ) : artists.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>🎤</Text>
                    <Text style={styles.emptyTitle}>Chưa theo dõi nghệ sĩ nào</Text>
                    <Text style={styles.emptyHint}>Khám phá và bấm Theo dõi để bắt đầu</Text>
                    <Pressable style={styles.exploreBtn} onPress={() => navigation.navigate('ArtistDiscovery')}>
                        <Text style={styles.exploreBtnText}>Khám phá nghệ sĩ</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={artists}
                    keyExtractor={i => i.followId}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
                    onEndReached={() => hasMore && load()}
                    onEndReachedThreshold={0.3}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.row}
                            onPress={() => navigation.navigate('ArtistProfile', { artistId: item.id })}
                        >
                            {item.avatarUrl ? (
                                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={{ fontSize: 24 }}>🎤</Text>
                                </View>
                            )}
                            <View style={styles.info}>
                                <Text style={styles.name} numberOfLines={1}>{item.stageName}</Text>
                                <Text style={styles.meta}>Nghệ sĩ</Text>
                            </View>
                            <FollowButton
                                artistId={item.id}
                                compact
                                onToggle={(following) => {
                                    if (!following) {
                                        setArtists(prev => prev.filter(a => a.id !== item.id));
                                    }
                                }}
                            />
                        </Pressable>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root:   { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingBottom: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    discoverBtn: {
        backgroundColor: COLORS.accentDim,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    discoverBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
    title:  { color: COLORS.white, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 4 },
    sub:    { color: COLORS.glass50, fontSize: 13 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
    },
    avatar:            { width: 52, height: 52, borderRadius: 26 },
    avatarPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
    meta: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyTitle:  { color: COLORS.glass60, fontSize: 17, fontWeight: '600' },
    emptyHint:   { color: COLORS.glass35, fontSize: 13 },
    exploreBtn:  { marginTop: 12, backgroundColor: COLORS.accentDim, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    exploreBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
});

export const FollowedArtistsScreen = FollowingScreen;