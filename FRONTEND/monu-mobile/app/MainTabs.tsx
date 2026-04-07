import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

const toTabHref = (screen?: string) => {
  switch (screen) {
    case 'Discover':
      return '/(tabs)/Discover';
    case 'Create':
      return '/(tabs)/Create';
    case 'Library':
      return '/(tabs)/Library';
    case 'Premium':
      return '/(tabs)/Premium';
    case 'Home':
    default:
      return '/(tabs)/Home';
  }
};

export default function MainTabsRoute() {
  const params = useLocalSearchParams<{ screen?: string }>();
  return <Redirect href={toTabHref(params.screen)} />;
}
