import api from './api';

export const authService = {
  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password,
      user_type: 'workforce',
    });
    return response.data;
  },

  // Signup
  signup: async (userData) => {
    const response = await api.post('/auth/signup', {
      ...userData,
      user_type: 'workforce',
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    // Add logout API call if backend supports it
    return { success: true };
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.put('/workforce/me/profile', profileData);
    return response.data;
  },
};
