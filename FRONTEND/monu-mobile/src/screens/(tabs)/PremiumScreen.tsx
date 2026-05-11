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
    Image,
    type ViewStyle,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { RetryState } from '../../components/RetryState';
import { MonuBrandHeaderTitle } from '../../components/MonuBrandHeaderTitle';
import {
    cancelMySubscription,
    cancelPaymentLink,
    purchaseSubscription,
    PaymentResponse,
    SubscriptionPlan,
    UserSubscription,
} from '../../services/payment';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { useSubscription } from '../../hooks/useSubscription';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';

const { width: SCREEN_W } = Dimensions.get('window');
const PURCHASE_COOLDOWN_MS = 30_000;
const PENDING_PAYMENT_TTL_MS = 10 * 60 * 1000;

type PendingPaymentCache = {
    payment: PaymentResponse;
    planId: string;
    createdAt: number;
};

const getPendingPaymentStorageKey = (userScope: string) => `premium.pendingPayment.${userScope}`;

const getStatusBarStyle = (backgroundColor: string): 'light' | 'dark' => {
    const hex = backgroundColor.replace('#', '');
    if (hex.length !== 6) return 'light';
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.6 ? 'dark' : 'light';
};

const usePulseOpacity = () => {
    const opacity = useRef(new Animated.Value(0.36)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 850, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.36, duration: 850, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);
    return opacity;
};

const SkeletonBlock = ({ style, skeletonStyles }: { style: ViewStyle; skeletonStyles: PremiumStyles }) => {
    const opacity = usePulseOpacity();
    return <Animated.View style={[skeletonStyles.skeletonBlock, { opacity }, style]} />;
};

const PremiumSkeleton = ({ skeletonStyles }: { skeletonStyles: PremiumStyles }) => (
    <View style={skeletonStyles.skeletonRoot}>
        <View style={skeletonStyles.skeletonHero}>
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonCrown} />
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonTitle} />
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonSubtitle} />
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonBadge} />
        </View>
        <View style={skeletonStyles.skeletonBody}>
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonSectionTitle} />
            <View style={skeletonStyles.skeletonPlanRow}>
                <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonPlanCard} />
                <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonPlanCard} />
            </View>
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonCta} />
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonFeatureRow} />
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonFeatureRow} />
            <SkeletonBlock skeletonStyles={skeletonStyles} style={skeletonStyles.skeletonGuarantee} />
        </View>
    </View>
);

