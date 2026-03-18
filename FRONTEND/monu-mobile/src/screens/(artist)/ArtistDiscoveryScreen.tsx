// src/screens/(artist)/ArtistDiscoveryScreen.tsx
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
import { getPopularArtists } from '../../services/favorites';
import { Artist } from '../../types/favorites';
import { getMyFollowedArtists } from '../../services/social';

export const ArtistDiscoveryScreen = () => {
    const navigation           = useNavigation<any>();
    const insets               = useSafeAreaInsets();
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Track locally which artists the user just followed so they disappear from the list
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        try {
            // Fetch popular artists and the user's current follows in parallel
            const [allArtists, followRes] = await Promise.allSettled([
                getPopularArtists(50),
                getMyFollowedArtists({ page: 1, size: 200 }),
            ]);

            const popular = allArtists.status === 'fulfilled' ? allArtists.value : [];

            const alreadyFollowed = new Set<string>();
            if (followRes.status === 'fulfilled') {
                (followRes.value?.content ?? []).forEach(f => alreadyFollowed.add(f.artistId));
            }

            // Show only artists that are not yet followed
            setArtists(popular.filter(a => !alreadyFollowed.has(a.id)));
            setFollowedIds(alreadyFollowed);
        } catch (e) {
            console.warn('ArtistDiscovery load:', e);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        setLoading(true);
        load().finally(() => setLoading(false));
    }, [load]));

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    // When user follows an artist, remove them from the discovery list
    const handleToggle = (artistId: string, following: boolean) => {
        if (following) {
            setArtists(prev => prev.filter(a => a.id !== artistId));
        }
    };

    const visibleArtists = artists.filter(a => !followedIds.has(a.id));

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <BackButton onPress={() => navigation.goBack()} />
                <Text style={styles.title}>Khám phá nghệ sĩ</Text>
                <Text style={styles.sub}>Những nghệ sĩ bạn chưa theo dõi</Text>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
            ) : visibleArtists.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ fontSize: 52, marginBottom: 12 }}>🎤</Text>
                    <Text style={styles.emptyTitle}>Bạn đã theo dõi tất cả nghệ sĩ!</Text>
                    <Text style={styles.emptyHint}>Không có nghệ sĩ mới để gợi ý</Text>
                </View>
            ) : (
                <FlatList
                    data={visibleArtists}
                    keyExtractor={i => i.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
                    }
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
                                {item.bio ? (
                                    <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
                                ) : (
                                    <Text style={styles.bio}>Nghệ sĩ</Text>
                                )}
                            </View>
                            <FollowButton
                                artistId={item.id}
                                compact
                                onToggle={(following) => handleToggle(item.id, following)}
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
    bio:  { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    emptyTitle: { color: COLORS.glass60, fontSize: 17, fontWeight: '600' },
    emptyHint:  { color: COLORS.glass35, fontSize: 13 },
});
