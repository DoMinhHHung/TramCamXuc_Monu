import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config/colors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText,
  cancelText = 'Hủy',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable style={[styles.button, destructive ? styles.destructive : styles.confirm]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  confirm: { backgroundColor: COLORS.accentDim },
  destructive: { backgroundColor: COLORS.error },
  cancelText: { color: COLORS.text, fontWeight: '600' },
  confirmText: { color: COLORS.white, fontWeight: '700' },
});
