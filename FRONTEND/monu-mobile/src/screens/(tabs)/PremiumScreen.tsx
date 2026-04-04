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
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ColorScheme, useThemeColors } from '../../config/colors';
import {
    cancelMySubscription,
    cancelPaymentLink,
    getActiveSubscriptionPlans,
    getMySubscription,
    purchaseSubscription,
    PaymentResponse,
    SubscriptionPlan,
    UserSubscription,
} from '../../services/payment';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';

const { width: SCREEN_W } = Dimensions.get('window');
const PURCHASE_COOLDOWN_MS = 30_000;
const PENDING_PAYMENT_TTL_MS = 10 * 60 * 1000;

type PendingPaymentCache = {
    payment: PaymentResponse;
    planId: string;
    createdAt: number;
};

const getPendingPaymentStorageKey = (userScope: string) => `premium.pendingPayment.${userScope}`;

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
    const qrImageUri = useMemo(() => buildQrImageUri(inAppPayment?.qrCode), [inAppPayment?.qrCode]);
    const transferDescription = useMemo(() => {
        const planName = plans.find((p) => p.id === pendingPaymentMeta?.planId)?.subsName
            ?? selectedPlan?.subsName
            ?? null;
        return planName ? `Get plans ${planName}` : 'Get plans Premium';
    }, [plans, pendingPaymentMeta?.planId, selectedPlan?.subsName]);

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

    const fetchData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [plansData, subData] = await Promise.allSettled([
                getActiveSubscriptionPlans(),
                authSession ? getMySubscription() : Promise.resolve(null as UserSubscription | null),
            ]);

            if (plansData.status === 'fulfilled') {
                setPlans(plansData.value);
                const paid = plansData.value.filter(
                    (p) => p.price > 0 && !p.subsName.toLowerCase().includes('free'),
                );
                if (paid.length > 0 && !selectedPlan) {
                    setSelectedPlan(paid.reduce((a, b) => (a.price < b.price ? a : b)));
                }
            }
            if (subData.status === 'fulfilled') {
                setCurrentSub(subData.value ?? null);
            } else {
                setCurrentSub(null);
            }
        } catch {}
        finally { if (!silent) setLoading(false); }
    }, [authSession, selectedPlan]);

    useEffect(() => {
        premiumFocusPassRef.current = 0;
    }, [authSession?.tokens.accessToken]);

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

    const userScope = useMemo(() => {
        const id = authSession?.profile?.id;
        if (id) return id;
        const token = authSession?.tokens?.accessToken;
        if (!token) return 'anonymous';
        return token.slice(-24);
    }, [authSession?.profile?.id, authSession?.tokens?.accessToken]);

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

    useFocusEffect(
        useCallback(() => {
            const silent = premiumFocusPassRef.current > 0;
            premiumFocusPassRef.current += 1;
            void fetchData(silent);
            const id = setInterval(() => void fetchData(true), 120000);
            return () => clearInterval(id);
        }, [fetchData]),
    );

    const openCheckoutInBrowser = useCallback(async (checkoutUrl: string) => {
        if (!checkoutUrl) throw new Error('Thiếu đường dẫn thanh toán');
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
    }, []);

    const handlePurchase = async () => {
        if (!authSession) {
            Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để mua Premium.');
            return;
        }
        if (!selectedPlan || selectedPlan.price === 0) {
            Alert.alert('Chọn gói', 'Vui lòng chọn gói Premium trả phí.');
            return;
        }
        const now = Date.now();
        if (now - lastPurchaseAtRef.current < PURCHASE_COOLDOWN_MS) {
            const remain = Math.ceil((PURCHASE_COOLDOWN_MS - (now - lastPurchaseAtRef.current)) / 1000);
            Alert.alert('Thao tác quá nhanh', `Vui lòng đợi ${remain}s trước khi tạo đơn mới.`);
            return;
        }
        if (inAppPayment && pendingPaymentMeta) {
            const isPendingStillValid = now - pendingPaymentMeta.createdAt <= PENDING_PAYMENT_TTL_MS;
            if (isPendingStillValid) {
                Alert.alert(
                    'Đang có đơn chờ thanh toán',
                    'Bạn đã có đơn thanh toán trong app. Hãy dùng QR/chuyển khoản hiện tại hoặc fallback browser, không tạo đơn mới liên tục.',
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
                Alert.alert(
                    'Thanh toán trong app',
                    'Đã tạo mã QR và thông tin chuyển khoản. Nếu không thanh toán được, bạn có thể dùng trình duyệt để thanh toán.',
                );
            } else {
                await clearPendingPayment();
                await openCheckoutInBrowser(res.checkoutUrl);
                Alert.alert(
                    'Fallback trình duyệt',
                    'Không có dữ liệu thanh toán nội bộ nên đã chuyển sang browser checkout.',
                    [{ text: 'OK', onPress: () => fetchData(true) }],
                );
            }
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể khởi tạo thanh toán');
        } finally { setPurchasing(false); }
    };

    const handleCancelSubscription = useCallback(() => {
        if (!authSession) {
            Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để thực hiện thao tác này.');
            return;
        }

        Alert.alert(
            'Hủy gói cước',
            'Bạn có chắc muốn hủy gói Premium hiện tại không?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy gói',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCanceling(true);
                            await cancelMySubscription();
                            Alert.alert('Thành công', 'Gói cước đã được hủy.');
                            await fetchData(true);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e?.message || 'Không thể hủy gói cước lúc này.');
                        } finally {
                            setCanceling(false);
                        }
                    },
                },
            ],
        );
    }, [authSession, fetchData]);

    const handleCancelInAppPayment = useCallback(() => {
        if (!inAppPayment?.orderCode) {
            Alert.alert('Không tìm thấy đơn', 'Không có mã đơn để hủy.');
            return;
        }

        Alert.alert(
            'Hủy đơn thanh toán',
            'Bạn có muốn hủy đơn thanh toán đang chờ này không?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy đơn',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelingInAppOrder(true);
                            await cancelPaymentLink(inAppPayment.orderCode, {
                                cancellationReason: 'User cancelled in-app pending payment',
                            });
                            await clearPendingPayment();
                            Alert.alert('Đã hủy', 'Đơn thanh toán đã được hủy thành công.');
                            await fetchData(true);
                        } catch (e: any) {
                            const msg = String(e?.message || '');
                            const staleOrder = /no longer cancellable|not found|error processing payment/i.test(msg);
                            if (staleOrder) {
                                await clearPendingPayment();
                                await fetchData(true);
                                Alert.alert('Đơn đã thay đổi', 'Đơn thanh toán này không còn ở trạng thái chờ hủy. App đã làm mới dữ liệu.');
                            } else {
                                Alert.alert('Lỗi', msg || 'Không thể hủy đơn thanh toán lúc này.');
                            }
                        } finally {
                            setCancelingInAppOrder(false);
                        }
                    },
                },
            ],
        );
    }, [inAppPayment?.orderCode, clearPendingPayment, fetchData]);

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
                await fetchData(true);
                Alert.alert(
                    t('premium.expiredTitle', 'Đơn hết hạn'),
                    t('premium.expiredMessage', 'Đơn thanh toán đã tự hủy do quá 10 phút chưa thanh toán.'),
                );
            } catch (e: any) {
                const msg = String(e?.message || '');
                const staleOrder = /no longer cancellable|not found|error processing payment/i.test(msg);
                if (staleOrder) {
                    await clearPendingPayment();
                    await fetchData(true);
                } else {
                    Alert.alert('Lỗi', msg || t('premium.autoCancelError', 'Không thể tự hủy đơn thanh toán hết hạn.'));
                }
            } finally {
                setCancelingInAppOrder(false);
            }
        })();
    }, [inAppPayment?.orderCode, pendingPaymentMeta?.createdAt, remainingMs, clearPendingPayment, fetchData, t]);

    const isActive = currentSub?.status === 'ACTIVE';
    const remainDays = useMemo(() => {
        if (!currentSub?.expiresAt) return 0;
        return Math.max(0, Math.ceil((new Date(currentSub.expiresAt).getTime() - Date.now()) / 86400000));
    }, [currentSub]);

    const glowOpacity = crownGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

    useEffect(() => {
        if (!isActive) return;
        void clearPendingPayment();
    }, [isActive, clearPendingPayment]);

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
                                            <Text style={styles.ctaIcon}>💳</Text>
                                            <Text style={styles.ctaText}>
                                                {selectedPlan && selectedPlan.price > 0
                                                    ? `Thanh toán · ${new Intl.NumberFormat('vi-VN').format(selectedPlan.price)}đ`
                                                    : 'Chọn gói Premium'}
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
                                <ActivityIndicator color="#FCA5A5" />
                            ) : (
                                <Text style={styles.cancelBtnText}>Hủy gói cước</Text>
                            )}
                        </Pressable>
                    )}

                    {!isActive && inAppPayment && (
                        <View style={styles.inAppPayCard}>
                            <View style={styles.inAppPayHeaderRow}>
                                <Text style={styles.inAppPayTitle}>{t('premium.inAppTitle', 'Thanh toán trong app')}</Text>
                                <Text style={styles.inAppPayBadge}>
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
                            <Text style={styles.inAppPayMeta}>{inAppPayment.referenceCode || 'Đang cập nhật'}</Text>

                            <Text style={styles.inAppPayMeta}>{t('premium.orderCodePrefix', 'Mã đơn hàng:')} {inAppPayment.orderCode}</Text>
                            <Text style={styles.inAppPayMeta}>{t('premium.autoActivateHint', 'Sau khi chuyển khoản thành công, hệ thống sẽ tự kích hoạt Premium.')}</Text>

                            <Pressable
                                disabled={openingBrowser || !inAppPayment.checkoutUrl}
                                onPress={async () => {
                                    try {
                                        await openCheckoutInBrowser(inAppPayment.checkoutUrl);
                                    } catch (e: any) {
                                        Alert.alert('Lỗi', e?.message || 'Không thể mở browser checkout');
                                    }
                                }}
                                style={({ pressed }) => [styles.fallbackBtn, pressed && { opacity: 0.9 }]}
                            >
                                <Text style={styles.fallbackBtnText}>
                                    {openingBrowser ? 'Đang mở browser...' : t('premium.openBrowser', 'Open Browser')}
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
                                    <ActivityIndicator color="#FCA5A5" />
                                ) : (
                                    <Text style={styles.cancelInAppOrderBtnText}>{t('premium.cancelOrder', 'Hủy đơn thanh toán này')}</Text>
                                )}
                            </Pressable>
                        </View>
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(245,158,11,0.35)',
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
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    inAppPayBadge: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    qrWrap: {
        backgroundColor: '#FFFFFF',
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
        color: 'rgba(255,255,255,0.65)',
        fontSize: 12,
        marginBottom: 6,
    },
    inAppPayCode: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    inAppPayMeta: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 12,
        marginBottom: 4,
    },
    fallbackBtn: {
        marginTop: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    fallbackBtnText: {
        color: '#FFFFFF',
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