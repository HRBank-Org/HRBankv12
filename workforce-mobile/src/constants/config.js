// API Configuration
export const API_CONFIG = {
  // Base URL from environment variable (falls back to preview if not set)
  BASE_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://talent-match-82.preview.emergentagent.com/api',
  
  TIMEOUT: 15000, // 15 seconds
};

// App Theme Colors
export const COLORS = {
  primary: '#30496d',
  secondary: '#4a90e2',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#ffffff',
  backgroundLight: '#f9fafb',
  border: '#e5e7eb',
  white: '#ffffff',
  black: '#000000',
};

// App Constants
export const CONSTANTS = {
  TOKEN_KEY: '@hrbank_token',
  REFRESH_TOKEN_KEY: '@hrbank_refresh_token',
  USER_KEY: '@hrbank_user',
  
  // Geofence radius in meters for clock in/out
  GEOFENCE_RADIUS: 100,
  
  // Ontario minimum wage
  MINIMUM_WAGE: 17.60,
  
  // Document types
  DOCUMENT_TYPES: {
    WORK_PERMIT: 'Work Permit',
    SIN: 'SIN Card',
    DRIVERS_LICENSE: 'Driver\'s License',
    RESUME: 'Resume',
    REFERENCE: 'Reference Letter',
    CERTIFICATION: 'Certification',
  },
};

// Status types
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
};
