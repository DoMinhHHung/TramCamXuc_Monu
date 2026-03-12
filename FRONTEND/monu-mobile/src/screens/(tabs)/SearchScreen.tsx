import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';

const CATEGORIES = [
    { label: 'Pop', emoji: '🎤', colors: [COLORS.catPopFrom, COLORS.catPopTo] as const },
    { label: 'R&B', emoji: '🎷', colors: [COLORS.catRnbFrom, COLORS.catRnbTo] as const },
    { label: 'Hip-Hop', emoji: '🎧', colors: [COLORS.cardTrendingFrom, COLORS.catHipHopTo] as const },
    { label: 'EDM', emoji: '⚡', colors: [COLORS.cardAcousticFrom, COLORS.catEdmTo] as const },
    { label: 'Acoustic', emoji: '🎸', colors: [COLORS.catAcousticFrom, COLORS.catAcousticTo] as const },
    { label: 'Chill', emoji: '🌙', colors: [COLORS.cardLofiFrom, COLORS.catChillTo] as const },
    { label: 'Indie', emoji: '🌿', colors: [COLORS.catIndieFrom, COLORS.catIndieTo] as const },
    { label: 'Classic', emoji: '🎻', colors: [COLORS.catClassicFrom, COLORS.catClassicTo] as const },
];

export const SearchScreen = () => {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={[COLORS.gradSlate, COLORS.bg]}
                    style={[styles.header, { paddingTop: insets.top + 16 }]}
                >
                    <Text style={styles.title}>Tìm kiếm</Text>
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Bài hát, nghệ sĩ, podcast..."
                            placeholderTextColor="COLORS.glass30"
                            value={query}
                            onChangeText={setQuery}
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => setQuery('')}>
                                <Text style={{ color: 'COLORS.glass40', fontSize: 18 }}>✕</Text>
                            </Pressable>
                        )}
                    </View>
                </LinearGradient>

                <View style={styles.body}>
                    <Text style={styles.sectionLabel}>Duyệt theo thể loại</Text>
                    <View style={styles.grid}>
                        {CATEGORIES.map(cat => (
                            <Pressable key={cat.label} style={styles.catCard}>
                                <LinearGradient colors={cat.colors} style={styles.catGradient}>
                                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                                    <Text style={styles.catLabel}>{cat.label}</Text>
                                </LinearGradient>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingBottom: 20 },
    title: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 16 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'COLORS.glass08',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'COLORS.glass10',
    },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, color: COLORS.white, fontSize: 15 },
    body: { paddingHorizontal: 20, paddingTop: 24 },
    sectionLabel: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard: { width: '47.5%', borderRadius: 12, overflow: 'hidden' },
    catGradient: {
        padding: 16,
        minHeight: 80,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'COLORS.glass06',
    },
    catEmoji: { fontSize: 24 },
    catLabel: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});