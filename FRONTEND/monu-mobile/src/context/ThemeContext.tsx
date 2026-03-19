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
  setTheme: (theme: ThemeName) => Promise<void>;
  /** Available themes for user selection */
  availableThemes: ThemeName[];
  /** Get theme display name */
  getThemeName: (theme: ThemeName) => string;
  /** Whether system prefers dark mode (for device appearance detection) */
  systemDarkMode: boolean | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'monu_app_theme';

/**
 * Determine initial theme based on stored preference or device settings
 */
const getInitialTheme = (systemDarkMode: boolean | null): ThemeName => {
  // If user has explicitly set a theme, we'll load it in useEffect
  // For now, check system preference as fallback
  if (systemDarkMode === true) {
    return 'dark';
  }
  if (systemDarkMode === false) {
    return 'light';
  }
  return 'dark'; // Default fallback
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const systemDarkMode = systemColorScheme === 'dark';
  
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'dark' || saved === 'light' || saved === 'classic')) {
          setThemeState(saved);
        } else {
          // Use device appearance if no saved preference
          const initialTheme = getInitialTheme(systemDarkMode);
          setThemeState(initialTheme);
          await AsyncStorage.setItem(THEME_STORAGE_KEY, initialTheme);
        }
      } catch (error) {
        console.warn('[Theme] Failed to load saved theme:', error);
        setThemeState('dark');
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [systemDarkMode]);

  const setTheme = useCallback(async (newTheme: ThemeName) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('[Theme] Failed to save theme preference:', error);
    }
  }, []);

  if (isLoading) {
    return null; // Or return a loading screen
  }

  const colors = THEMES[theme];
  const availableThemes: ThemeName[] = ['dark', 'light', 'classic'];

  return (
    <ThemeContext.Provider
      value={{
        colors,
        theme,
        setTheme,
        availableThemes,
        getThemeName,
        systemDarkMode,
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
