import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Image,
    Pressable, StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { getMyAlbumById, getMySongs, publishAlbum, Song, unpublishAlbum } from '../../services/music';
import { apiClient } from '../../services/api';

export const AlbumAddSongScreen = () => {
    const navigation = useNavigation<any>();
    const route      = useRoute<any>();
    const insets     = useSafeAreaInsets();
    const albumId: string = route.params?.albumId;

    const [songs, setSongs]     = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding]   = useState<string | null>(null);
    const [albumStatus, setAlbumStatus] = useState<'PUBLIC' | 'PRIVATE' | 'DRAFT'>('DRAFT');
    const [publishing, setPublishing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                try {
                    const res = await getMySongs({ page: 1, size: 100 });
                    // Hiện TẤT CẢ bài đã transcode xong (PUBLIC hoặc PRIVATE đều được add vào album)
                    const available = (res.content ?? []).filter(
                        s => s.transcodeStatus === 'COMPLETED' &&
                            (s.status === 'PUBLIC' || s.status === 'PRIVATE' || s.status === 'ALBUM_ONLY')
                    );
                    setSongs(available);
                    const album = await getMyAlbumById(albumId);
                    setAlbumStatus(album.status);
                } catch (e) {
                    console.warn('AlbumAddSong load:', e);
                } finally {
                    setLoading(false);
                }
            })();
        }, [])
    );

    const handleAdd = async (songId: string) => {
        if (!albumId || adding) return;
        setAdding(songId);
        try {
            await apiClient.post(`/albums/${albumId}/songs/${songId}`);
            Alert.alert('✅ Thành công', 'Đã thêm bài hát vào album', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể thêm bài');
        } finally {
            setAdding(null);
        }
    };

    const formatDuration = (s?: number) => {
        if (!s) return '';
        return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerRow}>
                    <BackButton onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>Chọn bài hát</Text>
                    <View style={{ width: 36 }} />
                </View>
                <Text style={styles.headerSub}>
                    {songs.length} bài sẵn sàng · Bấm để thêm vào album
                </Text>
                <Pressable
                    style={[styles.releaseBtn, publishing && { opacity: 0.6 }]}
                    disabled={publishing}
                    onPress={async () => {
                        try {
                            setPublishing(true);
                            if (albumStatus === 'PUBLIC') {
                                const updated = await unpublishAlbum(albumId);
                                setAlbumStatus(updated.status);
                                Alert.alert('Đã chuyển riêng tư', 'Album đã được unrelease.');
                            } else {
                                const updated = await publishAlbum(albumId);
                                setAlbumStatus(updated.status);
                                Alert.alert('Đã phát hành', 'Album đã được release công khai.');
                            }
                        } catch (e: any) {
                            Alert.alert('Lỗi release', e?.message ?? 'Không thể đổi trạng thái release');
                        } finally {
                            setPublishing(false);
                        }
                    }}
                >
                    <Text style={styles.releaseBtnText}>
                        {publishing ? 'Đang xử lý...' : albumStatus === 'PUBLIC' ? '🔒 Unrelease album' : '🚀 Release album'}
                    </Text>
                </Pressable>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 40 }} />
            ) : songs.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🎵</Text>
                    <Text style={styles.emptyTitle}>Chưa có bài hát sẵn sàng</Text>
                    <Text style={styles.emptyHint}>
                        Bài hát cần hoàn thành upload và transcode (COMPLETED){'\n'}
                        và ở trạng thái PUBLIC hoặc PRIVATE
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={songs}
                    keyExtractor={s => s.id}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    renderItem={({ item }) => (
                        <Pressable
                            style={[styles.row, adding === item.id && { opacity: 0.5 }]}
                            onPress={() => handleAdd(item.id)}
                            disabled={!!adding}
                        >
                            {item.thumbnailUrl ? (
                                <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} />
                            ) : (
                                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                                    <Text style={{ fontSize: 20 }}>🎵</Text>
                                </View>
                            )}
                            <View style={styles.info}>
                                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.songMeta}>
                                    {item.status === 'PUBLIC' ? '🌐 Công khai' : item.status === 'PRIVATE' ? '🔒 Riêng tư' : '💿 Album only'}
                                    {item.durationSeconds ? `  ·  ${formatDuration(item.durationSeconds)}` : ''}
                                </Text>
                            </View>
                            {adding === item.id ? (
                                <ActivityIndicator size="small" color={COLORS.accent} />
                            ) : (
                                <Text style={styles.addIcon}>＋</Text>
                            )}
                        </Pressable>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root:   { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
    headerSub:   { color: COLORS.glass45, fontSize: 13 },
    releaseBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accentDim,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    releaseBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
    },
    thumb:            { width: 50, height: 50, borderRadius: 8 },
    thumbPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
    info:     { flex: 1 },
    songTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600', marginBottom: 3 },
    songMeta:  { color: COLORS.glass45, fontSize: 12 },
    addIcon:   { color: COLORS.accent, fontSize: 24, fontWeight: '300' },
    empty:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyTitle: { color: COLORS.glass60, fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
    emptyHint:  { color: COLORS.glass35, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
