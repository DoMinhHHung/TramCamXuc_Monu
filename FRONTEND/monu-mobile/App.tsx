import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider }        from './src/context/AuthContext';
import { HeartCacheProvider }  from './src/context/HeartCacheContext';
import { PlayerProvider }      from './src/context/PlayerContext';
import { DownloadProvider }    from './src/context/DownloadContext';
import { LocalizationProvider } from './src/context/LocalizationContext';
import { ThemeProvider }       from './src/context/ThemeContext';
import { AppNavigator }        from './src/navigation/AppNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <LocalizationProvider>
                <ThemeProvider>
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
                </ThemeProvider>
            </LocalizationProvider>
        </SafeAreaProvider>
    );
}
