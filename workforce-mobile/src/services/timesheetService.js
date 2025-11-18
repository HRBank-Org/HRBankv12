import api from './api';

export const timesheetService = {
  // Get timesheets
  getTimesheets: async (startDate, endDate) => {
    const response = await api.get('/workforce/timesheets', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Get earnings summary
  getEarnings: async (period = 'month') => {
    const response = await api.get('/workforce/earnings', {
      params: { period },
    });
    return response.data;
  },

  // Get timesheet details
  getTimesheetDetails: async (timesheetId) => {
    const response = await api.get(`/workforce/timesheets/${timesheetId}`);
    return response.data;
  },
};
