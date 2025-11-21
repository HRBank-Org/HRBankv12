import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Storage utility functions for AsyncStorage
 */

export const storage = {
  /**
   * Save auth tokens
   */
  saveTokens: async (accessToken, refreshToken) => {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ]);
      return true;
    } catch (error) {
      console.error('Error saving tokens:', error);
      return false;
    }
  },

  /**
   * Get auth token
   */
  getAuthToken: async () => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  /**
   * Save user data
   */
  saveUserData: async (userData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  },

  /**
   * Get user data
   */
  getUserData: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  /**
   * Save EULA acceptance
   */
  saveEULAAcceptance: async (accepted = true) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EULA_ACCEPTED, JSON.stringify(accepted));
      return true;
    } catch (error) {
      console.error('Error saving EULA acceptance:', error);
      return false;
    }
  },

  /**
   * Check if EULA was accepted
   */
  isEULAAccepted: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EULA_ACCEPTED);
      return data ? JSON.parse(data) : false;
    } catch (error) {
      console.error('Error checking EULA acceptance:', error);
      return false;
    }
  },

  /**
   * Clear all auth data (logout)
   */
  clearAuthData: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.EULA_ACCEPTED,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  },

  /**
   * Queue an action for offline sync
   */
  queueAction: async (action) => {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.ACTION_QUEUE);
      const queue = queueData ? JSON.parse(queueData) : [];
      
      queue.push({
        ...action,
        timestamp: new Date().toISOString(),
      });
      
      await AsyncStorage.setItem(STORAGE_KEYS.ACTION_QUEUE, JSON.stringify(queue));
      return true;
    } catch (error) {
      console.error('Error queueing action:', error);
      return false;
    }
  },

  /**
   * Get queued actions
   */
  getActionQueue: async () => {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.ACTION_QUEUE);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting action queue:', error);
      return [];
    }
  },

  /**
   * Clear action queue
   */
  clearActionQueue: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTION_QUEUE);
      return true;
    } catch (error) {
      console.error('Error clearing action queue:', error);
      return false;
    }
  },
};

export default storage;
