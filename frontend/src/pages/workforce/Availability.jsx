import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import { FiSave, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AvailabilityPage = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/workforce/me/profile');
      const profile = response.data.data;
      
      // Convert availability_hours format from backend to UI format
      const availabilityHours = profile.availability_hours || {};
      const formattedAvailability = {};
      
      daysOfWeek.forEach(day => {
        const dayLower = day.toLowerCase();
        const dayHours = availabilityHours[dayLower] || [];
        
        formattedAvailability[day] = {
          enabled: dayHours.length > 0,
          from: dayHours.length > 0 ? '09:00' : '09:00',
          to: dayHours.length > 0 ? '17:00' : '17:00'
        };
      });
      
      setAvailability(formattedAvailability);
    } catch (error) {
      console.error('Failed to load availability:', error);
      // Initialize with defaults
      const defaultAvailability = {};
      daysOfWeek.forEach(day => {
        defaultAvailability[day] = {
          enabled: false,
          from: '09:00',
          to: '17:00'
        };
      });
      setAvailability(defaultAvailability);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
    setHasChanges(true);
  };

  const updateTime = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const saveAvailability = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      // Convert UI format to backend format (hour slots)
      const availabilityHours = {};
      
      Object.keys(availability).forEach(day => {
        const dayData = availability[day];
        if (dayData.enabled) {
          const dayLower = day.toLowerCase();
          const fromHour = parseInt(dayData.from.split(':')[0]);
          const toHour = parseInt(dayData.to.split(':')[0]);
          
          const timeSlots = [];
          for (let hour = fromHour; hour < toHour; hour++) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`);
          }
          
          availabilityHours[dayLower] = timeSlots;
        }
      });
      
      await api.patch('/api/workforce/me/profile/availability', {
        availability_hours: availabilityHours,
        blackout_dates: []
      });
      
      setMessage({ type: 'success', text: 'Availability updated successfully!' });
      setHasChanges(false);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save availability:', error);
      
      if (error.response?.status === 409) {
        // Conflict with existing shifts
        const conflicts = error.response.data.detail.conflicts || [];
        setMessage({
          type: 'error',
          text: 'Cannot update availability - conflicts with accepted shifts',
          conflicts
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to save availability. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const getEnabledDaysCount = () => {
    return Object.values(availability).filter(day => day.enabled).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/workforce/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900">Work Availability</h1>
          <p className="text-gray-600 mt-2">
            Set your available days and hours for job matching. Enabled: {getEnabledDaysCount()}/7 days
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'success' ? (
                <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{message.text}</p>
                {message.conflicts && message.conflicts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-semibold">Conflicting shifts:</p>
                    {message.conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-sm bg-white bg-opacity-50 p-2 rounded">
                        <div><strong>Date:</strong> {conflict.shift_date}</div>
                        <div><strong>Time:</strong> {conflict.shift_time}</div>
                        <div><strong>Workplace:</strong> {conflict.workplace}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Availability Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {daysOfWeek.map(day => (
              <div key={day} className={`p-4 rounded-lg border-2 transition-all ${
                availability[day]?.enabled 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Day Checkbox */}
                  <div className="flex items-center gap-3 min-w-[150px]">
                    <input
                      type="checkbox"
                      id={`day-${day}`}
                      checked={availability[day]?.enabled || false}
                      onChange={() => toggleDay(day)}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label htmlFor={`day-${day}`} className="font-semibold text-gray-900 cursor-pointer">
                      {day}
                    </label>
                    {availability[day]?.enabled && (
                      <FiCheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {/* Time Pickers */}
                  {availability[day]?.enabled && (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <FiClock className="w-4 h-4 text-gray-600" />
                        <label className="text-sm text-gray-600 font-medium">From:</label>
                        <input
                          type="time"
                          value={availability[day]?.from || '09:00'}
                          onChange={(e) => updateTime(day, 'from', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 font-medium">To:</label>
                        <input
                          type="time"
                          value={availability[day]?.to || '17:00'}
                          onChange={(e) => updateTime(day, 'to', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasChanges && (
                <div className="flex items-center gap-2 text-orange-600">
                  <FiAlertCircle className="w-4 h-4" />
                  <span>You have unsaved changes</span>
                </div>
              )}
            </div>
            
            <button
              onClick={saveAvailability}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <FiSave className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How availability works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Enable days you're available to work</li>
                <li>Set your preferred working hours for each day</li>
                <li>Your availability is used for job matching and shift assignments</li>
                <li>You cannot change availability if it conflicts with accepted shifts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityPage;
