import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Pressable,
  StyleSheet, Text, TextInput, View, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Octicons } from '@expo/vector-icons';

import { BackButton } from '../../components/BackButton';
import { VoiceSearchButton } from '../../components/VoiceSearchButton';
import { useThemeColors } from '../../config/colors';
import { usePlayer } from '../../context/PlayerContext';
import { useTranslation } from '../../context/LocalizationContext';
import { useVoiceSearch } from '../../hooks/useVoiceSearch';
import { Artist } from '../../services/music';
import { UnifiedSong, isSpotifySong } from '../../types/unified';
import { unifiedSearch } from '../../services/unifiedSearch';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistoryItem,
} from '../../utils/searchHistory';

const UnifiedSongRow = ({
  item,
  isActive,
  onPress,
  colors,
}: {
  item: UnifiedSong;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) => {
  const isSpotify = isSpotifySong(item);

  return (
    <Pressable style={[uStyles.row, isActive && { backgroundColor: `${colors.accent}18` }]} onPress={onPress}>
      <View style={uStyles.thumbWrap}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={uStyles.thumb} />
        ) : (
          <View style={[uStyles.thumb, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 18 }}>🎵</Text>
          </View>
        )}
        {isSpotify && (
          <View style={uStyles.spotifyDot}>
            <Text style={{ fontSize: 8 }}>🟢</Text>
          </View>
        )}
      </View>

      <View style={uStyles.info}>
        <Text style={[uStyles.title, isActive && { color: colors.accent }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[uStyles.sub, { color: colors.muted }]} numberOfLines={1}>
            {item.primaryArtist.stageName}
          </Text>
          {isSpotify && (
            <View style={[uStyles.previewBadge, { backgroundColor: 'rgba(30,215,96,0.12)' }]}>
              <Text style={uStyles.previewBadgeText}>30s Preview</Text>
            </View>
          )}
        </View>
      </View>

      <AntDesign
        name={isSpotify ? 'caretright' : 'play-circle'}
        size={22}
        color={isSpotify ? '#1ED760' : colors.white}
        style={{ opacity: 0.7 }}
      />
    </Pressable>
  );
};

const uStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 46, height: 46, borderRadius: 8 },
  spotifyDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#191414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, flex: 1 },
  previewBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  previewBadgeText: { color: '#1ED760', fontSize: 9, fontWeight: '700' },
});

