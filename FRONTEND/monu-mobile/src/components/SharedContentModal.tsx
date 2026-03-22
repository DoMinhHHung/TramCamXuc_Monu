/**
 * File này chứa:
 * 1. Component SaveContentModal — modal chọn playlist để lưu bài
 * 2. SharedContentDetailModal đã cập nhật — thêm nút lưu vào playlist/album
 *
 * Thay thế SharedContentDetailModal trong DiscoverScreen.tsx bằng component bên dưới.
 * Import thêm:
 *   import { addSongToPlaylist, createPlaylist, getMyPlaylists } from '../../services/music';
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/colors';
import { usePlayer } from '../context/PlayerContext';
import { addSongToPlaylist, createPlaylist, getMyPlaylists, Playlist, Song } from '../services/music';

// ─── Kiểu dùng chung ─────────────────────────────────────────────────────────

interface PostContentInfo {
    type: 'SONG' | 'ALBUM' | 'PLAYLIST';
    id: string;
    slug?: string;
    title: string;
    subtitle?: string;
    coverUrl?: string;
    songs: Song[];
    totalCount?: number;
    ownerName?: string; // tên nghệ sĩ / người dùng gốc
}

// ─── SaveContentModal ─────────────────────────────────────────────────────────
// Modal chọn playlist để lưu bài — dùng cho cả SONG, ALBUM, PLAYLIST

interface SaveContentModalProps {
    visible: boolean;
    songs: Song[];
    sourceTitle: string;
    sourceOwner?: string;
    onClose: () => void;
}

export const SaveContentModal: React.FC<SaveContentModalProps> = ({
                                                                      visible,
                                                                      songs,
                                                                      sourceTitle,
                                                                      sourceOwner,
                                                                      onClose,
                                                                  }) => {
    const insets = useSafeAreaInsets();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading]     = useState(false);
    const [saving, setSaving]       = useState<string | null>(null); // playlistId đang lưu
    const [newName, setNewName]     = useState('');
    const [creating, setCreating]   = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        getMyPlaylists({ page: 1, size: 50 })
            .then(res => setPlaylists(res.content ?? []))
            .catch(() => setPlaylists([]))
            .finally(() => setLoading(false));
    }, [visible]);

    const handleSaveToPlaylist = useCallback(async (playlistId: string, playlistName: string) => {
        setSaving(playlistId);
        let successCount = 0;
        for (const song of songs) {
            try {
                await addSongToPlaylist(playlistId, song.id);
                successCount++;
            } catch {
                // ignore duplicates / errors for individual songs
            }
        }
        setSaving(null);
        Alert.alert(
            '✓ Đã lưu',
            `${successCount}/${songs.length} bài từ "${sourceTitle}" → "${playlistName}"`,
            [{ text: 'OK', onPress: onClose }]
        );
    }, [songs, sourceTitle, onClose]);

    const handleCreateAndSave = useCallback(async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const pl = await createPlaylist({ name: newName.trim(), visibility: 'PUBLIC' });
            setNewName('');
            await handleSaveToPlaylist(pl.id, pl.name);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể tạo playlist');
        } finally {
            setCreating(false);
        }
    }, [newName, handleSaveToPlaylist]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={saveStyles.overlay} onPress={onClose} />
            <View style={[saveStyles.sheet, { paddingBottom: insets.bottom + 8 }]}>
                <View style={saveStyles.handle} />

                <Text style={saveStyles.title}>Lưu vào playlist</Text>

                {/* Source info */}
                <View style={saveStyles.sourceBadge}>
                    <Text style={saveStyles.sourceText} numberOfLines={1}>
                        📎 {sourceTitle}
                        {sourceOwner ? ` · bởi ${sourceOwner}` : ''}
                        {' · '}{songs.length} bài
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 24 }} />
                ) : (
                    <FlatList
                        data={playlists}
                        keyExtractor={p => p.id}
                        style={{ maxHeight: 260 }}
                        renderItem={({ item }) => (
                            <Pressable
                                style={saveStyles.playlistRow}
                                onPress={() => void handleSaveToPlaylist(item.id, item.name)}
                                disabled={saving === item.id}
                            >
                                <View style={saveStyles.playlistIcon}>
                                    <Text>🎵</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={saveStyles.playlistName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={saveStyles.playlistCount}>{item.totalSongs ?? 0} bài</Text>
                                </View>
                                {saving === item.id ? (
                                    <ActivityIndicator size="small" color={COLORS.accent} />
                                ) : (
                                    <Text style={saveStyles.addIcon}>+</Text>
                                )}
                            </Pressable>
                        )}
                        ListEmptyComponent={
                            <Text style={saveStyles.emptyText}>Bạn chưa có playlist nào</Text>
                        }
                    />
                )}

                {/* Tạo playlist mới */}
                <View style={saveStyles.newRow}>
                    <TextInput
                        style={saveStyles.newInput}
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="Tạo playlist mới và lưu..."
                        placeholderTextColor={COLORS.glass30}
                    />
                    <Pressable
                        style={[saveStyles.newBtn, (!newName.trim() || creating) && { opacity: 0.4 }]}
                        onPress={handleCreateAndSave}
                        disabled={!newName.trim() || creating}
                    >
                        {creating ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={saveStyles.newBtnText}>+</Text>}
                    </Pressable>
                </View>

                <Pressable style={saveStyles.cancelBtn} onPress={onClose}>
                    <Text style={saveStyles.cancelText}>Đóng</Text>
                </Pressable>
            </View>
        </Modal>
    );
};

