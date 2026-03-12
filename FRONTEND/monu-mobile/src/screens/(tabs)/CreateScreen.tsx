import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';

export const CreateScreen = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.hero, { paddingTop: insets.top + 20 }]}
            >
                <Text style={styles.emoji}>🎼</Text>
                <Text style={styles.title}>Tạo</Text>
                <Text style={styles.sub}>Tính năng tạo playlist & upload sẽ xuất hiện tại đây.</Text>
            </LinearGradient>

            <View style={styles.comingSoon}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>✦  SẮP RA MẮT</Text>
                </View>
                <Text style={styles.desc}>Chúng tôi đang xây dựng công cụ sáng tác dành riêng cho bạn.</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    hero: {
        paddingHorizontal: 24,
        paddingBottom: 60,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
    },
    emoji: { fontSize: 56, marginBottom: 16 },
    title: { color: COLORS.white, fontSize: 32, fontWeight: '800', marginBottom: 10 },
    sub: { color: 'COLORS.glass45', fontSize: 15, textAlign: 'center', lineHeight: 22 },

    comingSoon: { padding: 24, alignItems: 'center' },
    badge: {
        backgroundColor: 'COLORS.accentFill25',
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'COLORS.accentBorder35',
        marginBottom: 16,
    },
    badgeText: { color: COLORS.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1.5 },
    desc: { color: 'COLORS.glass35', textAlign: 'center', lineHeight: 22 },
});