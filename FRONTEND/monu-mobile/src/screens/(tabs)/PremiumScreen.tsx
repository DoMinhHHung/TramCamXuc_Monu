import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Linking, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import  PremiumCard  from "../../components/PremiumCard";
import { getActiveSubscriptionPlans, purchaseSubscription, SubscriptionPlan, getMySubscription, UserSubscription } from '../../services/payment';
import { useAuth } from '../../context/AuthContext';

const PERKS = [
    { icon: '🎵', title: 'Nghe không giới hạn', desc: 'Không bị gián đoạn bởi quảng cáo' },
    { icon: '⬇️', title: 'Tải nhạc nghe offline', desc: 'Nghe mọi lúc, không cần internet' },
    { icon: '🎧', title: 'Chất lượng âm thanh cao', desc: 'Lên đến 320kbps crystal clear' },
    { icon: '🎯', title: 'Playlist AI cá nhân hóa', desc: 'Gợi ý nhạc thông minh theo cảm xúc' },
];

export const PremiumScreen = () => {
    const insets = useSafeAreaInsets();
    const { authSession } = useAuth();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansData, subscriptionData] = await Promise.allSettled([
                getActiveSubscriptionPlans(),
                authSession ? getMySubscription() : null,
            ]);

            if (plansData.status === 'fulfilled') {
                setPlans(plansData.value);
                // Auto-select cheapest paid plan (exclude Free/Basic)
                const paidPlans = plansData.value.filter(isPurchasablePlan);
                if (paidPlans.length > 0) {
                    const cheapestPaid = paidPlans.reduce((prev, curr) =>
                        curr.price < prev.price ? curr : prev
                    );
                    setSelectedPlan(cheapestPaid);
                } else {
                    setSelectedPlan(null);
                }
            }

            if (subscriptionData.status === 'fulfilled' && subscriptionData.value) {
                setCurrentSubscription(subscriptionData.value);
            }
        } catch (error: any) {
            console.error('Error fetching plans:', error);
            Alert.alert('Lỗi', error.message || 'Không thể tải thông tin gói cước');
        } finally {
            setLoading(false);
        }
    };


    const openCheckoutUrl = async (checkoutUrl: string): Promise<boolean> => {
        try {
            await Linking.openURL(checkoutUrl);
            return true;
        } catch {
            // fallback to in-app browser if external browser cannot be opened
        }

        try {
            const result = await WebBrowser.openBrowserAsync(checkoutUrl);
            return result.type === 'opened' || result.type === 'cancel' || result.type === 'dismiss';
        } catch {
            return false;
        }
    };

    const handlePurchase = async (planOverride?: SubscriptionPlan) => {
        if (!authSession) {
            Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập để mua gói Premium');
            return;
        }

        const planToBuy = planOverride ?? selectedPlan;

        if (!planToBuy) {
            Alert.alert('Lỗi', 'Vui lòng chọn một gói cước trả phí');
            return;
        }

        if (!isPurchasablePlan(planToBuy)) {
            Alert.alert('Không hợp lệ', 'Không thể thanh toán gói Free/Basic. Vui lòng chọn gói Premium khác.');
            return;
        }

        try {
            setPurchasing(true);
            const response = await purchaseSubscription({ planId: planToBuy.id });

            const opened = await openCheckoutUrl(response.checkoutUrl);
            if (!opened) {
                Alert.alert(
                    'Không thể mở link thanh toán',
                    `Vui lòng mở thủ công đường dẫn sau:\n${response.checkoutUrl}`
                );
                return;
            }

            Alert.alert(
                'Thanh toán',
                'Vui lòng hoàn tất thanh toán trong trình duyệt. Sau khi thanh toán thành công, quay lại ứng dụng, hệ thống sẽ tự làm mới token và cập nhật quyền Premium.',
                [
                    {
                        text: 'Đã hiểu',
                        onPress: () => fetchData(), // Refresh data after payment
                    },
                ]
            );
        } catch (error: any) {
            console.error('Purchase error:', error);
            Alert.alert('Lỗi', error.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
        } finally {
            setPurchasing(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN').format(price);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const isFreeOrBasic = (plan: SubscriptionPlan) => {
        return plan.price === 0 || plan.subsName.toLowerCase().includes('free') || plan.subsName.toLowerCase().includes('basic');
    };

    const isPurchasablePlan = (plan: SubscriptionPlan) => !isFreeOrBasic(plan);

    const renderFeatureValue = (value: any): string => {
        if (typeof value === 'boolean') return value ? 'Có' : 'Không';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;
        return JSON.stringify(value);
    };

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={[styles.heroSub, { marginTop: 16 }]}>Đang tải...</Text>
            </View>
        );
    }

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

                    {currentSubscription && currentSubscription.status === 'ACTIVE' ? (
                        <View style={styles.activeSubscriptionCard}>
                            <Text style={styles.activeLabel}>✨ Đang kích hoạt</Text>
                            <Text style={styles.activePlan}>{currentSubscription.plan.subsName}</Text>
                            <Text style={styles.activeExpiry}>
                                Hết hạn: {formatDate(currentSubscription.expiresAt)}
                            </Text>
                        </View>
                    ) : selectedPlan ? (
                        <View style={styles.priceCard}>
                            <Text style={styles.priceLabel}>CHỈ TỪ</Text>
                            <Text style={styles.price}>
                                {formatPrice(selectedPlan.price)} <Text style={styles.pricePer}>đ/{selectedPlan.durationDays} ngày</Text>
                            </Text>
                        </View>
                    ) : null}
                </LinearGradient>

                <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
                    {/* Available Plans */}
                    {plans.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Các gói cước</Text>
                            {plans.map((plan) => (
                                <PremiumCard
                                    key={plan.id}
                                    name={plan.subsName}
                                    price={`${formatPrice(plan.price)}đ`}
                                    duration={`${plan.durationDays} ngày`}
                                    features={
                                        plan.features
                                            ? Object.entries(plan.features).map(
                                                ([k, v]) => `${k.replace(/_/g, ' ')}: ${renderFeatureValue(v)}`
                                            )
                                            : []
                                    }
                                    onBuy={() => {
                                        setSelectedPlan(plan);
                                        void handlePurchase(plan);
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    {/* Perks */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tính năng</Text>
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
                    </View>

                    {/* Purchase Button */}
                    {currentSubscription?.status !== 'ACTIVE' && (
                        <>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.upgradeBtn,
                                    pressed && { opacity: 0.85 },
                                    purchasing && { opacity: 0.6 },
                                ]}
                                onPress={handlePurchase}
                                disabled={purchasing || !selectedPlan || !isPurchasablePlan(selectedPlan)}
                            >
                                <LinearGradient
                                    colors={[COLORS.warning, COLORS.error]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.upgradeBtnGradient}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color={COLORS.white} />
                                    ) : (
                                        <Text style={styles.upgradeBtnText}>
                                            👑  {selectedPlan ? `Mua ngay ${formatPrice(selectedPlan.price)}đ` : 'Chọn gói trả phí'}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            <Text style={styles.trial}>
                                Thanh toán qua PayOS. Hủy bất cứ lúc nào.
                            </Text>
                        </>
                    )}
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

    activeSubscriptionCard: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    activeLabel: {
        color: '#22c55e',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    activePlan: { color: COLORS.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
    activeExpiry: { fontSize: 13, fontWeight: '500', color: '#86efac', marginTop: 4 },

    body: { paddingHorizontal: 20, paddingTop: 24 },

    section: { marginBottom: 24 },
    sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 12 },

    planCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    planCardSelected: {
        borderColor: COLORS.accent,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    planCardFree: {
        borderColor: COLORS.glass20,
        opacity: 0.7,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    planName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    planDesc: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
    planPrice: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
    planDuration: { color: COLORS.muted, fontSize: 12 },

    freeBadge: {
        backgroundColor: COLORS.glass15,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    freeBadgeText: {
        color: COLORS.glass60,
        fontSize: 10,
        fontWeight: '700',
    },

    featuresContainer: {
        marginTop: 8,
        gap: 4,
    },
    featureItem: {
        color: COLORS.glass50,
        fontSize: 12,
        lineHeight: 18,
    },

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