// ─── SharedContentDetailModal (cập nhật) ──────────────────────────────────────

interface SharedContentDetailModalProps {
    visible: boolean;
    content: PostContentInfo | null;
    onClose: () => void;
}

export const SharedContentDetailModal: React.FC<SharedContentDetailModalProps> = ({
                                                                                      visible,
                                                                                      content,
                                                                                      onClose,
                                                                                  }) => {
    const insets = useSafeAreaInsets();
    const { playSong, currentSong } = usePlayer();
    const [saveModalOpen, setSaveModalOpen] = useState(false);

    if (!content) return null;

    const canSave = content.songs.length > 0;
    const typeLabel =
        content.type === 'ALBUM' ? 'Album'
            : content.type === 'PLAYLIST' ? 'Playlist'
                : 'Bài hát';

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={onClose}
            >
                <View style={detailStyles.root}>
                    {/* Header */}
                    <View style={[detailStyles.header, { paddingTop: insets.top + 6 }]}>
                        <Pressable style={detailStyles.backBtn} onPress={onClose}>
                            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                            <Text style={detailStyles.backText}>Quay lại</Text>
                        </Pressable>

                        {/* Lưu vào playlist (nếu có bài) */}
                        {canSave && (
                            <Pressable
                                style={detailStyles.saveBtn}
                                onPress={() => setSaveModalOpen(true)}
                            >
                                <Text style={detailStyles.saveBtnText}>
                                    {content.type === 'ALBUM' ? '💿 Lưu album' : '📋 Lưu vào playlist'}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    <ScrollView
                        contentContainerStyle={detailStyles.body}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Cover */}
                        <Image
                            source={{ uri: content.coverUrl || 'https://via.placeholder.com/240' }}
                            style={detailStyles.cover}
                        />

                        {/* Info */}
                        <Text style={detailStyles.typeLabel}>{typeLabel}</Text>
                        <Text style={detailStyles.title}>{content.title}</Text>
                        {content.subtitle ? (
                            <Text style={detailStyles.subtitle}>{content.subtitle}</Text>
                        ) : null}
                        {content.ownerName ? (
                            <Text style={detailStyles.owner}>
                                Bởi <Text style={{ color: COLORS.accent }}>{content.ownerName}</Text>
                            </Text>
                        ) : null}
                        <Text style={detailStyles.count}>
                            {content.totalCount ?? content.songs.length} bài hát
                        </Text>

                        {/* Song list */}
                        {content.songs.length > 0 ? (
                            <View style={detailStyles.tracks}>
                                {content.songs.map((song, idx) => {
                                    const isNowPlaying = currentSong?.id === song.id;
                                    return (
                                        <Pressable
                                            key={`${song.id}-${idx}`}
                                            style={[detailStyles.trackRow, isNowPlaying && detailStyles.trackRowActive]}
                                            onPress={() => playSong(song, content.songs)}
                                        >
                                            <Text style={detailStyles.trackIdx}>{idx + 1}</Text>
                                            <View style={detailStyles.trackInfo}>
                                                <Text
                                                    style={[detailStyles.trackTitle, isNowPlaying && { color: COLORS.accent }]}
                                                    numberOfLines={1}
                                                >
                                                    {song.title}
                                                </Text>
                                                <Text style={detailStyles.trackArtist} numberOfLines={1}>
                                                    {song.primaryArtist?.stageName ?? 'Nghệ sĩ'}
                                                </Text>
                                            </View>
                                            <Ionicons
                                                name={isNowPlaying ? 'pause' : 'play'}
                                                size={18}
                                                color={isNowPlaying ? COLORS.accent : COLORS.glass60}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text style={detailStyles.empty}>Không có bài hát nào</Text>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Save modal */}
            <SaveContentModal
                visible={saveModalOpen}
                songs={content.songs}
                sourceTitle={content.title}
                sourceOwner={content.ownerName ?? content.subtitle}
                onClose={() => setSaveModalOpen(false)}
            />
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const saveStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: COLORS.scrim },
    sheet: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 16, maxHeight: '80%',
        borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.glass12,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: COLORS.glass20,
        alignSelf: 'center', marginBottom: 14,
    },
    title: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 8 },
    sourceBadge: {
        backgroundColor: COLORS.glass07,
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
        marginBottom: 12, borderWidth: 1, borderColor: COLORS.glass10,
    },
    sourceText: { color: COLORS.glass70, fontSize: 13 },
    playlistRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 11, gap: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass06,
    },
    playlistIcon: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: COLORS.glass08,
        alignItems: 'center', justifyContent: 'center',
    },
    playlistName: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
    playlistCount: { color: COLORS.glass40, fontSize: 12, marginTop: 2 },
    addIcon: { color: COLORS.accent, fontSize: 22, fontWeight: '300' },
    emptyText: { color: COLORS.glass40, textAlign: 'center', paddingVertical: 16 },
    newRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    newInput: {
        flex: 1,
        backgroundColor: COLORS.surfaceLow,
        borderWidth: 1, borderColor: COLORS.glass15,
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
        color: COLORS.white, fontSize: 14,
    },
    newBtn: {
        width: 44, height: 44, borderRadius: 10,
        backgroundColor: COLORS.accentDim,
        alignItems: 'center', justifyContent: 'center',
    },
    newBtnText: { color: COLORS.white, fontSize: 22, fontWeight: '300' },
    cancelBtn: {
        marginTop: 10, paddingVertical: 13,
        alignItems: 'center',
        borderTopWidth: 1, borderTopColor: COLORS.glass08,
    },
    cancelText: { color: COLORS.glass60, fontSize: 15 },
});

