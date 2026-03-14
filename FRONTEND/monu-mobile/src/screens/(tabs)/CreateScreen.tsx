import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { getMySubscription, UserSubscription } from '../../services/payment';
import { apiClient } from '../../services/api';
import { confirmUploadSong, Genre, requestUploadSong } from '../../services/music';
import { getPopularGenres } from '../../services/favorites';

const ALLOWED_UPLOAD_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'] as const;

type ArtistProfile = {
  id: string;
  stageName: string;
  status: 'ACTIVE' | 'PENDING' | 'BANNED' | 'REJECTED';
};

export const CreateScreen = () => {
  const insets = useSafeAreaInsets();
  const { authSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadExt, setUploadExt] = useState('mp3');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [pendingSongId, setPendingSongId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isFileUploaded, setIsFileUploaded] = useState(false);

  React.useEffect(() => {
    void loadCreatorState();
  }, [authSession?.tokens.accessToken]);

  const loadCreatorState = async () => {
    if (!authSession) return;
    setLoading(true);
    try {
      const [artistRes, subRes, genreRes] = await Promise.allSettled([
        apiClient.get<ArtistProfile>('/artists/me'),
        getMySubscription(),
        getPopularGenres(20),
      ]);

      if (artistRes.status === 'fulfilled') {
        setArtistProfile(artistRes.value.data);
      } else if (authSession.profile?.role === 'ARTIST') {
        setArtistProfile({
          id: authSession.profile.id,
          stageName: authSession.profile.fullName || authSession.profile.email,
          status: 'ACTIVE',
        });
      } else {
        setArtistProfile(null);
      }

      if (subRes.status === 'fulfilled') setSubscription(subRes.value);
      else setSubscription(null);

      if (genreRes.status === 'fulfilled') setGenres(genreRes.value as unknown as Genre[]);
      else setGenres([]);
    } finally {
      setLoading(false);
    }
  };

  const isBanned = authSession?.profile?.status === 'BANNED' || artistProfile?.status === 'BANNED';
  const isArtist = Boolean(artistProfile?.id) || authSession?.profile?.role === 'ARTIST';
  const hasActiveSubscription = subscription?.status === 'ACTIVE' && new Date(subscription.expiresAt).getTime() > Date.now();

  const creatorStatusText = useMemo(() => {
    if (!authSession) return 'Bạn cần đăng nhập để tạo nội dung.';
    if (isBanned) return 'Tài khoản đang bị khóa, không thể tạo nội dung.';
    if (!isArtist) return 'Bạn chưa đăng ký artist profile.';
    if (!hasActiveSubscription) return 'Gói cước đã hết hạn, hãy gia hạn để upload.';
    return `Sẵn sàng sáng tạo với nghệ danh ${artistProfile?.stageName || authSession.profile?.fullName}.`;
  }, [authSession, isBanned, isArtist, hasActiveSubscription, artistProfile?.stageName]);

  const canCreateSongAlbum = !!authSession && !isBanned && isArtist && hasActiveSubscription;

  const handleCreateSongAlbum = () => {
    if (!authSession) return Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để dùng tính năng này.');
    if (isBanned) return Alert.alert('Tài khoản bị giới hạn', 'Bạn đang bị ban nên không thể thêm bài hát/album.');
    if (!isArtist) return Alert.alert('Chưa phải nghệ sĩ', 'Bạn cần đăng ký hồ sơ artist trước khi upload bài hát/album.');
    if (!hasActiveSubscription) return Alert.alert('Hết hạn gói cước', 'Gói cước không còn hiệu lực. Vui lòng nâng cấp/gia hạn để tiếp tục.');
    Alert.alert('Sẵn sàng', 'Bạn đã đủ điều kiện artist + gói cước để upload.');
  };

  const handleRequestUpload = async () => {
    if (!canCreateSongAlbum) return handleCreateSongAlbum();
    const normalizedExt = uploadExt.trim().toLowerCase().replace(/^\./, '');
    if (!uploadTitle.trim() || selectedGenreIds.length === 0) {
      return Alert.alert('Thiếu dữ liệu', 'Nhập title và chọn ít nhất 1 genre.');
    }
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(normalizedExt as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
      return Alert.alert('Sai định dạng', `Backend chỉ hỗ trợ: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`);
    }
    try {
      const created = await requestUploadSong({
        title: uploadTitle.trim(),
        fileExtension: normalizedExt,
        genreIds: selectedGenreIds,
      });
      setPendingSongId(created.id);
      setUploadUrl(created.uploadUrl || null);
      setIsFileUploaded(false);
      Alert.alert('Bước 1 thành công', 'Đã tạo upload URL. Upload file lên URL và bấm Xác nhận upload.');
    } catch (error: any) {
      Alert.alert('Lỗi upload', error?.message || 'Không thể tạo request upload. Kiểm tra genre hoặc định dạng file.');
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingSongId) return;
    if (!selectedAudioFile || !isFileUploaded) {
      return Alert.alert('Thiếu file nhạc', 'Bạn cần chọn và upload file nhạc thành công trước khi xác nhận upload.');
    }
    try {
      await confirmUploadSong(pendingSongId);
      Alert.alert('Đã xác nhận', 'Upload confirmed, hệ thống đang transcode.');
      setPendingSongId(null);
      setUploadUrl(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể xác nhận upload');
    }
  };

  const toggleGenre = (id: string) => {
    setSelectedGenreIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const uploadSongFile = async (url: string, file: DocumentPicker.DocumentPickerAsset) => {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
      },
      body: blob,
    });
    if (!putRes.ok) {
      throw new Error(`Upload thất bại (HTTP ${putRes.status})`);
    }
  };

  const handlePickAudioFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;

    const file = picked.assets[0];
    const nameOrExt = (file.name || '').toLowerCase();
    const fileExt = nameOrExt.includes('.') ? nameOrExt.split('.').pop() || '' : '';
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(fileExt as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
      Alert.alert('Sai định dạng', `File không hợp lệ. Chỉ chấp nhận: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`);
      return;
    }

    setUploadExt(fileExt);
    setSelectedAudioFile(file);
    setIsFileUploaded(false);
  };

  const handleUploadPickedFile = async () => {
    if (!uploadUrl) return Alert.alert('Thiếu upload URL', 'Hãy bấm "Tạo upload URL" trước.');
    if (!selectedAudioFile) return Alert.alert('Thiếu file nhạc', 'Hãy chọn file nhạc trước khi upload.');

    try {
      setIsUploadingFile(true);
      await uploadSongFile(uploadUrl, selectedAudioFile);
      setIsFileUploaded(true);
      Alert.alert('Upload thành công', 'File nhạc đã được upload. Bạn có thể bấm Xác nhận upload.');
    } catch (error: any) {
      setIsFileUploaded(false);
      Alert.alert('Lỗi upload file', error?.message || 'Không thể upload file nhạc lên URL đã cấp.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <LinearGradient colors={[COLORS.gradNavy, COLORS.bg]} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.emoji}>🎼</Text>
          <Text style={styles.title}>Creator Studio</Text>
          <Text style={styles.sub}>{creatorStatusText}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator color={COLORS.accent} /> : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Thêm bài hát / Album</Text>
                <Text style={styles.cardDesc}>Kiểm tra artist, gói cước và trạng thái ban trước khi tạo.</Text>
                <Pressable onPress={handleCreateSongAlbum} style={[styles.primaryBtn, !canCreateSongAlbum && styles.disabledBtn]}>
                  <Text style={styles.primaryBtnText}>{canCreateSongAlbum ? 'Tiếp tục tạo nội dung' : 'Chưa đủ điều kiện'}</Text>
                </Pressable>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Upload bài hát cho mọi người cùng nghe</Text>
                <TextInput style={styles.input} value={uploadTitle} onChangeText={setUploadTitle} placeholder="Tên bài hát" placeholderTextColor={COLORS.glass45} />
                <Text style={styles.genreLabel}>Định dạng file</Text>
                <View style={styles.genreWrap}>
                  {ALLOWED_UPLOAD_EXTENSIONS.map((ext) => {
                    const active = uploadExt === ext;
                    return (
                      <Pressable key={ext} style={[styles.genreChip, active && styles.genreChipActive]} onPress={() => setUploadExt(ext)}>
                        <Text style={[styles.genreText, active && styles.genreTextActive]}>{ext.toUpperCase()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.genreLabel}>Chọn file nhạc</Text>
                <View style={styles.fileRow}>
                  <Pressable onPress={handlePickAudioFile} style={[styles.primaryBtn, { flex: 1 }]}>
                    <Text style={styles.primaryBtnText}>Chọn file</Text>
                  </Pressable>
                  <Pressable onPress={handleUploadPickedFile} style={[styles.primaryBtn, { flex: 1 }, (!uploadUrl || !selectedAudioFile || isUploadingFile) && styles.disabledBtn]} disabled={!uploadUrl || !selectedAudioFile || isUploadingFile}>
                    <Text style={styles.primaryBtnText}>{isUploadingFile ? 'Đang upload...' : 'Upload file'}</Text>
                  </Pressable>
                </View>
                {!!selectedAudioFile && <Text style={styles.fileName}>Đã chọn: {selectedAudioFile.name}</Text>}
                {isFileUploaded && <Text style={styles.fileOk}>✓ File đã upload thành công.</Text>}
                <Text style={styles.genreLabel}>Chọn thể loại</Text>
                <View style={styles.genreWrap}>
                  {genres.map((g) => {
                    const active = selectedGenreIds.includes(g.id);
                    return (
                      <Pressable key={g.id} style={[styles.genreChip, active && styles.genreChipActive]} onPress={() => toggleGenre(g.id)}>
                        <Text style={[styles.genreText, active && styles.genreTextActive]}>{g.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!!uploadUrl && <Text style={styles.uploadUrl}>Upload URL: {uploadUrl}</Text>}
                <Text style={styles.uploadGuide}>Sau khi tạo URL: dùng PUT upload file gốc lên URL này (không đổi Content-Type), rồi bấm Xác nhận upload để backend trigger transcode.</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={handleRequestUpload} style={[styles.primaryBtn, { flex: 1 }]}><Text style={styles.primaryBtnText}>Tạo upload URL</Text></Pressable>
                  <Pressable
                    onPress={handleConfirmUpload}
                    style={[styles.primaryBtn, { flex: 1 }, (!pendingSongId || !selectedAudioFile || !isFileUploaded) && styles.disabledBtn]}
                    disabled={!pendingSongId || !selectedAudioFile || !isFileUploaded}
                  ><Text style={styles.primaryBtnText}>Xác nhận upload</Text></Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center', justifyContent: 'center', minHeight: 230 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { color: COLORS.white, fontSize: 32, fontWeight: '800', marginBottom: 10 },
  sub: { color: COLORS.glass50, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  body: { paddingHorizontal: 20, gap: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.glass10, padding: 16 },
  cardTitle: { color: COLORS.white, fontWeight: '700', fontSize: 18, marginBottom: 6 },
  cardDesc: { color: COLORS.glass60, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: COLORS.glass15, backgroundColor: COLORS.surfaceLow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: COLORS.white, marginBottom: 8 },
  genreLabel: { color: COLORS.glass60, marginBottom: 6 },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  genreChip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.glass20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.surfaceLow },
  genreChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentFill20 },
  genreText: { color: COLORS.glass70, fontSize: 12 },
  genreTextActive: { color: COLORS.accent, fontWeight: '700' },
  fileRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  fileName: { color: COLORS.glass60, fontSize: 12, marginBottom: 4 },
  fileOk: { color: COLORS.accent, fontSize: 12, marginBottom: 8 },
  uploadUrl: { color: COLORS.glass60, fontSize: 12, marginBottom: 8 },
  uploadGuide: { color: COLORS.glass50, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  primaryBtn: { backgroundColor: COLORS.accentDim, borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: COLORS.surfaceDim },
  primaryBtnText: { color: COLORS.white, fontWeight: '700' },
});
