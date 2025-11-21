// Color Palette for HR Bank Mobile Apps

export const colors = {
  // Workforce theme (Blue)
  workforce: {
    primary: '#30496d',
    primaryLight: '#4a6fa5',
    primaryDark: '#1e2f4d',
    secondary: '#5c7cad',
    accent: '#7a9bc4',
    background: '#f5f7fa',
    backgroundAlt: '#ffffff',
    card: '#ffffff',
    text: '#2c3e50',
    textLight: '#7f8c8d',
    textMuted: '#95a5a6',
    border: '#e1e8ed',
  },
  
  // Employer theme (Orange) - for future use
  employer: {
    primary: '#ff5f00',
    primaryLight: '#ff7f3f',
    primaryDark: '#cc4c00',
    secondary: '#ff9966',
    accent: '#ffb380',
    background: '#fff5f0',
    backgroundAlt: '#ffffff',
    card: '#ffffff',
    text: '#2c3e50',
    textLight: '#7f8c8d',
    textMuted: '#95a5a6',
    border: '#ffe6d9',
  },
  
  // Semantic colors
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#ef4444',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  
  // Status badge colors
  pending: '#fbbf24',
  pendingBg: '#fef3c7',
  verified: '#10b981',
  verifiedBg: '#d1fae5',
  rejected: '#ef4444',
  rejectedBg: '#fee2e2',
  active: '#10b981',
  activeBg: '#d1fae5',
  inactive: '#6b7280',
  inactiveBg: '#f3f4f6',
  
  // Common colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Emma AI specific
  emma: {
    userBubble: '#30496d',
    userText: '#ffffff',
    emmaBubble: '#f3f4f6',
    emmaText: '#2c3e50',
  },
};

// Get theme colors based on user type
export const getThemeColors = (userType = 'workforce') => {
  return userType === 'employer' ? colors.employer : colors.workforce;
};

export default colors;
