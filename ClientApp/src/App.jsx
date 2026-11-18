import './utils/fixFontTimeout';
import 'react-native-gesture-handler';
import React, { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
} from 'react-native-paper';
import {
  NavigationContainer,
  NavigationIndependentTree,
  DefaultTheme as NavigationDefaultTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme as useAppTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import AppNavigator from './navigation/AppNavigator';

const AppContent = () => {
  const { isDark } = useAppTheme();
  const { isAmharic } = useLanguage();

  const dynamicPaperTheme = useMemo(() => {
    const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
    const customColors = isDark
      ? {
          primary: '#4CAF50',
          secondary: '#FF9800',
          background: '#121212',
          surface: '#1E1E1E',
          surfaceVariant: '#2A2A2A',
          onSurface: '#FFFFFF',
          onBackground: '#FFFFFF',
          text: '#FFFFFF',
          error: '#CF6679',
        }
      : {
          primary: '#2E7D32',
          secondary: '#FF9800',
          background: '#f5f5f5',
          surface: '#ffffff',
          surfaceVariant: '#f0f0f0',
          onSurface: '#1C1B1F',
          onBackground: '#1C1B1F',
          text: '#333333',
          error: '#F44336',
        };

    const paperTheme = {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        ...customColors,
      },
    };

    if (isAmharic) {
      const amharicFontFamily =
        'Noto Serif Ethiopic, "material-community", "Material Design Icons", "MaterialCommunityIcons", sans-serif';
      const updatedFonts = {};
      if (paperTheme.fonts) {
        Object.keys(paperTheme.fonts).forEach((variant) => {
          updatedFonts[variant] = {
            ...paperTheme.fonts[variant],
            fontFamily: amharicFontFamily,
          };
        });
      }
      paperTheme.fonts = updatedFonts;
    }

    return paperTheme;
  }, [isDark, isAmharic]);

  const navTheme = useMemo(() => {
    return isDark
      ? {
          ...NavigationDarkTheme,
          dark: true,
          colors: {
            ...NavigationDarkTheme.colors,
            primary: '#4CAF50',
            background: '#121212',
            card: '#1E1E1E',
            text: '#FFFFFF',
            border: '#2C2C2C',
            notification: '#FF9800',
          },
        }
      : {
          ...NavigationDefaultTheme,
          dark: false,
          colors: {
            ...NavigationDefaultTheme.colors,
            primary: '#2E7D32',
            background: '#f5f5f5',
            card: '#FFFFFF',
            text: '#1C1B1F',
            border: '#E0E0E0',
            notification: '#FF9800',
          },
        };
  }, [isDark]);

  return (
    <PaperProvider theme={dynamicPaperTheme}>
      <NavigationIndependentTree>
        <NavigationContainer theme={navTheme}>
          <AppNavigator />
        </NavigationContainer>
      </NavigationIndependentTree>
    </PaperProvider>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};

export default App;
