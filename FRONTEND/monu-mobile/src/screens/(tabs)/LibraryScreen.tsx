import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { Album, getMyAlbums, getMyPlaylists, getMySongs, Playlist, Song } from '../../services/music';
import { createFeedPost } from '../../services/social';

const PUBLIC_LINK_BASE = 'https://phazelsound.oopsgolden.id.vn';

export const LibraryScreen = () => {
  const insets = useSafeAreaInsets();
  const { authSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [feedSharePayload, setFeedSharePayload] = useState<{id: string; type: 'PLAYLIST' | 'SONG' | 'ALBUM'; defaultTitle: string} | null>(null);
  const [feedTitleInput, setFeedTitleInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
      const id = setInterval(() => void loadLibrary(), 12000);
      return () => clearInterval(id);
    }, [authSession?.tokens.accessToken]),
  );

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const [playlistRes, songRes, albumRes] = await Promise.allSettled([
        getMyPlaylists({ page: 1, size: 20 }),
        getMySongs({ page: 1, size: 20 }),
        getMyAlbums({ page: 1, size: 20 }),
      ]);

      setPlaylists(playlistRes.status === 'fulfilled' ? playlistRes.value.content ?? [] : []);
      setSongs(songRes.status === 'fulfilled' ? songRes.value.content ?? [] : []);
      setAlbums(albumRes.status === 'fulfilled' ? albumRes.value.content ?? [] : []);
    } finally {
      setLoading(false);
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
      setQrLink(link);
      return;
    }

    if (method === 'link') {
      await Share.share({ message: `Nghe ngay: ${defaultTitle}\n${link}` });
      return;
    }

    setFeedSharePayload({ id, type: type.toUpperCase() as 'PLAYLIST' | 'SONG' | 'ALBUM', defaultTitle });
    setFeedTitleInput(defaultTitle);
  };

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
            <View key={p.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{p.name}</Text>
              {renderShareActions('playlist', p.id, p.name)}
            </View>
          ))}

          <Text style={styles.sectionTitle}>Songs ({songs.length})</Text>
          {songs.map((s) => (
            <View key={s.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{s.title}</Text>
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


      <Modal visible={!!feedSharePayload} transparent animationType="slide" onRequestClose={() => setFeedSharePayload(null)}>
        <Pressable style={styles.qrBackdrop} onPress={() => setFeedSharePayload(null)}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Đăng lên Feed</Text>
            <TextInput
              style={styles.feedInput}
              value={feedTitleInput}
              onChangeText={setFeedTitleInput}
              placeholder="Title"
              placeholderTextColor={COLORS.glass45}
            />
            <Pressable
              style={styles.feedBtn}
              onPress={async () => {
                if (!feedSharePayload) return;
                try {
                  await createFeedPost({
                    visibility: 'PUBLIC',
                    title: feedTitleInput.trim() || feedSharePayload.defaultTitle,
                    caption: `Mình vừa chia sẻ ${feedSharePayload.defaultTitle} 🎧`,
                    contentId: feedSharePayload.id,
                    contentType: feedSharePayload.type,
                  });
                  setFeedSharePayload(null);
                  Alert.alert('Đã chia sẻ', 'Nội dung đã được đăng lên feed.');
                } catch (error: any) {
                  Alert.alert('Không thể chia sẻ feed', error?.message || 'Vui lòng thử lại.');
                }
              }}
            >
              <Text style={styles.feedBtnText}>Đăng</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!qrLink} transparent animationType="slide" onRequestClose={() => setQrLink(null)}>
        <Pressable style={styles.qrBackdrop} onPress={() => setQrLink(null)}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>QR Chia sẻ</Text>
            <View style={styles.qrPlaceholder}><Text style={styles.qrPlaceholderText}>▦ QR ▦</Text></View>
            <Text style={styles.qrLink}>{qrLink}</Text>
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
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  shareLabel: { color: COLORS.glass45, fontSize: 12 },
  shareAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  qrBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
  qrCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, alignItems: 'center' },
  qrTitle: { color: COLORS.white, fontWeight: '800', fontSize: 18, marginBottom: 10 },
  qrPlaceholder: { width: 180, height: 180, borderRadius: 12, borderWidth: 2, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  qrPlaceholderText: { color: COLORS.white, fontSize: 28, fontWeight: '900' },
  qrLink: { color: COLORS.glass70, textAlign: 'center' },
  feedInput: { width: '100%', color: COLORS.white, borderWidth: 1, borderColor: COLORS.glass20, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  feedBtn: { width: '100%', minHeight: 40, borderRadius: 8, backgroundColor: COLORS.accentDim, alignItems: 'center', justifyContent: 'center' },
  feedBtnText: { color: COLORS.white, fontWeight: '700' },
});
