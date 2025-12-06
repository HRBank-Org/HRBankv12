// API Configuration
// Use Expo environment variable if available, otherwise fallback to localhost for development
export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001/api';

// App Configuration
export const APP_NAME = 'HR Bank';
export const APP_VERSION = '1.0.0';

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_DATA: '@user_data',
  EULA_ACCEPTED: '@eula_accepted',
  ACTION_QUEUE: '@action_queue',
};

// API Timeouts
export const API_TIMEOUT = 30000; // 30 seconds

// Polling Intervals
export const POLLING_INTERVALS = {
  NOTIFICATIONS: 30000, // 30 seconds
  ATTENDANCE: 10000,    // 10 seconds
  SHIFTS: 60000,        // 1 minute
};

// Geolocation Configuration
export const GEO_CONFIG = {
  ACCURACY: 'high',
  MAX_AGE: 5000,
  TIMEOUT: 10000,
  WORKPLACE_RADIUS: 100, // meters
};

// Emma AI Configuration
export const EMMA_CONFIG = {
  AVATAR_URL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop',
  MAX_MESSAGE_LENGTH: 1000,
  FILE_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};
