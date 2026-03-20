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
import { useTranslation } from '../../context/LocalizationContext';

export const RegisterArtistScreen = () => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
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
                bio: bio.trim() || t('screens.registerArtist.defaultBio', 'Artist from Monu'),
            });
            Alert.alert(
                t('screens.registerArtist.successTitle', '🎉 Registration successful!'),
                t('screens.registerArtist.successMessage', 'Your artist profile is under review (1–3 days). You will receive an email notification once approved.'),
                [{ text: t('controls.ok', 'OK'), onPress: () => navigation.goBack() }],
            );
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? t('screens.registerArtist.registerFailed', 'Could not register. Please try again.'));
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
                        <Text style={styles.heroTitle}>{t('screens.registerArtist.title', 'Become an Artist')}</Text>
                        <Text style={styles.heroSub}>
                            {t('screens.registerArtist.subtitle', 'Share your music with thousands of listeners')}
                        </Text>
                    </View>
                </LinearGradient>

                {/* Form */}
                <View style={[styles.body, { paddingBottom: insets.bottom + 32 }]}>

                    {/* Stage name */}
                    <Text style={styles.fieldLabel}>{t('screens.registerArtist.stageNameLabel', 'Stage name *')}</Text>
                    <TextInput
                        style={styles.input}
                        value={stageName}
                        onChangeText={setStageName}
                        placeholder={t('screens.registerArtist.stageNamePlaceholder', 'Your stage name')}
                        placeholderTextColor={COLORS.glass35}
                        maxLength={50}
                        autoCapitalize="words"
                    />
                    <Text style={styles.charCount}>{stageName.length}/50</Text>

                    {/* Bio */}
                    <Text style={styles.fieldLabel}>{t('screens.registerArtist.bioLabel', 'Bio')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder={t('screens.registerArtist.bioPlaceholder', 'Tell us about you and your music journey...')}
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
                                {t('screens.registerArtist.acceptPrefix', 'I agree to')}{' '}
                                <Text
                                    style={styles.termsLink}
                                    onPress={() => navigation.navigate('ArtistTerms')}
                                >
                                    {t('screens.registerArtist.artistTerms', 'Artist Terms')}
                                </Text>
                                {' '}{t('screens.registerArtist.acceptSuffix', 'of Monu')}
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
                                <Text style={styles.submitText}>{t('screens.registerArtist.submit', 'Register as Artist')}</Text>
                            )}
                        </LinearGradient>
                    </Pressable>

                    {/* Info card */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>{t('screens.registerArtist.reviewProcessTitle', '📋 Review process')}</Text>
                        {[
                            t('screens.registerArtist.reviewStep1', 'Profile is reviewed within 1–3 business days'),
                            t('screens.registerArtist.reviewStep2', 'Approval notification is sent via email'),
                            t('screens.registerArtist.reviewStep3', 'After approval, you can upload songs and create albums'),
                            t('screens.registerArtist.reviewStep4', 'A Premium plan is required to activate Artist features'),
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