import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { HeartCacheProvider } from '../src/context/HeartCacheContext';
import { PlayerProvider, usePlayer } from '../src/context/PlayerContext';
import { DownloadProvider } from '../src/context/DownloadContext';
import { LocalizationProvider, useTranslation } from '../src/context/LocalizationContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { UploadProvider } from '../src/context/UploadContext';

import { MiniPlayer } from '../src/components/MiniPlayer';
import { FullPlayerModal } from '../src/components/FullPlayerModal';
import { UploadProgressBanner } from '../src/components/UploadProgressBanner';
import { AdPlayerModal } from '../src/components/AdPlayerModal';
import { AdNoticeBanner } from '../src/components/AdNoticeBanner';
import { StreamingStatusBanner } from '../src/components/StreamingStatusBanner';
import { useThemeColors } from '../src/config/colors';

const GlobalOverlays = () => {
  const { pendingAd, dismissAd, currentSong, adNotice } = usePlayer();

  return (
    <>
      <AdNoticeBanner notice={adNotice} />
      <StreamingStatusBanner />
      <MiniPlayer />
      <UploadProgressBanner />
      <FullPlayerModal />
      <AdPlayerModal ad={pendingAd} songId={currentSong?.id} onFinished={dismissAd} />
    </>
  );
};

const RootNavigator = () => {
  const segments = useSegments();
  const { authSession, isInitializing } = useAuth();
  const { theme, followSystem } = useTheme();
  const { language } = useTranslation();
  const colors = useThemeColors();

  if (isInitializing) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.bg }]}> 
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const needsOnboarding = !!authSession?.profile && !authSession.profile.pickFavorite;
  const inAuth = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';

  if (!authSession && !inAuth) {
    return <Redirect href="/(auth)/Welcome" />;
  }

  if (authSession && needsOnboarding && !inOnboarding) {
    return <Redirect href="/(onboarding)/SelectGenres" />;
  }

  if (authSession && !needsOnboarding && (inAuth || inOnboarding)) {
    return <Redirect href="/(tabs)/Home" />;
  }

  const uiSyncKey = `${language}:${theme}:${followSystem ? 'system' : 'fixed'}`;

  return (
    <>
      <Stack key={uiSyncKey} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {authSession && !needsOnboarding && <GlobalOverlays />}
    </>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LocalizationProvider>
        <ThemeProvider>
          <AuthProvider>
            <HeartCacheProvider>
              <PlayerProvider>
                <DownloadProvider>
                  <UploadProvider>
                    <RootNavigator />
                  </UploadProvider>
                </DownloadProvider>
              </PlayerProvider>
            </HeartCacheProvider>
          </AuthProvider>
        </ThemeProvider>
      </LocalizationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
