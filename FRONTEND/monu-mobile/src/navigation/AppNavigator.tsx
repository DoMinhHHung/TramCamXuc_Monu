import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { NavigationContainer, LinkingOptions, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { COLORS } from '../config/colors';
import { MAIN_TAB_BAR_BASE_HEIGHT, MINI_PLAYER_HEIGHT } from '../config/design';
import { AppIcon, AppIconName } from '../config/appIcons';
import { useAuth } from '../context/AuthContext';
import { usePlayerState } from '../context/PlayerContext';
import { UploadProvider } from '../context/UploadContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LocalizationContext';
import { useLibraryData } from '../hooks/useLibraryData';
import { useThemeColors } from '../config/colors';

import { MiniPlayer } from '../components/MiniPlayer';
import { FullPlayerModal } from '../components/FullPlayerModal';
import { UploadProgressBanner } from '../components/UploadProgressBanner';
import { AdPlayerModal } from '../components/AdPlayerModal';
import { AdNoticeBanner } from '../components/AdNoticeBanner';
import { StreamingStatusBanner } from '../components/StreamingStatusBanner';


import { HomeScreen } from '../screens/HomeScreen';
import { WelcomeScreen } from '../screens/(auth)/WelcomeScreen';
import { SelectGenresScreen } from '../screens/(onBoard)/SelectGenresScreen';
import { SelectArtistsScreen } from '../screens/(onBoard)/SelectArtistsScreen';

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
    History: undefined;
    Settings: undefined;
    PersonalSettings: undefined;
    SystemSettings: undefined;
    AccountSettings: undefined;
    EditProfile: undefined;
    UpdateAvatar: undefined;
    DeleteAccount: undefined;
    Insights: undefined;
    Profile: undefined;
    Search: { initialQuery?: string } | undefined;
    PlaylistDetail: { slug: string };
    AlbumDetail: { albumId: string };
    GenreDetail: { genreId: string; genreName: string };
    MyPosts: undefined;
    ContentManagement: undefined;
    // Artist
    ArtistProfile: { artistId: string };
    RegisterArtist: undefined;
    ArtistTerms: undefined;
    FavoriteSongs: undefined;
    Following: undefined;
    Followers: { artistId: string; artistName?: string };
    FollowedArtists: undefined;
    ArtistDiscovery: undefined;
    AlbumAddSong: { albumId: string };
    EditSong: { songId: string };
    TrendingChart: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Discover: undefined;
    Create: undefined;
    Library: undefined;
    Premium: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabMeta: Record<keyof MainTabParamList, { label: string; icon: AppIconName }> = {
    Home: { label: 'Trang chủ', icon: 'home' },
    Discover: { label: 'Khám phá', icon: 'discover' },
    Create: { label: 'Tạo', icon: 'create' },
    Library: { label: 'Thư viện', icon: 'library' },
    Premium: { label: 'TramCamXuc Plus', icon: 'premium' },
};

const linking: LinkingOptions<any> = {
    prefixes: ['monumobile://'],
    config: { screens: { MainTabs: 'home' } },
};

const MAIN_TAB_LEAF_ROUTE_NAMES = new Set<string>(['Home', 'Discover', 'Create', 'Library', 'Premium']);

const MainTabNavigator = () => {
    const insets = useSafeAreaInsets();
    const { prefetch: prefetchLibrary } = useLibraryData();
    const tabBarHeight = MAIN_TAB_BAR_BASE_HEIGHT + insets.bottom;
    const themeColors = useThemeColors();

    return (
        <Tab.Navigator
            screenOptions={({ route }: any) => {
                const meta = tabMeta[route.name as keyof MainTabParamList];
                return {
                    lazy: true,
                    headerShown: false,
                    tabBarLabel: meta.label,
                    tabBarStyle: {
                        position: 'absolute',
                        left: 16,
                        width: '90%',
                        bottom: 24,
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                        borderRadius: 30,
                        height: 85,
                        paddingBottom: Math.max(10, insets.bottom > 0 ? insets.bottom - 2 : 10),
                        paddingTop: 10,
                        ...styles.tabBarShadow,
                    },
                    tabBarBackground: () => (
                        <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: 30, overflow: 'hidden' }}>
                            <View
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(20, 20, 25, 0.9)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.12)',
                                    borderRadius: 30,
                                }}
                            />
                        </View>
                    ),
                    tabBarActiveTintColor: themeColors.accent,
                    tabBarInactiveTintColor: themeColors.glass45,
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: '700',
                        marginTop: 2,
                    },
                    tabBarIcon: ({ color }: { color: string; focused: boolean }) => (
                        <View style={styles.tabIconWrap}>
                            <AppIcon name={meta.icon} size={20} color={color} />
                        </View>
                    ),
                };
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Discover" getComponent={() => require('../screens/(tabs)/DiscoverScreen').DiscoverScreen} />
            <Tab.Screen name="Create" getComponent={() => require('../screens/(tabs)/CreateScreen').CreateScreen} />
            <Tab.Screen
                name="Library"
                getComponent={() => require('../screens/(tabs)/LibraryScreen').LibraryScreen}
                options={{
                    tabBarButton: (props: React.ComponentProps<typeof Pressable>) => (
                        <Pressable
                            {...props}
                            onPress={(event) => {
                                void prefetchLibrary();
                                props.onPress?.(event);
                            }}
                        />
                    ),
                }}
            />
            <Tab.Screen name="Premium" getComponent={() => require('../screens/(tabs)/PremiumScreen').PremiumScreen} />
        </Tab.Navigator>
    );
};

