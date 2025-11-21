import api, { handleApiError } from './api';

const authService = {
  /**
   * Login user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Signup new user
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  signup: async (userData) => {
    try {
      const response = await api.post('/auth/signup', {
        ...userData,
        user_type: 'workforce', // Always workforce for this app
      });
      
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Logout user (optional backend call if needed)
   * @returns {Promise<Object>}
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
      return { success: true };
    } catch (error) {
      // Even if backend call fails, we'll clear local storage
      return { success: true };
    }
  },

  /**
   * Change password
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default authService;
