import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const ShiftAttendance = () => {
  const { shiftId } = useParams();
  const [shift, setShift] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadShiftData();
    // Refresh attendance every 30 seconds
    const interval = setInterval(loadShiftData, 30000);
    return () => clearInterval(interval);
  }, [shiftId]);

  const loadShiftData = async () => {
    try {
      // Get shift details
      const shiftsRes = await api.get('/api/employer/shifts');
      const shiftData = shiftsRes.data.data.shifts.find(s => s.shift_id === shiftId);
      setShift(shiftData);

      // Generate QR code
      const qrRes = await api.post(`/api/attendance/shifts/${shiftId}/qr-code`);
      setQrCode(qrRes.data.data);

      // Get bookings for this shift
      // TODO: Add endpoint to get bookings by shift
      setBookings([]);
      setAttendance([]);
    } catch (error) {
      console.error('Failed to load shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">Shift Attendance</h1>
              <p className="text-sm opacity-90">
                {shift && new Date(shift.shift_date).toLocaleDateString()} • {shift?.start_time} - {shift?.end_time}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance QR Code</h2>
            <p className="text-sm text-gray-600 mb-6">
              Workers scan this QR code to clock in and out. Display it at your workplace entrance.
            </p>

            {qrCode && (
              <div className="space-y-6">
                {/* QR Code Display */}
                <div className="border-4 border-gray-200 rounded-lg p-6 bg-white text-center">
                  <img 
                    src={qrCode.qr_code_image} 
                    alt="Attendance QR Code"
                    className="mx-auto"
                    style={{ width: '300px', height: '300px' }}
                  />
                  <p className="text-sm text-gray-600 mt-4">
                    Valid until: {new Date(qrCode.valid_until).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    🖨️ Print QR Code
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrCode.qr_code_image;
                      link.download = `shift-qr-${shiftId}.png`;
                      link.click();
                    }}
                    className="flex-1 px-4 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    💾 Download
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Print this QR code and post it at your workplace entrance. 
                    Workers can scan it with their phone to clock in/out.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Live Attendance Section */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Attendance</h2>
            <p className="text-sm text-gray-600 mb-6">
              Real-time attendance tracking for this shift
            </p>

            {/* Attendance Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">0</p>
                <p className="text-xs text-gray-600 mt-1">Clocked In</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">0</p>
                <p className="text-xs text-gray-600 mt-1">Clocked Out</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-600">0</p>
                <p className="text-xs text-gray-600 mt-1">No Show</p>
              </div>
            </div>

            {/* Worker List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Workers ({bookings.length})</h3>
              
              {bookings.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm text-gray-600">No workers assigned to this shift yet</p>
                </div>
              ) : (
                bookings.map((booking) => {
                  const att = attendance.find(a => a.booking_id === booking.booking_id);
                  const status = att?.status || 'not_clocked_in';
                  
                  return (
                    <div key={booking.booking_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {booking.worker_name?.charAt(0) || 'W'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{booking.worker_name || 'Worker'}</p>
                          <p className="text-xs text-gray-500">{booking.role_title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {status === 'clocked_in' && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ✓ Clocked In
                          </span>
                        )}
                        {status === 'clocked_out' && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Completed
                          </span>
                        )}
                        {status === 'not_clocked_in' && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                            Not Arrived
                          </span>
                        )}
                        {att?.clock_in_time && (
                          <p className="text-xs text-gray-500 mt-1">
                            In: {new Date(att.clock_in_time).toLocaleTimeString()}
                          </p>
                        )}
                        {att?.clock_out_time && (
                          <p className="text-xs text-gray-500">
                            Out: {new Date(att.clock_out_time).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Auto-refresh indicator */}
            <p className="text-xs text-gray-500 text-center mt-6">
              🔄 Auto-refreshing every 30 seconds
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShiftAttendance;
