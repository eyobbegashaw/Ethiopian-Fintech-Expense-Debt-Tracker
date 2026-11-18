import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  const lightTheme = {
    dark: false,
    colors: {
      primary: '#2E7D32',
      accent: '#FF9800',
      background: '#f5f5f5',
      surface: '#ffffff',
      surfaceVariant: '#f0f0f0',
      error: '#F44336',
      text: '#333333',
      onSurface: '#1C1B1F',
      onBackground: '#1C1B1F',
      disabled: '#999999',
      placeholder: '#cccccc',
      backdrop: 'rgba(0,0,0,0.5)',
      notification: '#FF9800',
      success: '#4CAF50',
      warning: '#FFC107',
      info: '#2196F3',
      border: '#E0E0E0',
      outline: '#BDBDBD',
      outlineVariant: '#E0E0E0',
    },
  };

  const darkTheme = {
    dark: true,
    colors: {
      primary: '#4CAF50',
      accent: '#FF9800',
      background: '#121212',
      surface: '#1E1E1E',
      surfaceVariant: '#2A2A2A',
      error: '#CF6679',
      text: '#FFFFFF',
      onSurface: '#FFFFFF',
      onBackground: '#FFFFFF',
      disabled: '#666666',
      placeholder: '#888888',
      backdrop: 'rgba(0,0,0,0.7)',
      notification: '#FF9800',
      success: '#4CAF50',
      warning: '#FFC107',
      info: '#2196F3',
      border: '#3C3C3C',
      outline: '#777777',
      outlineVariant: '#555555',
    },
  };

  const applyWebTheme = (mode) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const isDark = mode === 'dark';
      const bg = isDark ? '#121212' : '#f5f5f5';
      const text = isDark ? '#FFFFFF' : '#333333';

      document.documentElement.setAttribute('data-theme', mode);
      if (document.body) {
        document.body.style.backgroundColor = bg;
        document.body.style.color = text;
      }
      const root = document.getElementById('root');
      if (root) {
        root.style.backgroundColor = bg;
      }

      let themeStyle = document.getElementById('app-dark-mode-style');
      if (!themeStyle) {
        themeStyle = document.createElement('style');
        themeStyle.id = 'app-dark-mode-style';
        document.head.appendChild(themeStyle);
      }
      themeStyle.textContent = `
        html, body, #root {
          background-color: ${bg} !important;
          color: ${text} !important;
        }
        /* React Native Paper TextInput: the inner input element MUST be transparent
           so it NEVER overlaps or masks the bottom border / underline of the Outline/Underline container */
        [data-testid="text-input-outlined"],
        [data-testid="text-input-flat"],
        input[data-testid="text-input-outlined"],
        input[data-testid="text-input-flat"] {
          background-color: transparent !important;
          background: transparent !important;
          border-width: 0px !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        /* Ensure the Outline container has crisp visible borders on all 4 sides */
        [data-theme="dark"] [data-testid="text-input-outline"] {
          background-color: #1E1E1E !important;
          border-color: #777777 !important;
        }
        [data-theme="light"] [data-testid="text-input-outline"] {
          background-color: #FFFFFF !important;
          border-color: #BDBDBD !important;
        }

        /* Ensure flat TextInput underline is visible */
        [data-theme="dark"] [data-testid="text-input-underline"] {
          background-color: #777777 !important;
        }

        ${isDark ? `
        input, textarea, select {
          color: #FFFFFF !important;
        }
        ::placeholder {
          color: #888888 !important;
          opacity: 1;
        }
        ` : `
        input, textarea, select {
          color: #333333 !important;
        }
        ::placeholder {
          color: #999999 !important;
          opacity: 1;
        }
        `}
      `;
    }
  };

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      const resolved = savedTheme || (systemColorScheme === 'dark' ? 'dark' : 'light');
      setThemeModeState(resolved);
      applyWebTheme(resolved);
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeModeState(newTheme);
    applyWebTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  const setThemeMode = async (mode) => {
    setThemeModeState(mode);
    applyWebTheme(mode);
    await AsyncStorage.setItem('app_theme', mode);
  };

  const isDark = themeMode === 'dark';
  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeMode,
        isDark,
        toggleTheme,
        setThemeMode,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
