import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppIcon, APP_ICONS } from '../components/IconComponent';

import { COLORS }                 from '../config/colors';
import { useAuth }                from '../context/AuthContext';
import { usePlayer }              from '../context/PlayerContext';
import { UploadProvider }         from '../context/UploadContext';

import { MiniPlayer }             from '../components/MiniPlayer';
import { FullPlayerModal }        from '../components/FullPlayerModal';
import { UploadProgressBanner }   from '../components/UploadProgressBanner';
import { AdPlayerModal }          from '../components/AdPlayerModal';

import { HomeScreen }             from '../screens/HomeScreen';
import { WelcomeScreen }          from '../screens/(auth)/WelcomeScreen';
import { LoginOptionsScreen }     from '../screens/(auth)/LoginOptionsScreen';
import { RegisterOptionsScreen }  from '../screens/(auth)/RegisterOptionsScreen';
import { LoginScreen }            from '../screens/(auth)/LoginScreen';
import RegisterScreen             from '../screens/(auth)/RegisterScreen';
import VerifyOtpScreen            from '../screens/(auth)/VerifyOtpScreen';
import ForgotPasswordScreen       from '../screens/(auth)/ForgotPasswordScreen';
import ResetPasswordScreen        from '../screens/(auth)/ResetPasswordScreen';
import { SelectGenresScreen }     from '../screens/(onBoard)/SelectGenresScreen';
import { SelectArtistsScreen }    from '../screens/(onBoard)/SelectArtistsScreen';
import { CreateScreen }           from '../screens/(tabs)/CreateScreen';
import { LibraryScreen }          from '../screens/(tabs)/LibraryScreen';
import { PremiumScreen }          from '../screens/(tabs)/PremiumScreen';
import { ProfileScreen }          from '../screens/(tabs)/ProfileScreen';
import { SearchScreen }           from '../screens/(tabs)/SearchScreen';
import { DiscoverScreen }         from '../screens/(tabs)/DiscoverScreen';
import { EditFavoritesScreen }    from '../screens/(settings)/EditFavoritesScreen';
import { PlaylistDetailScreen }   from '../screens/PlaylistDetailScreen';
import { AlbumDetailScreen }      from '../screens/AlbumDetailScreen';

// ─── Artist screens ───────────────────────────────────────────────────────────
import { ArtistProfileScreen }    from '../screens/(artist)/ArtistProfileScreen';
import { RegisterArtistScreen }   from '../screens/(artist)/RegisterArtistScreen';
import { ArtistTermsScreen }      from '../screens/(artist)/ArtistTermsScreen';
import { FavoriteSongsScreen }    from '../screens/(artist)/FavoriteSongsScreen';
import { FollowedArtistsScreen }  from '../screens/(artist)/FollowedArtistsScreen';
import { AlbumAddSongScreen }     from '../screens/(artist)/AlbumAddSongScreen';

export type RootStackParamList = {
    Welcome:         undefined;
    LoginOptions:    undefined;
    RegisterOptions: undefined;
    Login:           undefined;
    Register:        undefined;
    VerifyOtp:       { email: string };
    ForgotPassword:  undefined;
    ResetPassword:   { email: string };
    SelectGenres:    undefined;
    SelectArtists:   { selectedGenreIds: string[] };
    MainTabs:        undefined;
    EditFavorites:   undefined;
    Profile:         undefined;
    Search:          undefined;
    PlaylistDetail:  { slug: string };
    AlbumDetail:     { albumId: string };
    // Artist
    ArtistProfile:   { artistId: string };
    RegisterArtist:  undefined;
    ArtistTerms:     undefined;
    FavoriteSongs:   undefined;
    FollowedArtists: undefined;
    AlbumAddSong:    { albumId: string };
};

