import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/auth.service';
import storage from '../utils/storage';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storage.getAuthToken();
      const userData = await storage.getUserData();

      if (token && userData) {
        setUser(userData);
        setIsAuthenticated(true);
        
        // Fetch fresh user data from backend
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/me');
      if (response.data.success) {
        const updatedUser = response.data.data;
        setUser(updatedUser);
        await storage.saveUserData(updatedUser);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't logout on profile fetch failure, use cached data
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);

      if (response.success) {
        const { access_token, refresh_token, user: userData } = response.data;

        // Save tokens
        await storage.saveTokens(access_token, refresh_token);

        // Save user data
        await storage.saveUserData(userData);

        // Update state
        setUser(userData);
        setIsAuthenticated(true);

        return { success: true };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authService.signup(userData);

      if (response.success) {
        // Note: After signup, user needs to verify email
        // For now, we'll just return success
        // User will need to login after email verification
        return {
          success: true,
          message: 'Account created successfully. Please verify your email.',
          data: response.data,
        };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Signup failed',
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout (optional)
      await authService.logout();

      // Clear local storage
      await storage.clearAuthData();

      // Clear state
      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if backend call fails
      await storage.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    }
  };

  const updateUser = async (userData) => {
    try {
      setUser({ ...user, ...userData });
      await storage.saveUserData({ ...user, ...userData });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
    refreshUserData: fetchUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
