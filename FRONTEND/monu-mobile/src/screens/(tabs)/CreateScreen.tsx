import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ColorScheme, useThemeColors } from '../../config/colors';
import { useLayoutConstants } from '../../config/layout';
import { useAuth } from '../../context/AuthContext';
import { useUpload, UploadStage } from '../../context/UploadContext';
import { useTranslation } from '../../context/LocalizationContext';
import { apiClient } from '../../services/api';
import { Genre } from '../../services/music';
import { getPopularGenres } from '../../services/favorites';
import {
  acceptAiMusicJob,
  createAiMusicJob,
  getAiMusicJob,
  improveLyricsWithGoogle,
  keepPrivateAiMusicJob,
  rejectAiMusicJob,
} from '../../services/aiMusic';
import { getMySubscription } from '../../services/payment';
import type { Song } from '../../services/music';
import { usePlayerControls, usePlayerState, usePlayerStatus } from '../../context/PlayerContext';
import { AnimatedDecorIcon } from '../../components/AnimatedDecorIcon';
import { MonuBrandHeaderTitle } from '../../components/MonuBrandHeaderTitle';
import { uiPresets } from '../../config/uiPresets';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;
const LYRIC_EXTENSIONS = ['lrc', 'srt', 'txt'] as const;
const COVER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

/** Chuẩn hoá trạng thái job AI (PENDING, PROCESSING, READY, FAILED). */
function formatAiJobStatus(
  translate: (key: string, fallback?: string) => string,
  status: string | null
): string {
  if (!status) return '…';
  const key = `screens.create.aiJobStatus_${status}`;
  const out = translate(key, status);
  return out === key ? status : out;
}

