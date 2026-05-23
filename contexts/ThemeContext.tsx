import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  colorScheme: NonNullable<ColorSchemeName>;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  setThemePreference: () => {},
  colorScheme: 'light',
});

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemePreferenceState(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem('theme_preference', pref);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const effectiveColorScheme: NonNullable<ColorSchemeName> = 
    themePreference === 'system' 
      ? (systemColorScheme ?? 'light') 
      : themePreference;

  if (!isLoaded) {
    return null; // Or a minimal loading screen, but usually fast enough
  }

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, colorScheme: effectiveColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