const ArtistRow = ({
  item,
  onPress,
  colors,
}: {
  item: Artist;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) => (
  <Pressable style={[uStyles.row]} onPress={onPress}>
    <View style={[uStyles.thumb, {
      backgroundColor: colors.surface,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    }]}>
      <Text style={{ fontSize: 22 }}>🎤</Text>
    </View>
    <View style={uStyles.info}>
      <Text style={uStyles.title} numberOfLines={1}>{item.stageName}</Text>
      <Text style={[uStyles.sub, { color: colors.muted }]}>Nghệ sĩ</Text>
    </View>
    <Text style={{ color: colors.glass30, fontSize: 20 }}>›</Text>
  </Pressable>
);

const SectionHeader = ({ title, colors }: { title: string; colors: ReturnType<typeof useThemeColors> }) => (
  <View style={{
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: colors.bg,
  }}>
    <Text style={{ color: colors.glass40, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
      {title}
    </Text>
  </View>
);

export const SearchScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { playSong, currentSong } = usePlayer();
  const { t } = useTranslation();
  const themeColors = useThemeColors();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<UnifiedSong[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const voice = useVoiceSearch();
  const voiceBannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = voice.state === 'recording' || voice.state === 'processing';
    Animated.timing(voiceBannerAnim, { toValue: show ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [voice.state, voiceBannerAnim]);

  useEffect(() => {
    getSearchHistory().then(setHistory);
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSongs([]);
      setArtists([]);
      return;
    }
    setLoading(true);
    try {
      const result = await unifiedSearch(q, {
        internalLimit: 10,
        spotifyLimit: 8,
        includeArtists: true,
      });
      setSongs(result.songs);
      setArtists(result.artists);
    } catch {
      setSongs([]);
      setArtists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 400);
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setSongs([]);
      setArtists([]);
    } else {
      scheduleSearch(q);
    }
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;
    await addSearchHistory(query.trim());
    setHistory(await getSearchHistory());
    doSearch(query.trim());
  };

  const handleVoicePressIn = useCallback(async () => { await voice.startRecording(); }, [voice]);
  const handleVoicePressOut = useCallback(async () => {
    const text = await voice.stopAndTranscribe();
    if (text) {
      setQuery(text);
      await addSearchHistory(text.trim());
      setHistory(await getSearchHistory());
      doSearch(text.trim());
    }
  }, [voice, doSearch]);

  const handleHistoryPress = (q: string) => {
    setQuery(q);
    scheduleSearch(q);
    addSearchHistory(q).then(() => getSearchHistory().then(setHistory));
  };

  const handleRemoveHistory = async (q: string) => {
    setHistory(await removeSearchHistoryItem(q));
  };

  const handleSongPress = useCallback((song: UnifiedSong) => {
    playSong(song as any, songs as any);
    if (query.trim()) {
      addSearchHistory(query.trim()).then(() => getSearchHistory().then(setHistory));
    }
  }, [playSong, songs, query]);

  const handleArtistPress = useCallback((artist: Artist) => {
    navigation.navigate('ArtistProfile', { artistId: artist.artistId });
  }, [navigation]);

  const showHistory = !query.trim();
  const showEmpty = !loading && !!query.trim() && songs.length === 0 && artists.length === 0;
  const spotifyCount = songs.filter(isSpotifySong).length;

  return (
    <View style={[sStyles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={sStyles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <TextInput
          ref={inputRef}
          style={[sStyles.input, { color: themeColors.white }]}
          placeholder={t('screens.search.inputPlaceholder')}
          placeholderTextColor={themeColors.glass35}
          value={query}
          onChangeText={handleQueryChange}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCorrect={false}
          editable={voice.state === 'idle' || voice.state === 'error'}
        />
        {query.length > 0 && voice.state === 'idle' && (
          <Pressable onPress={() => { setQuery(''); setSongs([]); setArtists([]); }} hitSlop={8}>
            <Text style={{ color: themeColors.glass40, fontSize: 18 }}>✕</Text>
          </Pressable>
        )}
        <VoiceSearchButton state={voice.state} onPressIn={handleVoicePressIn} onPressOut={handleVoicePressOut} />
      </View>

      <Animated.View style={[sStyles.voiceBanner, { opacity: voiceBannerAnim, backgroundColor: `${themeColors.accent}15` }]} pointerEvents="none">
        <Text style={{ color: themeColors.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
          {voice.state === 'recording' ? '🔴 Đang ghi âm... thả để tìm kiếm' : '⏳ Đang nhận dạng giọng nói...'}
        </Text>
      </Animated.View>

      {loading && (
        <View style={sStyles.center}>
          <ActivityIndicator color={themeColors.accent} />
          <Text style={{ color: themeColors.glass40, marginTop: 8, fontSize: 13 }}>
            Đang tìm trong thư viện và Spotify...
          </Text>
        </View>
      )}

      {!loading && showHistory && (
        <FlatList
          data={history}
          keyExtractor={(item) => item}
          ListHeaderComponent={
            history.length > 0 ? (
              <View style={sStyles.historyHeader}>
                <Text style={[sStyles.historyTitle, { color: themeColors.white }]}>
                  {t('screens.search.historyTitle')}
                </Text>
                <Pressable onPress={() => { clearSearchHistory(); setHistory([]); }} hitSlop={8}>
                  <Text style={{ color: themeColors.accent, fontSize: 13, fontWeight: '600' }}>
                    {t('screens.search.clearAll')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={[sStyles.center, { paddingTop: 60 }]}>
                <Text style={{ fontSize: 42, marginBottom: 12 }}>🎙</Text>
                <Text style={{ color: themeColors.glass50, fontSize: 15, fontWeight: '600' }}>
                  Tìm kiếm nhạc
                </Text>
                <Text style={{ color: themeColors.glass30, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Giữ 🎤 để tìm bằng giọng nói{`\n`}hoặc gõ tên bài hát, nghệ sĩ
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable style={sStyles.historyRow} onPress={() => handleHistoryPress(item)}>
              <Octicons name="history" color={themeColors.glass40} size={18} />
              <Text style={[sStyles.historyText, { color: themeColors.glass70 }]} numberOfLines={1}>{item}</Text>
              <Pressable hitSlop={10} onPress={() => handleRemoveHistory(item)}>
                <Text style={{ color: themeColors.glass30, fontSize: 14 }}>✕</Text>
              </Pressable>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {!loading && showEmpty && (
        <View style={sStyles.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={{ color: themeColors.glass50, fontSize: 15 }}>
            Không tìm thấy kết quả cho "{query}"
          </Text>
        </View>
      )}

      {!loading && !showHistory && (songs.length > 0 || artists.length > 0) && (
        <FlatList
          data={[
            ...(artists.length > 0 ? [{ type: 'section', title: '🎤 Nghệ sĩ' } as any] : []),
            ...artists.map((a) => ({ type: 'artist', data: a })),
            ...(songs.length > 0 ? [{ type: 'section', title: `🎵 Bài hát${spotifyCount > 0 ? ` · ${spotifyCount} từ Spotify` : ''}` } as any] : []),
            ...songs.map((s) => ({ type: 'song', data: s })),
          ]}
          keyExtractor={(item, idx) =>
            item.type === 'section'
              ? `section_${idx}`
              : item.type === 'artist'
                ? `artist_${(item.data as Artist).artistId}`
                : `song_${(item.data as UnifiedSong).id}`
          }
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return <SectionHeader title={item.title} colors={themeColors} />;
            }
            if (item.type === 'artist') {
              return (
                <ArtistRow
                  item={item.data as Artist}
                  onPress={() => handleArtistPress(item.data as Artist)}
                  colors={themeColors}
                />
              );
            }
            const song = item.data as UnifiedSong;
            return (
              <UnifiedSongRow
                item={song}
                isActive={currentSong?.id === song.id}
                onPress={() => handleSongPress(song)}
                colors={themeColors}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListFooterComponent={
            spotifyCount > 0 ? (
              <View style={sStyles.spotifyFooter}>
                <Text style={sStyles.spotifyFooterText}>
                  🟢 {spotifyCount} kết quả từ Spotify là bản xem trước 30 giây.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const sStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D14' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 8 },
  voiceBanner: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  historyTitle: { fontSize: 15, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  historyText: { flex: 1, fontSize: 14 },
  spotifyFooter: {
    marginHorizontal: 16, marginVertical: 16,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(30,215,96,0.08)',
    borderWidth: 1, borderColor: 'rgba(30,215,96,0.2)',
  },
  spotifyFooterText: {
    color: 'rgba(30,215,96,0.8)', fontSize: 12, textAlign: 'center', lineHeight: 18,
  },
});
