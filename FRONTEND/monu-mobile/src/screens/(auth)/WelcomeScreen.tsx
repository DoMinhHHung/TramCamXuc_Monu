import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

const FEATURE_CHIPS = [
  { emoji: '🎵', label: 'Nhạc theo cảm xúc' },
  { emoji: '🤖', label: 'AI sáng tác' },
  { emoji: '👥', label: 'Cộng đồng' },
];

export const WelcomeScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    // Animated breathing orbs
    const orbScale1 = useRef(new Animated.Value(1)).current;
    const orbScale2 = useRef(new Animated.Value(1)).current;
    const orbOpacity = useRef(new Animated.Value(0.5)).current;
    const titleSlide = useRef(new Animated.Value(30)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.timing(titleSlide, { toValue: 0, duration: 700, useNativeDriver: true }),
            Animated.timing(titleOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]).start();

        // Ambient orb pulse
        const pulse1 = Animated.loop(
            Animated.sequence([
                Animated.timing(orbScale1, { toValue: 1.15, duration: 3000, useNativeDriver: true }),
                Animated.timing(orbScale1, { toValue: 1, duration: 3000, useNativeDriver: true }),
            ])
        );
        const pulse2 = Animated.loop(
            Animated.sequence([
                Animated.delay(1500),
                Animated.timing(orbScale2, { toValue: 1.2, duration: 3200, useNativeDriver: true }),
                Animated.timing(orbScale2, { toValue: 0.9, duration: 3200, useNativeDriver: true }),
            ])
        );
        const opacityPulse = Animated.loop(
            Animated.sequence([
                Animated.timing(orbOpacity, { toValue: 0.7, duration: 2500, useNativeDriver: true }),
                Animated.timing(orbOpacity, { toValue: 0.35, duration: 2500, useNativeDriver: true }),
            ])
        );
        pulse1.start();
        pulse2.start();
        opacityPulse.start();
        return () => {
            pulse1.stop();
            pulse2.stop();
            opacityPulse.stop();
        };
    }, []);

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* Animated ambient orbs */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Animated.View style={[
                    styles.orbTopRight,
                    { transform: [{ scale: orbScale1 }], opacity: orbOpacity },
                ]} />
                <Animated.View style={[
                    styles.orbBottomLeft,
                    { transform: [{ scale: orbScale2 }], opacity: orbOpacity },
                ]} />
                <Animated.View style={[
                    styles.orbCenter,
                    { transform: [{ scale: orbScale1 }], opacity: Animated.multiply(orbOpacity, 0.4) },
                ]} />
            </View>

            <View style={[styles.mainLayout, { paddingTop: insets.top + verticalScale(20), paddingBottom: insets.bottom + verticalScale(20) }]}>
                <View style={styles.headerSpacer} />

                {/* Hero content */}
                <Animated.View style={[
                    styles.centerContent,
                    { transform: [{ translateY: titleSlide }], opacity: titleOpacity },
                ]}>
                    <Image
                        source={require('../../../assets/faviconpng-removebg.png')}
                        style={styles.brandLogo}
                        resizeMode="contain"
                    />
                    
                </Animated.View>

                {/* Actions */}
                <View style={styles.actionsBox}>
                    <Pressable
                        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                        onPress={() => navigation.navigate('RegisterOptions')}
                    >
                        <LinearGradient
                            colors={[themeColors.accent, themeColors.accentAlt]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.primaryText}>{t('screens.welcome.registerFree', 'Tạo tài khoản miễn phí')}</Text>
                        </LinearGradient>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.secondaryBtn, pressed && { backgroundColor: themeColors.surfaceMid }]}
                        onPress={() => navigation.navigate('LoginOptions')}
                    >
                        <Text style={styles.secondaryText}>{t('screens.welcome.haveAccount', 'Đăng nhập')}</Text>
                    </Pressable>

                    <Text style={styles.legalNote}>
                        Bằng cách tiếp tục, bạn đồng ý với Điều khoản sử dụng của chúng tôi
                    </Text>
                </View>
            </View>
        </View>
    );
};

const createStyles = (colors: ColorScheme) => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    orbTopRight: {
        position: 'absolute',
        top: -scale(80),
        right: -scale(80),
        width: scale(360),
        height: scale(360),
        borderRadius: scale(180),
        backgroundColor: colors.accent + '30',
    },
    orbBottomLeft: {
        position: 'absolute',
        bottom: -scale(100),
        left: -scale(80),
        width: scale(300),
        height: scale(300),
        borderRadius: scale(150),
        backgroundColor: colors.gradPurple + '25',
    },
    orbCenter: {
        position: 'absolute',
        top: '35%',
        alignSelf: 'center',
        width: scale(200),
        height: scale(200),
        borderRadius: scale(100),
        backgroundColor: colors.accentAlt + '15',
    },
    mainLayout: { flex: 1, paddingHorizontal: scale(24), justifyContent: 'space-between' },
    headerSpacer: { flex: 0.15 },
    centerContent: { flex: 1, justifyContent: 'center' },
    brandLogo: {
        width: scale(140),
        height: scale(140),
        alignSelf: 'center',
        marginBottom: verticalScale(14),
    },
    tagline: {
        fontSize: moderateScale(20),
        color: colors.glass75,
        fontWeight: '600',
        lineHeight: moderateScale(28),
        marginBottom: verticalScale(32),
    },
    chipsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: scale(10),
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glass08,
        borderWidth: 1,
        borderColor: colors.glass15,
        borderRadius: 999,
        paddingHorizontal: scale(12),
        paddingVertical: scale(7),
        gap: scale(5),
    },
    chipEmoji: { fontSize: moderateScale(14) },
    chipLabel: {
        color: colors.glass75,
        fontSize: moderateScale(12),
        fontWeight: '600',
    },
    actionsBox: { width: '100%' },
    primaryBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: verticalScale(14) },
    btnGradient: { minHeight: verticalScale(56), alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: colors.white, fontSize: moderateScale(17), fontWeight: '800' },
    secondaryBtn: {
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: colors.glass10,
        backgroundColor: colors.glass04,
        minHeight: verticalScale(56),
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryText: { color: colors.white, fontSize: moderateScale(17), fontWeight: '700' },
    legalNote: {
        color: colors.glass35,
        fontSize: moderateScale(10),
        textAlign: 'center',
        marginTop: verticalScale(20),
        letterSpacing: 0.5,
    },
});
