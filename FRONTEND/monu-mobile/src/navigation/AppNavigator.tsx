import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { COLORS } from '../config/colors';
import { useAuth } from '../context/AuthContext';
import { MiniPlayer } from '../components/MiniPlayer';
import { FullPlayerModal } from '../components/FullPlayerModal';
import { HomeScreen } from '../screens/HomeScreen';
import { WelcomeScreen } from '../screens/(auth)/WelcomeScreen';
import { LoginOptionsScreen } from '../screens/(auth)/LoginOptionsScreen';
import { RegisterOptionsScreen } from '../screens/(auth)/RegisterOptionsScreen';
import { LoginScreen } from '../screens/(auth)/LoginScreen';
import RegisterScreen from '../screens/(auth)/RegisterScreen';
import VerifyOtpScreen from '../screens/(auth)/VerifyOtpScreen';
import ForgotPasswordScreen from '../screens/(auth)/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/(auth)/ResetPasswordScreen';
import { SelectGenresScreen } from '../screens/(onBoard)/SelectGenresScreen';
import { SelectArtistsScreen } from '../screens/(onBoard)/SelectArtistsScreen';
import { CreateScreen } from '../screens/(tabs)/CreateScreen';
import { LibraryScreen } from '../screens/(tabs)/LibraryScreen';
import { PremiumScreen } from '../screens/(tabs)/PremiumScreen';
import { ProfileScreen } from '../screens/(tabs)/ProfileScreen';
import { SearchScreen } from '../screens/(tabs)/SearchScreen';
import { DiscoverScreen } from '../screens/(tabs)/DiscoverScreen';
import { EditFavoritesScreen } from '../screens/(settings)/EditFavoritesScreen';
import { PlaylistDetailScreen } from '../screens/PlaylistDetailScreen';

export type RootStackParamList = {
    Welcome: undefined;
    LoginOptions: undefined;
    RegisterOptions: undefined;
    Login: undefined;
    Register: undefined;
    VerifyOtp: { email: string };
    ForgotPassword: undefined;
    ResetPassword: { email: string };
    SelectGenres: undefined;
    SelectArtists: { selectedGenreIds: string[] };
    MainTabs: undefined;
    EditFavorites: undefined;
    Profile: undefined;
    Search: undefined;
    PlaylistDetail: { slug: string };
};

export type MainTabParamList = {
    Home: undefined;
    Discover: undefined;
    Create: undefined;
    Library: undefined;
    Premium: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

const tabMeta: Record<keyof MainTabParamList, { label: string; icon: string }> = {
    Home:     { label: 'Trang chủ', icon: 'home' },
    Discover: { label: 'Khám phá',  icon: 'explore' },
    Create:   { label: 'Tạo',       icon: 'add' },
    Library:  { label: 'Thư viện',  icon: 'library-music' },
    Premium:  { label: 'Premium',   icon: 'redeem' },
};

const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ['monumobile://'],
    config: { screens: { MainTabs: 'home' } },
};

const MainTabNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }: any) => {
            const meta     = tabMeta[route.name as keyof MainTabParamList];
            const isCreate = route.name === 'Create';
            return {
                headerShown: false,
                tabBarLabel: meta.label,
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.border,
                    height: 78,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor:   COLORS.text,
                tabBarInactiveTintColor: COLORS.muted,
                tabBarIcon: ({ color }: { color: string }) => (
                    <View style={[styles.tabIconWrap, isCreate && styles.createIconWrap]}>
                        <MaterialIcons
                            name={meta.icon as any}
                            size={isCreate ? 20 : 18}
                            color={isCreate ? COLORS.white : color}
                        />
                    </View>
                ),
            };
        }}
    >
        <Tab.Screen name="Home"     component={HomeScreen} />
        <Tab.Screen name="Discover" component={DiscoverScreen} />
        <Tab.Screen name="Create"   component={CreateScreen} />
        <Tab.Screen name="Library"  component={LibraryScreen} />
        <Tab.Screen name="Premium"  component={PremiumScreen} />
    </Tab.Navigator>
);

export const AppNavigator = () => {
    const { authSession, isInitializing } = useAuth();

    if (isInitializing) {
        return (
            <View style={styles.splashContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    const needsOnboarding = authSession?.profile && !authSession.profile.pickFavorite;

    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
                {authSession ? (
                    needsOnboarding ? (
                        <>
                            <Stack.Screen name="SelectGenres"  component={SelectGenresScreen} />
                            <Stack.Screen name="SelectArtists" component={SelectArtistsScreen} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="MainTabs"      component={MainTabNavigator} />
                            <Stack.Screen name="Search"        component={SearchScreen} />
                            <Stack.Screen name="EditFavorites" component={EditFavoritesScreen} />
                            <Stack.Screen name="Profile"       component={ProfileScreen} />
                            <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
                        </>
                    )
                ) : (
                    <>
                        <Stack.Screen name="Welcome"         component={WelcomeScreen} />
                        <Stack.Screen name="RegisterOptions" component={RegisterOptionsScreen} />
                        <Stack.Screen name="LoginOptions"    component={LoginOptionsScreen} />
                        <Stack.Screen name="Login"           component={LoginScreen} />
                        <Stack.Screen name="Register"        component={RegisterScreen} />
                        <Stack.Screen name="VerifyOtp"       component={VerifyOtpScreen} />
                        <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
                        <Stack.Screen name="ResetPassword"   component={ResetPasswordScreen} />
                    </>
                )}
            </Stack.Navigator>

            {authSession && !needsOnboarding && (
                <>
                    <MiniPlayer />
                    <FullPlayerModal />
                </>
            )}
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    splashContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
    tabIconWrap:    { alignItems: 'center', justifyContent: 'center' },
    createIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accentDim },
});