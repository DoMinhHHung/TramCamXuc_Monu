import 'react-native-gesture-handler';
import { enableFreeze } from 'react-native-screens';

enableFreeze(true);

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider }        from './src/context/AuthContext';
import { HeartCacheProvider }  from './src/context/HeartCacheContext';
import { PlayerProvider }      from './src/context/PlayerContext';
import { DownloadProvider }    from './src/context/DownloadContext';
import { LocalizationProvider } from './src/context/LocalizationContext';
import { ThemeProvider }       from './src/context/ThemeContext';
import { AppNavigator }        from './src/navigation/AppNavigator';
import { queryClient } from './src/query/queryClient';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
    return (
        <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <LocalizationProvider>
                    <ThemeProvider>
                        <QueryClientProvider client={queryClient}>
                            <AuthProvider>
                              <HeartCacheProvider>
                                <PlayerProvider>
                                    <DownloadProvider>
                                        <StatusBar style="dark" />
                                        <AppNavigator />
                                    </DownloadProvider>
                                </PlayerProvider>
                              </HeartCacheProvider>
                            </AuthProvider>
                        </QueryClientProvider>
                    </ThemeProvider>
                </LocalizationProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
        </ErrorBoundary>
    );
}
