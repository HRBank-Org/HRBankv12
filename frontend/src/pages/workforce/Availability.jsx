import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23 (00:00 to 23:00)

const Availability = () => {
  const [availability, setAvailability] = useState({
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
  });
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const response = await api.get('/api/workforce/me/profile');
      const profile = response.data.data;
      if (profile.availability_hours) {
        setAvailability(profile.availability_hours);
      }
      if (profile.blackout_dates) {
        setBlackoutDates(profile.blackout_dates);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTimeSlot = (day, hour) => {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    const daySlots = availability[day] || [];
    
    if (daySlots.includes(timeSlot)) {
      setAvailability({
        ...availability,
        [day]: daySlots.filter(t => t !== timeSlot)
      });
    } else {
      setAvailability({
        ...availability,
        [day]: [...daySlots, timeSlot].sort()
      });
    }
  };

  const copyToAllDays = () => {
    const mondaySlots = availability.monday || [];
    const newAvailability = {};
    DAYS.forEach(day => {
      newAvailability[day] = [...mondaySlots];
    });
    setAvailability(newAvailability);
  };

  const setFullDay = (day) => {
    const allSlots = HOURS.map(h => `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`);
    setAvailability({
      ...availability,
      [day]: allSlots
    });
  };

  const clearDay = (day) => {
    setAvailability({
      ...availability,
      [day]: []
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/workforce/me/profile/availability', {
        availability_hours: availability,
        blackout_dates: blackoutDates
      });
      alert('Availability updated successfully!');
      navigate('/workforce/dashboard');
    } catch (error) {
      console.error('Failed to save availability:', error);
      
      // Check if it's a conflict error
      if (error.response?.status === 409) {
        const conflicts = error.response.data?.detail?.conflicts || [];
        if (conflicts.length > 0) {
          const conflictMessages = conflicts.map(c => 
            `• ${c.workplace} on ${new Date(c.shift_date).toLocaleDateString()} at ${c.shift_time}`
          ).join('\n');
          
          alert(`❌ Cannot Update Availability\n\nYou have accepted shifts that conflict with your new availability:\n\n${conflictMessages}\n\nPlease cancel these shifts first or adjust your availability to include these times.`);
        } else {
          alert('Cannot update availability - conflicts with accepted shifts');
        }
      } else {
        alert('Failed to save availability. Please try again.');
      }
    } finally {
      setSaving(false);
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
      <header className="text-white px-4 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workforce/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">My Availability</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">When Can You Work?</h2>
              <p className="text-sm text-gray-600 mt-1">
                Set your availability schedule. This applies to ALL your occupation profiles.
              </p>
            </div>
            <button
              onClick={copyToAllDays}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Copy Monday to All Days
            </button>
          </div>

          {/* 24-Hour Availability Grid */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                    Day
                  </th>
                  {HOURS.map(hour => (
                    <th key={hour} className="px-1 py-2 text-center text-xs font-medium text-gray-500">
                      {hour.toString().padStart(2, '0')}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DAYS.map(day => {
                  const daySlots = availability[day] || [];
                  const hoursSelected = daySlots.length;
                  return (
                    <tr key={day}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize sticky left-0 bg-white">
                        {day}
                        <div className="text-xs text-gray-500">{hoursSelected}h</div>
                      </td>
                      {HOURS.map(hour => {
                        const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
                        const isSelected = daySlots.includes(timeSlot);
                        return (
                          <td key={hour} className="px-0.5 py-1">
                            <button
                              type="button"
                              onClick={() => toggleTimeSlot(day, hour)}
                              className="w-full h-8 rounded transition-all hover:opacity-80"
                              style={{
                                backgroundColor: isSelected ? theme.primaryColor : '#F3F4F6'
                              }}
                              title={`${day} ${hour}:00-${hour + 1}:00`}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-1">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setFullDay(day)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            24h
                          </button>
                          <button
                            onClick={() => clearDay(day)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>💡 <strong>Tip:</strong> Click blocks to toggle hours. Colored blocks = available. Use "24h" to select full day or "Clear" to deselect all.</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong>Universal Availability:</strong> This schedule applies to all your occupation profiles. 
              The job matching system will only show you shifts during your available hours, regardless of which occupation profile matches the job.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Availability;