export type MainTabParamList = {
    Home:     undefined;
    Discover: undefined;
    Create:   undefined;
    Library:  undefined;
    Premium:  undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

const tabMeta: Record<keyof MainTabParamList, { label: string; icon: keyof typeof APP_ICONS.tab }> = {
    Home:     { label: 'Trang chủ', icon: 'home' },
    Discover: { label: 'Khám phá',  icon: 'discover' },
    Create:   { label: 'Tạo',       icon: 'create' },
    Library:  { label: 'Thư viện',  icon: 'library' },
    Premium:  { label: 'Premium',   icon: 'premium' },
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
                    borderTopColor:  COLORS.border,
                    height:      78,
                    paddingBottom: 8,
                    paddingTop:    8,
                },
                tabBarActiveTintColor:   COLORS.text,
                tabBarInactiveTintColor: COLORS.muted,
                tabBarIcon: ({ color }: { color: string }) => (
                    <View style={[styles.tabIconWrap, isCreate && styles.createIconWrap]}>
                        <AppIcon
                            name={APP_ICONS.tab[meta.icon]}
                            size={isCreate ? 20 : 18}
                            color={isCreate ? COLORS.white : color}
                        />
                    </View>
                ),
            };
        }}
    >
        <Tab.Screen name="Home"     component={HomeScreen}     />
        <Tab.Screen name="Discover" component={DiscoverScreen} />
        <Tab.Screen name="Create"   component={CreateScreen}   />
        <Tab.Screen name="Library"  component={LibraryScreen}  />
        <Tab.Screen name="Premium"  component={PremiumScreen}  />
    </Tab.Navigator>
);

const GlobalOverlays = () => {
    const { pendingAd, dismissAd } = usePlayer();
    return (
        <>
            <MiniPlayer />
            <UploadProgressBanner />
            <FullPlayerModal />
            <AdPlayerModal ad={pendingAd} onFinished={dismissAd} />
        </>
    );
};

export const AppNavigator = () => {
    const { authSession, isInitializing } = useAuth();

    if (isInitializing) {
        return (
            <View style={styles.splashContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    const needsOnboarding =
        authSession?.profile && !authSession.profile.pickFavorite;

    return (
        <UploadProvider>
            <NavigationContainer linking={linking}>
                <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
                    {authSession ? (
                        needsOnboarding ? (
                            <>
                                <Stack.Screen name="SelectGenres"  component={SelectGenresScreen}  />
                                <Stack.Screen name="SelectArtists" component={SelectArtistsScreen} />
                            </>
                        ) : (
                            <>
                                <Stack.Screen name="MainTabs"       component={MainTabNavigator}    />
                                <Stack.Screen name="Search"         component={SearchScreen}        />
                                <Stack.Screen name="EditFavorites"  component={EditFavoritesScreen} />
                                <Stack.Screen name="Profile"        component={ProfileScreen}       />
                                <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen}/>
                                <Stack.Screen name="AlbumDetail"    component={AlbumDetailScreen}   />
                                <Stack.Screen name="ArtistProfile"   component={ArtistProfileScreen}   />
                                <Stack.Screen name="RegisterArtist"  component={RegisterArtistScreen}  />
                                <Stack.Screen name="ArtistTerms"     component={ArtistTermsScreen}     />
                                <Stack.Screen name="FavoriteSongs"   component={FavoriteSongsScreen}   />
                                <Stack.Screen name="FollowedArtists" component={FollowedArtistsScreen} />
                                <Stack.Screen name="AlbumAddSong"    component={AlbumAddSongScreen}    />
                            </>
                        )
                    ) : (
                        <>
                            <Stack.Screen name="Welcome"         component={WelcomeScreen}         />
                            <Stack.Screen name="RegisterOptions" component={RegisterOptionsScreen} />
                            <Stack.Screen name="LoginOptions"    component={LoginOptionsScreen}    />
                            <Stack.Screen name="Login"           component={LoginScreen}           />
                            <Stack.Screen name="Register"        component={RegisterScreen}        />
                            <Stack.Screen name="VerifyOtp"       component={VerifyOtpScreen}       />
                            <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen}  />
                            <Stack.Screen name="ResetPassword"   component={ResetPasswordScreen}   />
                        </>
                    )}
                </Stack.Navigator>
                {authSession && !needsOnboarding && <GlobalOverlays />}
            </NavigationContainer>
        </UploadProvider>
    );
};

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.bg,
    },
    tabIconWrap:    { alignItems: 'center', justifyContent: 'center' },
    createIconWrap: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: COLORS.accentDim,
        alignItems: 'center', justifyContent: 'center',
    },
});