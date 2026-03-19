import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS } from '../../config/colors';
import { ICONS, ICON_SIZES } from '../../config/icons';
import { useAuth } from '../../context/AuthContext';
import { useUpload, UploadStage } from '../../context/UploadContext';
import { apiClient } from '../../services/api';
import { Genre } from '../../services/music';
import { getPopularGenres } from '../../services/favorites';
import { getMySubscription } from '../../services/payment';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;

type ArtistProfile = {
  id: string;
  stageName: string;
  status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UPLOAD_STAGE_HINT: Partial<Record<UploadStage, string>> = {
  requesting: 'Đang kết nối server...',
  uploading:  'Upload đang chạy nền — bạn có thể dùng app bình thường.',
  confirming: 'Gần xong rồi...',
  done:       'Bài hát đã được gửi lên. Hệ thống sẽ xử lý trong vài phút.',
  error:      'Upload thất bại. Kiểm tra kết nối và thử lại.',
};

// Debug function for development-only logs
const debugCreateUpload = (event: string, payload?: Record<string, unknown>) => {
  if (!__DEV__) return;
  const time = new Date().toISOString();
  if (payload) {
    console.log(`[CreateScreen][${time}] ${event}`, payload);
    return;
  }
  console.log(`[CreateScreen][${time}] ${event}`);
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CreateScreen = () => {
  const insets     = useSafeAreaInsets();
  const { authSession } = useAuth();
  const { job, startUpload } = useUpload();
  const publishAttemptRef = useRef(0);
  const lastProgressBucketRef = useRef<number>(-1);

  // ── Page state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]             = useState(true);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [hasActiveSub, setHasActiveSub]   = useState(false);
  const [genres, setGenres]               = useState<Genre[]>([]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title, setTitle]                 = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [pickedFile, setPickedFile]       = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // ── Artist register form ───────────────────────────────────────────────────
  const [stageName, setStageName]         = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    void loadPageData();
  }, [authSession?.tokens.accessToken]);

  useEffect(() => {
    if (!job || job.stage === 'idle') return;

    if (job.stage === 'uploading') {
      const progressBucket = Math.floor(job.progress / 10) * 10;
      if (progressBucket !== lastProgressBucketRef.current) {
        lastProgressBucketRef.current = progressBucket;
        debugCreateUpload('upload_progress', {
          title: job.title,
          stage: job.stage,
          progress: job.progress,
          bucket: progressBucket,
        });
      }
      return;
    }

    debugCreateUpload('upload_stage_changed', {
      title: job.title,
      stage: job.stage,
      progress: job.progress,
      error: job.error ?? null,
    });

    if (job.stage === 'done' || job.stage === 'error') {
      lastProgressBucketRef.current = -1;
    }
  }, [job]);

  const loadPageData = async () => {
    if (!authSession) { setLoading(false); return; }
    setLoading(true);
    try {
      const [artistRes, subRes, genreRes] = await Promise.allSettled([
        apiClient.get<ArtistProfile>('/artists/me'),
        getMySubscription(),
        getPopularGenres(20),
      ]);

      setArtistProfile(
          artistRes.status === 'fulfilled' ? artistRes.value.data : null
      );
      setHasActiveSub(
          subRes.status === 'fulfilled' &&
          subRes.value?.status === 'ACTIVE' &&
          new Date(subRes.value.expiresAt).getTime() > Date.now()
      );
      setGenres(
          genreRes.status === 'fulfilled'
              ? (genreRes.value as unknown as Genre[])
              : []
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const isBanned       = authSession?.profile?.status === 'BANNED' ||
      artistProfile?.status === 'BANNED';
  const isArtist       = !!artistProfile?.id;
  const canUpload      = !isBanned && isArtist && hasActiveSub;
  const isUploadActive = job !== null &&
      ['requesting', 'uploading', 'confirming'].includes(job.stage);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    debugCreateUpload('pick_file_opened');
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) {
      debugCreateUpload('pick_file_canceled');
      return;
    }

    const file = picked.assets[0];
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
      debugCreateUpload('pick_file_rejected_extension', {
        fileName: file.name,
        extension: ext,
        allowed: ALLOWED_EXTENSIONS.join(','),
      });
      Alert.alert(
          'Định dạng không hỗ trợ',
          `Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
      return;
    }
    setPickedFile(file);
    debugCreateUpload('pick_file_selected', {
      fileName: file.name,
      extension: ext,
      sizeBytes: file.size ?? null,
      mimeType: file.mimeType ?? null,
    });
  };

  const handlePublish = async () => {
    const attemptId = ++publishAttemptRef.current;
    debugCreateUpload('publish_clicked', {
      attemptId,
      titleLength: title.trim().length,
      selectedGenres: selectedGenreIds.length,
      hasFile: !!pickedFile,
      canUpload,
      isUploadActive,
    });

    if (!title.trim()) {
      debugCreateUpload('publish_blocked_missing_title', { attemptId });
      Alert.alert('Thiếu thông tin', 'Nhập tên bài hát.');
      return;
    }
    if (selectedGenreIds.length === 0) {
      debugCreateUpload('publish_blocked_missing_genre', { attemptId });
      Alert.alert('Thiếu thông tin', 'Chọn ít nhất 1 thể loại.');
      return;
    }
    if (!pickedFile) {
      debugCreateUpload('publish_blocked_missing_file', { attemptId });
      Alert.alert('Chưa chọn file', 'Chọn file nhạc trước khi đăng.');
      return;
    }
    if (isUploadActive) {
      debugCreateUpload('publish_blocked_upload_active', { attemptId, stage: job?.stage ?? null });
      return;
    }

    // Reset form — upload chạy nền thông qua context
    const titleCopy       = title;
    const genresCopy      = [...selectedGenreIds];
    const fileCopy        = pickedFile;

    debugCreateUpload('publish_trigger_upload', {
      attemptId,
      title: titleCopy,
      genres: genresCopy,
      fileName: fileCopy.name,
      fileSizeBytes: fileCopy.size ?? null,
      mimeType: fileCopy.mimeType ?? null,
    });

    setTitle('');
    setSelectedGenreIds([]);
    setPickedFile(null);

    try {
      await startUpload({ title: titleCopy, genreIds: genresCopy, file: fileCopy });
      debugCreateUpload('publish_startUpload_resolved', { attemptId });
    } catch (error: any) {
      debugCreateUpload('publish_startUpload_failed', {
        attemptId,
        message: error?.message ?? 'unknown',
      });
      throw error;
    }
  };

  const handleRegisterArtist = async () => {
    if (!stageName.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập nghệ danh.');
      return;
    }
    setRegisterLoading(true);
    try {
      await apiClient.post('/artists/register', {
        stageName: stageName.trim(),
        bio: 'Artist from Monu',
      });
      Alert.alert('Đã gửi đăng ký', 'Hệ thống đang xét duyệt. Refresh lại để kiểm tra.');
      setStageName('');
      await loadPageData();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message ?? 'Không thể đăng ký artist.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const toggleGenre = (id: string) => {
    setSelectedGenreIds(prev =>
        prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  // ── Render loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
        <View style={styles.centerFull}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
    );
  }

  // ── Render not logged in ───────────────────────────────────────────────────
  if (!authSession) {
    return (
      <View style={styles.centerFull}>
        <Text style={styles.gateEmoji}>{ICONS.lock}</Text>
          <Text style={styles.gateTitle}>Đăng nhập để tạo nội dung</Text>
        </View>
    );
  }

  // ── Render banned ─────────────────────────────────────────────────────────
  if (isBanned) {
    return (
      <View style={styles.centerFull}>
        <Text style={styles.gateEmoji}>{ICONS.banned}</Text>
          <Text style={styles.gateTitle}>Tài khoản bị hạn chế</Text>
          <Text style={styles.gateSub}>Liên hệ hỗ trợ để biết thêm chi tiết.</Text>
        </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ScrollView
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
        >
          {/* ── Hero header ──────────────────────────────────────────── */}
          <LinearGradient
              colors={[COLORS.gradNavy, COLORS.bg]}
              style={[styles.hero, { paddingTop: insets.top + 20 }]}
          >
            <Text style={styles.heroEmoji}>{ICONS.music_note}</Text>
            <Text style={styles.heroTitle}>Creator Studio</Text>
            <Text style={styles.heroSub}>
              {canUpload
                  ? `Xin chào, ${artistProfile?.stageName} ${ICONS.wave}`
                  : isArtist && !hasActiveSub
                      ? 'Gói cước đã hết hạn — gia hạn để tiếp tục upload'
                      : !isArtist
                          ? 'Đăng ký artist để bắt đầu upload nhạc'
                          : ''}
            </Text>
          </LinearGradient>

          <View style={styles.body}>

            {/* ── Upload đang chạy nền: status card ───────────────── */}
            {job && job.stage !== 'idle' && (
                <View style={[
                  styles.statusCard,
                  job.stage === 'error'  && { borderColor: COLORS.error },
                  job.stage === 'done'   && { borderColor: COLORS.success },
                ]}>
                  <Text style={styles.statusTitle}>
                    {job.stage === 'done'  ? '✓ Upload hoàn tất' :
                        job.stage === 'error' ? '✕ Upload thất bại' :
                            '↑  Đang upload...'}
                  </Text>
                  <Text style={styles.statusSong} numberOfLines={1}>
                    {job.title}
                  </Text>
                  {job.stage === 'uploading' && (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressTrack}>
                          <View
                              style={[
                                styles.progressFill,
                                { width: `${job.progress}%` as any },
                              ]}
                          />
                        </View>
                        <Text style={styles.progressPct}>{job.progress}%</Text>
                      </View>
                  )}
                  <Text style={styles.statusHint}>
                    {UPLOAD_STAGE_HINT[job.stage] ?? ''}
                  </Text>
                </View>
            )}

            {/* ── Chưa là artist: register form ───────────────────── */}
            {!isArtist && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Trở thành Artist</Text>
                  <Text style={styles.cardDesc}>
                    Bạn cần gói cước có tính năng{' '}
                    <Text style={{ color: COLORS.accent }}>đăng ký artist</Text>
                    {' '}để upload nhạc.
                  </Text>

                  {hasActiveSub ? (
                      <>
                        <TextInput
                            style={styles.input}
                            value={stageName}
                            onChangeText={setStageName}
                            placeholder="Nghệ danh của bạn"
                            placeholderTextColor={COLORS.glass35}
                        />
                        <Pressable
                            style={[styles.primaryBtn,
                              registerLoading && styles.disabledBtn]}
                            onPress={handleRegisterArtist}
                            disabled={registerLoading}
                        >
                          {registerLoading
                              ? <ActivityIndicator color={COLORS.white} />
                              : <Text style={styles.primaryBtnText}>Đăng ký Artist</Text>
                          }
                        </Pressable>
                      </>
                  ) : (
                      <Text style={styles.cardDesc}>
                        Nâng cấp lên gói Premium trong tab{' '}
                        <Text style={{ color: COLORS.accent }}>Premium</Text>
                        {' '}để mở khoá.
                      </Text>
                  )}
                </View>
            )}

            {/* ── Artist nhưng hết sub ─────────────────────────────── */}
            {isArtist && !hasActiveSub && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Gia hạn gói cước</Text>
                  <Text style={styles.cardDesc}>
                    Gói cước của bạn đã hết hạn. Vào tab{' '}
                    <Text style={{ color: COLORS.accent }}>Premium</Text>
                    {' '}để gia hạn và tiếp tục upload nhạc.
                  </Text>
                </View>
            )}

            {/* ── Upload form (chỉ khi canUpload) ─────────────────── */}
            {canUpload && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Đăng bài hát mới</Text>

                  {/* Tên bài hát */}
                  <Text style={styles.fieldLabel}>Tên bài hát</Text>
                  <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Nhập tên bài hát..."
                      placeholderTextColor={COLORS.glass35}
                      editable={!isUploadActive}
                  />

                  {/* Chọn file nhạc */}
                  <Text style={styles.fieldLabel}>File nhạc</Text>
                  <Pressable
                      style={[
                        styles.filePicker,
                        pickedFile && styles.filePickerSelected,
                        isUploadActive && styles.disabledBtn,
                      ]}
                      onPress={handlePickFile}
                      disabled={isUploadActive}
                  >
                    {pickedFile ? (
                        <View style={styles.filePickerRow}>
                          <Text style={styles.fileIcon}>{ICONS.song}</Text>
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName} numberOfLines={1}>
                              {pickedFile.name}
                            </Text>
                            <Text style={styles.fileSize}>
                              {pickedFile.size
                                  ? `${(pickedFile.size / 1024 / 1024).toFixed(1)} MB`
                                  : ''}
                              {'  ·  '}
                              {pickedFile.name.split('.').pop()?.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.fileChange}>Đổi</Text>
                        </View>
                    ) : (
                        <View style={styles.filePickerEmpty}>
                          <Text style={styles.filePickerPlus}>+</Text>
                          <Text style={styles.filePickerHint}>
                            Chọn file nhạc
                          </Text>
                          <Text style={styles.filePickerFormats}>
                            {ALLOWED_EXTENSIONS.join('  ·  ').toUpperCase()}
                          </Text>
                        </View>
                    )}
                  </Pressable>

                  {/* Thể loại */}
                  <Text style={styles.fieldLabel}>
                    Thể loại
                    {selectedGenreIds.length > 0 &&
                        <Text style={{ color: COLORS.accent }}>
                          {' '}({selectedGenreIds.length})
                        </Text>
                    }
                  </Text>
                  <View style={styles.genreWrap}>
                    {genres.map(g => {
                      const active = selectedGenreIds.includes(g.id);
                      return (
                          <Pressable
                              key={g.id}
                              style={[
                                styles.genreChip,
                                active && styles.genreChipActive,
                                isUploadActive && styles.disabledBtn,
                              ]}
                              onPress={() => !isUploadActive && toggleGenre(g.id)}
                          >
                            <Text style={[
                              styles.genreText,
                              active && styles.genreTextActive,
                            ]}>
                              {g.name}
                            </Text>
                          </Pressable>
                      );
                    })}
                  </View>

                  {/* Publish button */}
                  <Pressable
                      style={[
                        styles.publishBtn,
                        isUploadActive && styles.disabledBtn,
                      ]}
                      onPress={handlePublish}
                      disabled={isUploadActive}
                  >
                    <LinearGradient
                        colors={[COLORS.accent, COLORS.accentAlt]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.publishBtnGradient}
                    >
                      {isUploadActive ? (
                          <View style={styles.publishBtnRow}>
                            <ActivityIndicator color={COLORS.white} size="small" />
                            <Text style={styles.publishBtnText}>
                              Đang upload nền...
                            </Text>
                          </View>
                      ) : (
                          <Text style={styles.publishBtnText}>
                            Đăng bài ↑
                          </Text>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Text style={styles.publishNote}>
                    Sau khi đăng, bạn có thể rời màn hình này. Upload
                    sẽ tiếp tục chạy trong nền và hiển thị ở thanh
                    trạng thái phía dưới.
                  </Text>
                </View>
            )}

          </View>
        </ScrollView>
      </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  centerFull: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  gateEmoji: { fontSize: 56, marginBottom: 20 },
  gateTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  gateSub: {
    color: COLORS.glass50,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  hero: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  heroTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSub: {
    color: COLORS.glass45,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  body: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 16,
  },

  // ── Status card ──────────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
    padding: 18,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  statusSong: {
    color: COLORS.glass60,
    fontSize: 14,
  },
  statusHint: {
    color: COLORS.glass40,
    fontSize: 13,
    lineHeight: 18,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.glass10,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressPct: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'right',
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glass12,
    padding: 22,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardDesc: {
    color: COLORS.glass60,
    fontSize: 15,
    lineHeight: 22,
  },

  // ── Form fields ──────────────────────────────────────────────────────────
  fieldLabel: {
    color: COLORS.glass45,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.glass15,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: COLORS.white,
    fontSize: 16,
  },

  // ── File picker ──────────────────────────────────────────────────────────
  filePicker: {
    borderWidth: 2,
    borderColor: COLORS.glass15,
    borderStyle: 'dashed',
    borderRadius: 14,
    overflow: 'hidden',
  },
  filePickerSelected: {
    borderStyle: 'solid',
    borderColor: COLORS.accentBorder35,
    backgroundColor: COLORS.accentFill20,
  },
  filePickerEmpty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  filePickerPlus: {
    color: COLORS.glass40,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '300',
  },
  filePickerHint: {
    color: COLORS.glass50,
    fontSize: 15,
    fontWeight: '600',
  },
  filePickerFormats: {
    color: COLORS.glass25,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  filePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  fileIcon: { fontSize: 26 },
  fileInfo: { flex: 1 },
  fileName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  fileSize: {
    color: COLORS.glass50,
    fontSize: 13,
    marginTop: 3,
  },
  fileChange: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Genres ───────────────────────────────────────────────────────────────
  genreWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glass20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceLow,
  },
  genreChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentFill20,
  },
  genreText: {
    color: COLORS.glass70,
    fontSize: 14,
    fontWeight: '500',
  },
  genreTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },

  // ── Publish button ───────────────────────────────────────────────────────
  publishBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 6,
    shadowColor: COLORS.accentDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  publishBtnGradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  publishBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  publishBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  publishNote: {
    color: COLORS.glass35,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },

  // ── Shared ───────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.accentDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.4,
  },
});

