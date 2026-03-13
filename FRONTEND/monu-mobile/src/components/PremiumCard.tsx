import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../config/colors";

interface Props {
    name: string;
    price: string;
    duration: string;
    features: string[];
    onBuy: () => void;
}

export default function PremiumCard({
                                        name,
                                        price,
                                        duration,
                                        features,
                                        onBuy,
                                    }: Props) {
    const [flip] = useState(new Animated.Value(0));
    const [flipped, setFlipped] = useState(false);

    const rotate = flip.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
    });

    const frontOpacity = flip.interpolate({
        inputRange: [0, 0.5],
        outputRange: [1, 0],
    });

    const backOpacity = flip.interpolate({
        inputRange: [0.5, 1],
        outputRange: [0, 1],
    });

    const toggle = () => {
        Animated.spring(flip, {
            toValue: flipped ? 0 : 1,
            useNativeDriver: true,
            friction: 8,
        }).start();

        setFlipped(!flipped);
    };

    return (
        <Pressable onPress={toggle} style={styles.wrapper}>
            <Animated.View
                style={[
                    styles.card,
                    {
                        transform: [{ rotateY: rotate }],
                    },
                ]}
            >
                <LinearGradient
                    colors={[COLORS.premiumCardFrom, COLORS.premiumCardTo]}
                    style={styles.gradient}
                >
                    {/* FRONT */}
                    <Animated.View style={[styles.face, { opacity: frontOpacity }]}>
                        <View style={styles.glow} />

                        <Text style={styles.plan}>{name}</Text>

                        <Text style={styles.price}>{price}</Text>

                        <Text style={styles.duration}>{duration}</Text>

                        <Pressable style={styles.buyBtn} onPress={onBuy}>
                            <LinearGradient
                                colors={[COLORS.accent, COLORS.accentAlt]}
                                style={styles.buyGradient}
                            >
                                <Text style={styles.buyText}>Mua ngay</Text>
                            </LinearGradient>
                        </Pressable>

                        <Text style={styles.hint}>Nhấn để xem tính năng</Text>
                    </Animated.View>

                    {/* BACK */}
                    <Animated.View
                        style={[
                            styles.face,
                            styles.back,
                            {
                                opacity: backOpacity,
                                transform: [{ rotateY: "180deg" }],
                            },
                        ]}
                    >
                        <Text style={styles.featureTitle}>Tính năng</Text>

                        {features.map((f, i) => (
                            <Text key={i} style={styles.feature}>
                                ✓ {f}
                            </Text>
                        ))}

                        <Text style={styles.hint}>Nhấn để quay lại</Text>
                    </Animated.View>
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
        transform: [{ perspective: 1000 }],
    },

    card: {
        borderRadius: 26,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.premiumBorder,
        shadowColor: COLORS.premiumGlow,
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },

    gradient: {
        padding: 24,
        minHeight: 260,
        justifyContent: "space-between",
    },

    glow: {
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: 180,
        backgroundColor: COLORS.premiumGlowSoft,
        top: -60,
        right: -40,
    },

    face: {
        alignItems: "center",
    },

    back: {
        position: "absolute",
        width: "100%",
    },

    plan: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: "800",
    },

    price: {
        color: COLORS.white,
        fontSize: 34,
        fontWeight: "900",
        marginTop: 10,
    },

    duration: {
        color: COLORS.glass60,
        marginBottom: 20,
    },

    buyBtn: {
        width: "100%",
    },

    buyGradient: {
        paddingVertical: 14,
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
        fontWeight: "800",
        marginBottom: 10,
    },

    feature: {
        color: COLORS.glass80,
        fontSize: 14,
        marginBottom: 6,
    },

    hint: {
        marginTop: 20,
        color: COLORS.glass40,
        fontSize: 12,
    },
});