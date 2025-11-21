import api, { handleApiError } from './api';

const emmaService = {
  /**
   * Get Emma conversation history
   * @returns {Promise<Object>}
   */
  getConversation: async () => {
    try {
      const response = await api.get('/emma/conversation');
      return {
        success: true,
        data: response.data.data || {},
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Send message to Emma
   * @param {string} message
   * @returns {Promise<Object>}
   */
  sendMessage: async (message) => {
    try {
      const response = await api.post('/emma/chat', { message });
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Upload and parse resume
   * @param {Object} file - File object with uri, name, type
   * @returns {Promise<Object>}
   */
  parseResume: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'application/pdf',
      });

      const response = await api.post('/emma/parse-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
   * Approve parsed resume data
   * @param {Object} resumeData
   * @returns {Promise<Object>}
   */
  approveResumeData: async (resumeData) => {
    try {
      const response = await api.post('/emma/approve-resume-data', resumeData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Resume data approved',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get onboarding status
   * @returns {Promise<Object>}
   */
  getOnboardingStatus: async () => {
    try {
      const response = await api.get('/emma/onboarding-status');
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default emmaService;
