import api from './api';

export const shiftService = {
  // Get available shifts
  getAvailableShifts: async (filters = {}) => {
    const response = await api.get('/workforce/shifts/available', {
      params: filters,
    });
    return response.data;
  },

  // Get my shifts
  getMyShifts: async () => {
    const response = await api.get('/workforce/shifts/my-shifts');
    return response.data;
  },

  // Apply to shift
  applyToShift: async (shiftId) => {
    const response = await api.post(`/workforce/shifts/${shiftId}/apply`);
    return response.data;
  },

  // Get shift details
  getShiftDetails: async (shiftId) => {
    const response = await api.get(`/workforce/shifts/${shiftId}`);
    return response.data;
  },

  // Cancel application
  cancelApplication: async (shiftId) => {
    const response = await api.delete(`/workforce/shifts/${shiftId}/application`);
    return response.data;
  },
};
