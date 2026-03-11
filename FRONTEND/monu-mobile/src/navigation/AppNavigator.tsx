import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/(auth)/LoginScreen';
import RegisterScreen from '../screens/(auth)/RegisterScreen';
import VerifyOtpScreen from '../screens/(auth)/VerifyOtpScreen';
import ForgotPasswordScreen from '../screens/(auth)/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/(auth)/ResetPasswordScreen';
import { SelectGenresScreen } from '../screens/(onBoard)/SelectGenresScreen';
import { SelectArtistsScreen } from '../screens/(onBoard)/SelectArtistsScreen';
import { EditFavoritesScreen } from '../screens/(settings)/EditFavoritesScreen';

// Navigation parameter types for all screens
export type RootStackParamList = {
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
  const { authSession } = useAuth();

  // Check nếu user đã login nhưng chưa pick favorites
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
                <Stack.Screen name="Login"          component={LoginScreen} />
                <Stack.Screen name="Register"       component={RegisterScreen} />
                <Stack.Screen name="VerifyOtp"      component={VerifyOtpScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
              </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
  );
};