import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { FollowResponse, getArtistByUserId, getArtistFollowers } from '../../services/social';
import { apiClient } from '../../services/api';

interface FollowerInfo {
  followId: string;
  followerId: string;
  displayName: string;
  avatarUrl?: string;
  artistId?: string;
  followedAt: string;
}

export const FollowersScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const artistId = route.params?.artistId as string;
  const artistName = route.params?.artistName as string | undefined;

  const [followers, setFollowers] = useState<FollowerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (reset = false) => {
    if (!artistId) return;
    try {
      const p = reset ? 0 : page;
      const res = await getArtistFollowers(artistId, { page: p, size: 20 });
      const follows: FollowResponse[] = res?.content ?? [];

      const mapped: FollowerInfo[] = await Promise.all(
        follows.map(async (f) => {
          const followerId = String(f.followerId);

          let displayName = `User ${followerId.slice(0, 6)}`;
          let avatarUrl: string | undefined;
          let followerArtistId: string | undefined;

          try {
            const userRes = await apiClient.get<any>(`/users/${followerId}`);
            const user = userRes.data as any;
            displayName = user?.fullName || user?.email || displayName;
            avatarUrl = user?.avatarUrl;
          } catch {
            // keep fallback name
          }

          try {
            const artist = await getArtistByUserId(followerId);
            followerArtistId = artist?.id;
          } catch {
            // optional
          }

          return {
            followId: f.id,
            followerId,
            displayName,
            avatarUrl,
            artistId: followerArtistId,
            followedAt: String(f.createdAt),
          };
        }),
      );

      setFollowers((prev) => (reset ? mapped : [...prev, ...mapped]));
      setHasMore(!res?.last);
      setPage(p + 1);
    } catch (e) {
      console.warn('Followers load:', e);
    }
  }, [artistId, page]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(0);
      load(true).finally(() => setLoading(false));
    }, [load]),
  );

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
        </View>
        <Text style={styles.title}>Người theo dõi</Text>
        <Text style={styles.sub}>{artistName ? `${artistName} · ` : ''}{followers.length} người</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
      ) : followers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
          <Text style={styles.emptyTitle}>Chưa có người theo dõi</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.followId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          onEndReached={() => hasMore && load()}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => item.artistId && navigation.navigate('ArtistProfile', { artistId: item.artistId })}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                <Text style={styles.meta}>{item.artistId ? 'Nghệ sĩ' : 'Người dùng'}</Text>
              </View>
              {item.artistId ? <Text style={styles.chevron}>›</Text> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 4 },
  sub: { color: COLORS.glass50, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass06,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  meta: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  chevron: { color: COLORS.glass35, fontSize: 24, marginRight: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: COLORS.glass60, fontSize: 17, fontWeight: '600' },
});
