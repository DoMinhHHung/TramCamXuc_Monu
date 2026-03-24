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

import { COLORS, useThemeColors } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { useUpload, UploadStage } from '../../context/UploadContext';
import { useTranslation } from '../../context/LocalizationContext';
import { apiClient } from '../../services/api';
import { Genre } from '../../services/music';
import { getPopularGenres } from '../../services/favorites';
import { getMySubscription } from '../../services/payment';
import { AnimatedDecorIcon } from '../../components/AnimatedDecorIcon';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;

type ArtistProfile = {
  id: string;
  stageName: string;
  status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUploadStageHint = (t: (key: string, fallback?: string) => string): Partial<Record<UploadStage, string>> => ({
  requesting: t('screens.create.uploadHintRequesting', 'Connecting to server...'),
  uploading:  t('screens.create.uploadHintUploading', 'Upload is running in background — you can continue using the app.'),
  confirming: t('screens.create.uploadHintConfirming', 'Almost done...'),
  done:       t('screens.create.uploadHintDone', 'Song uploaded. The system will process it in a few minutes.'),
  error:      t('screens.create.uploadHintError', 'Upload failed. Check your connection and try again.'),
});

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
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const UPLOAD_STAGE_HINT = getUploadStageHint(t);
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
          t('screens.create.unsupportedFormatTitle', 'Unsupported format'),
          `${t('screens.create.allowedFormatsPrefix', 'Only allowed')}: ${ALLOWED_EXTENSIONS.join(', ')}`
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
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.missingTitle', 'Enter song title.'));
      return;
    }
    if (selectedGenreIds.length === 0) {
      debugCreateUpload('publish_blocked_missing_genre', { attemptId });
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.missingGenre', 'Select at least 1 genre.'));
      return;
    }
    if (!pickedFile) {
      debugCreateUpload('publish_blocked_missing_file', { attemptId });
      Alert.alert(t('screens.create.noFileTitle', 'No file selected'), t('screens.create.noFileMessage', 'Choose a music file before publishing.'));
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
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.missingStageName', 'Enter your stage name.'));
      return;
    }
    setRegisterLoading(true);
    try {
      await apiClient.post('/artists/register', {
        stageName: stageName.trim(),
        bio: 'Artist from Monu',
      });
      Alert.alert(t('screens.create.artistRegisterSentTitle', 'Registration submitted'), t('screens.create.artistRegisterSentMessage', 'Your request is under review. Refresh to check status.'));
      setStageName('');
      await loadPageData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('screens.create.artistRegisterFailed', 'Cannot register as artist.'));
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
          <AnimatedDecorIcon intensity="medium">
            <Text style={styles.gateEmoji}>🔒</Text>
          </AnimatedDecorIcon>
          <Text style={styles.gateTitle}>{t('screens.create.loginToCreate', 'Login to create content')}</Text>
        </View>
    );
  }

  // ── Render banned ─────────────────────────────────────────────────────────
  if (isBanned) {
    return (
        <View style={styles.centerFull}>
          <AnimatedDecorIcon intensity="medium">
            <Text style={styles.gateEmoji}>🚫</Text>
          </AnimatedDecorIcon>
          <Text style={styles.gateTitle}>{t('screens.create.accountRestricted', 'Account is restricted')}</Text>
          <Text style={styles.gateSub}>{t('screens.create.contactSupport', 'Contact support for more details.')}</Text>
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
              colors={[themeColors.gradNavy, themeColors.bg]}
              style={[styles.hero, { paddingTop: insets.top + 20 }]}
          >
            <AnimatedDecorIcon intensity="medium">
              <Text style={styles.heroEmoji}>🎼</Text>
            </AnimatedDecorIcon>
            <Text style={styles.heroTitle}>{t('screens.create.creatorStudio', 'Creator Studio')}</Text>
            <Text style={styles.heroSub}>
              {canUpload
                  ? `${t('screens.create.greetingPrefix', 'Hello')}, ${artistProfile?.stageName} 👋`
                  : isArtist && !hasActiveSub
                      ? t('screens.create.subscriptionExpired', 'Subscription expired — renew to continue uploading')
                      : !isArtist
                          ? t('screens.create.registerArtistToStart', 'Register as an artist to start uploading music')
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
                    {job.stage === 'done'  ? t('screens.create.uploadDoneTitle', '✓ Upload completed') :
                      job.stage === 'error' ? t('screens.create.uploadFailedTitle', '✕ Upload failed') :
                        t('screens.create.uploadingTitle', '↑ Uploading...')}
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
                  <Text style={styles.cardTitle}>{t('screens.create.becomeArtist', 'Become an Artist')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('screens.create.needPlanPrefix', 'You need a plan with')}{' '}
                    <Text style={{ color: themeColors.accent }}>{t('screens.create.artistRegisterFeature', 'artist registration')}</Text>
                    {' '}{t('screens.create.needPlanSuffix', 'to upload music.')}
                  </Text>

                  {hasActiveSub ? (
                      <>
                        <TextInput
                            style={styles.input}
                            value={stageName}
                            onChangeText={setStageName}
                            placeholder={t('screens.create.stageNamePlaceholder', 'Your stage name')}
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
                              : <Text style={styles.primaryBtnText}>{t('screens.create.registerArtistButton', 'Register Artist')}</Text>
                          }
                        </Pressable>
                      </>
                  ) : (
                      <Text style={styles.cardDesc}>
                        {t('screens.create.upgradePremiumPrefix', 'Upgrade to')}{' '}
                        <Text style={{ color: themeColors.accent }}>{t('navigation.premium', 'Premium')}</Text>
                        {' '}{t('screens.create.upgradePremiumSuffix', 'to unlock this feature.')}
                      </Text>
                  )}
                </View>
            )}

            {/* ── Artist nhưng hết sub ─────────────────────────────── */}
            {isArtist && !hasActiveSub && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('screens.create.renewSubscription', 'Renew subscription')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('screens.create.subscriptionExpiredMessagePrefix', 'Your subscription has expired. Go to')}{' '}
                    <Text style={{ color: themeColors.accent }}>{t('navigation.premium', 'Premium')}</Text>
                    {' '}{t('screens.create.subscriptionExpiredMessageSuffix', 'to renew and continue uploading music.')}
                  </Text>
                </View>
            )}

            {/* ── Upload form (chỉ khi canUpload) ─────────────────── */}
            {canUpload && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('screens.create.publishNewSong', 'Publish new song')}</Text>

                  {/* Tên bài hát */}
                  <Text style={styles.fieldLabel}>{t('screens.create.songTitleLabel', 'Song title')}</Text>
                  <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                        placeholder={t('screens.create.songTitlePlaceholder', 'Enter song title...')}
                      placeholderTextColor={COLORS.glass35}
                      editable={!isUploadActive}
                  />

                  {/* Chọn file nhạc */}
                  <Text style={styles.fieldLabel}>{t('screens.create.musicFileLabel', 'Music file')}</Text>
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
                          <Text style={styles.fileIcon}>🎵</Text>
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
                          <Text style={styles.fileChange}>{t('screens.create.changeFile', 'Change')}</Text>
                        </View>
                    ) : (
                        <View style={styles.filePickerEmpty}>
                          <Text style={styles.filePickerPlus}>+</Text>
                          <Text style={styles.filePickerHint}>
                            {t('screens.create.chooseFile', 'Choose music file')}
                          </Text>
                          <Text style={styles.filePickerFormats}>
                            {ALLOWED_EXTENSIONS.join('  ·  ').toUpperCase()}
                          </Text>
                        </View>
                    )}
                  </Pressable>

                  {/* Thể loại */}
                  <Text style={styles.fieldLabel}>
                    {t('labels.genre', 'Genre')}
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
                        colors={[themeColors.accent, themeColors.accentAlt]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.publishBtnGradient}
                    >
                      {isUploadActive ? (
                          <View style={styles.publishBtnRow}>
                            <ActivityIndicator color={COLORS.white} size="small" />
                            <Text style={styles.publishBtnText}>
                              {t('screens.create.uploadingBackground', 'Uploading in background...')}
                            </Text>
                          </View>
                      ) : (
                          <Text style={styles.publishBtnText}>
                            {t('screens.create.publishButton', 'Publish ↑')}
                          </Text>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Text style={styles.publishNote}>
                    {t('screens.create.publishNote', 'After publishing, you can leave this screen. Upload will continue in the background and show in the status card below.')}
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
    padding: 32,
  },
  gateEmoji: { fontSize: 48, marginBottom: 16 },
  gateTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  gateSub: {
    color: COLORS.glass50,
    fontSize: 14,
    textAlign: 'center',
  },

  hero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSub: {
    color: COLORS.glass50,
    fontSize: 14,
    textAlign: 'center',
  },

  body: {
    paddingHorizontal: 20,
    gap: 14,
  },

  // ── Status card ──────────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accentBorder25,
    padding: 16,
    gap: 6,
  },
  statusTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  statusSong: {
    color: COLORS.glass60,
    fontSize: 13,
  },
  statusHint: {
    color: COLORS.glass40,
    fontSize: 12,
    lineHeight: 17,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.glass10,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glass10,
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  cardDesc: {
    color: COLORS.glass60,
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Form fields ──────────────────────────────────────────────────────────
  fieldLabel: {
    color: COLORS.glass40,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.glass15,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 15,
  },

  // ── File picker ──────────────────────────────────────────────────────────
  filePicker: {
    borderWidth: 1.5,
    borderColor: COLORS.glass15,
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  filePickerSelected: {
    borderStyle: 'solid',
    borderColor: COLORS.accentBorder35,
    backgroundColor: COLORS.accentFill20,
  },
  filePickerEmpty: {
    alignItems: 'center',
    paddingVertical: 22,
    gap: 4,
  },
  filePickerPlus: {
    color: COLORS.glass35,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
  filePickerHint: {
    color: COLORS.glass50,
    fontSize: 14,
    fontWeight: '600',
  },
  filePickerFormats: {
    color: COLORS.glass25,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  filePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  fileIcon: { fontSize: 24 },
  fileInfo: { flex: 1 },
  fileName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    color: COLORS.glass45,
    fontSize: 12,
    marginTop: 2,
  },
  fileChange: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Genres ───────────────────────────────────────────────────────────────
  genreWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glass20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.surfaceLow,
  },
  genreChipActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentFill20,
  },
  genreText: {
    color: COLORS.glass70,
    fontSize: 13,
  },
  genreTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  // ── Publish button ───────────────────────────────────────────────────────
  publishBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  publishBtnGradient: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  publishBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  publishBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 16,
  },
  publishNote: {
    color: COLORS.glass30,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  // ── Shared ───────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: COLORS.accentDim,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.45,
  },
});

