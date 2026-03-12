import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';

const PERKS = [
    { icon: '🎵', title: 'Nghe không giới hạn', desc: 'Không bị gián đoạn bởi quảng cáo' },
    { icon: '⬇️', title: 'Tải nhạc nghe offline', desc: 'Nghe mọi lúc, không cần internet' },
    { icon: '🎧', title: 'Chất lượng âm thanh cao', desc: 'Lên đến 320kbps crystal clear' },
    { icon: '🎯', title: 'Playlist AI cá nhân hóa', desc: 'Gợi ý nhạc thông minh theo cảm xúc' },
];

export const PremiumScreen = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={[COLORS.gradPurple, COLORS.gradIndigo, COLORS.bg]}
                    locations={[0, 0.5, 1]}
                    style={[styles.hero, { paddingTop: insets.top + 20 }]}
                >
                    <View style={styles.crownWrap}>
                        <Text style={{ fontSize: 44 }}>👑</Text>
                    </View>
                    <Text style={styles.heroTitle}>Monu Premium</Text>
                    <Text style={styles.heroSub}>Trải nghiệm âm nhạc đỉnh cao</Text>

                    <View style={styles.priceCard}>
                        <Text style={styles.priceLabel}>CHỈ TỪ</Text>
                        <Text style={styles.price}>59.000 <Text style={styles.pricePer}>đ/tháng</Text></Text>
                    </View>
                </LinearGradient>

                <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
                    {PERKS.map((perk, i) => (
                        <View key={i} style={styles.perkRow}>
                            <LinearGradient colors={[COLORS.surface, COLORS.surfaceLow]} style={styles.perkIcon}>
                                <Text style={{ fontSize: 22 }}>{perk.icon}</Text>
                            </LinearGradient>
                            <View style={styles.perkInfo}>
                                <Text style={styles.perkTitle}>{perk.title}</Text>
                                <Text style={styles.perkDesc}>{perk.desc}</Text>
                            </View>
                            <Text style={styles.checkmark}>✓</Text>
                        </View>
                    ))}

                    <Pressable style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}>
                        <LinearGradient
                            colors={[COLORS.warning, COLORS.error]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.upgradeBtnGradient}
                        >
                            <Text style={styles.upgradeBtnText}>👑  Nâng cấp ngay</Text>
                        </LinearGradient>
                    </Pressable>

                    <Text style={styles.trial}>Dùng thử miễn phí 30 ngày. Hủy bất cứ lúc nào.</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    hero: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
    crownWrap: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'COLORS.warningDim',
        borderWidth: 1.5,
        borderColor: 'COLORS.warningBorder',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    heroTitle: { color: COLORS.white, fontSize: 30, fontWeight: '800', marginBottom: 8 },
    heroSub: { color: 'COLORS.glass50', fontSize: 15, marginBottom: 22 },

    priceCard: {
        backgroundColor: 'COLORS.glass07',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'COLORS.glass12',
    },
    priceLabel: {
        color: 'COLORS.glass40',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    price: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginTop: 4 },
    pricePer: { fontSize: 15, fontWeight: '500', color: 'COLORS.glass50' },

    body: { paddingHorizontal: 20, paddingTop: 24 },

    perkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    perkIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        overflow: 'hidden',
    },
    perkInfo: { flex: 1 },
    perkTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
    perkDesc: { color: 'COLORS.glass40', fontSize: 13, marginTop: 2 },
    checkmark: { color: COLORS.success, fontSize: 20, fontWeight: '800' },

    upgradeBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 24, marginBottom: 14 },
    upgradeBtnGradient: {
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    upgradeBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

    trial: { color: 'COLORS.glass30', textAlign: 'center', fontSize: 12 },
});