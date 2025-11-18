import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, CONSTANTS } from '../constants/config';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(CONSTANTS.TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(CONSTANTS.REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
          // Try to refresh token
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const { access_token } = response.data;
          await AsyncStorage.setItem(CONSTANTS.TOKEN_KEY, access_token);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove([
          CONSTANTS.TOKEN_KEY,
          CONSTANTS.REFRESH_TOKEN_KEY,
          CONSTANTS.USER_KEY,
        ]);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
