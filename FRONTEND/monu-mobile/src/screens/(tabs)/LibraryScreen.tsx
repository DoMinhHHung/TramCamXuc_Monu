import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { addSongToPlaylist, Album, createPlaylist, getMyAlbums, getMyPlaylists, getMySongs, Playlist, Song } from '../../services/music';
import { createFeedPost, getPlaylistShareLink, getPlaylistShareQr } from '../../services/social';
import { usePlayer } from '../../context/PlayerContext';

const PUBLIC_LINK_BASE = 'https://phazelsound.oopsgolden.id.vn';

export const LibraryScreen = () => {
  const insets = useSafeAreaInsets();
  const { authSession } = useAuth();
  const navigation = useNavigation<any>();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [qrData, setQrData] = useState<{ link: string; image?: string } | null>(null);
  const [feedSharePayload, setFeedSharePayload] = useState<{id: string; type: 'PLAYLIST' | 'SONG' | 'ALBUM'; defaultTitle: string} | null>(null);
  const [feedTitleInput, setFeedTitleInput] = useState('');
  const [addSongTarget, setAddSongTarget] = useState<Song | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useFocusEffect(
    useCallback(() => {
      void loadLibrary(false);
      const id = setInterval(() => void loadLibrary(true), 12000);
      return () => clearInterval(id);
    }, [authSession?.tokens.accessToken]),
  );

  const loadLibrary = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [playlistRes, songRes, albumRes] = await Promise.allSettled([
        getMyPlaylists({ page: 1, size: 50 }),
        getMySongs({ page: 1, size: 50 }),
        getMyAlbums({ page: 1, size: 50 }),
      ]);

      setPlaylists(playlistRes.status === 'fulfilled' ? playlistRes.value.content ?? [] : []);
      setSongs(songRes.status === 'fulfilled' ? songRes.value.content ?? [] : []);
      setAlbums(albumRes.status === 'fulfilled' ? albumRes.value.content ?? [] : []);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleShare = async (
    type: 'playlist' | 'song' | 'album',
    id: string,
    defaultTitle: string,
    method: 'qr' | 'link' | 'feed',
  ) => {
    const link = `${PUBLIC_LINK_BASE}/${type}/${id}`;

    if (method === 'qr') {
      if (type === 'playlist') {
        const qr = await getPlaylistShareQr(id);
        setQrData({ link: qr.shareUrl, image: qr.qrCodeBase64 });
      } else {
        setQrData({ link });
      }
      return;
    }

    if (method === 'link') {
      const shareUrl = type === 'playlist' ? (await getPlaylistShareLink(id)).shareUrl : link;
      await Share.share({ message: `Nghe ngay: ${defaultTitle}\n${shareUrl}` });
      return;
    }

    setFeedSharePayload({ id, type: type.toUpperCase() as 'PLAYLIST' | 'SONG' | 'ALBUM', defaultTitle });
    setFeedTitleInput(defaultTitle);
  };

  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    try {
      await addSongToPlaylist(playlistId, songId);
      Alert.alert('Thành công', 'Đã thêm bài hát vào playlist.');
      setAddSongTarget(null);
      await loadLibrary(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể thêm bài hát vào playlist');
    }
  };

  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const renderShareActions = (type: 'playlist' | 'song' | 'album', id: string, title: string) => (
    <View style={styles.shareRow}>
      <Text style={styles.shareLabel}>Share:</Text>
      <Pressable onPress={() => void handleShare(type, id, title, 'qr')}><Text style={styles.shareAction}>QR</Text></Pressable>
      <Pressable onPress={() => void handleShare(type, id, title, 'link')}><Text style={styles.shareAction}>Link</Text></Pressable>
      <Pressable onPress={() => void handleShare(type, id, title, 'feed')}><Text style={styles.shareAction}>Feed</Text></Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <LinearGradient colors={[COLORS.gradSlate, COLORS.bg]} style={[styles.header, { paddingTop: insets.top + 18 }]}>
          <Text style={styles.headerTitle}>Thư viện</Text>
          <Text style={styles.headerSub}>Playlist / Songs / Album của user hoặc nghệ sĩ</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator color={COLORS.accent} /> : null}

          <Text style={styles.sectionTitle}>Playlist ({playlists.length})</Text>
          {playlists.map((p) => (
            <Pressable key={p.id} style={styles.itemCard} onPress={() => navigation.navigate('PlaylistDetail', { slug: p.slug, name: p.name })}>
              <Text style={styles.itemTitle}>{p.name}</Text>
              <Text style={styles.itemSub}>{p.totalSongs ?? p.songs?.length ?? 0} bài hát</Text>
              {renderShareActions('playlist', p.id, p.name)}
            </Pressable>
          ))}

          <Text style={styles.sectionTitle}>Songs ({songs.length})</Text>
          {songs.map((s) => (
            <View key={s.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{s.title}</Text>
              <View style={styles.songActionRow}>
                <Pressable onPress={() => playSong(s, songs)}><Text style={styles.shareAction}>{currentSong?.id === s.id && isPlaying ? '⏸ Đang phát' : '▶ Phát'}</Text></Pressable>
                <Pressable onPress={() => setAddSongTarget(s)}><Text style={styles.shareAction}>+ Thêm vào playlist</Text></Pressable>
              </View>
              {renderShareActions('song', s.id, s.title)}
            </View>
          ))}

          <Text style={styles.sectionTitle}>Album ({albums.length})</Text>
          {albums.map((a) => (
            <View key={a.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{a.title}</Text>
              {renderShareActions('album', a.id, a.title)}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!addSongTarget} transparent animationType="slide" onRequestClose={() => setAddSongTarget(null)}>
        <Pressable style={styles.qrBackdrop} onPress={() => setAddSongTarget(null)}>
          <View style={styles.sheetCard}>
            <Text style={styles.qrTitle}>Thêm vào playlist</Text>
            {playlists.map(p => (
              <Pressable key={p.id} style={styles.addPlaylistItem} onPress={() => addSongTarget && void handleAddSongToPlaylist(p.id, addSongTarget.id)}>
                <Text style={styles.itemTitle}>{p.name}</Text>
                <Text style={styles.itemSub}>{p.totalSongs ?? p.songs?.length ?? 0} bài hát</Text>
              </Pressable>
            ))}
            <TextInput value={newPlaylistName} onChangeText={setNewPlaylistName} placeholder="Tên playlist mới" placeholderTextColor={COLORS.glass45} style={styles.input} />
            <Pressable style={styles.newBtn} onPress={async () => {
              if (!newPlaylistName.trim()) return;
              try {
                const pl = await createPlaylist({ name: newPlaylistName.trim(), visibility: 'PUBLIC' });
                if (addSongTarget) await addSongToPlaylist(pl.id, addSongTarget.id);
                setNewPlaylistName('');
                setAddSongTarget(null);
                await loadLibrary(true);
              } catch (e: any) {
                Alert.alert('Lỗi', e?.message || 'Không thể tạo playlist mới');
              }
            }}>
              <Text style={styles.newBtnText}>+ Tạo playlist mới</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!feedSharePayload} transparent animationType="slide" onRequestClose={() => setFeedSharePayload(null)}>
        <Pressable style={styles.qrBackdrop} onPress={() => setFeedSharePayload(null)}>
          <View style={styles.sheetCard}>
            <Text style={styles.qrTitle}>Đăng lên Feed</Text>
            <TextInput style={styles.input} value={feedTitleInput} onChangeText={setFeedTitleInput} placeholder="Title" placeholderTextColor={COLORS.glass45} />
            <Pressable style={styles.newBtn} onPress={async () => {
              if (!feedSharePayload) return;
              try {
                await createFeedPost({ visibility: 'PUBLIC', title: feedTitleInput.trim() || feedSharePayload.defaultTitle, caption: `Mình vừa chia sẻ ${feedSharePayload.defaultTitle} 🎧`, contentId: feedSharePayload.id, contentType: feedSharePayload.type });
                setFeedSharePayload(null);
                Alert.alert('Đã chia sẻ', 'Nội dung đã được đăng lên feed.');
              } catch (error: any) {
                Alert.alert('Không thể chia sẻ feed', error?.message || 'Vui lòng thử lại.');
              }
            }}><Text style={styles.newBtnText}>Đăng</Text></Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!qrData} transparent animationType="slide" onRequestClose={() => setQrData(null)}>
        <Pressable style={styles.qrBackdrop} onPress={() => setQrData(null)}>
          <View style={styles.sheetCard}>
            <Text style={styles.qrTitle}>QR Chia sẻ</Text>
            {qrData?.image ? <Image source={{ uri: qrData.image }} style={styles.qrImage} /> : <View style={styles.qrPlaceholder}><Text style={styles.qrPlaceholderText}>▦ QR ▦</Text></View>}
            <Text style={styles.qrLink}>{qrData?.link}</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 22 },
  headerTitle: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  headerSub: { color: COLORS.glass50, marginTop: 6 },
  body: { paddingHorizontal: 20 },
  sectionTitle: { color: COLORS.white, fontWeight: '700', marginTop: 18, marginBottom: 10, fontSize: 17 },
  itemCard: { backgroundColor: COLORS.surface, borderRadius: 12, borderColor: COLORS.glass10, borderWidth: 1, padding: 12, marginBottom: 10 },
  itemTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  itemSub: { color: COLORS.glass50, fontSize: 12, marginTop: 4 },
  songActionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  shareLabel: { color: COLORS.glass45, fontSize: 12 },
  shareAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  qrBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
  sheetCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  qrTitle: { color: COLORS.white, fontWeight: '800', fontSize: 18, marginBottom: 10 },
  qrPlaceholder: { width: 180, height: 180, borderRadius: 12, borderWidth: 2, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  qrPlaceholderText: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  qrLink: { color: COLORS.glass70, textAlign: 'center' },
  qrImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 10 },
  input: { color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  newBtn: { minHeight: 40, borderRadius: 8, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' },
  newBtnText: { color: COLORS.white, fontWeight: '700' },
  playlistSongRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.glass10 },
  playlistSongTitle: { color: COLORS.white, fontWeight: '600' },
  playlistSongMeta: { color: COLORS.glass50, fontSize: 12 },
  addPlaylistItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.glass10 },
});