const formatCountdown = (ms: number): string => {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const buildQrImageUri = (qrCode?: string | null): string | null => {
    const raw = qrCode?.trim();
    if (!raw) return null;

    if (/^data:image\//i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;

    const compact = raw.replace(/\s+/g, '');
    const looksLikeImageBase64 =
        compact.startsWith('iVBORw0KGgo') ||
        compact.startsWith('/9j/') ||
        compact.startsWith('R0lGOD') ||
        compact.startsWith('UklGR');

    if (looksLikeImageBase64) {
        return `data:image/png;base64,${compact}`;
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(raw)}`;
};

type FeatureItem = {
    key: string;
    icon: string;
    label: string;
    desc: string;
    color: string;
    displayValue: string;
    enabled: boolean;
};

type TranslateFn = (key: string, fallback?: string) => string;

/** Order of plan feature rows; keys must exist in API `plan.features` to appear. */
const FEATURE_ORDER: string[] = [
    'quality',
    'no_ads',
    'offline',
    'download',
    'playlist_limit',
    'recommendation',
    'ai_music_enabled',
    'ai_music_generations_per_month',
    'ai_music_max_duration_seconds',
    'ai_music_max_minutes_per_month',
    'can_become_artist',
    'create_album',
];

const FEATURE_STYLE: Record<string, { icon: string; color: string }> = {
    quality: { icon: 'equalizer', color: '#A78BFA' },
    no_ads: { icon: 'music-off', color: '#FF6B6B' },
    offline: { icon: 'download-circle', color: '#4ECDC4' },
    download: { icon: 'download', color: '#60A5FA' },
    playlist_limit: { icon: 'playlist-music', color: '#60A5FA' },
    can_become_artist: { icon: 'account-music', color: '#34D399' },
    create_album: { icon: 'album', color: '#34D399' },
    recommendation: { icon: 'robot-love', color: '#F59E0B' },
    ai_music_enabled: { icon: 'creation', color: '#E879F9' },
    ai_music_generations_per_month: { icon: 'counter', color: '#C084FC' },
    ai_music_max_duration_seconds: { icon: 'timer-music', color: '#818CF8' },
    ai_music_max_minutes_per_month: { icon: 'clock-time-four', color: '#67E8F9' },
};

const featureLabelKey = (key: string) => `premium.features.${key}.label`;
const featureDescKey = (key: string) => `premium.features.${key}.desc`;

const formatFeatureValue = (key: string, value: unknown, t: TranslateFn): { value: string; enabled: boolean } => {
    if (typeof value === 'boolean') {
        return { value: value ? t('premium.featureValue.yes', 'Yes') : t('premium.featureValue.no', 'No'), enabled: value };
    }
    if (key === 'playlist_limit' && typeof value === 'number') {
        return {
            value: value < 0 ? t('premium.featureValue.unlimitedPlaylists', 'Unlimited') : `${value}`,
            enabled: true,
        };
    }
    if (key === 'recommendation' && typeof value === 'string') {
        const v = value.toLowerCase();
        if (v === 'basic') return { value: t('premium.featureValue.recommendationBasic', 'Basic'), enabled: true };
        if (v === 'advanced' || v === 'advance') {
            return { value: t('premium.featureValue.recommendationAdvanced', 'Advanced'), enabled: true };
        }
    }
    if (key === 'quality' && typeof value === 'string') return { value: value, enabled: true };
    if (key === 'ai_music_generations_per_month' && typeof value === 'number') {
        return {
            value: `${value} ${t('premium.featureValue.generationsPerMonth', 'generations / month')}`,
            enabled: value > 0,
        };
    }
    if (key === 'ai_music_max_duration_seconds' && typeof value === 'number') {
        return {
            value: t('premium.featureValue.secondsMax', 'Up to {n}s per track').replace('{n}', String(value)),
            enabled: true,
        };
    }
    if (key === 'ai_music_max_minutes_per_month' && typeof value === 'number') {
        return {
            value: t('premium.featureValue.minutesMonthly', 'Up to {n} min / month').replace('{n}', String(value)),
            enabled: true,
        };
    }
    return { value: String(value), enabled: true };
};

// ─── Animated star particle ───────────────────────────────────────────────────

const StarParticle = ({
                          x,
                          y,
                          size,
                          delay,
                          accentColor,
                      }: {
    x: number;
    y: number;
    size: number;
    delay: number;
    accentColor: string;
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
                backgroundColor: accentColor,
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
                      cardWidth,
                      styles,
                      themeColors,
                  }: {
    plan: SubscriptionPlan;
    isSelected: boolean;
    isCurrent: boolean;
    onSelect: () => void;
    cardWidth: number;
    styles: PremiumStyles;
    themeColors: ColorScheme;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const { language } = useTranslation();
    const priceNumber = typeof plan.price === 'number' ? plan.price : Number(plan.price);
    const safePrice = Number.isFinite(priceNumber) ? priceNumber : 0;
    const isFree = safePrice === 0 || plan.subsName.toLowerCase().includes('free');
    const priceLocale = language === 'vi' ? 'vi-VN' : 'en-US';

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        ]).start();
        onSelect();
    };

    const formatPrice = (p: number) => new Intl.NumberFormat(priceLocale).format(p);

    return (
        <Pressable onPress={handlePress} style={{ width: cardWidth }}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {isSelected && !isFree ? (
                    <LinearGradient
                        colors={[themeColors.accentDim, themeColors.accent, themeColors.accentDim]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.planCard, styles.planCardSelectedGradient]}
                    >
                        <PlanCardContent
                            plan={plan}
                            isSelected={isSelected}
                            isCurrent={isCurrent}
                            isFree={isFree}
                            priceNumber={safePrice}
                            formatPrice={formatPrice}
                            styles={styles}
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
                            priceNumber={safePrice}
                            formatPrice={formatPrice}
                            styles={styles}
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
                             priceNumber,
                             formatPrice,
                             styles,
                         }: {
    plan: SubscriptionPlan;
    isSelected: boolean;
    isCurrent: boolean;
    isFree: boolean;
    priceNumber: number;
    formatPrice: (p: number) => string;
    styles: PremiumStyles;
}) => {
    const { t } = useTranslation();
    return (
        <>
            {isCurrent && (
                <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>{t('premium.badgeCurrent', 'CURRENT')}</Text>
                </View>
            )}
            {isSelected && !isFree && !isCurrent && (
                <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{t('premium.badgePopular', '✦ POPULAR')}</Text>
                </View>
            )}

            <Text style={[styles.planName, isSelected && !isFree && styles.planNameSelected]}>
                {plan.subsName}
            </Text>

            {isFree ? (
                <Text style={styles.planFreeLabel}>{t('premium.planFree', 'Free')}</Text>
            ) : (
                <>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                        {formatPrice(priceNumber)}
                        <Text style={styles.planPriceCurrency}>{t('premium.currencyDong', 'đ')}</Text>
                    </Text>
                    <Text style={[styles.planDuration, isSelected && styles.planDurationSelected]}>
                        {t('premium.planDurationDays', '{n} days').replace('{n}', String(plan.durationDays))}
                    </Text>
                </>
            )}
        </>
    );
};

// ─── Feature row ──────────────────────────────────────────────────────────────

const FeatureRow = ({
                        icon,
                        label,
                        desc,
                        color,
                        displayValue,
                        enabled,
                        index,
                        styles,
                        themeColors,
                    }: {
    icon: string;
    label: string;
    desc: string;
    color: string;
    displayValue: string;
    enabled: boolean;
    index: number;
    styles: PremiumStyles;
    themeColors: ColorScheme;
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
                    color={enabled ? color : themeColors.glass35}
                />
            </View>
        </Animated.View>
    );
};

// ─── Subscription history item ────────────────────────────────────────────────

const STATUS_COLOR_MAP: Record<UserSubscription['status'], string> = {
    ACTIVE: '#34D399',
    EXPIRED: '#6B7280',
    CANCELLED: '#F87171',
    PENDING: '#FBBF24',
    SUSPENDED: '#F97316',
};

const formatHistoryDate = (dateStr?: string): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const HistoryItem = ({
    item,
    styles,
    themeColors,
    t,
}: {
    item: UserSubscription;
    styles: PremiumStyles;
    themeColors: ColorScheme;
    t: TranslateFn;
}) => {
    const statusColor = STATUS_COLOR_MAP[item.status] ?? themeColors.glass50;
    const price = typeof item.plan?.price === 'number' ? item.plan.price : Number(item.plan?.price ?? 0);
    const isFree = !Number.isFinite(price) || price === 0;
    const endDate = item.cancelledAt ?? item.expiresAt;

    return (
        <View style={styles.historyItem}>
            <View style={[styles.historyStatusDot, { backgroundColor: statusColor }]} />
            <View style={styles.historyItemBody}>
                <View style={styles.historyItemTitleRow}>
                    <Text style={styles.historyPlanName}>{item.plan?.subsName ?? '—'}</Text>
                    <View style={[styles.historyStatusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}50` }]}>
                        <Text style={[styles.historyStatusText, { color: statusColor }]}>
                            {t(`premium.history.status.${item.status.toLowerCase()}`, item.status)}
                        </Text>
                    </View>
                </View>
                <Text style={styles.historyDateRange}>
                    {formatHistoryDate(item.startedAt)} → {formatHistoryDate(endDate)}
                </Text>
                {!isFree && (
                    <Text style={styles.historyPrice}>
                        {new Intl.NumberFormat('vi-VN').format(price)}đ · {item.plan?.durationDays ?? '—'} {t('premium.history.days', 'ngày')}
                    </Text>
                )}
            </View>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PremiumScreen = () => {
    const insets = useSafeAreaInsets();
    const { authSession } = useAuth();
    const { t, language } = useTranslation();
    const priceLocale = language === 'vi' ? 'vi-VN' : 'en-US';
    const themeColors = useThemeColors();
    const styles = useMemo(() => createPremiumStyles(themeColors), [themeColors]);
    const planCardWidth = useMemo(() => {
        // Balanced horizontal cards with snap-like spacing.
        const w = Math.round(Math.min(192, SCREEN_W * 0.52));
        return Math.max(160, w);
    }, []);

    const {
        plans,
        currentSubscription: currentSub,
        isActive,
        isLoading: queryLoading,
        isFetching: queryFetching,
        isError: queryIsError,
        error: queryError,
        history,
        isHistoryLoading,
        refresh: refreshSubscription,
    } = useSubscription();

    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const backgroundRefreshing = queryFetching && !queryLoading;
    const [purchasing, setPurchasing] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [cancelingInAppOrder, setCancelingInAppOrder] = useState(false);
    const [openingBrowser, setOpeningBrowser] = useState(false);
    const [inAppPayment, setInAppPayment] = useState<PaymentResponse | null>(null);
    const [pendingPaymentMeta, setPendingPaymentMeta] = useState<{ createdAt: number; planId: string } | null>(null);
    const [qrImageFailed, setQrImageFailed] = useState(false);
    const [remainingMs, setRemainingMs] = useState<number | null>(null);
    const autoCancelKeyRef = useRef<string | null>(null);
    const lastPurchaseAtRef = useRef(0);
    const mappedFeatures = useMemo<FeatureItem[]>(() => {
        const raw = selectedPlan?.features ?? {};
        return FEATURE_ORDER.filter((key) => raw[key] !== undefined && FEATURE_STYLE[key])
            .map((key) => {
                const style = FEATURE_STYLE[key];
                const { value, enabled } = formatFeatureValue(key, raw[key], t);
                return {
                    key,
                    icon: style.icon,
                    label: t(featureLabelKey(key), key),
                    desc: t(featureDescKey(key), ''),
                    color: style.color,
                    displayValue: value,
                    enabled,
                };
            });
    }, [selectedPlan, t]);

    const selectedPrice = useMemo(() => {
        if (!selectedPlan) return 0;
        const n = typeof selectedPlan.price === 'number' ? selectedPlan.price : Number(selectedPlan.price);
        return Number.isFinite(n) ? n : 0;
    }, [selectedPlan]);
    const qrImageUri = useMemo(() => buildQrImageUri(inAppPayment?.qrCode), [inAppPayment?.qrCode]);
    const transferDescription = useMemo(() => {
        const planName = plans.find((p) => p.id === pendingPaymentMeta?.planId)?.subsName
            ?? selectedPlan?.subsName
            ?? null;
        const prefix = t('premium.transferPlanPrefix', 'Get plans');
        return planName ? `${prefix} ${planName}` : `${prefix} Premium`;
    }, [plans, pendingPaymentMeta?.planId, selectedPlan?.subsName, t]);

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

    const userScope = useMemo(() => {
        const id = authSession?.profile?.id;
        if (id) return id;
        const token = authSession?.tokens?.accessToken;
        if (!token) return 'anonymous';
        return token.slice(-24);
    }, [authSession?.profile?.id, authSession?.tokens?.accessToken]);

    // Keep selected plan stable; if user hasn't picked yet, auto pick cheapest paid.
    useEffect(() => {
        if (selectedPlan) return;
        if (plans.length === 0) return;
        const paid = plans.filter((p) => {
            const price = typeof p.price === 'number' ? p.price : Number(p.price);
            return (Number.isFinite(price) ? price : 0) > 0;
        });
        if (paid.length === 0) return;
        const cheapest = paid.reduce((a, b) => {
            const ap = typeof a.price === 'number' ? a.price : Number(a.price);
            const bp = typeof b.price === 'number' ? b.price : Number(b.price);
            return (ap ?? 0) < (bp ?? 0) ? a : b;
        });
        setSelectedPlan(cheapest);
    }, [plans, selectedPlan]);

    useEffect(() => {
        setQrImageFailed(false);
    }, [inAppPayment?.qrCode]);

    useEffect(() => {
        if (!inAppPayment || !pendingPaymentMeta) {
            setRemainingMs(null);
            return;
        }

        const tick = () => {
            const elapsed = Date.now() - pendingPaymentMeta.createdAt;
            setRemainingMs(Math.max(0, PENDING_PAYMENT_TTL_MS - elapsed));
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [inAppPayment?.orderCode, pendingPaymentMeta?.createdAt]);

    const loadPendingPayment = useCallback(async () => {
        if (!authSession) {
            setInAppPayment(null);
            setPendingPaymentMeta(null);
            return;
        }
        const key = getPendingPaymentStorageKey(userScope);
        try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) {
                setPendingPaymentMeta(null);
                return;
            }
            const parsed = JSON.parse(raw) as PendingPaymentCache;
            const isExpired = Date.now() - parsed.createdAt > PENDING_PAYMENT_TTL_MS;
            if (isExpired) {
                await AsyncStorage.removeItem(key);
                setInAppPayment(null);
                setPendingPaymentMeta(null);
                return;
            }
            setInAppPayment(parsed.payment);
            setPendingPaymentMeta({ createdAt: parsed.createdAt, planId: parsed.planId });
        } catch {
            setPendingPaymentMeta(null);
        }
    }, [authSession, userScope]);

    const savePendingPayment = useCallback(async (payment: PaymentResponse, planId: string) => {
        if (!authSession) return;
        const key = getPendingPaymentStorageKey(userScope);
        const payload: PendingPaymentCache = {
            payment,
            planId,
            createdAt: Date.now(),
        };
        setInAppPayment(payment);
        setPendingPaymentMeta({ createdAt: payload.createdAt, planId });
        try {
            await AsyncStorage.setItem(key, JSON.stringify(payload));
        } catch {}
    }, [authSession, userScope]);

    const clearPendingPayment = useCallback(async () => {
        const key = getPendingPaymentStorageKey(userScope);
        setInAppPayment(null);
        setPendingPaymentMeta(null);
        try {
            await AsyncStorage.removeItem(key);
        } catch {}
    }, [userScope]);

    useEffect(() => {
        void loadPendingPayment();
    }, [loadPendingPayment]);

    const { paymentState, isChecking: checkingPayment } = usePaymentStatus({
        orderCode: inAppPayment?.orderCode ?? null,
        enabled: Boolean(inAppPayment?.orderCode) && !isActive,
    });

    const openCheckoutInBrowser = useCallback(async (checkoutUrl: string) => {
        if (!checkoutUrl) throw new Error(t('premium.checkoutUrlMissing', 'Missing checkout URL'));
        setOpeningBrowser(true);
        try {
            try {
                await Linking.openURL(checkoutUrl);
            } catch {
                await WebBrowser.openBrowserAsync(checkoutUrl);
            }
        } finally {
            setOpeningBrowser(false);
        }
    }, [t]);

    const handlePurchase = async () => {
        if (!authSession) {
            Alert.alert(t('premium.alert.signInTitle', 'Sign in'), t('screens.premium.loginToPurchase', ''));
            return;
        }
        if (!selectedPlan || selectedPrice === 0) {
            Alert.alert(
                t('premium.alert.selectPlanTitle', 'Select a plan'),
                t('screens.premium.selectPaidPlan', ''),
            );
            return;
        }
        const now = Date.now();
        if (now - lastPurchaseAtRef.current < PURCHASE_COOLDOWN_MS) {
            const remain = Math.ceil((PURCHASE_COOLDOWN_MS - (now - lastPurchaseAtRef.current)) / 1000);
            Alert.alert(
                t('premium.alert.cooldownTitle', 'Please wait'),
                t('premium.alert.cooldownMessage', 'Please wait {n}s before creating another order.').replace('{n}', String(remain)),
            );
            return;
        }
        if (inAppPayment && pendingPaymentMeta) {
            const isPendingStillValid = now - pendingPaymentMeta.createdAt <= PENDING_PAYMENT_TTL_MS;
            if (isPendingStillValid) {
                Alert.alert(
                    t('premium.alert.pendingOrderTitle', 'Pending payment'),
                    t('premium.alert.pendingOrderMessage', ''),
                );
                return;
            }
        }
        try {
            setPurchasing(true);
            lastPurchaseAtRef.current = now;
            const res = await purchaseSubscription({ planId: selectedPlan.id });
            const hasInAppData = Boolean(res.qrCode || res.referenceCode);
            if (hasInAppData) {
                await savePendingPayment(res, selectedPlan.id);
                Alert.alert(t('premium.inAppTitle', 'In-app payment'), t('premium.alert.inAppCreatedMessage', ''));
            } else {
                await clearPendingPayment();
                await openCheckoutInBrowser(res.checkoutUrl);
                Alert.alert(
                    t('premium.alert.browserFallbackTitle', 'Browser checkout'),
                    t('premium.alert.browserFallbackMessage', ''),
                    [{ text: t('common.done', 'OK'), onPress: () => void refreshSubscription() }],
                );
            }
        } catch (e: any) {
            Alert.alert(t('common.error', 'Error'), e.message || t('premium.alert.purchaseFailed', 'Could not start payment'));
        } finally { setPurchasing(false); }
    };

    const handleCancelSubscription = useCallback(() => {
        if (!authSession) {
            Alert.alert(t('premium.alert.signInTitle', 'Sign in'), t('premium.alert.signInToManage', ''));
            return;
        }

        Alert.alert(
            t('premium.alert.cancelSubTitle', 'Cancel subscription'),
            t('premium.alert.cancelSubMessage', ''),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('premium.alert.cancelSubConfirm', 'Cancel plan'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCanceling(true);
                            await cancelMySubscription();
                            Alert.alert(t('common.success', 'Success'), t('premium.alert.cancelSubSuccess', ''));
                            await refreshSubscription();
                        } catch (e: any) {
                            Alert.alert(t('common.error', 'Error'), e?.message || t('premium.alert.cancelSubFailed', ''));
                        } finally {
                            setCanceling(false);
                        }
                    },
                },
            ],
        );
    }, [authSession, refreshSubscription, t]);

    const handleCancelInAppPayment = useCallback(() => {
        if (!inAppPayment?.orderCode) {
            Alert.alert(t('premium.alert.orderMissingTitle', 'No order'), t('premium.alert.orderMissingMessage', ''));
            return;
        }

        Alert.alert(
            t('premium.alert.cancelPaymentTitle', 'Cancel payment order'),
            t('premium.alert.cancelPaymentMessage', ''),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('premium.alert.cancelPaymentConfirm', 'Cancel order'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelingInAppOrder(true);
                            await cancelPaymentLink(inAppPayment.orderCode, {
                                cancellationReason: 'User cancelled in-app pending payment',
                            });
                            await clearPendingPayment();
                            Alert.alert(t('premium.alert.paymentCancelledTitle', 'Cancelled'), t('premium.alert.paymentCancelledMessage', ''));
                            await refreshSubscription();
                        } catch (e: any) {
                            const msg = String(e?.message || '');
                            const staleOrder = /no longer cancellable|not found|error processing payment/i.test(msg);
                            if (staleOrder) {
                                await clearPendingPayment();
                                await refreshSubscription();
                                Alert.alert(t('premium.alert.orderStaleTitle', 'Order changed'), t('premium.alert.orderStaleMessage', ''));
                            } else {
                                Alert.alert(t('common.error', 'Error'), msg || t('premium.alert.cancelPaymentFailed', ''));
                            }
                        } finally {
                            setCancelingInAppOrder(false);
                        }
                    },
                },
            ],
        );
    }, [inAppPayment?.orderCode, clearPendingPayment, refreshSubscription, t]);

    useEffect(() => {
        if (!inAppPayment?.orderCode || !pendingPaymentMeta?.createdAt) return;
        if (remainingMs == null || remainingMs > 0) return;

        const key = `${inAppPayment.orderCode}-${pendingPaymentMeta.createdAt}`;
        if (autoCancelKeyRef.current === key) return;
        autoCancelKeyRef.current = key;

        void (async () => {
            try {
                setCancelingInAppOrder(true);
                await cancelPaymentLink(inAppPayment.orderCode, {
                    cancellationReason: 'Auto-cancel after 10 minutes pending',
                });
                await clearPendingPayment();
                await refreshSubscription();
                Alert.alert(
                    t('premium.expiredTitle', 'Đơn hết hạn'),
                    t('premium.expiredMessage', 'Đơn thanh toán đã tự hủy do quá 10 phút chưa thanh toán.'),
                );
            } catch (e: any) {
                const msg = String(e?.message || '');
                const staleOrder = /no longer cancellable|not found|error processing payment/i.test(msg);
                if (staleOrder) {
                    await clearPendingPayment();
                    await refreshSubscription();
                } else {
                    Alert.alert('Lỗi', msg || t('premium.autoCancelError', 'Không thể tự hủy đơn thanh toán hết hạn.'));
                }
            } finally {
                setCancelingInAppOrder(false);
            }
        })();
    }, [inAppPayment?.orderCode, pendingPaymentMeta?.createdAt, remainingMs, clearPendingPayment, refreshSubscription, t]);

    const remainDays = useMemo(() => {
        if (!currentSub?.expiresAt) return 0;
        return Math.max(0, Math.ceil((new Date(currentSub.expiresAt).getTime() - Date.now()) / 86400000));
    }, [currentSub]);

    const glowOpacity = crownGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

    useEffect(() => {
        if (!isActive) return;
        void clearPendingPayment();
    }, [isActive, clearPendingPayment]);

    useEffect(() => {
        if (!inAppPayment) return;
        if (paymentState !== 'SUCCESS') return;
        void clearPendingPayment();
    }, [clearPendingPayment, inAppPayment, paymentState]);

    const loadErrorMessage =
        queryIsError && queryError
            ? (queryError as any)?.message ?? String(queryError)
            : null;

    if (queryLoading) {
        return (
            <View style={styles.root}>
                <StatusBar style={getStatusBarStyle(themeColors.bg)} />
                <PremiumSkeleton skeletonStyles={styles} />
            </View>
        );
    }

    if (loadErrorMessage && plans.length === 0) {
        return (
            <View style={styles.root}>
                <StatusBar style={getStatusBarStyle(themeColors.bg)} />
                <View style={{ paddingTop: insets.top + 20 }}>
                    <RetryState
                        title={t('premium.loadErrorTitle', 'Could not load Premium')}
                        description={loadErrorMessage}
                        onRetry={() => void refreshSubscription()}
                        icon="👑"
                    />
                </View>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={[themeColors.premiumCardFrom || themeColors.surfaceMid, themeColors.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.root}
        >
            <StatusBar style={getStatusBarStyle(themeColors.bg)} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
            >
                {/* ── Hero ── */}
                <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
                    {/* Star particles */}
                    {stars.map((s) => (
                        <StarParticle
                            key={s.id}
                            x={s.x}
                            y={s.y}
                            size={s.size}
                            delay={s.delay}
                            accentColor={themeColors.accent}
                        />
                    ))}

                    {/* Hero gradient */}
                    <LinearGradient
                        colors={[themeColors.gradViolet, themeColors.gradPurple, themeColors.bg]}
                        locations={[0, 0.55, 1]}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Glow blob */}
                    <Animated.View style={[styles.glowBlob, { opacity: glowOpacity }]} />

                    {/* Brand mark */}
                    <Animated.View style={[styles.crownWrap, { transform: [{ scale: crownScale }] }]}>
                        <LinearGradient
                            colors={['#F59E0B', '#FBBF24', '#F59E0B']}
                            style={styles.crownGradient}
                        >
                            <Image
                                source={require('../../../assets/logo.png')}
                                style={styles.crownLogoImage}
                                resizeMode="contain"
                                accessibilityLabel={t('common.appName', 'Monu')}
                            />
                        </LinearGradient>
                    </Animated.View>

                    <MonuBrandHeaderTitle layout="hero" accentColor={themeColors.accent} style={styles.heroTitleWrap}>
                        {t('navigation.headerPremium', 'MONU · Plus')}
                    </MonuBrandHeaderTitle>

                    {isActive ? (
                        <View style={styles.activeBadge}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeBadgeText}>
                                {t('premium.activeLine', 'Active · {days} days left').replace('{days}', String(remainDays))}
                            </Text>
                        </View>
                    ) : selectedPlan && selectedPrice > 0 ? (
                        <View style={styles.priceTease}>
                            <Text style={styles.priceTeaseLabel}>{t('premium.startingFrom', 'STARTING FROM')}</Text>
                            <Text style={styles.priceTeaseValue}>
                                {new Intl.NumberFormat(priceLocale).format(selectedPrice)}
                                <Text style={styles.priceTeaseCurrency}>{t('premium.currencyDong', 'đ')}</Text>
                            </Text>
                            <Text style={styles.priceTeaseDuration}>
                                {t('premium.pricePerDuration', '/ {n} days').replace('{n}', String(selectedPlan.durationDays))}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.body}>
                    {backgroundRefreshing && (
                        <View style={styles.streamingBar}>
                            <ActivityIndicator size="small" color={themeColors.accent} />
                            <Text style={styles.streamingText}>{t('premium.streamingRefresh', '')}</Text>
                        </View>
                    )}

                    {/* ── Plan selector ── */}
                    {plans.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionHeading}>{t('premium.choosePlan', 'Choose your plan')}</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.plansRow}
                                decelerationRate="fast"
                                snapToInterval={planCardWidth + 10}
                                snapToAlignment="start"
                            >
                                {plans.map((plan) => (
                                    <PlanCard
                                        key={plan.id}
                                        plan={plan}
                                        isSelected={selectedPlan?.id === plan.id}
                                        isCurrent={currentSub?.plan?.id === plan.id && isActive}
                                        onSelect={() => setSelectedPlan(plan)}
                                        cardWidth={planCardWidth}
                                        styles={styles}
                                        themeColors={themeColors}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* ── CTA button ── */}
                    {!isActive && (
                        <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
                            <Pressable
                                onPress={handlePurchase}
                                disabled={purchasing || !selectedPlan || selectedPrice === 0}
                                style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]}
                            >
                                <LinearGradient
                                    colors={
                                        purchasing
                                            ? [themeColors.surfaceMid, themeColors.surfaceMid]
                                            : [themeColors.warning, themeColors.error, themeColors.accent]
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.ctaGradient}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color={themeColors.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.ctaIcon}>💳</Text>
                                            <Text style={styles.ctaText}>
                                                {selectedPlan && selectedPrice > 0
                                                    ? t('premium.ctaPay', 'Pay · {price}đ').replace(
                                                        '{price}',
                                                        new Intl.NumberFormat(priceLocale).format(selectedPrice),
                                                    )
                                                    : t('premium.ctaPickPlan', 'Choose a Premium plan')}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </Animated.View>
                    )}

                    {isActive && (
                        <Pressable
                            onPress={handleCancelSubscription}
                            disabled={canceling}
                            style={({ pressed }) => [
                                styles.cancelBtn,
                                pressed && { opacity: 0.88 },
                                canceling && { opacity: 0.7 },
                            ]}
                        >
                            {canceling ? (
                                <ActivityIndicator color={themeColors.error} />
                            ) : (
                                <Text style={styles.cancelBtnText}>{t('premium.cancelSubscription', 'Cancel subscription')}</Text>
                            )}
                        </Pressable>
                    )}

                    {!isActive && inAppPayment && (
                        <View style={styles.inAppPayCard}>
                            <View style={styles.inAppPayHeaderRow}>
                                <Text style={styles.inAppPayTitle}>{t('premium.inAppTitle', 'Thanh toán trong app')}</Text>
                                <Text style={styles.inAppPayBadge}>
                                    {checkingPayment ? t('premium.checking', 'Đang kiểm tra...') + ' · ' : ''}
                                    {remainingMs == null
                                        ? t('premium.pendingLabel', 'Đang chờ')
                                        : `${t('premium.remainingPrefix', 'Còn')} ${formatCountdown(remainingMs)}`}
                                </Text>
                            </View>

                            {qrImageUri && !qrImageFailed ? (
                                <View style={styles.qrWrap}>
                                    <Image
                                        source={{ uri: qrImageUri }}
                                        style={styles.qrImage}
                                        resizeMode="contain"
                                        onError={() => setQrImageFailed(true)}
                                    />
                                </View>
                            ) : (
                                <Text style={styles.inAppPayHint}>
                                    {t('premium.qrUnavailable', 'Chưa tải được ảnh QR. Bạn vẫn có thể thanh toán bằng nội dung chuyển khoản hoặc dùng fallback trình duyệt.')}
                                </Text>
                            )}

                            <Text style={styles.inAppPayHint}>{t('premium.transferContent', 'Nội dung chuyển khoản')}</Text>
                            <Text style={styles.inAppPayCode}>{transferDescription}</Text>

                            <Text style={styles.inAppPayHint}>{t('premium.referenceCode', 'Mã tham chiếu')}</Text>
                            <Text style={styles.inAppPayMeta}>
                                {inAppPayment.referenceCode || t('premium.referencePending', 'Updating...')}
                            </Text>

                            <Text style={styles.inAppPayMeta}>{t('premium.orderCodePrefix', 'Mã đơn hàng:')} {inAppPayment.orderCode}</Text>
                            <Text style={styles.inAppPayMeta}>{t('premium.autoActivateHint', 'Sau khi chuyển khoản thành công, hệ thống sẽ tự kích hoạt Premium.')}</Text>

                            <Pressable
                                disabled={openingBrowser || !inAppPayment.checkoutUrl}
                                onPress={async () => {
                                    try {
                                        await openCheckoutInBrowser(inAppPayment.checkoutUrl);
                                    } catch (e: any) {
                                        Alert.alert(t('common.error', 'Error'), e?.message || t('premium.alert.openCheckoutFailed', ''));
                                    }
                                }}
                                style={({ pressed }) => [styles.fallbackBtn, pressed && { opacity: 0.9 }]}
                            >
                                <Text style={styles.fallbackBtnText}>
                                    {openingBrowser ? t('premium.openingBrowser', 'Opening browser...') : t('premium.openBrowser', 'Open Browser')}
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={cancelingInAppOrder}
                                onPress={handleCancelInAppPayment}
                                style={({ pressed }) => [
                                    styles.cancelInAppOrderBtn,
                                    pressed && { opacity: 0.9 },
                                    cancelingInAppOrder && { opacity: 0.7 },
                                ]}
                            >
                                {cancelingInAppOrder ? (
                                    <ActivityIndicator color={themeColors.error} />
                                ) : (
                                    <Text style={styles.cancelInAppOrderBtnText}>{t('premium.cancelOrder', 'Hủy đơn thanh toán này')}</Text>
                                )}
                            </Pressable>
                        </View>
                    )}

                    {/* ── Divider ── */}
                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerLabel}>{t('premium.featuresHeading', 'Monu Plus features')}</Text>
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
                                styles={styles}
                                themeColors={themeColors}
                            />
                        ))}
                    </View>

                    {/* ── Guarantee strip ── */}
                    <LinearGradient
                        colors={[themeColors.premiumCardFrom, themeColors.gradPurple]}
                        style={styles.guaranteeCard}
                    >
                        <Text style={styles.guaranteeEmoji}>🛡️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.guaranteeTitle}>{t('premium.guaranteePayos', 'Secure payment via PayOS')}</Text>
                        </View>
                    </LinearGradient>

                    {/* ── Purchase history ── */}
                    {authSession && (
                        <View style={styles.section}>
                            <View style={styles.dividerRow}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerLabel}>{t('premium.history.title', 'Lịch sử đăng ký')}</Text>
                                <View style={styles.dividerLine} />
                            </View>
                            {isHistoryLoading ? (
                                <ActivityIndicator color={themeColors.accent} style={{ marginVertical: 16 }} />
                            ) : history.length === 0 ? (
                                <View style={styles.historyEmpty}>
                                    <MaterialCommunityIcons name="history" size={32} color={themeColors.glass20} />
                                    <Text style={styles.historyEmptyText}>{t('premium.history.empty', 'Chưa có lịch sử đăng ký')}</Text>
                                </View>
                            ) : (
                                <View style={styles.historyList}>
                                    {history.map((item) => (
                                        <HistoryItem
                                            key={item.id}
                                            item={item}
                                            styles={styles}
                                            themeColors={themeColors}
                                            t={t}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                </View>
            </ScrollView>
        </LinearGradient>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createPremiumStyles = (colors: ColorScheme) => StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.bg,
    },

    // ── Hero ────────────────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 40,
        overflow: 'hidden',
        minHeight: 320,
    },
    glowBlob: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: colors.accentDim,
        top: -72,
        alignSelf: 'center',
    },
    crownWrap: {
        marginBottom: 20,
        shadowColor: colors.warning,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
    },
    crownGradient: {
        width: 144,
        height: 62,
        borderRadius: 31,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    crownLogoImage: {
        width: 124,
        height: 44,
    },
    heroTitleWrap: { marginBottom: 8 },
    heroSubtitle: {
        color: colors.glass50,
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
        backgroundColor: colors.success,
    },
    activeBadgeText: {
        color: colors.success,
        fontWeight: '700',
        fontSize: 13,
    },

    // ── Price tease ───────────────────────────────────────────────────────────
    priceTease: {
        alignItems: 'center',
        backgroundColor: colors.glass07,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.glass12,
        paddingHorizontal: 30,
        paddingVertical: 16,
    },
    priceTeaseLabel: {
        color: colors.glass45,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 2,
    },
    priceTeaseValue: {
        color: colors.white,
        fontSize: 34,
        fontWeight: '800',
        lineHeight: 38,
    },
    priceTeaseCurrency: {
        fontSize: 20,
        fontWeight: '600',
    },
    priceTeaseDuration: {
        color: colors.glass50,
        fontSize: 13,
        marginTop: 2,
    },

    // ── Body ─────────────────────────────────────────────────────────────────
    body: {
        paddingHorizontal: 20,
    },
    streamingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.glass06,
        borderWidth: 1,
        borderColor: colors.glass12,
    },
    streamingText: {
        color: colors.glass70,
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeading: {
        color: colors.white,
        fontSize: 19,
        fontWeight: '800',
        marginBottom: 14,
    },

    // ── Plans ─────────────────────────────────────────────────────────────────
    plansRow: {
        flexDirection: 'row',
        gap: 10,
    },
    planCard: {
        borderRadius: 20,
        padding: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.glass10,
        alignItems: 'center',
        minHeight: 110,
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    planCardSelected: {
        borderColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
    },
    planCardSelectedGradient: {
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        minHeight: 110,
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 0,
    },
    planCardFree: {
        borderColor: colors.glass06,
        opacity: 0.6,
    },
    currentBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(52,211,153,0.25)',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    currentBadgeText: {
        color: colors.success,
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    popularBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: colors.glass20,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    popularBadgeText: {
        color: colors.white,
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    planName: {
        color: colors.glass60,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    planNameSelected: {
        color: colors.white,
    },
    planPrice: {
        color: colors.accent,
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 26,
    },
    planPriceSelected: {
        color: colors.white,
    },
    planPriceCurrency: {
        fontSize: 14,
        fontWeight: '600',
    },
    planDuration: {
        color: colors.glass45,
        fontSize: 11,
        textAlign: 'center',
        marginTop: 2,
    },
    planDurationSelected: {
        color: colors.glass70,
    },
    planFreeLabel: {
        color: colors.glass35,
        fontSize: 14,
        fontWeight: '500',
    },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaBtn: {
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 28,
        shadowColor: colors.warning,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
        elevation: 12,
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
        color: colors.white,
        fontWeight: '800',
        fontSize: 16,
    },
    cancelBtn: {
        minHeight: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.45)',
        backgroundColor: 'rgba(127,29,29,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    cancelBtnText: {
        color: '#FCA5A5',
        fontSize: 14,
        fontWeight: '800',
    },

    // ── In-app payment card ──────────────────────────────────────────────────
    inAppPayCard: {
        backgroundColor: colors.glass05,
        borderColor: colors.warningBorder ?? colors.warning,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 24,
    },
    inAppPayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    inAppPayTitle: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '800',
    },
    inAppPayBadge: {
        color: colors.warning,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    qrWrap: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    qrImage: {
        width: 200,
        height: 200,
    },
    inAppPayHint: {
        color: colors.glass65,
        fontSize: 12,
        marginBottom: 6,
    },
    inAppPayCode: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    inAppPayMeta: {
        color: colors.glass70,
        fontSize: 12,
        marginBottom: 4,
    },
    fallbackBtn: {
        marginTop: 10,
        borderRadius: 12,
        backgroundColor: colors.glass12,
        borderWidth: 1,
        borderColor: colors.glass20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    fallbackBtnText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
    cancelInAppOrderBtn: {
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(248,113,113,0.45)',
        backgroundColor: 'rgba(127,29,29,0.2)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    cancelInAppOrderBtnText: {
        color: '#FCA5A5',
        fontSize: 13,
        fontWeight: '700',
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
        backgroundColor: colors.glass08,
    },
    dividerLabel: {
        color: colors.glass35,
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
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.glass10,
    },
    featureRowDisabled: {
        opacity: 0.65,
    },
    featureIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
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
        backgroundColor: colors.glass15,
    },
    featureText: {
        flex: 1,
        gap: 2,
    },
    featureLabel: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    featureDesc: {
        color: colors.glass45,
        fontSize: 12,
        lineHeight: 17,
    },
    featureValueWrap: {
        alignItems: 'flex-end',
        gap: 4,
    },
    featureValue: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    featureValueDisabled: {
        color: colors.glass50,
    },

    // ── Skeleton Loading ───────────────────────────────────────────────────────
    skeletonRoot: {
        flex: 1,
        paddingTop: 24,
    },
    skeletonBlock: {
        backgroundColor: colors.glass08,
        borderRadius: 12,
    },
    skeletonHero: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 36,
        minHeight: 300,
    },
    skeletonCrown: {
        width: 90,
        height: 90,
        borderRadius: 45,
        marginBottom: 20,
    },
    skeletonTitle: {
        height: 32,
        width: '60%',
        marginBottom: 12,
    },
    skeletonSubtitle: {
        height: 16,
        width: '70%',
        marginBottom: 16,
    },
    skeletonBadge: {
        height: 32,
        width: 200,
        borderRadius: 999,
    },
    skeletonBody: {
        paddingHorizontal: 20,
    },
    skeletonSectionTitle: {
        height: 24,
        width: '40%',
        marginBottom: 14,
        marginTop: 20,
    },
    skeletonPlanRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    skeletonPlanCard: {
        flex: 1,
        height: 110,
        borderRadius: 16,
    },
    skeletonCta: {
        height: 58,
        borderRadius: 999,
        marginBottom: 28,
    },
    skeletonFeatureRow: {
        height: 70,
        borderRadius: 14,
        marginBottom: 10,
    },
    skeletonGuarantee: {
        height: 90,
        borderRadius: 16,
        marginBottom: 20,
    },

    // ── History ───────────────────────────────────────────────────────────────
    historyList: {
        gap: 10,
    },
    historyItem: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.glass10,
    },
    historyStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 5,
        flexShrink: 0,
    },
    historyItemBody: {
        flex: 1,
        gap: 4,
    },
    historyItemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    historyPlanName: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    historyStatusBadge: {
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    historyStatusText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    historyDateRange: {
        color: colors.glass50,
        fontSize: 12,
    },
    historyPrice: {
        color: colors.glass65,
        fontSize: 12,
        fontWeight: '600',
    },
    historyEmpty: {
        alignItems: 'center',
        gap: 10,
        paddingVertical: 24,
    },
    historyEmptyText: {
        color: colors.glass35,
        fontSize: 14,
    },

    // ── Guarantee ─────────────────────────────────────────────────────────────
    guaranteeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.accentBorder25,
    },
    guaranteeEmoji: { fontSize: 28 },
    guaranteeTitle: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 3,
    },
    guaranteeDesc: {
        color: colors.glass45,
        fontSize: 12,
    },
});

type PremiumStyles = ReturnType<typeof createPremiumStyles>;
