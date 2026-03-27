import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { usePlayer } from '../context/PlayerContext';
import { Song } from '../services/music';
import { useThemeColors } from '../config/colors';
import { getListenHistory } from '../utils/listenHistory';

export const ContinueListeningSection = () => {
  const colors = useThemeColors();
  const { playSong, currentSong } = usePlayer();
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);

  const refresh = useCallback(async () => {
    const history = await getListenHistory();
    const recent = history
      .filter((h) => h.song.id !== currentSong?.id)
      .slice(0, 6)
      .map((h) => h.song);
    setRecentSongs(recent);
  }, [currentSong?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (recentSongs.length < 2) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text
        style={{
          color: colors.white,
          fontSize: 20,
          fontWeight: '800',
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        ▶ Tiếp tục nghe
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, flexDirection: 'row' }}
      >
        {recentSongs.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => playSong(item, recentSongs)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.glass08,
              flexDirection: 'row',
              alignItems: 'center',
              width: 200,
              padding: 10,
              gap: 10,
            }}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: colors.accentFill20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text>🎵</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.white, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: colors.glass45, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                {item.primaryArtist?.stageName}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
