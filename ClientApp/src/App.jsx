import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppNavigator from './navigation/AppNavigator';

const theme = {
  colors: {
    primary: '#2E7D32',
    accent: '#FF9800',
    background: '#f5f5f5',
    surface: '#ffffff',
    error: '#F44336',
    text: '#333333',
    disabled: '#999999',
    placeholder: '#cccccc',
    backdrop: 'rgba(0,0,0,0.5)'
  }
};

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <PaperProvider theme={theme}>
            <AppNavigator />
          </PaperProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;