import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert, Linking, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { ColorScheme, useThemeColors } from '../../config/colors';
import  PremiumCard  from "../../components/PremiumCard";
import { getActiveSubscriptionPlans, getMySubscriptionHistory, purchaseSubscription, SubscriptionPlan, getMySubscription, UserSubscription } from '../../services/payment';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';

const PERKS = [
    { icon: '🎵', titleKey: 'screens.premium.perkUnlimitedTitle', descKey: 'screens.premium.perkUnlimitedDesc' },
    { icon: '⬇️', titleKey: 'screens.premium.perkOfflineTitle', descKey: 'screens.premium.perkOfflineDesc' },
    { icon: '🎧', titleKey: 'screens.premium.perkQualityTitle', descKey: 'screens.premium.perkQualityDesc' },
    { icon: '🎯', titleKey: 'screens.premium.perkAiTitle', descKey: 'screens.premium.perkAiDesc' },
];

export const PremiumScreen = () => {
    const insets = useSafeAreaInsets();
    const { authSession } = useAuth();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [subscriptionHistory, setSubscriptionHistory] = useState<UserSubscription[]>([]);

    useEffect(() => {
        fetchData(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void fetchData(true);
            const id = setInterval(() => void fetchData(true), 12000);
            return () => clearInterval(id);
        }, [authSession?.tokens.accessToken]),
    );

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [plansData, subscriptionData, historyData] = await Promise.allSettled([
                getActiveSubscriptionPlans(),
                authSession ? getMySubscription() : null,
                authSession ? getMySubscriptionHistory() : [],
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

            if (historyData.status === 'fulfilled') {
                setSubscriptionHistory(historyData.value ?? []);
            }
        } catch (error: any) {
            console.error('Error fetching plans:', error);
            Alert.alert(t('common.error'), error.message || t('errors.loadingFailed'));
        } finally {
            if (!silent) setLoading(false);
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
            Alert.alert(t('auth.login'), t('screens.premium.loginToPurchase'));
            return;
        }

        const planToBuy = planOverride ?? selectedPlan;

        if (!planToBuy) {
            Alert.alert(t('common.error'), t('screens.premium.selectPaidPlan'));
            return;
        }

        if (!isPurchasablePlan(planToBuy)) {
            Alert.alert(t('common.error'), t('screens.premium.invalidFreePlan'));
            return;
        }

        try {
            setPurchasing(true);
            const response = await purchaseSubscription({ planId: planToBuy.id });

            const opened = await openCheckoutUrl(response.checkoutUrl);
            if (!opened) {
                Alert.alert(
                    t('screens.premium.cannotOpenCheckout'),
                    `${t('screens.premium.openCheckoutManual')}\n${response.checkoutUrl}`
                );
                return;
            }

            Alert.alert(
                t('screens.premium.paymentTitle'),
                t('screens.premium.paymentMessage'),
                [
                    {
                        text: t('common.done'),
                        onPress: () => fetchData(), // Refresh data after payment
                    },
                ]
            );
        } catch (error: any) {
            console.error('Purchase error:', error);
            Alert.alert(t('common.error'), error.message || t('errors.somethingWentWrong'));
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

    const remainingDays = useMemo(() => {
        if (!currentSubscription?.expiresAt) return 0;
        const diff = new Date(currentSubscription.expiresAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [currentSubscription?.expiresAt]);

    const latestPaymentStatus = useMemo(() => {
        if (subscriptionHistory.length === 0) return currentSubscription?.status ?? 'UNKNOWN';
        return subscriptionHistory[0]?.status ?? currentSubscription?.status ?? 'UNKNOWN';
    }, [subscriptionHistory, currentSubscription?.status]);

    const renderFeatureValue = (value: any): string => {
        if (typeof value === 'boolean') return value ? 'Có' : 'Không';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;
        return JSON.stringify(value);
    };

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
                <Text style={[styles.heroSub, { marginTop: 16 }]}>{t('common.loading')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={[themeColors.gradPurple, themeColors.gradIndigo, themeColors.bg]}
                    locations={[0, 0.5, 1]}
                    style={[styles.hero, { paddingTop: insets.top + 20 }]}
                >
                    <View style={styles.crownWrap}>
                        <Text style={{ fontSize: 44 }}>👑</Text>
                    </View>
                    <Text style={styles.heroTitle}>Monu Premium</Text>
                    <Text style={styles.heroSub}>{t('screens.premium.heroSubtitle')}</Text>

                    {currentSubscription && currentSubscription.status === 'ACTIVE' ? (
                        <View style={styles.activeSubscriptionCard}>
                            <Text style={styles.activeLabel}>✨ {t('screens.premium.active')}</Text>
                            <Text style={styles.activePlan}>{currentSubscription.plan.subsName}</Text>
                            <Text style={styles.activeExpiry}>
                                {t('screens.premium.expiresAt')}: {formatDate(currentSubscription.expiresAt)}
                            </Text>
                        </View>
                    ) : selectedPlan ? (
                        <View style={styles.priceCard}>
                            <Text style={styles.priceLabel}>{t('screens.premium.startingFrom')}</Text>
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
                            <Text style={styles.sectionTitle}>{t('screens.premium.plans')}</Text>
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
                        <Text style={styles.sectionTitle}>{t('screens.premium.features')}</Text>
                        {PERKS.map((perk, i) => (
                            <View key={i} style={styles.perkRow}>
                                <LinearGradient colors={[themeColors.surface, themeColors.surfaceLow]} style={styles.perkIcon}>
                                    <Text style={{ fontSize: 22 }}>{perk.icon}</Text>
                                </LinearGradient>
                                <View style={styles.perkInfo}>
                                    <Text style={styles.perkTitle}>{t(perk.titleKey)}</Text>
                                    <Text style={styles.perkDesc}>{t(perk.descKey)}</Text>
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
                                onPress={() => void handlePurchase()}
                                disabled={purchasing || !selectedPlan || !isPurchasablePlan(selectedPlan)}
                            >
                                <LinearGradient
                                    colors={[themeColors.warning, themeColors.error]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.upgradeBtnGradient}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color={themeColors.white} />
                                    ) : (
                                        <Text style={styles.upgradeBtnText}>
                                            👑  {selectedPlan ? `${t('screens.premium.buyNow')} ${formatPrice(selectedPlan.price)}đ` : t('screens.premium.selectPaidPlan')}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            <Text style={styles.trial}>
                                {t('screens.premium.trialHint')}
                            </Text>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },

    hero: { paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
    crownWrap: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: colors.warningDim,
        borderWidth: 1.5,
        borderColor: colors.warningBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    heroTitle: { color: colors.white, fontSize: 30, fontWeight: '800', marginBottom: 8 },
    heroSub: { color: colors.glass50, fontSize: 15, marginBottom: 22 },

    priceCard: {
        backgroundColor: colors.glass07,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.glass12,
    },
    priceLabel: {
        color: colors.glass40,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    price: { color: colors.white, fontSize: 28, fontWeight: '800', marginTop: 4 },
    pricePer: { fontSize: 15, fontWeight: '500', color: colors.glass50 },

    activeSubscriptionCard: {
        backgroundColor: colors.glass07,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success,
    },
    activeLabel: {
        color: colors.success,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    activePlan: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
    activeExpiry: { fontSize: 13, fontWeight: '500', color: colors.successAlt, marginTop: 4 },

    body: { paddingHorizontal: 20, paddingTop: 24 },

    paymentStatusCard: { backgroundColor: colors.glass07, borderWidth: 1, borderColor: colors.glass15, borderRadius: 12, padding: 12, marginBottom: 16 },
    paymentStatusTitle: { color: colors.white, fontWeight: '800', marginBottom: 8 },
    paymentStatusText: { color: colors.glass80, fontSize: 13, marginBottom: 4 },

    section: { marginBottom: 24 },
    sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 12 },

    planCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    planCardSelected: {
        borderColor: colors.accent,
        backgroundColor: colors.accentFill20,
    },
    planCardFree: {
        borderColor: colors.glass20,
        opacity: 0.7,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    planName: { color: colors.white, fontSize: 16, fontWeight: '700' },
    planDesc: { color: colors.muted, fontSize: 13, marginTop: 4 },
    planPrice: { color: colors.accent, fontSize: 18, fontWeight: '800' },
    planDuration: { color: colors.muted, fontSize: 12 },

    freeBadge: {
        backgroundColor: colors.glass15,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    freeBadgeText: {
        color: colors.glass60,
        fontSize: 10,
        fontWeight: '700',
    },

    featuresContainer: {
        marginTop: 8,
        gap: 4,
    },
    featureItem: {
        color: colors.glass50,
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
    perkTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
    perkDesc: { color: colors.glass40, fontSize: 13, marginTop: 2 },
    checkmark: { color: colors.success, fontSize: 20, fontWeight: '800' },

    upgradeBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 24, marginBottom: 14 },
    upgradeBtnGradient: {
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    upgradeBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },

    trial: { color: colors.glass30, textAlign: 'center', fontSize: 12 },
});