import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const GOOGLE_FONT_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;500;600;700&display=swap';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  // Inject Noto Serif Ethiopic font on Web
  const injectWebFont = (currentLang) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Check if Google Font link already exists
    let fontLink = document.getElementById('noto-serif-ethiopic-font');
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = 'noto-serif-ethiopic-font';
      fontLink.rel = 'stylesheet';
      fontLink.href = GOOGLE_FONT_URL;
      document.head.appendChild(fontLink);
    }

    // Check if Amharic font style rule exists
    let fontStyle = document.getElementById('amharic-font-style');
    if (!fontStyle) {
      fontStyle = document.createElement('style');
      fontStyle.id = 'amharic-font-style';
      document.head.appendChild(fontStyle);
    }
    fontStyle.textContent = `
      @import url('${GOOGLE_FONT_URL}');
      
      [data-app-language="am"] {
        font-family: 'Noto Serif Ethiopic', 'material-community', 'Material Design Icons', 'MaterialCommunityIcons', sans-serif;
      }
      
      /* Apply Amharic font to text while ensuring icon fonts are in the fallback chain */
      [data-app-language="am"] * {
        font-family: 'Noto Serif Ethiopic', 'material-community', 'Material Design Icons', 'MaterialCommunityIcons', sans-serif !important;
      }
      
      /* Explicitly protect icon elements and vector icons from losing their icon font */
      [data-app-language="am"] [style*="material-community"],
      [data-app-language="am"] [style*="Material Design Icons"],
      [data-app-language="am"] [style*="MaterialCommunityIcons"],
      [data-app-language="am"] [class*="r-fontFamily-"],
      [data-app-language="am"] [data-icon="true"],
      [data-app-language="am"] [role="img"],
      [data-app-language="am"] i {
        font-family: 'material-community', 'Material Design Icons', 'MaterialCommunityIcons' !important;
      }
    `;

    // Set attribute on root
    if (document.documentElement) {
      document.documentElement.setAttribute('data-app-language', currentLang);
      document.documentElement.lang = currentLang;
    }
    if (document.body) {
      document.body.setAttribute('data-app-language', currentLang);
    }
  };

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('app_language');
        if (savedLang === 'en' || savedLang === 'am') {
          setLanguage(savedLang);
          i18n.locale = savedLang;
          injectWebFont(savedLang);
        } else {
          // Detect system locale
          const locales = Localization.getLocales();
          const code = locales[0]?.languageCode || 'en';
          const initialLang = code.startsWith('am') ? 'am' : 'en';
          setLanguage(initialLang);
          i18n.locale = initialLang;
          injectWebFont(initialLang);
        }
      } catch (error) {
        console.warn('Error loading language setting:', error);
        i18n.locale = 'en';
        injectWebFont('en');
      } finally {
        setLoading(false);
      }
    };

    loadSavedLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    if (newLang !== 'en' && newLang !== 'am') return;
    try {
      setLanguage(newLang);
      i18n.locale = newLang;
      injectWebFont(newLang);
      await AsyncStorage.setItem('app_language', newLang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'am' : 'en';
    changeLanguage(nextLang);
  };

  const t = (key, options) => {
    return i18n.t(key, options);
  };

  const isAmharic = language === 'am';
  const amharicFontFamily = isAmharic
    ? 'Noto Serif Ethiopic, "material-community", "Material Design Icons", "MaterialCommunityIcons", sans-serif'
    : undefined;

  return (
    <LanguageContext.Provider
      value={{
        language,
        isAmharic,
        changeLanguage,
        toggleLanguage,
        t,
        fontFamily: amharicFontFamily,
        loading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
