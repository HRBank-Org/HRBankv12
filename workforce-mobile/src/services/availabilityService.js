import api from './api';

export const availabilityService = {
  // Get availability calendar
  getAvailability: async (startDate, endDate) => {
    const response = await api.get('/workforce/availability/calendar', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Add availability
  addAvailability: async (availabilityData) => {
    const response = await api.post('/workforce/availability/calendar', availabilityData);
    return response.data;
  },

  // Update availability
  updateAvailability: async (eventId, availabilityData) => {
    const response = await api.put(
      `/workforce/availability/calendar/${eventId}`,
      availabilityData
    );
    return response.data;
  },

  // Delete availability
  deleteAvailability: async (eventId) => {
    const response = await api.delete(`/workforce/availability/calendar/${eventId}`);
    return response.data;
  },
};
