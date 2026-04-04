import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../config/colors';
import { reportSong, ReportReason } from '../services/music';

type TranslateFn = (key: string, fallback?: string) => string;

export interface ReportReasonSheetProps {
  visible: boolean;
  songId: string;
  source: string;
  onClose: () => void;
  onReported?: () => void;
  t?: TranslateFn;
}

const getReasonOptions = (t: TranslateFn): Array<{ label: string; reason: ReportReason }> => [
  { label: t('report.reasons.copyrightViolation', 'Vi phạm bản quyền'), reason: 'COPYRIGHT_VIOLATION' },
  { label: t('report.reasons.explicitContent', 'Nội dung người lớn'), reason: 'EXPLICIT_CONTENT' },
  { label: t('report.reasons.hateSpeech', 'Phát ngôn thù ghét'), reason: 'HATE_SPEECH' },
  { label: t('report.reasons.spam', 'Spam'), reason: 'SPAM' },
  { label: t('report.reasons.misinformation', 'Thông tin sai lệch'), reason: 'MISINFORMATION' },
  { label: t('report.reasons.other', 'Khác'), reason: 'OTHER' },
];

export const ReportReasonSheet = ({
  visible,
  songId,
  source,
  onClose,
  onReported,
  t,
}: ReportReasonSheetProps) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const translate: TranslateFn = t ?? ((key, fallback) => fallback ?? key);
  const reasonOptions = useMemo(() => getReasonOptions(translate), [translate]);
  const [pendingReason, setPendingReason] = useState<ReportReason | null>(null);
  const [loadingReason, setLoadingReason] = useState<ReportReason | null>(null);

  const closeConfirm = () => {
    if (loadingReason === null) {
      setPendingReason(null);
    }
  };

  const handleReport = async (reason: ReportReason) => {
    setLoadingReason(reason);
    try {
      await reportSong(songId, {
        reason,
        description: `Reported from ${source}: ${reason}`,
      });
      Alert.alert(
        translate('report.successTitle', 'Đã gửi báo cáo'),
        translate('report.successMessage', 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ sớm kiểm tra.'),
      );
      setPendingReason(null);
      onClose();
      onReported?.();
    } catch (error: any) {
      Alert.alert(
        translate('common.error', 'Lỗi'),
        error?.message ?? translate('report.errorMessage', 'Không thể gửi báo cáo lúc này.'),
      );
    } finally {
      setLoadingReason(null);
    }
  };

  const pendingLabel = pendingReason
    ? reasonOptions.find((option) => option.reason === pendingReason)?.label ?? pendingReason
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]} onPress={() => null}>
          <View style={styles.handle} />
          <Text style={styles.title}>{translate('report.title', 'Chọn lý do báo cáo')}</Text>
          <Text style={styles.message}>{translate('report.message', 'Vui lòng chọn lý do phù hợp với nội dung bài hát.')}</Text>

          <View style={styles.actions}>
            {reasonOptions.map((option, index) => {
              const isLoading = loadingReason === option.reason;
              return (
                <Pressable
                  key={option.reason}
                  style={({ pressed }) => [
                    styles.reasonBtn,
                    pressed && styles.reasonBtnPressed,
                    isLoading && styles.reasonBtnLoading,
                    index === 0 && styles.reasonBtnPrimary,
                  ]}
                  onPress={() => setPendingReason(option.reason)}
                  disabled={loadingReason !== null}
                >
                  <Text style={styles.reasonText}>{option.label}</Text>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.reasonArrow}>›</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{translate('common.cancel', 'Hủy')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <Modal visible={pendingReason !== null} transparent animationType="fade" onRequestClose={closeConfirm}>
        <Pressable style={styles.confirmBackdrop} onPress={closeConfirm}>
          <Pressable style={styles.confirmCard} onPress={() => null}>
            <Text style={styles.confirmTitle}>{translate('report.confirmTitle', 'Xác nhận báo cáo')}</Text>
            <Text style={styles.confirmMessage}>
              {translate('report.confirmMessage', 'Bạn có chắc muốn gửi báo cáo với lý do này không?')}
            </Text>
            <View style={styles.confirmReasonPill}>
              <Text style={styles.confirmReasonText}>{pendingLabel}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
              onPress={() => pendingReason && void handleReport(pendingReason)}
              disabled={loadingReason !== null || pendingReason === null}
            >
              {loadingReason !== null ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.confirmBtnText}>{translate('report.confirmAction', 'Báo cáo')}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
};

const getStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.glass20,
    marginBottom: 14,
  },
  title: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  message: {
    color: colors.glass50,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  actions: {
    gap: 10,
  },
  reasonBtn: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.accentFill20,
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonBtnPrimary: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.glass20,
  },
  reasonBtnPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  reasonBtnLoading: {
    opacity: 0.8,
  },
  reasonText: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  reasonArrow: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '700',
    marginLeft: 12,
  },
  cancelBtn: {
    marginTop: 14,
    marginBottom: 2,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.glass15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.glass40,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glass12,
    gap: 10,
  },
  confirmTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  confirmMessage: {
    color: colors.glass60,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmReasonPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.accentFill20,
    borderWidth: 1,
    borderColor: colors.accentBorder25,
  },
  confirmReasonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  confirmBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
