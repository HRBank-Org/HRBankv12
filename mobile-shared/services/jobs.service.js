import api, { handleApiError } from './api';

const jobsService = {
  /**
   * Get matched jobs for workforce user
   * @returns {Promise<Object>}
   */
  getMatchedJobs: async () => {
    try {
      const response = await api.get('/jobs/matched');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get job detail by ID
   * @param {string} jobId
   * @returns {Promise<Object>}
   */
  getJobDetail: async (jobId) => {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Apply to a job
   * @param {string} jobId
   * @returns {Promise<Object>}
   */
  applyToJob: async (jobId) => {
    try {
      const response = await api.post(`/jobs/${jobId}/apply`);
      return {
        success: true,
        message: response.data.message || 'Application submitted successfully',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get job offers for workforce user
   * @returns {Promise<Object>}
   */
  getJobOffers: async () => {
    try {
      const response = await api.get('/jobs/offers');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Accept a job offer
   * @param {string} offerId
   * @returns {Promise<Object>}
   */
  acceptOffer: async (offerId) => {
    try {
      const response = await api.post(`/jobs/offers/${offerId}/accept`);
      return {
        success: true,
        message: response.data.message || 'Offer accepted successfully',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Decline a job offer
   * @param {string} offerId
   * @returns {Promise<Object>}
   */
  declineOffer: async (offerId) => {
    try {
      const response = await api.post(`/jobs/offers/${offerId}/decline`);
      return {
        success: true,
        message: response.data.message || 'Offer declined',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get interview invitations
   * @returns {Promise<Object>}
   */
  getInterviews: async () => {
    try {
      const response = await api.get('/jobs/interviews');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get employment status
   * @returns {Promise<Object>}
   */
  getEmploymentStatus: async () => {
    try {
      const response = await api.get('/jobs/employment/status');
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Quit current job
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  quitJob: async (reason) => {
    try {
      const response = await api.post('/jobs/employment/quit', { reason });
      return {
        success: true,
        message: response.data.message || 'Job quit successfully',
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get my shifts
   * @returns {Promise<Object>}
   */
  getMyShifts: async () => {
    try {
      const response = await api.get('/jobs/my-shifts');
      return {
        success: true,
        data: response.data.data || [],
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default jobsService;
