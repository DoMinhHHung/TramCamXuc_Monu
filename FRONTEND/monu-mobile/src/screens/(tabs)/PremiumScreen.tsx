import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Alert,
    Linking,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ColorScheme, useThemeColors } from '../../config/colors';
import {
    getActiveSubscriptionPlans,
    getMySubscription,
    purchaseSubscription,
    SubscriptionPlan,
    UserSubscription,
} from '../../services/payment';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';

const { width: SCREEN_W } = Dimensions.get('window');
const PREMIUM_CACHE_KEY = 'premium_screen_cache_v1';
const PREMIUM_CACHE_TTL_MS = 30 * 60 * 1000;

let premiumCacheMemory: {
    plans: SubscriptionPlan[];
    currentSub: UserSubscription | null;
    updatedAt: number;
} | null = null;

type FeatureItem = {
    key: string;
    icon: string;
    label: string;
    desc: string;
    color: string;
    displayValue: string;
    enabled: boolean;
};

const FEATURE_META: Record<string, { icon: string; label: string; desc: string; color: string }> = {
    quality: {
        icon: 'waveform',
        label: 'Chất lượng âm thanh',
        desc: 'Bitrate tối đa theo gói',
        color: '#A78BFA',
    },
    no_ads: {
        icon: 'music-off',
        label: 'Không quảng cáo',
        desc: 'Nghe nhạc liên tục, không gián đoạn',
        color: '#FF6B6B',
    },
    offline: {
        icon: 'download-circle',
        label: 'Nghe offline',
        desc: 'Phát nhạc khi mất mạng',
        color: '#4ECDC4',
    },
    download: {
        icon: 'download',
        label: 'Tải bài hát',
        desc: 'Lưu bài hát về thiết bị',
        color: '#60A5FA',
    },
    playlist_limit: {
        icon: 'playlist-music',
        label: 'Giới hạn playlist',
        desc: 'Số playlist có thể tạo',
        color: '#60A5FA',
    },
    can_become_artist: {
        icon: 'account-music',
        label: 'Đăng ký nghệ sĩ',
        desc: 'Mở quyền nghệ sĩ',
        color: '#34D399',
    },
    create_album: {
        icon: 'album',
        label: 'Tạo album',
        desc: 'Tạo và quản lý album',
        color: '#34D399',
    },
    recommendation: {
        icon: 'robot-love',
        label: 'Gợi ý nhạc',
        desc: 'Mức độ cá nhân hoá đề xuất',
        color: '#F59E0B',
    },
};

const featureDisplay = (key: string, value: any): { value: string; enabled: boolean } => {
    if (typeof value === 'boolean') return { value: value ? 'Có' : 'Không', enabled: value };
    if (key === 'playlist_limit' && typeof value === 'number') {
        return { value: value < 0 ? 'Không giới hạn' : `${value}`, enabled: true };
    }
    if (key === 'recommendation' && typeof value === 'string') {
        const v = value.toLowerCase();
        if (v === 'basic') return { value: 'Cơ bản', enabled: true };
        if (v === 'advanced') return { value: 'Nâng cao', enabled: true };
    }
    if (key === 'quality' && typeof value === 'string') return { value, enabled: true };
    return { value: String(value), enabled: true };
};

// ─── Animated star particle ───────────────────────────────────────────────────

const StarParticle = ({
                          x,
                          y,
                          size,
                          delay,
                      }: {
    x: number;
    y: number;
    size: number;
    delay: number;
}) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(opacity, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.1, duration: 1200, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#C084FC',
                opacity,
            }}
        />
    );
};

// ─── Plan selector card ───────────────────────────────────────────────────────

