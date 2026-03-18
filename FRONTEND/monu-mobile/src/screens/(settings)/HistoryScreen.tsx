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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { usePlayer } from '../../context/PlayerContext';
import { clearListenHistory, getListenHistory, ListenHistoryItem } from '../../utils/listenHistory';

const timeAgo = (ms: number): string => {
  const mins = Math.max(1, Math.floor((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

export const HistoryScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { playSong } = usePlayer();

  const [items, setItems] = useState<ListenHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getListenHistory();
    setItems(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onClear = async () => {
    await clearListenHistory();
    setItems([]);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.gradNavy, COLORS.bg]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <BackButton onPress={() => navigation.goBack()} />
          {items.length > 0 ? (
            <Pressable style={styles.clearBtn} onPress={onClear}>
              <Text style={styles.clearBtnText}>Xóa lịch sử</Text>
            </Pressable>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>
        <Text style={styles.title}>Lịch sử nghe nhạc</Text>
        <Text style={styles.sub}>{items.length} bài đã nghe</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🕒</Text>
          <Text style={styles.emptyTitle}>Chưa có lịch sử nghe</Text>
          <Text style={styles.emptyHint}>Các bài bạn nghe sẽ hiển thị ở đây</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.song.id}-${index}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => playSong(item.song, items.map((x) => x.song))}>
              {item.song.thumbnailUrl ? (
                <Image source={{ uri: item.song.thumbnailUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={{ fontSize: 22 }}>🎵</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.song.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.song.primaryArtist?.stageName ? `${item.song.primaryArtist.stageName} · ${timeAgo(item.listenedAt)}` : timeAgo(item.listenedAt)}
                </Text>
              </View>
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
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 4 },
  sub: { color: COLORS.glass50, fontSize: 13 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glass15,
    backgroundColor: COLORS.glass07,
  },
  clearBtnText: { color: COLORS.glass70, fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
  },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  songTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  meta: { color: COLORS.glass45, fontSize: 12, marginTop: 3 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: COLORS.glass60, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: COLORS.glass35, fontSize: 13 },
});
