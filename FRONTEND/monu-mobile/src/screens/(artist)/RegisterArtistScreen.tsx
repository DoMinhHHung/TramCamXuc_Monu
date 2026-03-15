import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../../config/colors';
import { BackButton } from '../../components/BackButton';
import { apiClient } from '../../services/api';

export const RegisterArtistScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [stageName, setStageName] = useState('');
    const [bio, setBio] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const canSubmit = stageName.trim().length > 0 && termsAccepted;

    const handleRegister = async () => {
        if (!canSubmit) return;
        setLoading(true);
        try {
            await apiClient.post('/artists/register', {
                stageName: stageName.trim(),
                bio: bio.trim() || 'Artist from Monu',
            });
            Alert.alert(
                '🎉 Đăng ký thành công!',
                'Hồ sơ nghệ sĩ đang được xét duyệt (1–3 ngày). Bạn sẽ nhận thông báo qua email khi được phê duyệt.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
            );
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể đăng ký. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="light" />
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero */}
                <LinearGradient
                    colors={[COLORS.gradNavy, COLORS.bg]}
                    style={[styles.hero, { paddingTop: insets.top + 12 }]}
                >
                    <BackButton onPress={() => navigation.goBack()} />
                    <View style={styles.heroContent}>
                        <Text style={styles.heroEmoji}>🎤</Text>
                        <Text style={styles.heroTitle}>Trở thành Nghệ sĩ</Text>
                        <Text style={styles.heroSub}>
                            Chia sẻ âm nhạc của bạn với hàng nghìn người nghe
                        </Text>
                    </View>
                </LinearGradient>

                {/* Form */}
                <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>

                    {/* Stage name */}
                    <Text style={styles.fieldLabel}>Nghệ danh *</Text>
                    <TextInput
                        style={styles.input}
                        value={stageName}
                        onChangeText={setStageName}
                        placeholder="Tên nghệ danh của bạn"
                        placeholderTextColor={COLORS.glass35}
                        maxLength={50}
                        autoCapitalize="words"
                    />
                    <Text style={styles.charCount}>{stageName.length}/50</Text>

                    {/* Bio */}
                    <Text style={styles.fieldLabel}>Giới thiệu</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Kể đôi điều về bạn và hành trình âm nhạc..."
                        placeholderTextColor={COLORS.glass35}
                        multiline
                        numberOfLines={4}
                        maxLength={500}
                        textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{bio.length}/500</Text>

                    {/* Terms toggle */}
                    <View style={styles.termsRow}>
                        <Switch
                            value={termsAccepted}
                            onValueChange={setTermsAccepted}
                            trackColor={{ false: COLORS.glass15, true: COLORS.accentDim }}
                            thumbColor={termsAccepted ? COLORS.accent : COLORS.glass40}
                        />
                        <View style={styles.termsTextWrap}>
                            <Text style={styles.termsLabel}>
                                Tôi đồng ý với{' '}
                                <Text
                                    style={styles.termsLink}
                                    onPress={() => navigation.navigate('ArtistTerms')}
                                >
                                    Điều khoản dành cho Nghệ sĩ
                                </Text>
                                {' '}của Monu
                            </Text>
                        </View>
                    </View>

                    {/* Submit */}
                    <Pressable
                        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                        onPress={handleRegister}
                        disabled={!canSubmit || loading}
                    >
                        <LinearGradient
                            colors={
                                canSubmit
                                    ? [COLORS.accent, COLORS.accentAlt]
                                    : [COLORS.surfaceMid, COLORS.surfaceMid]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.submitText}>Đăng ký Nghệ sĩ</Text>
                            )}
                        </LinearGradient>
                    </Pressable>

                    {/* Info card */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>📋 Quy trình xét duyệt</Text>
                        {[
                            'Hồ sơ được xem xét trong 1–3 ngày làm việc',
                            'Thông báo phê duyệt sẽ gửi qua email',
                            'Sau khi được duyệt, bạn có thể upload nhạc và tạo album',
                            'Cần có gói Premium để kích hoạt tính năng Artist',
                        ].map((item, i) => (
                            <View key={i} style={styles.infoRow}>
                                <Text style={styles.infoDot}>•</Text>
                                <Text style={styles.infoText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.bg },

    hero: { paddingHorizontal: 24, paddingBottom: 28 },
    heroContent: { alignItems: 'center', marginTop: 20, marginBottom: 4 },
    heroEmoji: { fontSize: 52, marginBottom: 12 },
    heroTitle: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 6 },
    heroSub: { color: COLORS.glass50, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    body: { paddingHorizontal: 24, paddingTop: 20 },

    fieldLabel: {
        color: COLORS.glass40,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 18,
    },
    input: {
        backgroundColor: COLORS.glass06,
        borderWidth: 1,
        borderColor: COLORS.glass10,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: COLORS.white,
        fontSize: 15,
    },
    textArea: {
        minHeight: 100,
        paddingTop: 14,
    },
    charCount: {
        color: COLORS.glass25,
        fontSize: 11,
        textAlign: 'right',
        marginTop: 4,
    },

    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 20,
        marginBottom: 6,
        gap: 12,
    },
    termsTextWrap: { flex: 1 },
    termsLabel: {
        color: COLORS.glass70,
        fontSize: 14,
        lineHeight: 21,
    },
    termsLink: {
        color: COLORS.accent,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },

    submitBtn: { borderRadius: 999, overflow: 'hidden', marginTop: 22 },
    submitBtnDisabled: { opacity: 0.5 },
    submitGradient: {
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    submitText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

    infoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        marginTop: 22,
        borderWidth: 1,
        borderColor: COLORS.glass10,
        gap: 6,
    },
    infoTitle: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 14,
        marginBottom: 8,
    },
    infoRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    infoDot: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
    infoText: { color: COLORS.glass50, fontSize: 13, lineHeight: 19, flex: 1 },
});