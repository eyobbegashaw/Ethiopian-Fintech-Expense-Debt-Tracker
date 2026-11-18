import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { initLocalDatabase } from '../database/db';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      // 1. Initialize local SQLite database
      await initLocalDatabase();

      // 2. Load stored session
      const storedToken = await AsyncStorage.getItem('token');
      const storedUserStr = await AsyncStorage.getItem('user');

      if (storedToken && storedUserStr) {
        try {
          const res = await authService.getMe();
          if (res?.data) {
            setToken(storedToken);
            setUser(res.data);
            await AsyncStorage.setItem('user', JSON.stringify(res.data));
          } else {
            const fallbackUser = JSON.parse(storedUserStr);
            setToken(storedToken);
            setUser(fallbackUser);
          }
        } catch (e) {
          console.log('Local session refresh notice:', e?.message);
          const fallbackUser = JSON.parse(storedUserStr);
          setToken(storedToken);
          setUser(fallbackUser);
        }
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading local auth data:', error);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    try {
      const response = await authService.login(phone, password);
      const { token: localToken, user: loggedInUser } = response;

      await AsyncStorage.setItem('token', localToken);
      await AsyncStorage.setItem('user', JSON.stringify(loggedInUser));

      setToken(localToken);
      setUser(loggedInUser);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  };

  const register = async (userData, autoLogin = false) => {
    try {
      const response = await authService.register(userData);
      const { token: localToken, user: newUser, recoveryCode } = response;

      if (autoLogin) {
        await AsyncStorage.setItem('token', localToken);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));
        setToken(localToken);
        setUser(newUser);
      }

      return { success: true, recoveryCode, user: newUser, token: localToken };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedData) => {
    try {
      const response = await authService.updateProfile(updatedData);
      const updated = response?.data || { ...user, ...updatedData };
      await AsyncStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      return { success: true, user: updated };
    } catch {
      const fallbackUser = { ...user, ...updatedData };
      await AsyncStorage.setItem('user', JSON.stringify(fallbackUser));
      setUser(fallbackUser);
      return { success: true, user: fallbackUser };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isLocalOnly: true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
