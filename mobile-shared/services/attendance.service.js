import api from './api';

class AttendanceService {
  /**
   * Generate QR code for a shift (employer only)
   */
  async generateQRCode(shiftId) {
    try {
      const response = await api.post(`/attendance/shifts/${shiftId}/qr-code`);
      return response.data;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clock in to a shift with QR code and location
   */
  async clockIn(qrData, location, bookingId) {
    try {
      const response = await api.post('/attendance/clock-in', {
        qr_data: qrData,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        booking_id: bookingId,
      });
      return response.data;
    } catch (error) {
      console.error('Error clocking in:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Clock out from a shift
   */
  async clockOut(bookingId, location) {
    try {
      const response = await api.post('/attendance/clock-out', {
        booking_id: bookingId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error clocking out:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
      };
    }
  }

  /**
   * Get attendance history for current user
   */
  async getAttendanceHistory(limit = 20) {
    try {
      const response = await api.get(`/attendance/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current active attendance (if clocked in)
   */
  async getCurrentAttendance() {
    try {
      const response = await api.get('/attendance/current');
      return response.data;
    } catch (error) {
      console.error('Error fetching current attendance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upcoming shifts that user can clock into
   */
  async getUpcomingShifts() {
    try {
      const response = await api.get('/attendance/upcoming-shifts');
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming shifts:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AttendanceService();