const GlobalOverlays = ({ routeName }: { routeName: string | null }) => {
    const insets = useSafeAreaInsets();
    const { pendingAd, dismissAd, currentSong, adNotice, setChromeBottomInset } = usePlayerState();
    const overMainTabLeaf = routeName != null && MAIN_TAB_LEAF_ROUTE_NAMES.has(routeName);
    const miniPlayerBottomInset = overMainTabLeaf
        ? MAIN_TAB_BAR_BASE_HEIGHT + insets.bottom
        : Math.max(insets.bottom, 8) + 8;

    useEffect(() => {
        setChromeBottomInset(
            currentSong ? miniPlayerBottomInset + MINI_PLAYER_HEIGHT + 12 : 0,
        );
    }, [currentSong, miniPlayerBottomInset, setChromeBottomInset]);

    useEffect(() => () => setChromeBottomInset(0), [setChromeBottomInset]);

    const allowAdNotice = routeName != null && (
        routeName === 'MainTabs'
        || MAIN_TAB_LEAF_ROUTE_NAMES.has(routeName)
        || routeName === 'Search'
        || routeName === 'PlaylistDetail'
        || routeName === 'AlbumDetail'
        || routeName === 'GenreDetail'
        || routeName === 'Insights'
        || routeName === 'Profile'
    );
    return (
        <>
            <AdNoticeBanner notice={adNotice} enabled={allowAdNotice} />
            <StreamingStatusBanner />
            <MiniPlayer bottomInset={miniPlayerBottomInset} />
            <UploadProgressBanner />
            <FullPlayerModal />
            <AdPlayerModal ad={pendingAd} songId={currentSong?.id} onFinished={dismissAd} />
        </>
    );
};

