import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

const resolveApiUrl = () => {
  const configured = process.env.API_URL || DEFAULT_API_URL;

  // For physical devices, localhost points to the phone itself.
  // If API_URL uses localhost, replace it with Metro host IP when available.
  if (configured.includes('localhost')) {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      '';

    const metroHost = hostUri.split(':')[0];
    if (metroHost) {
      return configured.replace('localhost', metroHost);
    }
  }

  return configured;
};

const API_URL = resolveApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear stored auth data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Navigate to login (handled in AuthContext)
      // You might want to emit an event or use a callback here
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      error.userMessage = 'Network error. Please check your connection.';
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Request timeout. Please try again.';
    }

    return Promise.reject(error);
  }
);

export default api;