type ArtistProfile = {
  id: string;
  stageName: string;
  status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const truthyFeature = (v: unknown): boolean => {
  if (v === true) return true;
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true';
  if (typeof v === 'number') return v !== 0;
  return false;
};

const getUploadStageHint = (t: (key: string, fallback?: string) => string): Partial<Record<UploadStage, string>> => ({
  requesting: t('screens.create.uploadHintRequesting', 'Connecting to server...'),
  uploading:  t('screens.create.uploadHintUploading', 'Upload is running in background — you can continue using the app.'),
  confirming: t('screens.create.uploadHintConfirming', 'Almost done...'),
  done:       t('screens.create.uploadHintDone', 'Song uploaded. The system will process it in a few minutes.'),
  error:      t('screens.create.uploadHintError', 'Upload failed. Check your connection and try again.'),
});

// Debug function for development-only logs
const getStatusBarStyle = (backgroundColor: string): 'light' | 'dark' => {
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return 'light';
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? 'dark' : 'light';
};

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
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const layout = useLayoutConstants();
  const { authSession, refreshSession, refreshProfile } = useAuth();
  const { job, startUpload } = useUpload();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const UPLOAD_STAGE_HINT = getUploadStageHint(t);
  const publishAttemptRef = useRef(0);
  const lastProgressBucketRef = useRef<number>(-1);

  // ── Page state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]             = useState(true);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [hasActiveSub, setHasActiveSub]   = useState(false);
  const [genres, setGenres]               = useState<Genre[]>([]);
  const [planFeatures, setPlanFeatures]   = useState<Record<string, unknown>>({});

  // ── Form state ─────────────────────────────────────────────────────────────
  const [title, setTitle]                 = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [pickedFile, setPickedFile]       = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pickedLyric, setPickedLyric]     = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pickedCover, setPickedCover]     = useState<ImagePicker.ImagePickerAsset | null>(null);

  // ── Artist register form ───────────────────────────────────────────────────
  const [stageName, setStageName]         = useState('');
  const [registerBio, setRegisterBio]     = useState('');
  const [registerTermsAccepted, setRegisterTermsAccepted] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const canSubmitArtistRegister = stageName.trim().length > 0 && registerTermsAccepted;

  // ── AI music (ElevenLabs + Google lyrics) ─────────────────────────────────
  const [aiTitle, setAiTitle]             = useState('');
  const [aiLyrics, setAiLyrics]           = useState('');
  const [aiStyle, setAiStyle]             = useState('');
  const [aiDurationSec, setAiDurationSec] = useState(60);
  const [aiGenreIds, setAiGenreIds]       = useState<string[]>([]);
  const [aiJobId, setAiJobId]             = useState<string | null>(null);
  const [aiJobStatus, setAiJobStatus]     = useState<string | null>(null);
  const [aiPreviewUrl, setAiPreviewUrl]   = useState<string | null>(null);
  const [aiError, setAiError]             = useState<string | null>(null);
  const [aiBusy, setAiBusy]               = useState(false);
  const [improveBusy, setImproveBusy]   = useState(false);
  const [createTab, setCreateTab]       = useState<'upload' | 'ai'>('upload');

  const resetAiMusicUi = useCallback(() => {
    setAiJobId(null);
    setAiJobStatus(null);
    setAiPreviewUrl(null);
    setAiError(null);
  }, []);

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
          Boolean(subRes.value.expiresAt) &&
          new Date(subRes.value.expiresAt as string).getTime() > Date.now()
      );
      if (subRes.status === 'fulfilled' && subRes.value?.plan?.features) {
        setPlanFeatures(subRes.value.plan.features as Record<string, unknown>);
      } else {
        setPlanFeatures({});
      }
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

  const aiMusicPlanEnabled =
      truthyFeature(planFeatures.ai_music_enabled) && truthyFeature(planFeatures.can_become_artist);
  const showAiMusicSection = canUpload && aiMusicPlanEnabled;

  const aiMaxDurationSec = useMemo(() => {
    const raw = planFeatures.ai_music_max_duration_seconds;
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n) || n < 15) return 180;
    return Math.min(600, n);
  }, [planFeatures]);

  useEffect(() => {
    setAiDurationSec((d) => Math.min(d, aiMaxDurationSec));
  }, [aiMaxDurationSec]);

  const aiGenerationRunning = Boolean(
    aiJobId && aiJobStatus && !['READY', 'FAILED'].includes(aiJobStatus),
  );

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

  const handlePickLyric = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/*', 'application/x-subrip', 'application/octet-stream'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;

    const file = picked.assets[0];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!LYRIC_EXTENSIONS.includes(ext as any)) {
      Alert.alert(
        t('screens.create.unsupportedFormatTitle', 'Unsupported format'),
        `${t('screens.create.lyricAllowedFormatsHint', 'Chỉ hỗ trợ')}: ${LYRIC_EXTENSIONS.join(', ').toUpperCase()}`
      );
      return;
    }
    setPickedLyric(file);
  };

  const handlePickCover = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const file = picked.assets[0];
    const ext = file.fileName?.split('.').pop()?.toLowerCase()
      ?? file.uri.split('.').pop()?.toLowerCase()
      ?? '';
    if (!COVER_EXTENSIONS.includes(ext as any)) {
      Alert.alert(
        t('screens.create.unsupportedFormatTitle', 'Unsupported format'),
        `${t('screens.create.allowedFormatsPrefix', 'Only allowed')}: ${COVER_EXTENSIONS.join(', ')}`
      );
      return;
    }
    setPickedCover(file);
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
    const lyricCopy       = pickedLyric;
    const coverCopy       = pickedCover;

    debugCreateUpload('publish_trigger_upload', {
      attemptId,
      title: titleCopy,
      genres: genresCopy,
      fileName: fileCopy.name,
      fileSizeBytes: fileCopy.size ?? null,
      mimeType: fileCopy.mimeType ?? null,
      hasLyric: !!lyricCopy,
      hasCover: !!coverCopy,
    });

    setTitle('');
    setSelectedGenreIds([]);
    setPickedFile(null);
    setPickedLyric(null);
    setPickedCover(null);

    try {
      const coverUploadFile = coverCopy ? {
        uri: coverCopy.uri,
        name: coverCopy.fileName ?? `cover.${coverCopy.uri.split('.').pop() ?? 'jpg'}`,
        mimeType: coverCopy.mimeType ?? 'image/jpeg',
      } : null;

      await startUpload({
        title: titleCopy,
        genreIds: genresCopy,
        file: fileCopy,
        lyricFile: lyricCopy,
        coverFile: coverUploadFile,
      });
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
    if (!registerTermsAccepted) {
      Alert.alert(
        t('screens.registerArtist.invalidInfoTitle', 'Invalid information'),
        t('screens.registerArtist.validation.terms', 'Please accept the Artist Terms.'),
      );
      return;
    }
    setRegisterLoading(true);
    try {
      await apiClient.post('/artists/register', {
        stageName: stageName.trim(),
        bio: registerBio.trim() || t('screens.registerArtist.defaultBio', 'Artist from Monu'),
      });
      try {
        await refreshSession();
      } catch {
      }
      try {
        await refreshProfile();
      } catch {
      }
      Alert.alert(t('screens.create.artistRegisterSentTitle', 'Registration submitted'), t('screens.create.artistRegisterSentMessage', 'Your request is under review. Refresh to check status.'));
      setStageName('');
      setRegisterBio('');
      setRegisterTermsAccepted(false);
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

  const toggleAiGenre = (id: string) => {
    setAiGenreIds(prev =>
        prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  useFocusEffect(
    useCallback(() => {
      if (!aiJobId) return undefined;
      let cancelled = false;
      void (async () => {
        try {
          await getAiMusicJob(aiJobId);
        } catch (e: any) {
          if (cancelled) return;
          if (e?.response?.status === 404) {
            resetAiMusicUi();
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [aiJobId, resetAiMusicUi]),
  );

  useEffect(() => {
    if (!aiJobId) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const j = await getAiMusicJob(aiJobId);
        if (cancelled) return true;
        setAiJobStatus(j.status);
        setAiPreviewUrl(j.previewUrl ?? null);
        setAiError(j.errorMessage ?? null);
        return j.status === 'READY' || j.status === 'FAILED';
      } catch (err: any) {
        if (cancelled) return true;
        if (err?.response?.status === 404) {
          resetAiMusicUi();
          return true;
        }
        setAiError(t('screens.create.aiMusicPollError', 'Could not refresh job status.'));
        return true;
      }
    };

    void (async () => {
      const done = await poll();
      if (done || cancelled) return;
      interval = setInterval(async () => {
        const finished = await poll();
        if (finished && interval) clearInterval(interval);
      }, 2500);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [aiJobId, t, resetAiMusicUi]);

  const handlePickAiLyricFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/*', 'application/x-subrip', 'application/octet-stream'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const file = picked.assets[0];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!LYRIC_EXTENSIONS.includes(ext as any)) {
      Alert.alert(
        t('screens.create.unsupportedFormatTitle', 'Unsupported format'),
        `${t('screens.create.lyricAllowedFormatsHint', 'Chỉ hỗ trợ')}: ${LYRIC_EXTENSIONS.join(', ').toUpperCase()}`
      );
      return;
    }
    try {
      const text = await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
      setAiLyrics(text);
    } catch {
      Alert.alert(t('common.error'), t('screens.create.aiMusicReadLyricFailed', 'Could not read lyric file.'));
    }
  };

  const handleImproveLyrics = async () => {
    if (!aiLyrics.trim()) {
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.aiMusicNeedLyrics', 'Enter or import lyrics first.'));
      return;
    }
    setImproveBusy(true);
    try {
      const improved = await improveLyricsWithGoogle(aiLyrics.trim());
      setAiLyrics(improved);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const status = err?.response?.status;
      if (code === 2704 || status === 502) {
        Alert.alert(
          t('screens.create.aiQuotaTitle', 'Dịch vụ tạm thời không khả dụng'),
          t('screens.create.aiQuotaMessage', 'Dịch vụ cải thiện lời bài hát bằng AI đã hết quota. Vui lòng thử lại sau.'),
        );
      } else {
        Alert.alert(t('common.error'), err?.response?.data?.message ?? err?.message ?? t('screens.create.aiMusicImproveFailed', 'Could not improve lyrics.'));
      }
    } finally {
      setImproveBusy(false);
    }
  };

  const handleAiMusicSubmit = async () => {
    if (!aiTitle.trim()) {
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.missingTitle', 'Enter song title.'));
      return;
    }
    if (aiGenreIds.length === 0) {
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.missingGenre', 'Select at least 1 genre.'));
      return;
    }
    if (!aiLyrics.trim()) {
      Alert.alert(t('screens.create.missingInfoTitle', 'Missing information'), t('screens.create.aiMusicNeedLyrics', 'Enter or import lyrics first.'));
      return;
    }
    setAiBusy(true);
    setAiError(null);
    setAiPreviewUrl(null);
    setAiJobStatus(null);
    setAiJobId(null);
    try {
      const job = await createAiMusicJob({
        title: aiTitle.trim(),
        genreIds: aiGenreIds,
        lyrics: aiLyrics.trim(),
        stylePrompt: aiStyle.trim() || undefined,
        durationSeconds: Math.round(aiDurationSec),
      });
      setAiJobId(job.jobId);
      setAiJobStatus(job.status);
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err?.response?.data?.message ?? err?.message ?? t('screens.create.aiMusicSubmitFailed', 'Could not start AI music job.')
      );
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiAccept = async () => {
    if (!aiJobId) return;
    setAiBusy(true);
    try {
      await acceptAiMusicJob(aiJobId);
      Alert.alert(
        t('screens.create.aiMusicAcceptedTitle', 'Saved'),
        t(
          'screens.create.aiMusicAcceptedMessagePublish',
          'Your song is processing for public release. Check Library → Songs.'
        )
      );
      resetAiMusicUi();
      setAiTitle('');
      setAiLyrics('');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message ?? err?.message ?? '');
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiKeepPrivate = async () => {
    if (!aiJobId) return;
    setAiBusy(true);
    try {
      await keepPrivateAiMusicJob(aiJobId);
      Alert.alert(
        t('screens.create.aiMusicAcceptedTitle', 'Saved'),
        t(
          'screens.create.aiMusicAcceptedMessagePrivate',
          'Saved as private. Check Library → Songs to play or manage.'
        )
      );
      resetAiMusicUi();
      setAiTitle('');
      setAiLyrics('');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message ?? err?.message ?? '');
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiReject = async () => {
    if (!aiJobId) return;
    setAiBusy(true);
    try {
      await rejectAiMusicJob(aiJobId);
      resetAiMusicUi();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message ?? err?.message ?? '');
    } finally {
      setAiBusy(false);
    }
  };

  // ── Render loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
        <View style={styles.centerFull}>
          <ActivityIndicator color={themeColors.accent} size="large" />
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
        <StatusBar style={getStatusBarStyle(themeColors.bg)} />
        <ScrollView
            contentContainerStyle={{ paddingBottom: layout.tabBarHeight + layout.miniPlayerHeight + 16 }}
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
            <MonuBrandHeaderTitle layout="hero" accentColor={themeColors.accent} style={styles.heroTitleWrap}>
              {t('navigation.headerCreate')}
            </MonuBrandHeaderTitle>
            <Text style={styles.heroSub}>
              {canUpload
                  ? `${t('screens.create.greetingPrefix', 'Hello')}, ${artistProfile?.stageName}`
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
                  job.stage === 'error'  && { borderColor: themeColors.error },
                  job.stage === 'done'   && { borderColor: themeColors.success },
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
                        <Text style={[styles.fieldLabel, styles.registerArtistFieldLabel]}>
                          {t('screens.registerArtist.stageNameLabel', 'Stage name *')}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={stageName}
                            onChangeText={setStageName}
                            placeholder={t('screens.registerArtist.stageNamePlaceholder', 'Your stage name')}
                            placeholderTextColor={themeColors.glass35}
                            maxLength={50}
                            autoCapitalize="words"
                        />
                        <Text style={styles.registerCharCount}>{stageName.length}/50</Text>

                        <Text style={styles.fieldLabel}>{t('screens.registerArtist.bioLabel', 'Bio')}</Text>
                        <TextInput
                            style={[styles.input, styles.registerTextArea]}
                            value={registerBio}
                            onChangeText={setRegisterBio}
                            placeholder={t('screens.registerArtist.bioPlaceholder', 'Tell us about you and your music journey...')}
                            placeholderTextColor={themeColors.glass35}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                        />
                        <Text style={styles.registerCharCount}>{registerBio.length}/500</Text>

                        <View style={styles.registerTermsRow}>
                          <Switch
                            value={registerTermsAccepted}
                            onValueChange={setRegisterTermsAccepted}
                            trackColor={{ false: themeColors.glass15, true: themeColors.accentDim }}
                            thumbColor={registerTermsAccepted ? themeColors.accent : themeColors.glass40}
                          />
                          <View style={styles.registerTermsTextWrap}>
                            <Text style={styles.registerTermsLabel}>
                              {t('screens.registerArtist.acceptPrefix', 'I agree to')}{' '}
                              <Text
                                style={styles.registerTermsLink}
                                onPress={() => navigation.navigate('ArtistTerms')}
                              >
                                {t('screens.registerArtist.artistTerms', 'Artist Terms')}
                              </Text>
                              {' '}{t('screens.registerArtist.acceptSuffix', 'of Monu')}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                            style={[
                              styles.primaryBtn,
                              (!canSubmitArtistRegister || registerLoading) && styles.disabledBtn,
                            ]}
                            onPress={handleRegisterArtist}
                            disabled={!canSubmitArtistRegister || registerLoading}
                        >
                          {registerLoading
                              ? <ActivityIndicator color={themeColors.white} />
                              : <Text style={styles.primaryBtnText}>{t('screens.create.registerArtistButton', 'Register Artist')}</Text>
                          }
                        </Pressable>
                      </>
                  ) : (
                      <Text style={styles.cardDesc}>
                        {t('screens.create.upgradePremiumPrefix', 'Upgrade to')}{' '}
                        <Text
                          style={{ color: themeColors.accent, textDecorationLine: 'underline', fontWeight: '700' }}
                          onPress={() => navigation.navigate('Premium')}
                        >
                          {t('navigation.premium', 'TramCamXuc Plus')}
                        </Text>
                        {' '}{t('screens.create.upgradePremiumSuffix', 'to unlock this feature.')}
                      </Text>
                  )}
                </View>
            )}

            {isArtist && !hasActiveSub && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('screens.create.renewSubscription', 'Renew subscription')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('screens.create.subscriptionExpiredMessagePrefix', 'Your subscription has expired. Go to')}{' '}
                    <Text style={{ color: themeColors.accent }}>{t('navigation.premium', 'TramCamXuc Plus')}</Text>
                    {' '}{t('screens.create.subscriptionExpiredMessageSuffix', 'to renew and continue uploading music.')}
                  </Text>
                </View>
            )}

            {canUpload && showAiMusicSection && (
                <View style={styles.createTabRow}>
                  <Pressable
                    onPress={() => setCreateTab('upload')}
                    style={[
                      styles.createTabBtn,
                      createTab === 'upload' && styles.createTabBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.createTabBtnText,
                        createTab === 'upload' && styles.createTabBtnTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t('screens.create.tabNewUpload', 'New upload')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setCreateTab('ai')}
                    style={[
                      styles.createTabBtn,
                      createTab === 'ai' && styles.createTabBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.createTabBtnText,
                        createTab === 'ai' && styles.createTabBtnTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t('screens.create.tabAiMusic', 'Create with AI')}
                    </Text>
                  </Pressable>
                </View>
            )}

            {canUpload && (!showAiMusicSection || createTab === 'upload') && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('screens.create.publishNewSong', 'Publish new song')}</Text>

                  {/* Tên bài hát */}
                  <Text style={styles.fieldLabel}>{t('screens.create.songTitleLabel', 'Song title')}</Text>
                  <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                        placeholder={t('screens.create.songTitlePlaceholder', 'Enter song title...')}
                      placeholderTextColor={themeColors.glass35}
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
                                  ? `${(pickedFile.size / 1024 / 1024).toFixed(1)} ${t('common.unitMB', 'MB')}`
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

                  {/* Lyric file (tuỳ chọn) */}
                  <Text style={styles.fieldLabel}>
                    {t('screens.create.lyricFileLabel', 'Lyric file (optional)')}
                  </Text>
                  <Pressable
                      style={[
                        styles.filePicker,
                        pickedLyric && styles.filePickerSelected,
                        isUploadActive && styles.disabledBtn,
                      ]}
                      onPress={handlePickLyric}
                      disabled={isUploadActive}
                  >
                    {pickedLyric ? (
                        <View style={styles.filePickerRow}>
                          <Text style={styles.fileIcon}>📝</Text>
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName} numberOfLines={1}>
                              {pickedLyric.name}
                            </Text>
                            <Text style={styles.fileSize}>
                              {pickedLyric.size
                                  ? `${(pickedLyric.size / 1024).toFixed(1)} ${t('common.unitKB', 'KB')}`
                                  : ''}
                              {'  ·  '}
                              {pickedLyric.name.split('.').pop()?.toUpperCase()}
                            </Text>
                          </View>
                          <Pressable
                              hitSlop={8}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                setPickedLyric(null);
                              }}
                          >
                            <Text style={styles.fileChange}>{t('common.remove', 'Xoá')}</Text>
                          </Pressable>
                        </View>
                    ) : (
                        <View style={styles.filePickerEmpty}>
                          <Text style={styles.filePickerPlus}>📝</Text>
                          <Text style={styles.filePickerHint}>
                            {t('screens.create.chooseLyricFile', 'Thêm file lời bài hát')}
                          </Text>
                          <Text style={styles.filePickerFormats}>
                            {LYRIC_EXTENSIONS.join('  ·  ').toUpperCase()}
                          </Text>
                        </View>
                    )}
                  </Pressable>

                  {/* Cover image (optional) */}
                  <Text style={styles.fieldLabel}>
                    {t('screens.create.coverImageLabel', 'Cover image (optional)')}
                  </Text>
                  <Pressable
                    style={[
                      styles.filePicker,
                      pickedCover && styles.filePickerSelected,
                      isUploadActive && styles.disabledBtn,
                    ]}
                    onPress={handlePickCover}
                    disabled={isUploadActive}
                  >
                    {pickedCover ? (
                      <View style={styles.filePickerRow}>
                        <Text style={styles.fileIcon}>🖼️</Text>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {pickedCover.fileName ?? pickedCover.uri.split('/').pop()}
                          </Text>
                            <Text style={styles.fileSize}>
                              {pickedCover.fileSize
                              ? `${(pickedCover.fileSize / 1024).toFixed(1)} ${t('common.unitKB', 'KB')}`
                              : ''}
                          </Text>
                        </View>
                        <Pressable
                          hitSlop={8}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            setPickedCover(null);
                          }}
                        >
                          <Text style={styles.fileChange}>{t('common.remove', 'Xoá')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.filePickerEmpty}>
                        <Text style={styles.filePickerPlus}>🖼️</Text>
                        <Text style={styles.filePickerHint}>
                          {t('screens.create.chooseCoverImage', 'Chọn ảnh bìa bài hát')}
                        </Text>
                        <Text style={styles.filePickerFormats}>
                          {COVER_EXTENSIONS.join('  ·  ').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Thể loại */}
                  <Text style={styles.fieldLabel}>
                    {t('labels.genre', 'Genre')}
                    {selectedGenreIds.length > 0 &&
                        <Text style={{ color: themeColors.accent }}>
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
                      <View style={styles.publishBtnRow}>
                        {isUploadActive ? (
                            <ActivityIndicator color={themeColors.white} size="small" />
                        ) : null}
                        <Text style={styles.publishBtnText}>
                          {isUploadActive
                              ? (job?.stage === 'uploading'
                                  ? t('screens.create.uploadingButtonLabel', `Đang tải lên... ${job.progress}%`)
                                  : job?.stage === 'confirming'
                                      ? t('screens.create.confirmingButtonLabel', 'Đang xử lý...')
                                      : t('screens.create.connectingButtonLabel', 'Đang kết nối...'))
                              : t('screens.create.publishButton', 'Publish ↑')}
                        </Text>
                      </View>

                      {isUploadActive && job?.stage === 'uploading' && (
                          <View style={styles.btnProgressTrack}>
                            <View style={[styles.btnProgressFill, { width: `${job.progress}%` as any }]} />
                          </View>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Text style={styles.publishNote}>
                    {t('screens.create.publishNote', 'After publishing, you can leave this screen. Upload will continue in the background and show in the status card below.')}
                  </Text>
                </View>
            )}

            {canUpload && showAiMusicSection && createTab === 'ai' && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{t('screens.create.aiMusicTitle', 'Create music with AI')}</Text>
                  <Text style={styles.cardDesc}>
                    {t('screens.create.aiMusicDesc', 'Write lyrics or import a file, pick style and length. Preview on device, then accept to publish like a normal upload.')}
                  </Text>
                  <Text style={styles.aiMusicAttribution}>
                    {t(
                      'screens.create.aiMusicAttribution',
                      'AI music is powered by Sonauto (ElevenLabs as backup). Sonauto requires attribution for user-facing API use.'
                    )}
                  </Text>

                  <Text style={styles.fieldLabel}>{t('screens.create.songTitleLabel', 'Song title')}</Text>
                  <TextInput
                    style={styles.input}
                    value={aiTitle}
                    onChangeText={setAiTitle}
                    placeholder={t('screens.create.songTitlePlaceholder', 'Enter song title...')}
                    placeholderTextColor={themeColors.glass35}
                    editable={!aiBusy}
                  />

                  <Text style={styles.fieldLabel}>{t('screens.create.aiMusicLyricsLabel', 'Lyrics')}</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
                    value={aiLyrics}
                    onChangeText={setAiLyrics}
                    multiline
                    placeholder={t('screens.create.aiMusicLyricsPlaceholder', 'Paste lyrics or use a file…')}
                    placeholderTextColor={themeColors.glass35}
                    editable={!aiBusy}
                  />

                  <View style={styles.aiMusicRow}>
                    <Pressable
                      style={[styles.secondaryBtn, aiBusy && styles.disabledBtn]}
                      onPress={handlePickAiLyricFile}
                      disabled={aiBusy}
                    >
                      <Text style={styles.secondaryBtnText}>{t('screens.create.aiMusicPickLyricFile', 'Import lyric file')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryBtn, (aiBusy || improveBusy) && styles.disabledBtn]}
                      onPress={handleImproveLyrics}
                      disabled={aiBusy || improveBusy}
                    >
                      {improveBusy ? (
                        <ActivityIndicator color={themeColors.accent} size="small" />
                      ) : (
                        <Text style={styles.secondaryBtnText}>{t('screens.create.aiMusicImproveLyrics', 'Improve with Google AI')}</Text>
                      )}
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>{t('screens.create.aiMusicStyleLabel', 'Style / mood (optional)')}</Text>
                  <TextInput
                    style={styles.input}
                    value={aiStyle}
                    onChangeText={setAiStyle}
                    placeholder={t('screens.create.aiMusicStylePlaceholder', 'e.g. acoustic Vietnamese ballad, 90 BPM')}
                    placeholderTextColor={themeColors.glass35}
                    editable={!aiBusy}
                  />

                  <Text style={styles.fieldLabel}>
                    {t('screens.create.aiMusicDurationLabel', 'Target length')}: {Math.round(aiDurationSec)}s
                    {' '}
                    ({t('screens.create.aiMusicDurationMax', 'max')} {aiMaxDurationSec}s)
                  </Text>
                  <Slider
                    style={{ width: '100%', height: 36 }}
                    minimumValue={15}
                    maximumValue={aiMaxDurationSec}
                    step={5}
                    value={Math.min(aiDurationSec, aiMaxDurationSec)}
                    onValueChange={(v) => setAiDurationSec(Math.min(v, aiMaxDurationSec))}
                    minimumTrackTintColor={themeColors.accent}
                    maximumTrackTintColor={themeColors.glass15}
                    thumbTintColor={themeColors.accent}
                    disabled={aiBusy}
                  />

                  <Text style={styles.fieldLabel}>
                    {t('labels.genre', 'Genre')} ({aiGenreIds.length})
                  </Text>
                  <View style={styles.genreWrap}>
                    {genres.map(g => {
                      const active = aiGenreIds.includes(g.id);
                      return (
                        <Pressable
                          key={g.id}
                          style={[styles.genreChip, active && styles.genreChipActive, aiBusy && styles.disabledBtn]}
                          onPress={() => !aiBusy && toggleAiGenre(g.id)}
                        >
                          <Text style={[styles.genreText, active && styles.genreTextActive]}>{g.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    style={[
                      styles.primaryBtn,
                      (aiBusy || aiGenerationRunning || (aiJobId !== null && aiJobStatus === 'READY')) && styles.disabledBtn,
                    ]}
                    onPress={handleAiMusicSubmit}
                    disabled={
                      aiBusy ||
                      aiGenerationRunning ||
                      (aiJobId !== null && aiJobStatus === 'READY')
                    }
                  >
                    {aiBusy ? (
                      <ActivityIndicator color={themeColors.white} />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {aiGenerationRunning
                          ? t('screens.create.aiMusicJobRunning', 'Generation in progress…')
                          : aiJobId && aiJobStatus === 'READY'
                            ? t(
                                'screens.create.aiMusicMainButtonReady',
                                'Preview ready — choose an action below',
                              )
                            : t('screens.create.aiMusicSubmit', 'Generate with AI')}
                      </Text>
                    )}
                  </Pressable>

                  {aiJobId ? (
                    <View style={styles.aiMusicStatus}>
                      <Text style={styles.cardDesc}>
                        {t('screens.create.aiMusicStatusPrefix', 'Status')}: {formatAiJobStatus(t, aiJobStatus)}
                      </Text>
                      {aiError ? <Text style={[styles.cardDesc, { color: themeColors.error }]}>{aiError}</Text> : null}
                      <AiMusicPreviewControls
                        previewUrl={aiPreviewUrl}
                        previewTitle={aiTitle.trim() || t('screens.create.aiMusicPreviewUntitled', 'AI preview')}
                        previewTrackId={aiJobId ?? ''}
                        artistStageName={artistProfile?.stageName ?? ''}
                        accent={themeColors.accent}
                      />
                      {aiJobStatus === 'READY' ? (
                        <View style={{ gap: 8, marginTop: 4 }}>
                          <Text style={[styles.cardDesc, { fontSize: 12 }]}>
                            {t(
                              'screens.create.aiMusicLibraryHint',
                              'The draft is also listed under Library → Songs. You can decide there.'
                            )}
                          </Text>
                          <View style={styles.aiMusicRow}>
                            <Pressable style={[styles.primaryBtn, { flex: 1 }, aiBusy && styles.disabledBtn]} onPress={handleAiAccept} disabled={aiBusy}>
                              <Text style={styles.primaryBtnText}>{t('screens.create.aiMusicAccept', 'Publish (public)')}</Text>
                            </Pressable>
                            <Pressable style={[styles.secondaryBtn, { flex: 1 }, aiBusy && styles.disabledBtn]} onPress={handleAiKeepPrivate} disabled={aiBusy}>
                              <Text style={styles.secondaryBtnText}>{t('screens.create.aiMusicKeepPrivate', 'Keep private')}</Text>
                            </Pressable>
                          </View>
                          <Pressable style={[styles.secondaryBtn, aiBusy && styles.disabledBtn]} onPress={handleAiReject} disabled={aiBusy}>
                            <Text style={styles.secondaryBtnText}>{t('screens.create.aiMusicReject', 'Discard preview')}</Text>
                          </Pressable>
                        </View>
                      ) : null}
                      {aiJobStatus === 'FAILED' ? (
                        <Pressable style={[styles.secondaryBtn, aiBusy && styles.disabledBtn]} onPress={() => resetAiMusicUi()} disabled={aiBusy}>
                          <Text style={styles.secondaryBtnText}>{t('screens.create.aiMusicTryAgain', 'Clear & try again')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
            )}

          </View>
        </ScrollView>
      </View>
  );
};

type PreviewProps = {
  previewUrl: string | null;
  previewTitle: string;
  previewTrackId: string;
  artistStageName: string;
  accent: string;
};

const AiMusicPreviewControls = ({
  previewUrl,
  previewTitle,
  previewTrackId,
  artistStageName,
  accent,
}: PreviewProps) => {
  const { t } = useTranslation();
  const { playSong, togglePlay } = usePlayerControls();
  const { currentSong } = usePlayerState();
  const { isPlaying } = usePlayerStatus();

  const previewSong = useMemo((): Song | null => {
    if (!previewUrl || !previewTrackId) return null;
    return {
      id: previewTrackId,
      title: previewTitle,
      primaryArtist: {
        artistId: '',
        stageName: artistStageName || t('screens.create.aiPreviewArtistYou', 'You'),
      },
      genres: [],
      durationSeconds: 0,
      playCount: 0,
      status: 'DRAFT',
      transcodeStatus: 'COMPLETED',
      streamUrl: previewUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'LOCAL',
    };
  }, [previewUrl, previewTrackId, previewTitle, artistStageName, t]);

  if (!previewSong) return null;

  const isThisPreview = currentSong?.id === previewSong.id;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
      <Pressable
        onPress={() => {
          if (isThisPreview) togglePlay();
          else void playSong(previewSong, [previewSong]);
        }}
        style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: `${accent}33` }}
      >
        <Text style={{ color: accent, fontWeight: '700' }}>
          {isThisPreview && isPlaying
            ? t('screens.create.aiMusicPreviewPause', 'Pause')
            : t('screens.create.aiMusicPreviewPlay', 'Play preview')}
        </Text>
      </Pressable>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (colors: ColorScheme) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  centerFull: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  gateEmoji: { fontSize: 48, marginBottom: 16 },
  gateTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  gateSub: {
    color: colors.glass50,
    fontSize: 14,
    textAlign: 'center',
  },

  hero: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitleWrap: { marginBottom: 6 },
  heroSub: {
    color: colors.glass50,
    fontSize: 14,
    textAlign: 'center',
  },

  body: {
    paddingHorizontal: 20,
    gap: 14,
  },

  createTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createTabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 999,
    ...uiPresets.glassSurface(colors, { intensity: 'default', radius: 999 }),
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTabBtnActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}24`,
  },
  createTabBtnText: {
    color: colors.glass50,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  createTabBtnTextActive: {
    color: colors.white,
  },

  // ── Status card ──────────────────────────────────────────────────────────
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentBorder25,
    padding: 16,
    gap: 6,
  },
  statusTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  statusSong: {
    color: colors.glass60,
    fontSize: 13,
  },
  statusHint: {
    color: colors.glass40,
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
    height: 5,
    backgroundColor: colors.glass10,
    borderRadius: 3,
  },
  progressFill: {
    height: 5,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  progressPct: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'right',
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surfaceLow,
    borderRadius: 24,
    borderWidth: 0,
    padding: 20,
    gap: 12,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  cardDesc: {
    color: colors.glass60,
    fontSize: 14,
    lineHeight: 20,
  },
  aiMusicAttribution: {
    color: colors.glass40,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // ── Form fields ──────────────────────────────────────────────────────────
  fieldLabel: {
    color: colors.glass40,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    borderWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.white,
    fontSize: 15,
  },
  registerArtistFieldLabel: {
    marginTop: 8,
    marginBottom: 6,
  },
  registerTextArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  registerCharCount: {
    color: colors.glass25,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  registerTermsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 12,
  },
  registerTermsTextWrap: { flex: 1 },
  registerTermsLabel: {
    color: colors.glass70,
    fontSize: 14,
    lineHeight: 21,
  },
  registerTermsLink: {
    color: colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── File picker ──────────────────────────────────────────────────────────
  filePicker: {
    backgroundColor: colors.surface,
    borderWidth: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  filePickerSelected: {
    backgroundColor: colors.accentFill20,
  },
  filePickerEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  filePickerPlus: {
    color: colors.glass35,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '300',
  },
  filePickerHint: {
    color: colors.glass50,
    fontSize: 14,
    fontWeight: '600',
  },
  filePickerFormats: {
    color: colors.glass25,
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
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    color: colors.glass45,
    fontSize: 12,
    marginTop: 2,
  },
  fileChange: {
    color: colors.accent,
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
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  genreChipActive: {
    backgroundColor: colors.accentFill20,
  },
  genreText: {
    color: colors.glass70,
    fontSize: 13,
  },
  genreTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },

  // ── Publish button ───────────────────────────────────────────────────────
  publishBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  publishBtnGradient: {
    minHeight: 54,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    overflow: 'hidden',
  },
  publishBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  publishBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  publishNote: {
    color: colors.glass30,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  btnProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  btnProgressFill: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },

  // ── Shared ───────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.45,
  },

  aiMusicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 0,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexGrow: 1,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  aiMusicStatus: {
    marginTop: 8,
    gap: 8,
  },
});
