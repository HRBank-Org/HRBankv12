import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { CONSTANTS } from '../constants/config';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem(CONSTANTS.TOKEN_KEY);
      const userData = await AsyncStorage.getItem(CONSTANTS.USER_KEY);

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        
        // Fetch fresh user data
        try {
          const response = await authService.getCurrentUser();
          if (response.success) {
            setUser(response.data);
            await AsyncStorage.setItem(CONSTANTS.USER_KEY, JSON.stringify(response.data));
          }
        } catch (error) {
          console.log('Error fetching user data:', error);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      
      if (response.success) {
        const { access_token, refresh_token, user_id, email: userEmail, user_type } = response.data;
        
        // Store tokens
        await AsyncStorage.setItem(CONSTANTS.TOKEN_KEY, access_token);
        await AsyncStorage.setItem(CONSTANTS.REFRESH_TOKEN_KEY, refresh_token);
        
        // Fetch complete user profile
        const userResponse = await authService.getCurrentUser();
        const userData = userResponse.data;
        
        await AsyncStorage.setItem(CONSTANTS.USER_KEY, JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, data: userData };
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Login failed',
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authService.signup(userData);
      
      if (response.success) {
        // After signup, login automatically
        return await login(userData.email, userData.password);
      }
      
      return { success: false, error: 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Signup failed',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      await AsyncStorage.multiRemove([
        CONSTANTS.TOKEN_KEY,
        CONSTANTS.REFRESH_TOKEN_KEY,
        CONSTANTS.USER_KEY,
      ]);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const response = await authService.updateProfile(updatedData);
      if (response.success) {
        const updatedUser = { ...user, ...response.data };
        setUser(updatedUser);
        await AsyncStorage.setItem(CONSTANTS.USER_KEY, JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
