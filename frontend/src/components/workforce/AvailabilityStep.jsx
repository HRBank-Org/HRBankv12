import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const AvailabilityStep = ({ data, onNext, onBack }) => {
  const [availability, setAvailability] = useState(
    data.availability_hours || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
  );
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const toggleTimeSlot = (day, hour) => {
    const dayLower = day.toLowerCase();
    const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    const daySlots = availability[dayLower] || [];
    
    if (daySlots.includes(timeSlot)) {
      setAvailability({
        ...availability,
        [dayLower]: daySlots.filter(t => t !== timeSlot)
      });
    } else {
      setAvailability({
        ...availability,
        [dayLower]: [...daySlots, timeSlot].sort()
      });
    }
  };

  const copyToAllDays = () => {
    const mondaySlots = availability.monday || [];
    const newAvailability = {};
    DAYS.forEach(day => {
      newAvailability[day.toLowerCase()] = [...mondaySlots];
    });
    setAvailability(newAvailability);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.patch('/api/workforce/me/profile/availability', {
        availability_hours: availability,
        blackout_dates: []
      });
      onNext({ availability_hours: availability });
    } catch (err) {
      alert('Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotSelected = (day, hour) => {
    const daySlots = availability[day.toLowerCase()] || [];
    const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
    return daySlots.includes(timeSlot);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">When Are You Available?</h2>
      <p className="text-gray-600 mb-6">Select the times you're available to work</p>

      {/* Copy to All Days Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={copyToAllDays}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Copy Monday to All Days
        </button>
      </div>

      {/* Availability Grid */}
      <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
              {HOURS.map(hour => (
                <th key={hour} className="px-2 py-3 text-center text-xs font-medium text-gray-500">
                  {hour % 12 || 12}{hour >= 12 ? 'PM' : 'AM'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {DAYS.map(day => (
              <tr key={day}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {day}
                </td>
                {HOURS.map(hour => (
                  <td key={hour} className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => toggleTimeSlot(day, hour)}
                      className="w-full h-10 rounded transition-all"
                      style={{
                        backgroundColor: isTimeSlotSelected(day, hour) ? theme.primaryColor : '#F3F4F6'
                      }}
                      title={`${day} ${hour}:00-${hour + 1}:00`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        💡 Tip: Click on time blocks to toggle your availability. Green blocks = available.
      </p>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-8 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {loading ? 'Saving...' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default AvailabilityStep;
