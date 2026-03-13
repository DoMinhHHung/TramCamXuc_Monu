import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { useAuth } from '../../context/AuthContext';
import { Album, getMyAlbums, getMyPlaylists, getMySongs, Playlist, Song } from '../../services/music';
import { createFeedPost } from '../../services/social';

export const LibraryScreen = () => {
  const insets = useSafeAreaInsets();
  const { authSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    void loadLibrary();
  }, [authSession?.tokens.accessToken]);

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
    title: string,
    method: 'qr' | 'link' | 'feed',
  ) => {
    const link = `https://monu.app/${type}/${id}`;

    if (method === 'qr') {
      Alert.alert('Share qua QR', `QR cho ${title} sẽ hiển thị ở bước tiếp theo.\nLink: ${link}`);
      return;
    }

    if (method === 'link') {
      await Share.share({ message: `Nghe ngay: ${title}\n${link}` });
      return;
    }

    try {
      await createFeedPost({
        visibility: 'PUBLIC',
        title,
        caption: `Mình vừa chia sẻ ${title} 🎧`,
        contentId: id,
        contentType: type.toUpperCase() as 'PLAYLIST' | 'SONG' | 'ALBUM',
      });
      Alert.alert('Đã chia sẻ', 'Nội dung đã được đăng lên feed.');
    } catch (error: any) {
      Alert.alert('Không thể chia sẻ feed', error?.message || 'Vui lòng thử lại.');
    }
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
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderColor: COLORS.glass10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  itemTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  shareLabel: { color: COLORS.glass45, fontSize: 12 },
  shareAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
});
