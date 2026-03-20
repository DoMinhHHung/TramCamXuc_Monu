/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Monu – Localization Context
 * Manages app language preference and provides useTranslation hook for all screens.
 * Supports persistence via AsyncStorage and device language detection.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import enTranslations from '../locales/en.json';
import viTranslations from '../locales/vi.json';

export type SupportedLanguage = 'en' | 'vi';

const translations: Record<SupportedLanguage, typeof enTranslations> = {
  en: enTranslations,
  vi: viTranslations,
};

interface LocalizationContextType {
  /** Current language code (e.g., 'en', 'vi') */
  language: SupportedLanguage;
  /** Change app language and persist preference */
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  /** Get translated string by key with optional fallback */
  t: (key: string, fallback?: string) => string;
  /** All available languages for user selection */
  availableLanguages: SupportedLanguage[];
  /** Get language display name (e.g., "English", "Tiếng Việt") */
  getLanguageName: (lang: SupportedLanguage) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'monu_app_language';

/**
 * Get default language from device settings, with fallback to English
 */
const getDefaultLanguage = (): SupportedLanguage => {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  
  if (deviceLang === 'vi') {
    return 'vi';
  }
  
  return 'en';
};

/**
 * Nested key access for translations (e.g., "screens.home.greeting")
 */
const getTranslation = (obj: any, path: string): string => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = current[key];
    } else {
      return path; // Return key as fallback if path not found
    }
  }
  
  return typeof current === 'string' ? current : path;
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'vi')) {
          setLanguageState(saved);
        } else {
          const defaultLang = getDefaultLanguage();
          setLanguageState(defaultLang);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, defaultLang);
        }
      } catch (error) {
        console.warn('[Localization] Failed to load saved language:', error);
        setLanguageState(getDefaultLanguage());
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: SupportedLanguage) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.warn('[Localization] Failed to save language preference:', error);
    }
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    const currentTranslations = translations[language];
    const translated = getTranslation(currentTranslations, key);
    
    // Return translated string, fallback, or original key as last resort
    if (translated !== key) {
      return translated;
    }
    
    return fallback || key;
  }, [language]);

  const getLanguageName = (lang: SupportedLanguage): string => {
    const names: Record<SupportedLanguage, string> = {
      en: 'English',
      vi: 'Tiếng Việt',
    };
    return names[lang];
  };

  if (isLoading) {
    return null; // Or return a loading screen
  }

  return (
    <LocalizationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        availableLanguages: ['en', 'vi'],
        getLanguageName,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
};

/**
 * Hook to use localization throughout the app
 * @throws Error if used outside LocalizationProvider
 */
export const useTranslation = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within LocalizationProvider');
  }
  
  return context;
};
