import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../../components/BackButton';
import { RetryState } from '../../components/RetryState';
import { SectionSkeleton } from '../../components/SkeletonLoader';
import { COLORS } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';
import { getMyReportHistory, removeMyReport, ReportStatus, SongReportItem } from '../../services/music';

const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Đang chờ xử lý', color: COLORS.warningMid, bg: COLORS.warningDim },
  CONFIRMED: { label: 'Đã xử lý', color: COLORS.success, bg: 'rgba(34,197,94,0.16)' },
  DISMISSED: { label: 'Đã bác bỏ', color: COLORS.glass60, bg: COLORS.glass10 },
};

const reasonLabel = (reason: SongReportItem['reason']) => {
  switch (reason) {
    case 'COPYRIGHT_VIOLATION': return 'Vi phạm bản quyền';
    case 'EXPLICIT_CONTENT': return 'Nội dung người lớn';
    case 'HATE_SPEECH': return 'Phát ngôn thù ghét';
    case 'SPAM': return 'Spam';
    case 'MISINFORMATION': return 'Thông tin sai lệch';
    default: return 'Khác';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
};

export const ContentManagementScreen = () => {
  const navigation = useNavigation<any>();
  useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), []);

  const [reports, setReports] = useState<SongReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removingReportId, setRemovingReportId] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setLoadError(null);
      const data = await getMyReportHistory({ page: 1, size: 50 });
      setReports(data.content ?? []);
    } catch {
      setLoadError('Không thể tải danh sách báo cáo');
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load(false);
  }, [load]));

  const handleRemoveReport = useCallback((report: SongReportItem) => {
    Alert.alert(
      'Gỡ báo cáo?',
      'Bạn có muốn gỡ báo cáo này không? Bạn có thể báo cáo lại sau nếu cần.',
      [
        { text: 'Huỷ bỏ', style: 'cancel' },
        {
          text: 'Gỡ báo cáo',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingReportId(report.id);
              await removeMyReport(report.id);
              setReports((prev) => prev.filter((item) => item.id !== report.id));
            } catch (error: any) {
              Alert.alert('Lỗi', error?.message ?? 'Không thể gỡ báo cáo lúc này.');
            } finally {
              setRemovingReportId(null);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Quản lý nội dung</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <SectionSkeleton rows={3} />
        </View>
      ) : loadError && reports.length === 0 ? (
        <RetryState
          title="Không tải được nội dung"
          description={loadError}
          onRetry={() => { setLoading(true); void load(false); }}
          fallbackLabel="Quay lại"
          onFallback={() => navigation.goBack()}
          icon="🛡️"
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={COLORS.accent} />}
          ListEmptyComponent={(
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Chưa có báo cáo nào</Text>
              <Text style={styles.emptySub}>Khi bạn báo cáo một bài hát, trạng thái xử lý sẽ hiển thị ở đây.</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status];
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle} numberOfLines={2}>{item.songTitle}</Text>
                    <Text style={styles.reasonText}>Lý do: {reasonLabel(item.reason)}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={3}>
                  {item.description ?? 'Không có mô tả thêm.'}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Gửi lúc</Text>
                  <Text style={styles.metaValue}>{formatDate(item.createdAt)}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Xử lý lúc</Text>
                  <Text style={styles.metaValue}>{formatDate(item.reviewedAt)}</Text>
                </View>

                {item.status === 'PENDING' && (
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && styles.removeBtnPressed,
                        removingReportId === item.id && styles.removeBtnDisabled,
                      ]}
                      onPress={() => handleRemoveReport(item)}
                      disabled={removingReportId === item.id}
                    >
                      {removingReportId === item.id ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                      ) : (
                        <Text style={styles.removeBtnText}>Gỡ báo cáo</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {!!item.adminNote && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>Ghi chú từ quản trị</Text>
                    <Text style={styles.noteText}>{item.adminNote}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerTextWrap: { flex: 1, paddingHorizontal: 10 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  headerSub: { color: COLORS.glass45, fontSize: 12, textAlign: 'center', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: COLORS.glass45, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glass10, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  songTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  reasonText: { color: COLORS.glass60, fontSize: 12, marginTop: 4 },
  statusChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  description: { color: COLORS.glass70, fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaLabel: { color: COLORS.glass45, fontSize: 12 },
  metaValue: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  removeBtn: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: `${COLORS.error}20`,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnPressed: { opacity: 0.9 },
  removeBtnDisabled: { opacity: 0.6 },
  removeBtnText: { color: COLORS.error, fontSize: 12, fontWeight: '700' },
  noteBox: { borderRadius: 12, backgroundColor: COLORS.glass08, borderWidth: 1, borderColor: COLORS.glass12, padding: 10, gap: 4 },
  noteLabel: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  noteText: { color: COLORS.glass80, fontSize: 13, lineHeight: 18 },
});