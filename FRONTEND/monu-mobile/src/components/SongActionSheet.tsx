import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/colors';

type Props = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onShareQr: () => void | Promise<void>;
  onAddToPlaylist: () => void | Promise<void>;
  onReportSong: () => void | Promise<void>;
  onDislike?: () => void | Promise<void>;
  onDownload?: () => void | Promise<void>;
};

export const SongActionSheet = ({
  visible,
  title,
  onClose,
  onShareQr,
  onAddToPlaylist,
  onReportSong,
  onDislike,
  onDownload,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          <Pressable onPress={() => void onShareQr()}><Text style={styles.item}>Chia sẻ bằng QR</Text></Pressable>
          <Pressable onPress={() => void onAddToPlaylist()}><Text style={styles.item}>Thêm vào playlist</Text></Pressable>
          <Pressable onPress={() => void onReportSong()}><Text style={styles.item}>Report song</Text></Pressable>
          <Pressable onPress={() => void onDislike?.()}><Text style={styles.item}>Dislike: Không quan tâm</Text></Pressable>
          <Pressable onPress={() => void onDownload?.()}><Text style={styles.item}>Tải xuống</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.scrim },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, gap: 10 },
  title: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  item: { color: COLORS.glass85, fontSize: 14 },
});
