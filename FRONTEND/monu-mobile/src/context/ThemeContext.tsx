/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Theme Context
 * Manages theme selection and provides useTheme hook for all components.
 * Supports device appearance detection and persistent user preferences.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, ThemeName, ThemeColors, darkTheme, getThemeName } from '../config/themes';

interface ThemeContextType {
  /** Current theme colors */
  colors: ThemeColors;
  /** Current theme name */
  theme: ThemeName;
  /** Change theme and persist preference */
  setTheme: (theme: ThemeName | 'system') => void;
  /** Available themes for user selection */
  availableThemes: ThemeName[];
  /** Get theme display name */
  getThemeName: (theme: ThemeName) => string;
  /** Whether system prefers dark mode (for device appearance detection) */
  systemDarkMode: boolean | null;
  /** Whether to follow system appearance */
  followSystem: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'monu_app_theme';

/**
 * Determine initial theme based on stored preference or device settings
 */
const getInitialTheme = (systemDarkMode: boolean | null): ThemeName => {
  // Default product theme: classical.
  // If follow-system is enabled we only switch between dark/light there.
  if (systemDarkMode === true) return 'dark';
  if (systemDarkMode === false) return 'light';
  return 'classic';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const systemDarkMode = systemColorScheme === 'dark';
  
  const [theme, setThemeState] = useState<ThemeName>('classic');
  const [followSystem, setFollowSystemState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const savedFollowSystem = await AsyncStorage.getItem(THEME_STORAGE_KEY + '_follow_system');
        
        const shouldFollowSystem = savedFollowSystem === 'true';
        setFollowSystemState(shouldFollowSystem);

        if (shouldFollowSystem) {
          // Use device appearance
          const initialTheme = getInitialTheme(systemDarkMode);
          setThemeState(initialTheme);
        } else if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'classic' || savedTheme === 'sunset' || savedTheme === 'ocean' || savedTheme === 'neonGen')) {
          setThemeState(savedTheme as any);
        } else {
          // Default
          setThemeState('classic');
          await AsyncStorage.setItem(THEME_STORAGE_KEY, 'classic');
        }
      } catch (error) {
        console.warn('[Theme] Failed to load saved theme:', error);
        setThemeState('classic');
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [systemDarkMode]);

  // Update theme if system appearance changes and followSystem is true
  useEffect(() => {
    if (followSystem && systemDarkMode !== null) {
      const newTheme = systemDarkMode ? 'dark' : 'light';
      setThemeState(newTheme);
    }
  }, [systemDarkMode, followSystem]);

  const setTheme = useCallback((newThemeOrSystem: ThemeName | 'system') => {
    try {
      if (newThemeOrSystem === 'system') {
        setFollowSystemState(true);
        AsyncStorage.setItem(THEME_STORAGE_KEY + '_follow_system', 'true');
        // Apply current system theme
        const systemTheme = systemDarkMode ? 'dark' : 'light';
        setThemeState(systemTheme);
      } else {
        setFollowSystemState(false);
        AsyncStorage.setItem(THEME_STORAGE_KEY + '_follow_system', 'false');
        setThemeState(newThemeOrSystem);
        AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeOrSystem);
      }
    } catch (error) {
      console.warn('[Theme] Failed to save theme preference:', error);
    }
  }, [systemDarkMode]);

  if (isLoading) {
    return null; // Or return a loading screen
  }

  const colors = THEMES[theme];
  const availableThemes: ThemeName[] = ['dark', 'light', 'classic', 'sunset', 'ocean', 'neonGen'];

  return (
    <ThemeContext.Provider
      value={{
        colors,
        theme,
        setTheme,
        availableThemes,
        getThemeName,
        systemDarkMode,
        followSystem,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme throughout the app
 * @throws Error if used outside ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
};