export const AppNavigator = () => {
    const { authSession, isInitializing } = useAuth();
    const { theme, followSystem } = useTheme();
    const { language } = useTranslation();
    const navigationRef = useNavigationContainerRef();
    const [routeName, setRouteName] = React.useState<string | null>(null);

    if (isInitializing) {
        return (
            <View style={styles.splashContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    const needsOnboarding =
        authSession?.profile && !authSession.profile.pickFavorite;
    const uiSyncKey = `${language}:${theme}:${followSystem ? 'system' : 'fixed'}`;

    return (
        <UploadProvider>
            <NavigationContainer
                ref={navigationRef}
                key={uiSyncKey}
                linking={linking}
                onReady={() => setRouteName(navigationRef.getCurrentRoute()?.name ?? null)}
                onStateChange={() => setRouteName(navigationRef.getCurrentRoute()?.name ?? null)}
            >
                <Stack.Navigator
                    initialRouteName="Welcome"
                    screenOptions={{ headerShown: false, animation: 'slide_from_right', freezeOnBlur: true }}
                >
                    {authSession ? (
                        needsOnboarding ? (
                            <>
                                <Stack.Screen name="SelectGenres" component={SelectGenresScreen} />
                                <Stack.Screen name="SelectArtists" component={SelectArtistsScreen} />
                            </>
                        ) : (
                            <>
                                <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                                <Stack.Screen name="Search" getComponent={() => require('../screens/(tabs)/SearchScreen').SearchScreen} />
                                <Stack.Screen name="EditFavorites" getComponent={() => require('../screens/(settings)/EditFavoritesScreen').EditFavoritesScreen} />
                                <Stack.Screen name="History" getComponent={() => require('../screens/(settings)/HistoryScreen').HistoryScreen} />
                                <Stack.Screen name="Settings" getComponent={() => require('../screens/SettingsScreen').SettingsScreen} />
                                <Stack.Screen name="PersonalSettings" getComponent={() => require('../screens/(settings)/PersonalSettingsScreen').PersonalSettingsScreen} />
                                <Stack.Screen name="SystemSettings" getComponent={() => require('../screens/(settings)/SystemSettingsScreen').SystemSettingsScreen} />
                                <Stack.Screen name="AccountSettings" getComponent={() => require('../screens/(settings)/AccountSettingsScreen').AccountSettingsScreen} />
                                <Stack.Screen name="EditProfile" getComponent={() => require('../screens/(settings)/EditProfileScreen').EditProfileScreen} />
                                <Stack.Screen name="UpdateAvatar" getComponent={() => require('../screens/(settings)/UpdateAvatarScreen').UpdateAvatarScreen} />
                                <Stack.Screen name="DeleteAccount" getComponent={() => require('../screens/(settings)/DeleteAccountScreen').DeleteAccountScreen} />
                                <Stack.Screen name="Insights" getComponent={() => require('../screens/InsightsScreen').InsightsScreen} />
                                <Stack.Screen name="Profile" getComponent={() => require('../screens/(tabs)/ProfileScreen').ProfileScreen} />
                                <Stack.Screen name="PlaylistDetail" getComponent={() => require('../screens/PlaylistDetailScreen').PlaylistDetailScreen} />
                                <Stack.Screen name="AlbumDetail" getComponent={() => require('../screens/AlbumDetailScreen').AlbumDetailScreen} />
                                <Stack.Screen name="GenreDetail" getComponent={() => require('../screens/GenreDetailScreen').GenreDetailScreen} />
                                <Stack.Screen name="MyPosts" getComponent={() => require('../screens/MyPostsScreen').MyPostsScreen} />
                                <Stack.Screen name="ContentManagement" getComponent={() => require('../screens/(settings)/ContentManagementScreen').ContentManagementScreen} />
                                <Stack.Screen name="ArtistProfile" getComponent={() => require('../screens/(artist)/ArtistProfileScreen').ArtistProfileScreen} />
                                <Stack.Screen name="RegisterArtist" getComponent={() => require('../screens/(artist)/RegisterArtistScreen').RegisterArtistScreen} />
                                <Stack.Screen name="ArtistTerms" getComponent={() => require('../screens/(artist)/ArtistTermsScreen').ArtistTermsScreen} />
                                <Stack.Screen name="FavoriteSongs" getComponent={() => require('../screens/(artist)/FavoriteSongsScreen').FavoriteSongsScreen} />
                                <Stack.Screen name="Following" getComponent={() => require('../screens/(artist)/FollowedArtistsScreen').FollowingScreen} />
                                <Stack.Screen name="Followers" getComponent={() => require('../screens/(artist)/FollowersScreen').FollowersScreen} />
                                <Stack.Screen name="FollowedArtists" getComponent={() => require('../screens/(artist)/FollowedArtistsScreen').FollowedArtistsScreen} />
                                <Stack.Screen name="ArtistDiscovery" getComponent={() => require('../screens/(artist)/ArtistDiscoveryScreen').ArtistDiscoveryScreen} />
                                <Stack.Screen name="AlbumAddSong" getComponent={() => require('../screens/(artist)/AlbumAddSongScreen').AlbumAddSongScreen} />
                                <Stack.Screen name="EditSong" getComponent={() => require('../screens/EditSongScreen').EditSongScreen} />
                                <Stack.Screen name="TrendingChart" getComponent={() => require('../screens/TrendingScreen').TrendingScreen} />
                            </>
                        )
                    ) : (
                        <>
                            <Stack.Screen name="Welcome" component={WelcomeScreen} />
                            <Stack.Screen name="RegisterOptions" getComponent={() => require('../screens/(auth)/RegisterOptionsScreen').RegisterOptionsScreen} />
                            <Stack.Screen name="LoginOptions" getComponent={() => require('../screens/(auth)/LoginOptionsScreen').LoginOptionsScreen} />
                            <Stack.Screen name="Login" getComponent={() => require('../screens/(auth)/LoginScreen').LoginScreen} />
                            <Stack.Screen name="Register" getComponent={() => require('../screens/(auth)/RegisterScreen').default} />
                            <Stack.Screen name="VerifyOtp" getComponent={() => require('../screens/(auth)/VerifyOtpScreen').default} />
                            <Stack.Screen name="ForgotPassword" getComponent={() => require('../screens/(auth)/ForgotPasswordScreen').default} />
                            <Stack.Screen name="ResetPassword" getComponent={() => require('../screens/(auth)/ResetPasswordScreen').default} />
                        </>
                    )}
                </Stack.Navigator>
                {authSession && !needsOnboarding && <GlobalOverlays routeName={routeName} />}
            </NavigationContainer>
        </UploadProvider>
    );
};

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.bg,
    },
    tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
    tabBarShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 18,
    },

});
