import api, { handleApiError } from './api';

const usersService = {
  /**
   * Get current user profile
   * @returns {Promise<Object>}
   */
  getMyProfile: async () => {
    try {
      const response = await api.get('/users/me');
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get workforce profile details
   * @returns {Promise<Object>}
   */
  getWorkforceProfile: async () => {
    try {
      const response = await api.get('/workforce/me/profile');
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update personal info
   * @param {Object} personalInfo
   * @returns {Promise<Object>}
   */
  updatePersonalInfo: async (personalInfo) => {
    try {
      const response = await api.patch('/workforce/me/profile/personal-info', personalInfo);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Profile updated successfully',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update skills
   * @param {Array<string>} skills
   * @returns {Promise<Object>}
   */
  updateSkills: async (skills) => {
    try {
      const response = await api.patch('/workforce/me/profile/skills', { skills });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Skills updated successfully',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get occupation profiles
   * @returns {Promise<Object>}
   */
  getOccupationProfiles: async () => {
    try {
      const response = await api.get('/occupations/me');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get common skills list
   * @returns {Promise<Object>}
   */
  getCommonSkills: async () => {
    try {
      const response = await api.get('/workforce/skills/common');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default usersService;
