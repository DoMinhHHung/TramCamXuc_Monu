import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { COLORS } from '../config/colors';
import { useAuth } from '../context/AuthContext';
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
import { EditFavoritesScreen } from '../screens/(settings)/EditFavoritesScreen';

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
  Home: undefined;
  EditFavorites: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['monumobile://'],
  config: {
    screens: {
      Home: 'home',
    },
  },
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

  const needsOnboarding = authSession?.profile && !authSession.profile.pickFavorite;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authSession ? (
          <>
            {needsOnboarding ? (
              <>
                <Stack.Screen name="SelectGenres" component={SelectGenresScreen} />
                <Stack.Screen name="SelectArtists" component={SelectArtistsScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="EditFavorites" component={EditFavoritesScreen} />
              </>
            )}
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="RegisterOptions" component={RegisterOptionsScreen} />
            <Stack.Screen name="LoginOptions" component={LoginOptionsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
});
