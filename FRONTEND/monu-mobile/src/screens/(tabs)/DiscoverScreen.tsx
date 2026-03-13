import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../config/colors';

export const DiscoverScreen = () => {
    const insets = useSafeAreaInsets();
    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[COLORS.gradNavy, COLORS.bg]}
                style={[styles.hero, { paddingTop: insets.top + 20 }]}
            >
                <Text style={styles.emoji}>🌐</Text>
                <Text style={styles.title}>Khám phá</Text>
                <Text style={styles.sub}>Playlist gợi ý, podcast & radio sẽ xuất hiện tại đây.</Text>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    hero: { paddingHorizontal: 24, paddingBottom: 60, alignItems: 'center', justifyContent: 'center', minHeight: 320 },
    emoji: { fontSize: 56, marginBottom: 16 },
    title: { color: COLORS.white, fontSize: 32, fontWeight: '800', marginBottom: 10 },
    sub:   { color: COLORS.glass45, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});