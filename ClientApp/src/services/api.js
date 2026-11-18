import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

const resolveApiUrl = () => {
  const configured = process.env.API_URL || DEFAULT_API_URL;

  // On Web (browser environment):
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;
    // 1. If running inside GitHub Codespaces web preview (e.g. *-8081.app.github.dev):
    if (hostname.includes('.github.dev') || hostname.includes('.githubpreview.dev')) {
      const backendHostname = hostname.replace(/-8081\b|-8082\b|-19000\b/, '-3000');
      return `https://${backendHostname}/api/v1`;
    }
    // 2. If running locally or on LAN IP on web:
    if (hostname) {
      return `${protocol}//${hostname}:3000/api/v1`;
    }
  }

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

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      const authHeader = `Bearer ${token}`;
      if (config.headers?.set) {
        config.headers.set('Authorization', authHeader);
      } else if (config.headers) {
        config.headers.Authorization = authHeader;
      }
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

    // Handle token expiration / invalid token
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (originalRequest) {
        originalRequest._retry = true;
      }
      
      // Clear stored auth data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete api.defaults.headers.Authorization;
      
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
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