const PlanCard = ({
                      plan,
                      isSelected,
                      isCurrent,
                      onSelect,
                  }: {
    plan: SubscriptionPlan;
    isSelected: boolean;
    isCurrent: boolean;
    onSelect: () => void;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isFree = plan.price === 0 || plan.subsName.toLowerCase().includes('free');

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        ]).start();
        onSelect();
    };

    const formatPrice = (p: number) => new Intl.NumberFormat('vi-VN').format(p);

    return (
        <Pressable onPress={handlePress} style={{ flex: 1 }}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {isSelected && !isFree ? (
                    <LinearGradient
                        colors={['#7C3AED', '#C084FC', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.planCard, styles.planCardSelectedGradient]}
                    >
                        <PlanCardContent
                            plan={plan}
                            isSelected={isSelected}
                            isCurrent={isCurrent}
                            isFree={isFree}
                            formatPrice={formatPrice}
                        />
                    </LinearGradient>
                ) : (
                    <View
                        style={[
                            styles.planCard,
                            isSelected && styles.planCardSelected,
                            isFree && styles.planCardFree,
                        ]}
                    >
                        <PlanCardContent
                            plan={plan}
                            isSelected={isSelected}
                            isCurrent={isCurrent}
                            isFree={isFree}
                            formatPrice={formatPrice}
                        />
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
};

const PlanCardContent = ({
                             plan,
                             isSelected,
                             isCurrent,
                             isFree,
                             formatPrice,
                         }: {
    plan: SubscriptionPlan;
    isSelected: boolean;
    isCurrent: boolean;
    isFree: boolean;
    formatPrice: (p: number) => string;
}) => (
    <>
        {isCurrent && (
            <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>HIỆN TẠI</Text>
            </View>
        )}
        {isSelected && !isFree && !isCurrent && (
            <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>✦ PHỔ BIẾN</Text>
            </View>
        )}

        <Text style={[styles.planName, isSelected && !isFree && styles.planNameSelected]}>
            {plan.subsName}
        </Text>

        {isFree ? (
            <Text style={styles.planFreeLabel}>Miễn phí</Text>
        ) : (
            <>
                <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                    {formatPrice(plan.price)}
                    <Text style={styles.planPriceCurrency}>đ</Text>
                </Text>
                <Text style={[styles.planDuration, isSelected && styles.planDurationSelected]}>
                    {plan.durationDays} ngày
                </Text>
            </>
        )}
    </>
);

// ─── Feature row ──────────────────────────────────────────────────────────────

const FeatureRow = ({
                        icon,
                        label,
                        desc,
                        color,
                        displayValue,
                        enabled,
                        index,
                    }: {
    icon: string;
    label: string;
    desc: string;
    color: string;
    displayValue: string;
    enabled: boolean;
    index: number;
}) => {
    const translateX = useRef(new Animated.Value(-30)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const iconScale = useRef(new Animated.Value(1)).current;
    const iconFloat = useRef(new Animated.Value(0)).current;
    const sparkleOpacity = useRef(new Animated.Value(0.25)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateX, {
                toValue: 0,
                duration: 400,
                delay: index * 80,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay: index * 80,
                useNativeDriver: true,
            }),
        ]).start();

        const iconLoop = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(iconScale, {
                        toValue: 1.08,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconFloat, {
                        toValue: -2,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(sparkleOpacity, {
                        toValue: 0.8,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(iconScale, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconFloat, {
                        toValue: 0,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(sparkleOpacity, {
                        toValue: 0.25,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                ]),
            ]),
        );
        iconLoop.start();
        return () => iconLoop.stop();
    }, []);

    return (
        <Animated.View
            style={[
                styles.featureRow,
                !enabled && styles.featureRowDisabled,
                { opacity, transform: [{ translateX }] },
            ]}
        >
            <Animated.View style={{ transform: [{ scale: iconScale }, { translateY: iconFloat }] }}>
                <LinearGradient
                    colors={[`${color}35`, `${color}15`]}
                    style={[styles.featureIconWrap, { borderColor: `${color}50` }]}
                >
                    <MaterialCommunityIcons
                        name={icon as any}
                        size={22}
                        color={color}
                    />
                    <Animated.View style={[styles.iconSparkle, { opacity: sparkleOpacity, borderColor: `${color}90` }]} />
                </LinearGradient>
            </Animated.View>
            <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{label}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
            </View>
            <View style={styles.featureValueWrap}>
                <Text style={[styles.featureValue, !enabled && styles.featureValueDisabled]}>{displayValue}</Text>
                <MaterialCommunityIcons
                    name={enabled ? 'check-circle' : 'close-circle'}
                    size={18}
                    color={enabled ? color : 'rgba(255,255,255,0.35)'}
                />
            </View>
        </Animated.View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PremiumScreen = () => {
    const insets = useSafeAreaInsets();
    const { authSession } = useAuth();
    const { t } = useTranslation();
    const themeColors = useThemeColors();
    const styles_dynamic = useMemo(() => createDynamicStyles(themeColors), [themeColors]);

    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
    const [loading, setLoading] = useState(true);
    const premiumFocusPassRef = useRef(0);
    const [purchasing, setPurchasing] = useState(false);
    const [hasHydratedCache, setHasHydratedCache] = useState(false);

    const pickDefaultPaidPlan = useCallback((sourcePlans: SubscriptionPlan[]): SubscriptionPlan | null => {
        const paid = sourcePlans.filter((p) => p.price > 0 && !p.subsName.toLowerCase().includes('free'));
        return paid.length > 0 ? paid.reduce((a, b) => (a.price < b.price ? a : b)) : null;
    }, []);
    const mappedFeatures = useMemo<FeatureItem[]>(() => {
        const raw = selectedPlan?.features ?? {};
        const keys = Object.keys(FEATURE_META);
        return keys
            .filter((key) => raw[key] !== undefined)
            .map((key) => {
                const meta = FEATURE_META[key];
                const { value, enabled } = featureDisplay(key, raw[key]);
                return {
                    key,
                    icon: meta.icon,
                    label: meta.label,
                    desc: meta.desc,
                    color: meta.color,
                    displayValue: value,
                    enabled,
                };
            });
    }, [selectedPlan]);

    // Animations
    const crownScale = useRef(new Animated.Value(0.8)).current;
    const crownGlow = useRef(new Animated.Value(0)).current;
    const btnPulse = useRef(new Animated.Value(1)).current;

    // Star particles (memoized positions)
    const stars = useMemo(
        () =>
            Array.from({ length: 18 }, (_, i) => ({
                id: i,
                x: Math.random() * SCREEN_W,
                y: Math.random() * 260,
                size: 1.5 + Math.random() * 3,
                delay: Math.random() * 2000,
            })),
        [],
    );

    useEffect(() => {
        // Crown entrance
        Animated.spring(crownScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();

        // Glow pulse
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(crownGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(crownGlow, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ]),
        );
        glowLoop.start();

        // Button pulse
        const btnLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(btnPulse, { toValue: 1.02, duration: 1000, useNativeDriver: true }),
                Animated.timing(btnPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ]),
        );
        btnLoop.start();

        return () => {
            glowLoop.stop();
            btnLoop.stop();
        };
    }, []);

    const hydrateFromCache = useCallback(async () => {
        if (premiumCacheMemory && Date.now() - premiumCacheMemory.updatedAt < PREMIUM_CACHE_TTL_MS) {
            setPlans(premiumCacheMemory.plans);
            setCurrentSub(premiumCacheMemory.currentSub);
            setSelectedPlan((prev) => prev ?? pickDefaultPaidPlan(premiumCacheMemory!.plans));
            setHasHydratedCache(true);
            setLoading(false);
            return;
        }

        try {
            const raw = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as {
                plans?: SubscriptionPlan[];
                currentSub?: UserSubscription | null;
                updatedAt?: number;
            };
            if (!parsed?.updatedAt || Date.now() - parsed.updatedAt >= PREMIUM_CACHE_TTL_MS) return;
            setPlans(parsed.plans ?? []);
            setCurrentSub(parsed.currentSub ?? null);
            setSelectedPlan((prev) => prev ?? pickDefaultPaidPlan(parsed.plans ?? []));
            premiumCacheMemory = {
                plans: parsed.plans ?? [],
                currentSub: parsed.currentSub ?? null,
                updatedAt: parsed.updatedAt,
            };
            setLoading(false);
            setHasHydratedCache(true);
        } catch {
            // ignore cache parse/read errors
        }
    }, []);

    const fetchData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [plansData, subData] = await Promise.allSettled([
                getActiveSubscriptionPlans(),
                authSession ? getMySubscription() : Promise.resolve(null as UserSubscription | null),
            ]);

            if (plansData.status === 'fulfilled') {
                setPlans(plansData.value);
                if (!selectedPlan) {
                    setSelectedPlan(pickDefaultPaidPlan(plansData.value));
                }
            }
            if (subData.status === 'fulfilled') {
                setCurrentSub(subData.value ?? null);
            } else {
                setCurrentSub(null);
            }

            if (plansData.status === 'fulfilled') {
                const cachePayload = {
                    plans: plansData.value,
                    currentSub: subData.status === 'fulfilled' ? (subData.value ?? null) : null,
                    updatedAt: Date.now(),
                };
                premiumCacheMemory = cachePayload;
                AsyncStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(cachePayload)).catch(() => {});
            }
        } catch {}
        finally { if (!silent) setLoading(false); }
    }, [authSession, pickDefaultPaidPlan, selectedPlan]);

    useEffect(() => {
        premiumFocusPassRef.current = 0;
    }, [authSession?.tokens.accessToken]);

    useEffect(() => {
        void hydrateFromCache();
    }, [hydrateFromCache]);

    useFocusEffect(
        useCallback(() => {
            const silent = premiumFocusPassRef.current > 0 || hasHydratedCache;
            premiumFocusPassRef.current += 1;
            void fetchData(silent);
            const id = setInterval(() => void fetchData(true), 120000);
            return () => clearInterval(id);
        }, [fetchData, hasHydratedCache]),
    );

    const handlePurchase = async () => {
        if (!authSession) {
            Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để mua Premium.');
            return;
        }
        if (!selectedPlan || selectedPlan.price === 0) {
            Alert.alert('Chọn gói', 'Vui lòng chọn gói Premium trả phí.');
            return;
        }
        try {
            setPurchasing(true);
            const res = await purchaseSubscription({ planId: selectedPlan.id });
            try { await Linking.openURL(res.checkoutUrl); }
            catch { await WebBrowser.openBrowserAsync(res.checkoutUrl); }
            Alert.alert(
                '💳 Thanh toán',
                'Hoàn tất thanh toán trong trình duyệt. Quay lại app sau khi hoàn thành.',
                [{ text: 'OK', onPress: () => fetchData(true) }],
            );
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể khởi tạo thanh toán');
        } finally { setPurchasing(false); }
    };

    const isActive = currentSub?.status === 'ACTIVE';
    const remainDays = useMemo(() => {
        if (!currentSub?.expiresAt) return 0;
        return Math.max(0, Math.ceil((new Date(currentSub.expiresAt).getTime() - Date.now()) / 86400000));
    }, [currentSub]);

    const glowOpacity = crownGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#C084FC" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
            >
                {/* ── Hero ── */}
                <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
                    {/* Star particles */}
                    {stars.map((s) => (
                        <StarParticle key={s.id} x={s.x} y={s.y} size={s.size} delay={s.delay} />
                    ))}

                    {/* Hero gradient */}
                    <LinearGradient
                        colors={['#1a0040', '#2D1B69', '#0D0D14']}
                        locations={[0, 0.55, 1]}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Glow blob */}
                    <Animated.View style={[styles.glowBlob, { opacity: glowOpacity }]} />

                    {/* Crown */}
                    <Animated.View style={[styles.crownWrap, { transform: [{ scale: crownScale }] }]}>
                        <LinearGradient
                            colors={['#F59E0B', '#FBBF24', '#F59E0B']}
                            style={styles.crownGradient}
                        >
                            <Text style={styles.crownEmoji}>👑</Text>
                        </LinearGradient>
                    </Animated.View>

                    <Text style={styles.heroTitle}>Monu Premium</Text>
                    <Text style={styles.heroSubtitle}>Trải nghiệm âm nhạc không giới hạn</Text>

                    {/* Active badge OR price teaser */}
                    {isActive ? (
                        <View style={styles.activeBadge}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeBadgeText}>
                                Đang kích hoạt · còn {remainDays} ngày
                            </Text>
                        </View>
                    ) : selectedPlan && selectedPlan.price > 0 ? (
                        <View style={styles.priceTease}>
                            <Text style={styles.priceTeaseLabel}>CHỈ TỪ</Text>
                            <Text style={styles.priceTeaseValue}>
                                {new Intl.NumberFormat('vi-VN').format(selectedPlan.price)}
                                <Text style={styles.priceTeaseCurrency}>đ</Text>
                            </Text>
                            <Text style={styles.priceTeaseDuration}>/{selectedPlan.durationDays} ngày</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.body}>

                    {/* ── Plan selector ── */}
                    {plans.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>Chọn gói phù hợp</Text>
                            <View style={styles.plansRow}>
                                {plans.map((plan) => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        isSelected={selectedPlan?.id === plan.id}
                                        isCurrent={currentSub?.plan?.id === plan.id && isActive}
                                        onSelect={() => setSelectedPlan(plan)}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── CTA button ── */}
                    {!isActive && (
                        <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
                            <Pressable
                                onPress={handlePurchase}
                                disabled={purchasing || !selectedPlan || selectedPlan.price === 0}
                                style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]}
                            >
                                <LinearGradient
                                    colors={purchasing ? ['#555', '#555'] : ['#F59E0B', '#EF4444', '#C084FC']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.ctaGradient}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.ctaIcon}>👑</Text>
                                            <Text style={styles.ctaText}>
                                                {selectedPlan && selectedPlan.price > 0
                                                    ? `Nâng cấp ngay · ${new Intl.NumberFormat('vi-VN').format(selectedPlan.price)}đ`
                                                    : 'Chọn gói Premium'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </Animated.View>
                    )}

                    {/* ── Divider ── */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerLabel}>Tính năng Premium</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* ── Feature list ── */}
                    <View style={styles.featureList}>
                        {mappedFeatures.map((f, i) => (
                            <FeatureRow
                                key={f.key}
                                icon={f.icon}
                                label={f.label}
                                desc={f.desc}
                                color={f.color}
                                displayValue={f.displayValue}
                                enabled={f.enabled}
                                index={i}
                            />
                        ))}
                    </View>

                    {/* ── Guarantee strip ── */}
                    <LinearGradient
                        colors={['#1a1040', '#2D1B69']}
                        style={styles.guaranteeCard}
                    >
                        <Text style={styles.guaranteeEmoji}>🛡️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.guaranteeTitle}>Thanh toán an toàn qua PayOS</Text>
                        </View>
                    </LinearGradient>

                </View>
            </ScrollView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createDynamicStyles = (colors: ColorScheme) => ({});

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#0D0D14',
    },

    // ── Hero ────────────────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 36,
        overflow: 'hidden',
        minHeight: 300,
    },
    glowBlob: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: '#7C3AED',
        top: -60,
        alignSelf: 'center',
    },
    crownWrap: {
        marginBottom: 20,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    },
    crownGradient: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
    },
    crownEmoji: { fontSize: 44 },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 15,
        marginBottom: 24,
        textAlign: 'center',
    },

    // ── Active badge ─────────────────────────────────────────────────────────
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(52,211,153,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(52,211,153,0.4)',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#34D399',
    },
    activeBadgeText: {
        color: '#34D399',
        fontWeight: '700',
        fontSize: 13,
    },

    // ── Price tease ───────────────────────────────────────────────────────────
    priceTease: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    priceTeaseLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 2,
    },
    priceTeaseValue: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: '800',
        lineHeight: 38,
    },
    priceTeaseCurrency: {
        fontSize: 20,
        fontWeight: '600',
    },
    priceTeaseDuration: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        marginTop: 2,
    },

    // ── Body ─────────────────────────────────────────────────────────────────
    body: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeading: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 14,
    },

    // ── Plans ─────────────────────────────────────────────────────────────────
    plansRow: {
        flexDirection: 'row',
        gap: 10,
    },
    planCard: {
        borderRadius: 16,
        padding: 16,
        backgroundColor: '#1E1A38',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        minHeight: 110,
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    planCardSelected: {
        borderColor: '#C084FC',
    },
    planCardSelectedGradient: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        minHeight: 110,
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 0,
    },
    planCardFree: {
        borderColor: 'rgba(255,255,255,0.06)',
        opacity: 0.6,
    },
    currentBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(52,211,153,0.25)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    currentBadgeText: {
        color: '#34D399',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    popularBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    popularBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    planName: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    planNameSelected: {
        color: '#FFFFFF',
    },
    planPrice: {
        color: '#A78BFA',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 26,
    },
    planPriceSelected: {
        color: '#FFFFFF',
    },
    planPriceCurrency: {
        fontSize: 14,
        fontWeight: '600',
    },
    planDuration: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 2,
    },
    planDurationSelected: {
        color: 'rgba(255,255,255,0.75)',
    },
    planFreeLabel: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 14,
        fontWeight: '500',
    },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaBtn: {
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 28,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 58,
        borderRadius: 999,
    },
    ctaIcon: { fontSize: 20 },
    ctaText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 16,
    },

    // ── Divider ───────────────────────────────────────────────────────────────
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    dividerLabel: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // ── Features ──────────────────────────────────────────────────────────────
    featureList: {
        gap: 10,
        marginBottom: 24,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    featureRowDisabled: {
        opacity: 0.65,
    },
    featureIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        flexShrink: 0,
        position: 'relative',
    },
    iconSparkle: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        right: -2,
        top: -2,
        borderWidth: 1.4,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    featureText: {
        flex: 1,
        gap: 2,
    },
    featureLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    featureDesc: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        lineHeight: 17,
    },
    featureValueWrap: {
        alignItems: 'flex-end',
        gap: 4,
    },
    featureValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    featureValueDisabled: {
        color: 'rgba(255,255,255,0.5)',
    },

    // ── Guarantee ─────────────────────────────────────────────────────────────
    guaranteeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(192,132,252,0.2)',
    },
    guaranteeEmoji: { fontSize: 28 },
    guaranteeTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 3,
    },
    guaranteeDesc: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
    },
});
