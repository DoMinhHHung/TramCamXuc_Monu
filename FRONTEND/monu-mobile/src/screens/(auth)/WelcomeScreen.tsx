import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { ColorScheme, useThemeColors } from '../../config/colors';
import { useTranslation } from '../../context/LocalizationContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { moderateScale, scale, SCREEN, verticalScale } from '../../utils/responsive';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

export const WelcomeScreen = () => {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const themeColors = useThemeColors();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(themeColors), [themeColors]);

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            <View style={[StyleSheet.absoluteFillObject, styles.bgMeshWrapper]}>
                <View style={styles.gradBgTopRight} />
                <View style={styles.gradBgBottomLeft} />
            </View>

            <View style={[styles.mainLayout, { paddingTop: insets.top + verticalScale(20), paddingBottom: insets.bottom + verticalScale(20) }]}>
                {/* Header Context Spacer */}
                <View style={styles.headerSpacer} />

                {/* Hero Minimalist Context */}
                <View style={styles.centerContent}>
                    <Text style={[styles.brandTitle, { textAlign: 'center' }]}>
                        Monu
                    </Text>
                    <Text style={[styles.tagline, { textAlign: 'center' }]}>
                        Kết nối mọi cung bậc qua từng giai điệu
                    </Text>
                </View>

                {/* Actions Bottom Anchored */}
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
                            <Text style={styles.primaryText}>{t('screens.welcome.registerFree', 'Tạo tài khoản')}</Text>
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
    bgMeshWrapper: { opacity: 0.6 },
    gradBgTopRight: {
        position: 'absolute',
        top: -scale(100),   // -100 to push orb out
        right: -scale(100),
        width: scale(380),
        height: scale(380),
        borderRadius: scale(190),
        backgroundColor: colors.accent + '25', // '25' gives ~15% alpha
    },
    gradBgBottomLeft: {
        position: 'absolute',
        bottom: -scale(100),
        left: -scale(100),
        width: scale(320),
        height: scale(320),
        borderRadius: scale(160),
        backgroundColor: colors.gradPurple + '20',
    },
    mainLayout: { flex: 1, paddingHorizontal: scale(24), justifyContent: 'space-between' },
    headerSpacer: { flex: 0.2 },
    centerContent: { flex: 1, justifyContent: 'center' },
    brandTitle: {
        fontSize: moderateScale(48),
        fontWeight: '900',
        color: colors.white,
        letterSpacing: -1,
        marginBottom: verticalScale(12),
    },
    tagline: {
        fontSize: moderateScale(16),
        color: colors.glass65,
        fontWeight: '500',
    },
    actionsBox: { width: '100%' },
    primaryBtn: { borderRadius: 999, overflow: 'hidden', marginBottom: verticalScale(16) },
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
        color: colors.glass40,
        fontSize: moderateScale(11),
        textAlign: 'center',
        marginTop: verticalScale(24),
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
});
