import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { AntDesign } from '@expo/vector-icons';

import { COLORS, useThemeColors } from '../config/colors';
import { useTranslation } from '../context/LocalizationContext';
import {
  deleteLyric,
  Genre,
  getLyric,
  LyricResponse,
  Song,
  SongStatus,
  updateSong,
  uploadLyric,
} from '../services/music';
import { getPopularGenres } from '../services/favorites';
import { apiClient } from '../services/api';

const LYRIC_EXTENSIONS = ['lrc', 'srt', 'txt'] as const;

type EditSongRouteParams = { songId: string };

const unwrap = <T,>(data: any): T =>
  data && typeof data === 'object' && 'result' in data ? (data as any).result as T : data as T;

export const EditSongScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ EditSong: EditSongRouteParams }, 'EditSong'>>();
  const { t } = useTranslation();
  const themeColors = useThemeColors();
  const songId = route.params.songId;

  // Loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lyricUploading, setLyricUploading] = useState(false);
  const [lyricDeleting, setLyricDeleting] = useState(false);

  // Song data
  const [song, setSong] = useState<Song | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [status, setStatus] = useState<SongStatus>('PUBLIC');

  // Lyric state
  const [lyricData, setLyricData] = useState<LyricResponse | null>(null);
  const [hasLyric, setHasLyric] = useState(false);
  const [pickedLyric, setPickedLyric] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    void loadData();
  }, [songId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [songRes, genreRes] = await Promise.allSettled([
        apiClient.get<Song>(`/songs/${songId}`),
        getPopularGenres(30),
      ]);

      if (songRes.status === 'fulfilled') {
        const s = unwrap<Song>(songRes.value.data);
        setSong(s);
        setTitle(s.title);
        setSelectedGenreIds(s.genres?.map(g => g.id) ?? []);
        setStatus((s.status === 'PUBLIC' || s.status === 'PRIVATE') ? s.status : 'PUBLIC');
        setHasLyric(!!s.lyricUrl);
      }

      if (genreRes.status === 'fulfilled') {
        setGenres(genreRes.value as unknown as Genre[]);
      }

      // Fetch lyric info
      try {
        const lyric = await getLyric(songId);
        setLyricData(lyric);
        setHasLyric(true);
      } catch {
        setLyricData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleGenre = (id: string) => {
    setSelectedGenreIds(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('screens.create.missingInfoTitle', 'Thiếu thông tin'), t('screens.create.missingTitle', 'Nhập tên bài hát.'));
      return;
    }
    if (selectedGenreIds.length === 0) {
      Alert.alert(t('screens.create.missingInfoTitle', 'Thiếu thông tin'), t('screens.create.missingGenre', 'Chọn ít nhất 1 thể loại.'));
      return;
    }

    setSaving(true);
    try {
      await updateSong(songId, {
        title: title.trim(),
        genreIds: selectedGenreIds,
        status,
      });
      Alert.alert(
        t('screens.editSong.savedTitle', 'Đã lưu'),
        t('screens.editSong.savedMessage', 'Thông tin bài hát đã được cập nhật.'),
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('screens.editSong.saveFailed', 'Không thể lưu. Thử lại.'));
    } finally {
      setSaving(false);
    }
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
        t('screens.create.unsupportedFormatTitle', 'Định dạng không hỗ trợ'),
        `Chỉ hỗ trợ: ${LYRIC_EXTENSIONS.join(', ').toUpperCase()}`
      );
      return;
    }
    setPickedLyric(file);
  };

  const handleUploadLyric = async () => {
    if (!pickedLyric) return;
    setLyricUploading(true);
    try {
      const result = await uploadLyric(songId, {
        uri: pickedLyric.uri,
        name: pickedLyric.name,
        type: pickedLyric.mimeType ?? 'text/plain',
      });
      setLyricData(result);
      setHasLyric(true);
      setPickedLyric(null);
      Alert.alert(t('screens.editSong.lyricUploadedTitle', 'Thành công'), t('screens.editSong.lyricUploadedMessage', 'Lời bài hát đã được tải lên.'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('screens.editSong.lyricUploadFailed', 'Không thể tải lên lời bài hát.'));
    } finally {
      setLyricUploading(false);
    }
  };

  const handleDeleteLyric = () => {
    Alert.alert(
      t('screens.editSong.deleteLyricTitle', 'Xoá lời bài hát?'),
      t('screens.editSong.deleteLyricMessage', 'Lời bài hát sẽ bị xoá vĩnh viễn.'),
      [
        { text: t('common.cancel', 'Huỷ'), style: 'cancel' },
        {
          text: t('common.delete', 'Xoá'),
          style: 'destructive',
          onPress: async () => {
            setLyricDeleting(true);
            try {
              await deleteLyric(songId);
              setLyricData(null);
              setHasLyric(false);
              Alert.alert(t('screens.editSong.lyricDeletedTitle', 'Đã xoá'), t('screens.editSong.lyricDeletedMessage', 'Lời bài hát đã được xoá.'));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message ?? t('screens.editSong.lyricDeleteFailed', 'Không thể xoá.'));
            } finally {
              setLyricDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!song) {
    return (
      <View style={styles.centerFull}>
        <Text style={styles.errorText}>{t('screens.editSong.notFound', 'Không tìm thấy bài hát.')}</Text>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>{t('common.goBack', 'Quay lại')}</Text>
        </Pressable>
      </View>
    );
  }

  const isReady = (song.transcodeStatus as string) === 'COMPLETED';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[themeColors.gradNavy, themeColors.bg]}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <AntDesign name="arrow-left" color={COLORS.white} size={22} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('screens.editSong.title', 'Chỉnh sửa bài hát')}</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Song preview */}
          <View style={styles.songPreview}>
            {song.thumbnailUrl ? (
              <Image source={{ uri: song.thumbnailUrl }} style={styles.songThumb} />
            ) : (
              <View style={[styles.songThumb, styles.songThumbPlaceholder]}>
                <Text style={{ fontSize: 28 }}>🎵</Text>
              </View>
            )}
            <View style={styles.songPreviewInfo}>
              <Text style={styles.songPreviewTitle} numberOfLines={2}>{song.title}</Text>
              <Text style={styles.songPreviewArtist} numberOfLines={1}>
                {song.primaryArtist?.stageName}
              </Text>
              <Text style={styles.songPreviewMeta}>
                🎧 {song.playCount?.toLocaleString('vi-VN') ?? 0} lượt nghe
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Title */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('screens.editSong.infoSection', 'Thông tin bài hát')}</Text>

            <Text style={styles.fieldLabel}>{t('screens.create.songTitleLabel', 'Tên bài hát')}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('screens.create.songTitlePlaceholder', 'Nhập tên bài hát...')}
              placeholderTextColor={COLORS.glass35}
            />

            {/* Status toggle */}
            {isReady && (
              <>
                <Text style={styles.fieldLabel}>{t('screens.editSong.statusLabel', 'Trạng thái')}</Text>
                <View style={styles.statusRow}>
                  {(['PUBLIC', 'PRIVATE'] as SongStatus[]).map(s => (
                    <Pressable
                      key={s}
                      style={[styles.statusChip, status === s && styles.statusChipActive]}
                      onPress={() => setStatus(s)}
                    >
                      <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
                        {s === 'PUBLIC' ? '🌐 Công khai' : '🔒 Riêng tư'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Genres */}
            <Text style={styles.fieldLabel}>
              {t('labels.genre', 'Thể loại')}
              {selectedGenreIds.length > 0 && (
                <Text style={{ color: COLORS.accent }}> ({selectedGenreIds.length})</Text>
              )}
            </Text>
            <View style={styles.genreWrap}>
              {genres.map(g => {
                const active = selectedGenreIds.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    style={[styles.genreChip, active && styles.genreChipActive]}
                    onPress={() => toggleGenre(g.id)}
                  >
                    <Text style={[styles.genreText, active && styles.genreTextActive]}>
                      {g.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Save button */}
            <Pressable
              style={[styles.saveBtn, saving && styles.disabledBtn]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={[themeColors.accent, themeColors.accentAlt]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('screens.editSong.saveButton', 'Lưu thay đổi')}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Lyric section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('screens.editSong.lyricSection', 'Lời bài hát')}</Text>

            {hasLyric && lyricData ? (
              <View style={styles.lyricInfo}>
                <View style={styles.lyricInfoHeader}>
                  <Text style={styles.lyricInfoIcon}>📝</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lyricInfoText}>
                      {t('screens.editSong.lyricAvailable', 'Đã có lời bài hát')}
                    </Text>
                    <Text style={styles.lyricInfoFormat}>
                      {t('screens.editSong.formatLabel', 'Định dạng')}: {lyricData.format}
                      {'  ·  '}
                      {lyricData.lines?.length ?? 0} {t('screens.editSong.linesLabel', 'dòng')}
                    </Text>
                  </View>
                </View>

                {/* Preview first few lines */}
                <View style={styles.lyricPreview}>
                  {lyricData.lines?.slice(0, 4).map((line, i) => (
                    <Text key={i} style={styles.lyricPreviewLine} numberOfLines={1}>
                      {line.text}
                    </Text>
                  ))}
                  {(lyricData.lines?.length ?? 0) > 4 && (
                    <Text style={styles.lyricPreviewMore}>
                      ... {t('screens.editSong.moreLines', 'và')} {(lyricData.lines?.length ?? 0) - 4} {t('screens.editSong.linesLabel', 'dòng')} {t('screens.editSong.more', 'nữa')}
                    </Text>
                  )}
                </View>

                {/* Delete lyric */}
                <Pressable
                  style={[styles.deleteLyricBtn, lyricDeleting && styles.disabledBtn]}
                  onPress={handleDeleteLyric}
                  disabled={lyricDeleting}
                >
                  {lyricDeleting ? (
                    <ActivityIndicator color={COLORS.error} size="small" />
                  ) : (
                    <Text style={styles.deleteLyricText}>
                      <AntDesign name="delete" color={COLORS.error} size={14} />{' '}
                      {t('screens.editSong.deleteLyricButton', 'Xoá lời bài hát')}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text style={styles.noLyricText}>
                {t('screens.editSong.noLyric', 'Chưa có lời bài hát cho bài này.')}
              </Text>
            )}

            {/* Upload new lyric */}
            <Text style={styles.fieldLabel}>
              {hasLyric
                ? t('screens.editSong.replaceLyric', 'Thay thế lời bài hát')
                : t('screens.editSong.addLyric', 'Thêm lời bài hát')}
            </Text>
            <Pressable
              style={[
                styles.filePicker,
                pickedLyric && styles.filePickerSelected,
              ]}
              onPress={handlePickLyric}
            >
              {pickedLyric ? (
                <View style={styles.filePickerRow}>
                  <Text style={styles.fileIcon}>📝</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{pickedLyric.name}</Text>
                    <Text style={styles.fileSize}>
                      {pickedLyric.size ? `${(pickedLyric.size / 1024).toFixed(1)} KB` : ''}
                      {'  ·  '}
                      {pickedLyric.name.split('.').pop()?.toUpperCase()}
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => setPickedLyric(null)}>
                    <Text style={styles.fileChange}>{t('common.remove', 'Xoá')}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.filePickerEmpty}>
                  <Text style={styles.filePickerPlus}>📝</Text>
                  <Text style={styles.filePickerHint}>
                    {t('screens.create.chooseLyricFile', 'Chọn file lời bài hát')}
                  </Text>
                  <Text style={styles.filePickerFormats}>
                    LRC  ·  SRT  ·  TXT
                  </Text>
                </View>
              )}
            </Pressable>

            {pickedLyric && (
              <Pressable
                style={[styles.uploadLyricBtn, lyricUploading && styles.disabledBtn]}
                onPress={handleUploadLyric}
                disabled={lyricUploading}
              >
                {lyricUploading ? (
                  <View style={styles.uploadLyricBtnRow}>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text style={styles.uploadLyricBtnText}>
                      {t('screens.editSong.uploadingLyric', 'Đang tải lên...')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.uploadLyricBtnText}>
                    {hasLyric
                      ? t('screens.editSong.replaceLyricButton', 'Thay thế lời bài hát')
                      : t('screens.editSong.uploadLyricButton', 'Tải lên lời bài hát')}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  centerFull: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  errorText: { color: COLORS.glass50, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  backBtn: {
    backgroundColor: COLORS.accentDim, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },

  songPreview: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  songThumb: { width: 72, height: 72, borderRadius: 14 },
  songThumbPlaceholder: {
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.accentBorder25,
  },
  songPreviewInfo: { flex: 1, gap: 3 },
  songPreviewTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  songPreviewArtist: { color: COLORS.glass50, fontSize: 13 },
  songPreviewMeta: { color: COLORS.glass35, fontSize: 12 },

  body: { paddingHorizontal: 20, gap: 14 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.glass10,
    padding: 18, gap: 10,
  },
  cardTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },

  fieldLabel: {
    color: COLORS.glass40, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', marginTop: 4,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.glass15,
    backgroundColor: COLORS.surfaceLow, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.white, fontSize: 15,
  },

  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.glass20, backgroundColor: COLORS.surfaceLow,
    paddingVertical: 11, alignItems: 'center',
  },
  statusChipActive: {
    borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20,
  },
  statusChipText: { color: COLORS.glass60, fontSize: 14, fontWeight: '600' },
  statusChipTextActive: { color: COLORS.accent },

  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: {
    borderRadius: 999, borderWidth: 1, borderColor: COLORS.glass20,
    paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.surfaceLow,
  },
  genreChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
  genreText: { color: COLORS.glass70, fontSize: 13 },
  genreTextActive: { color: COLORS.accent, fontWeight: '600' },

  saveBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 4 },
  saveBtnGradient: {
    minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 999,
  },
  saveBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

  lyricInfo: { gap: 10 },
  lyricInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lyricInfoIcon: { fontSize: 28 },
  lyricInfoText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  lyricInfoFormat: { color: COLORS.glass40, fontSize: 12, marginTop: 2 },

  lyricPreview: {
    backgroundColor: COLORS.surfaceLow, borderRadius: 10,
    padding: 12, gap: 4,
  },
  lyricPreviewLine: { color: COLORS.glass60, fontSize: 13, lineHeight: 20 },
  lyricPreviewMore: { color: COLORS.glass30, fontSize: 12, fontStyle: 'italic', marginTop: 4 },

  noLyricText: { color: COLORS.glass40, fontSize: 14 },

  deleteLyricBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.error,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  deleteLyricText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },

  filePicker: {
    borderWidth: 1.5, borderColor: COLORS.glass15,
    borderStyle: 'dashed', borderRadius: 12, overflow: 'hidden',
  },
  filePickerSelected: {
    borderStyle: 'solid', borderColor: COLORS.accentBorder35,
    backgroundColor: COLORS.accentFill20,
  },
  filePickerEmpty: { alignItems: 'center', paddingVertical: 18, gap: 4 },
  filePickerPlus: { fontSize: 28, lineHeight: 32 },
  filePickerHint: { color: COLORS.glass50, fontSize: 14, fontWeight: '600' },
  filePickerFormats: { color: COLORS.glass25, fontSize: 11, letterSpacing: 0.5 },
  filePickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  fileIcon: { fontSize: 24 },
  fileName: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  fileSize: { color: COLORS.glass45, fontSize: 12, marginTop: 2 },
  fileChange: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },

  uploadLyricBtn: {
    backgroundColor: COLORS.accentDim, borderRadius: 12,
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  uploadLyricBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadLyricBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  disabledBtn: { opacity: 0.45 },
});
