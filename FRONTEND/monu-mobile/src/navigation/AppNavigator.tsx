import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { EditFavoritesScreen } from '../screens/EditFavoritesScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: { email: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  Onboarding: undefined;
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
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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