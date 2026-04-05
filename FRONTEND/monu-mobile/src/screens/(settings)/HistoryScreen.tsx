import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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

import { ColorScheme, useThemeColors } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { RetryState } from '../../components/RetryState';
import { SectionSkeleton } from '../../components/SkeletonLoader';
import { usePlayer } from '../../context/PlayerContext';
import { useTranslation } from '../../context/LocalizationContext';
import { getSongsByIds } from '../../services/music';
import { getMyListenHistory } from '../../services/social';
import { clearListenHistory, getListenHistory, ListenHistoryItem } from '../../utils/listenHistory';

const timeAgo = (ms: number, t: (key: string, params?: any) => string): string => {
  const mins = Math.max(1, Math.floor((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins} ${t('screens.history.minutesAgoSuffix')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t('screens.history.hoursAgoSuffix')}`;
  return `${Math.floor(hours / 24)} ${t('screens.history.daysAgoSuffix')}`;
};

export const HistoryScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { playSong } = usePlayer();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [items, setItems] = useState<ListenHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fromServer = false;

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getListenHistory();
      setItems(data);
    } catch {
      setLoadError(t('errors.loadingFailed', 'Không thể tải lịch sử nghe nhạc'));
      setItems([]);
    }
  }, [t]);

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
    if (fromServer) {
      Alert.alert(
        t('screens.history.clearServerTitle', 'Lịch sử trên tài khoản'),
        t(
            'screens.history.clearServerMessage',
            'Lịch sử trên máy chủ chưa thể xóa từ app. Bạn vẫn có thể xóa bản nhớ cục bộ trên máy này.',
        ),
        [
          { text: t('common.cancel', 'Huỷ'), style: 'cancel' },
          {
            text: t('screens.history.clearLocalOnly', 'Xóa bản trên máy'),
            style: 'destructive',
            onPress: async () => {
              await clearListenHistory();
            },
          },
        ],
      );
      return;
    }
    await clearListenHistory();
    setItems([]);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[themeColors.gradNavy, themeColors.bg]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <BackButton onPress={() => navigation.goBack()} />
          {items.length > 0 ? (
            <Pressable style={styles.clearBtn} onPress={() => void onClear()}>
              <Text style={styles.clearBtnText}>
                {fromServer ? t('screens.history.clearOptions', 'Tuỳ chọn xóa') : t('screens.history.clearHistory')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>
        <Text style={styles.title}>{t('screens.history.title')}</Text>
        <Text style={styles.sub}>{`${items.length} ${t('screens.history.listenedCountSuffix')}`}</Text>
      </LinearGradient>

      {loading ? (
        <View style={{ paddingTop: 20 }}>
          <SectionSkeleton rows={4} />
        </View>
      ) : loadError && items.length === 0 ? (
        <RetryState
          title="Không tải được lịch sử"
          description={loadError}
          onRetry={() => { setLoading(true); void load().finally(() => setLoading(false)); }}
          fallbackLabel="Đóng"
          onFallback={() => navigation.goBack()}
          icon="🕒"
        />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🕒</Text>
          <Text style={styles.emptyTitle}>{t('screens.history.emptyTitle')}</Text>
          <Text style={styles.emptyHint}>{t('screens.history.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.song.id}-${index}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.accent} />}
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
                  {item.song.primaryArtist?.stageName ? `${item.song.primaryArtist.stageName} · ${timeAgo(item.listenedAt, t)}` : timeAgo(item.listenedAt, t)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.white, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 4 },
  sub: { color: colors.glass50, fontSize: 13 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass15,
    backgroundColor: colors.glass07,
  },
  clearBtnText: { color: colors.glass70, fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.glass06,
  },
  thumb: { width: 50, height: 50, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  songTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.glass45, fontSize: 12, marginTop: 3 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.glass60, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: colors.glass35, fontSize: 13 },
});
