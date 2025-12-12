import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const ClockInOut = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [qrScanning, setQrScanning] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [shiftTasks, setShiftTasks] = useState({ standard: [], custom: [] });
  const [taskCompletions, setTaskCompletions] = useState({});
  const [allTasksComplete, setAllTasksComplete] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadBooking();
  }, [bookingId]);
  
  useEffect(() => {
    if (attendance && booking) {
      loadShiftTasks();
    }
  }, [attendance, booking]);

  const loadBooking = async () => {
    try {
      const shiftsRes = await api.get('/api/jobs/my-shifts');
      const shiftData = shiftsRes.data.data.shifts.find(s => s.booking_id === bookingId);
      setBooking(shiftData);
      
      // Check attendance status
      try {
        const attendanceRes = await api.get(`/api/attendance/booking/${bookingId}/status`);
        setAttendance(attendanceRes.data.data.attendance);
      } catch (error) {
        console.log('No attendance record yet');
      }
    } catch (error) {
      console.error('Failed to load booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShiftTasks = async () => {
    try {
      const shiftDate = booking.shift_date.split('T')[0]; // Get YYYY-MM-DD
      
      // Get shift details with tasks
      const shiftsRes = await api.get(`/api/workforce/my-shifts?date=${shiftDate}`);
      const shifts = shiftsRes.data.data.shifts || [];
      
      // Find shift matching this booking (by comparing shift details)
      const matchingShift = shifts.find(s => 
        s.position_title === booking.role_title && 
        s.workplace_name === booking.workplace_name
      );
      
      if (matchingShift) {
        setShiftTasks({
          standard: matchingShift.standard_tasks || [],
          custom: matchingShift.custom_tasks || []
        });
        
        // Get task completions
        const completionsRes = await api.get(`/api/workforce/task-completions?date=${shiftDate}`);
        const completions = completionsRes.data.data.completions || [];
        
        // Build completion map
        const completionMap = {};
        completions.forEach(comp => {
          if (comp.shift_id === matchingShift.shift_id) {
            completionMap[comp.task_text] = comp;
          }
        });
        setTaskCompletions(completionMap);
        
        // Check if all tasks are complete
        const allTasks = [...(matchingShift.standard_tasks || []), ...(matchingShift.custom_tasks || [])];
        const completedCount = allTasks.filter(task => completionMap[task]?.completed).length;
        setAllTasksComplete(allTasks.length > 0 && completedCount === allTasks.length);
      }
    } catch (error) {
      console.error('Failed to load shift tasks:', error);
    }
  };

  const handleTaskToggle = async (taskText, taskType) => {
    try {
      const isCompleted = taskCompletions[taskText]?.completed || false;
      
      if (isCompleted) {
        // Uncomplete
        const completionId = taskCompletions[taskText].task_completion_id;
        await api.delete(`/api/workforce/task-completions/${completionId}`);
      } else {
        // Complete
        const shiftDate = booking.shift_date.split('T')[0];
        const shiftsRes = await api.get(`/api/workforce/my-shifts?date=${shiftDate}`);
        const shifts = shiftsRes.data.data.shifts || [];
        const matchingShift = shifts.find(s => 
          s.position_title === booking.role_title && 
          s.workplace_name === booking.workplace_name
        );
        
        if (matchingShift) {
          await api.post('/api/workforce/task-completions', {
            shift_id: matchingShift.shift_id,
            task_text: taskText,
            task_type: taskType
          });
        }
      }
      
      // Reload tasks
      await loadShiftTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleClockIn = async () => {
    try {
      // Parse QR code data
      const qrData = qrInput;
      
      // Get GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              long: position.coords.longitude,
              accuracy: position.coords.accuracy
            };

            try {
              await api.post('/api/attendance/clock-in', {
                qr_data: qrData,
                location: location,
                booking_id: bookingId
              });
              
              alert('Clocked in successfully! ✓');
              navigate('/workforce/dashboard');
            } catch (error) {
              alert(error.response?.data?.error?.detail || 'Clock-in failed');
            }
          },
          (error) => {
            alert('Please enable location services to clock in');
          },
          { enableHighAccuracy: true }
        );
      } else {
        alert('Geolocation not supported');
      }
    } catch (error) {
      alert('Invalid QR code');
    }
  };

  const handleClockOut = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            long: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          try {
            const response = await api.post('/api/attendance/clock-out', {
              booking_id: bookingId,
              location: location
            });
            
            alert(response.data.message || 'Clocked out successfully!');
            navigate('/workforce/dashboard');
          } catch (error) {
            alert(error.response?.data?.error?.detail || 'Clock-out failed');
          }
        },
        (error) => {
          alert('Please enable location services');
        },
        { enableHighAccuracy: true }
      );
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
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/workforce/dashboard')} className="hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">Clock In/Out</h1>
            <p className="text-sm opacity-90">{booking?.role_title}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Shift Info */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{booking?.role_title}</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p>📅 {booking && new Date(booking.shift_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p>⏰ {booking?.start_time} - {booking?.end_time}</p>
              <p>🏢 {booking?.workplace_name}</p>
              <p>💰 ${booking?.hourly_rate}/hour</p>
            </div>
          </div>

          {!attendance ? (
            /* CLOCK IN */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                  <svg className="w-10 h-10" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 16H6m2 0h.01M4 12h2m0 4H4m4-8h4m-4 0h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ready to Clock In?</h3>
                <p className="text-sm text-gray-600 mt-2">Scan the QR code at your workplace to start your shift</p>
              </div>

              {/* QR Scanner Placeholder */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M8 16H6m2 0h.01M4 12h2m0 4H4m4-8h4m-4 0h.01" />
                </svg>
                <p className="text-sm text-gray-600 mb-4">QR Scanner (Coming Soon)</p>
                
                {/* Manual QR Input for Testing */}
                <div className="max-w-md mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or paste QR code data:
                  </label>
                  <textarea
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    rows={3}
                    placeholder='{"qr_code_id":"...","shift_id":"...","token":"..."}'
                  />
                  <button
                    onClick={handleClockIn}
                    disabled={!qrInput}
                    className="w-full mt-4 px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Clock In
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>Note:</strong> You can clock in 15 minutes before your shift starts. 
                  Make sure you're at the workplace location for GPS verification.
                </p>
              </div>
            </div>
          ) : (
            /* CLOCK OUT */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Clocked In ✓</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Started at {attendance.clock_in_time && new Date(attendance.clock_in_time).toLocaleTimeString()}
                </p>
              </div>

              {/* Elapsed Time */}
              <div className="p-6 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">Time Elapsed</p>
                <p className="text-4xl font-bold text-gray-900">0:00:00</p>
                <p className="text-xs text-gray-500 mt-2">Hours worked</p>
              </div>

              {/* Task Checklist */}
              {(shiftTasks.standard.length > 0 || shiftTasks.custom.length > 0) && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    📋 Complete Your Tasks Before Clock Out
                  </h4>
                  <div className="space-y-2 mb-4">
                    {[...shiftTasks.standard, ...shiftTasks.custom].map((task, idx) => {
                      const isCompleted = taskCompletions[task]?.completed || false;
                      const isCustom = shiftTasks.custom.includes(task);
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => handleTaskToggle(task, isCustom ? 'custom' : 'standard')}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isCompleted 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeWidth={2} />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900 font-medium'}`}>
                              {task}
                            </p>
                            {isCustom && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {!allTasksComplete && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-800 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span><strong>Note:</strong> Complete all tasks above to enable clock out.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleClockOut}
                disabled={!allTasksComplete && (shiftTasks.standard.length > 0 || shiftTasks.custom.length > 0)}
                className="w-full px-6 py-4 rounded-lg text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {allTasksComplete || (shiftTasks.standard.length === 0 && shiftTasks.custom.length === 0) 
                  ? 'Clock Out' 
                  : '🔒 Complete Tasks to Clock Out'}
              </button>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Make sure to clock out within 1 hour of shift end time to avoid issues.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClockInOut;
