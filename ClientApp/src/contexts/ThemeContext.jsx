import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  const lightTheme = {
    dark: false,
    colors: {
      primary: '#2E7D32',
      accent: '#FF9800',
      background: '#f5f5f5',
      surface: '#ffffff',
      error: '#F44336',
      text: '#333333',
      disabled: '#999999',
      placeholder: '#cccccc',
      backdrop: 'rgba(0,0,0,0.5)',
      notification: '#FF9800',
      success: '#4CAF50',
      warning: '#FFC107',
      info: '#2196F3',
    },
  };

  const darkTheme = {
    dark: true,
    colors: {
      primary: '#4CAF50',
      accent: '#FF9800',
      background: '#121212',
      surface: '#1E1E1E',
      error: '#CF6679',
      text: '#FFFFFF',
      disabled: '#666666',
      placeholder: '#888888',
      backdrop: 'rgba(0,0,0,0.7)',
      notification: '#FF9800',
      success: '#4CAF50',
      warning: '#FFC107',
      info: '#2196F3',
    },
  };

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('app_theme', newTheme);
  };

  const setThemeMode = async (mode) => {
    setTheme(mode);
    await AsyncStorage.setItem('app_theme', mode);
  };

  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeMode: theme,
        toggleTheme,
        setThemeMode,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};