import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StreamingStatus {
  online: boolean;
  quality?: string;
}

export const StreamingStatusBanner = () => {
  // This is a placeholder component
  // In a real app, you would listen to network state
  // and display streaming quality or offline status
  
  return null;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 900,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
