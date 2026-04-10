import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Use relative URL for production (nginx proxy) or fallback for development
const API_URL = process.env.REACT_APP_BACKEND_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState({
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token')
  });

  const fetchCurrentUser = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Store complete user data including profile
      const userData = response.data.data;
      setUser(userData);
      // Also store in localStorage for API interceptor
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      // Token invalid or expired
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is logged in on mount or when token changes
    if (tokens.accessToken) {
      fetchCurrentUser(tokens.accessToken);
    } else {
      setLoading(false);
    }
  }, [tokens.accessToken]);

  const signup = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
      const { access_token, refresh_token, user_id, email, user_type } = response.data.data;
      
      // Store tokens
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setTokens({ accessToken: access_token, refreshToken: refresh_token });
      
      // Set basic user info - will be enriched by fetchCurrentUser
      setUser({ user_id, email, user_type });
      
      // Fetch complete profile data with the new token
      try {
        const profileResponse = await axios.get(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        });
        // Store complete user data including profile
        const userData = profileResponse.data.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Sync browser language to backend profile
        const currentLang = localStorage.getItem('language') || navigator.language?.split('-')[0] || 'en';
        try {
          await axios.put(`${API_URL}/api/users/preferred-language`, { preferred_language: currentLang }, {
            headers: { Authorization: `Bearer ${access_token}` }
          });
        } catch (langErr) { /* non-critical */ }
      } catch (profileError) {
        console.warn('Failed to fetch user profile:', profileError);
        // Don't logout on profile fetch failure during login
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setTokens({ accessToken: null, refreshToken: null });
    setUser(null);
  };

  const updateUserProfile = (profileData) => {
    setUser(prevUser => ({
      ...prevUser,
      profile: profileData
    }));
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};