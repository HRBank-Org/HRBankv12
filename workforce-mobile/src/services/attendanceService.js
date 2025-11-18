import api from './api';

export const attendanceService = {
  // Clock in
  clockIn: async (shiftId, location) => {
    const response = await api.post('/workforce/attendance/clock-in', {
      shift_id: shiftId,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return response.data;
  },

  // Clock out
  clockOut: async (shiftId, location) => {
    const response = await api.post('/workforce/attendance/clock-out', {
      shift_id: shiftId,
      latitude: location.latitude,
      longitude: location.longitude,
    });
    return response.data;
  },

  // Get current clock status
  getCurrentStatus: async () => {
    const response = await api.get('/workforce/attendance/current');
    return response.data;
  },

  // Get attendance history
  getAttendanceHistory: async (startDate, endDate) => {
    const response = await api.get('/workforce/attendance/history', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },
};