const detailStyles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: COLORS.glass08,
    },
    backBtn: {
        flexDirection: 'row', alignItems: 'center',
        gap: 6, paddingHorizontal: 4, paddingVertical: 6,
    },
    backText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
    saveBtn: {
        backgroundColor: COLORS.accentDim,
        borderRadius: 999,
        paddingHorizontal: 16, paddingVertical: 8,
    },
    saveBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
    body: { paddingHorizontal: 18, paddingBottom: 34, paddingTop: 14 },
    cover: {
        width: 220, height: 220, borderRadius: 14,
        alignSelf: 'center', marginBottom: 14,
        backgroundColor: COLORS.glass08,
    },
    typeLabel: {
        color: COLORS.accent, fontSize: 12, fontWeight: '700',
        textAlign: 'center', letterSpacing: 0.8,
        textTransform: 'uppercase', marginBottom: 4,
    },
    title: { color: COLORS.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
    subtitle: { color: COLORS.glass70, fontSize: 14, textAlign: 'center', marginTop: 4 },
    owner: { color: COLORS.glass50, fontSize: 13, textAlign: 'center', marginTop: 6 },
    count: { color: COLORS.glass40, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 18 },
    tracks: { gap: 8 },
    trackRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 12, backgroundColor: COLORS.glass08,
    },
    trackRowActive: {
        backgroundColor: COLORS.accentFill20,
        borderWidth: 1, borderColor: COLORS.accentBorder25,
    },
    trackIdx: { color: COLORS.glass60, width: 20, textAlign: 'center', fontWeight: '700' },
    trackInfo: { flex: 1 },
    trackTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
    trackArtist: { color: COLORS.glass60, fontSize: 12, marginTop: 2 },
    empty: { color: COLORS.glass45, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});