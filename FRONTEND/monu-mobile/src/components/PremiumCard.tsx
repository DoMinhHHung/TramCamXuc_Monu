import React, { useState, useRef, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors"; // giả sử bạn đã có file này

function capitalize(text: string): string {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

interface FeatureItem {
    label: string;
    display: string;
    highlight: boolean;
}

function formatFeature(key: string, value: any): FeatureItem | null {
    const featureMap: Record<string, string> = {
        no_ads: "Không quảng cáo",
        offline: "Nghe ngoại tuyến",
        download: "Tải nhạc",
        create_album: "Tạo album",
        playlist_limit: "Giới hạn playlist",
        recommendation: "Gợi ý nhạc",
        quality: "Chất lượng",
        can_become_artist: "Đăng ký nghệ sĩ",
    };

    const valueMap: Record<string, string> = {
        lossless: "Lossless",
        high: "Cao",
        medium: "Trung bình",
        low: "Thấp",
        advanced: "Nâng cao",
        basic: "Cơ bản",
    };

    const normalizedKey = key
        .replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase())
        .replace(/^_/, "");

    const label =
        featureMap[normalizedKey] ??
        capitalize(normalizedKey.replace(/_/g, " "));

    if (typeof value === "boolean") {
        return {
            label,
            display: value ? "✓" : "✗",
            highlight: value,
        };
    }

    if (typeof value === "number") {
        return {
            label,
            display: String(value),
            highlight: false,
        };
    }

    if (typeof value === "string") {
        const mappedValue = valueMap[value.toLowerCase()] ?? capitalize(value);
        return {
            label,
            display: mappedValue,
            highlight: false,
        };
    }

    return null;
}

interface PremiumCardProps {
    name: string;
    price: string;
    duration: string;
    features: Record<string, any>;
    onBuy: () => void;
    isFree?: boolean;
}

export default function PremiumCard({
                                        name,
                                        price,
                                        duration,
                                        features,
                                        onBuy,
                                        isFree = false,
                                    }: PremiumCardProps) {
    const [flipped, setFlipped] = useState<boolean>(false);

    const flipAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(-1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const shimmerDuration = useMemo(() => 1400 + Math.random() * 1200, []);

    const isFreePlan = isFree || name.toLowerCase().includes("free");

    useEffect(() => {
        // Shimmer effect loop
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: shimmerDuration,
                useNativeDriver: true,
            })
        ).start();

        // Glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 2200,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 2200,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [shimmerDuration]);

    const rotateFront = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    const rotateBack = flipAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["180deg", "360deg"],
    });

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-350, 350],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.7],
    });

    const toggleFlip = () => {
        Animated.spring(flipAnim, {
            toValue: flipped ? 0 : 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
        }).start();

        setFlipped((prev) => !prev);
    };

    const formattedFeatures = Object.entries(features)
        .map(([k, v]) => formatFeature(k, v))
        .filter((item): item is FeatureItem => item !== null);

    const rows: FeatureItem[][] = [];
    for (let i = 0; i < formattedFeatures.length; i += 2) {
        rows.push(formattedFeatures.slice(i, i + 2));
    }

    return (
        <Pressable onPress={toggleFlip} style={styles.wrapper}>
            <View style={styles.card}>
                {/* Shimmer layer */}
                <Animated.View
                    style={[
                        styles.shimmerContainer,
                        { transform: [{ translateX: shimmerTranslate }] },
                    ]}
                >
                    <LinearGradient
                        colors={["transparent", "rgba(255,255,255,0.25)", "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Front face */}
                <Animated.View
                    style={[
                        styles.face,
                        { transform: [{ perspective: 1000 }, { rotateY: rotateFront }] },
                    ]}
                    pointerEvents={flipped ? "none" : "auto"}
                >
                    <LinearGradient
                        colors={[COLORS.premiumCardFrom, COLORS.premiumCardTo]}
                        style={styles.gradient}
                    >
                        <Animated.View
                            style={[styles.glow, { opacity: glowOpacity }]}
                        />

                        <Text style={styles.plan}>{name}</Text>

                        {!isFreePlan && (
                            <>
                                <Text style={styles.price}>{price}</Text>
                                <Text style={styles.duration}>{duration}</Text>
                            </>
                        )}

                        {!isFreePlan && (
                            <Pressable style={styles.buyBtn} onPress={onBuy}>
                                <LinearGradient
                                    colors={[COLORS.accent, COLORS.accentAlt]}
                                    style={styles.buyGradient}
                                >
                                    <Text style={styles.buyText}>Mua ngay</Text>
                                </LinearGradient>
                            </Pressable>
                        )}

                        <Text style={styles.hint}>
                            {isFreePlan
                                ? "Gói hiện tại của bạn"
                                : "Nhấn để xem chi tiết tính năng"}
                        </Text>
                    </LinearGradient>
                </Animated.View>

                {/* Back face */}
                <Animated.View
                    style={[
                        styles.face,
                        styles.back,
                        { transform: [{ perspective: 1000 }, { rotateY: rotateBack }] },
                    ]}
                    pointerEvents={flipped ? "auto" : "none"}
                >
                    <LinearGradient
                        colors={[COLORS.premiumCardFrom, COLORS.premiumCardTo]}
                        style={styles.gradient}
                    >
                        <Text style={styles.featureTitle}>Tính năng</Text>

                        <View style={styles.table}>
                            {rows.map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.row}>
                                    {row.map((feature, cellIndex) => (
                                        <View
                                            key={cellIndex}
                                            style={[
                                                styles.cell,
                                                feature.highlight && styles.cellHighlight,
                                            ]}
                                        >
                                            <Text style={styles.featureLabel}>{feature.label}</Text>

                                            <Text
                                                style={[
                                                    styles.value,
                                                    feature.display === "✓" && styles.iconYes,
                                                    feature.display === "✗" && styles.iconNo,
                                                ]}
                                            >
                                                {feature.display}
                                            </Text>
                                        </View>
                                    ))}

                                    {row.length === 1 && <View style={styles.cell} />}
                                </View>
                            ))}
                        </View>

                        <Text style={styles.hint}>Nhấn để quay lại</Text>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 24,
    },
    card: {
        borderRadius: 26,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.premiumBorder,
        shadowColor: COLORS.premiumGlow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: Platform.OS === "android" ? 12 : 0,
        backgroundColor: COLORS.premiumCardFrom, // fallback
    },
    shimmerContainer: {
        ...StyleSheet.absoluteFillObject,
        width: 140,
        zIndex: 10,
        opacity: 0.6,
    },
    face: {
        backfaceVisibility: "hidden",
    },
    back: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
    gradient: {
        padding: 24,
        minHeight: 280,
        justifyContent: "center",
        alignItems: "center",
    },
    glow: {
        position: "absolute",
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: COLORS.premiumGlowSoft,
        top: -80,
        right: -60,
    },
    plan: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: "800",
    },
    price: {
        color: COLORS.white,
        fontSize: 36,
        fontWeight: "800",
        marginTop: 8,
    },
    duration: {
        color: COLORS.glass60,
        fontSize: 16,
        marginTop: 4,
        marginBottom: 24,
    },
    buyBtn: {
        width: "100%",
        marginVertical: 16,
    },
    buyGradient: {
        paddingVertical: 16,
        borderRadius: 999,
        alignItems: "center",
    },
    buyText: {
        color: COLORS.white,
        fontWeight: "800",
        fontSize: 16,
    },
    featureTitle: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 20,
    },
    table: {
        width: "100%",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    cell: {
        width: "48%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderSubtle,
    },
    cellHighlight: {
        backgroundColor: COLORS.glass06,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    featureLabel: {
        color: COLORS.glass85,
        fontSize: 14,
        flex: 1,
    },
    value: {
        fontSize: 15,
        fontWeight: "600",
        minWidth: 24,
        textAlign: "right",
    },
    iconYes: {
        color: COLORS.success,
    },
    iconNo: {
        color: COLORS.error,
    },
    hint: {
        marginTop: 16,
        color: COLORS.glass40,
        fontSize: 12,
        fontStyle: "italic",
    },
});