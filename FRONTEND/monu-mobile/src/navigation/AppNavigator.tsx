import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
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

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator key={authSession ? 'authed' : 'guest'} screenOptions={{ headerShown: false }}>
        {authSession
          ? <Stack.Screen name="Home" component={HomeScreen} />
          : <Stack.Screen name="Login" component={LoginScreen} />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
};
