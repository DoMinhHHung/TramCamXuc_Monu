import { Alert } from 'react-native';

import { reportSong, ReportReason } from '../services/music';

type TranslateFn = (key: string, fallback?: string) => string;

export interface ReportReasonPickerParams {
  songId: string;
  source: string;
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

export const showReportReasonPicker = ({ songId, source, onReported, t }: ReportReasonPickerParams): void => {
  const translate: TranslateFn = t ?? ((key, fallback) => fallback ?? key);
  const reasonOptions = getReasonOptions(translate);

  Alert.alert(
    translate('report.title', 'Chọn lý do báo cáo'),
    translate('report.message', 'Vui lòng chọn lý do phù hợp với nội dung bài hát.'),
    reasonOptions.map((option) => ({
      text: option.label,
      onPress: () => {
        Alert.alert(
          translate('report.confirmTitle', 'Xác nhận báo cáo'),
          `${translate('report.confirmMessage', 'Bạn có chắc muốn gửi báo cáo với lý do này không?')}\n\n${option.label}`,
          [
            {
              text: translate('report.confirmAction', 'Báo cáo'),
              onPress: async () => {
                try {
                  await reportSong(songId, {
                    reason: option.reason,
                    description: `Reported from ${source}: ${option.reason}`,
                  });
                  Alert.alert(
                    translate('report.successTitle', 'Đã gửi báo cáo'),
                    translate('report.successMessage', 'Cảm ơn bạn đã phản hồi.'),
                  );
                  onReported?.();
                } catch (error: any) {
                  Alert.alert(
                    translate('common.error', 'Lỗi'),
                    error?.message ?? translate('report.errorMessage', 'Không thể gửi báo cáo lúc này.'),
                  );
                }
              },
            },
          ],
        );
      },
    })),
  );
};
