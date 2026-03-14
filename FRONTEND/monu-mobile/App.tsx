import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider }     from './src/context/AuthContext';
import { PlayerProvider }   from './src/context/PlayerContext';
import { DownloadProvider } from './src/context/DownloadContext';
import { AppNavigator }     from './src/navigation/AppNavigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <PlayerProvider>
                    <DownloadProvider>
                        <StatusBar style="dark" />
                        <AppNavigator />
                    </DownloadProvider>
                </PlayerProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}