import React, { useState } from 'react';
import api from '../../services/api';
import { Button } from '../ui/button';
import { Clock, Calendar, Repeat } from 'lucide-react';

const RecurringShiftDialog = ({ rosterId, role, weekStart, weekEnd, onClose, onSuccess }) => {
  const [shiftData, setShiftData] = useState({
    shift_date: weekStart,
    start_time: '09:00',
    end_time: '17:00',
    recurring: false,
    recurring_days: [],
    color: '#3B82F6'
  });
  const [loading, setLoading] = useState(false);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const colorOptions = [
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
  ];

  const toggleDay = (dayIndex) => {
    const days = [...shiftData.recurring_days];
    const index = days.indexOf(dayIndex);
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(dayIndex);
    }
    setShiftData({...shiftData, recurring_days: days.sort()});
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const payload = {
        roster_id: rosterId,
        role_id: role.role_id,
        shift_date: shiftData.shift_date,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        color: shiftData.color,
        recurring: shiftData.recurring,
        recurring_days: shiftData.recurring ? shiftData.recurring_days : [],
        recurring_end_date: shiftData.recurring ? weekEnd : null
      };

      const response = await api.post(`/api/rosters/${rosterId}/shifts`, payload);
      if (response.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to create shifts:', error);
      alert('Failed to create shifts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="text-xl font-semibold">Create Shifts</h3>
        </div>
        
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Role: {role.role_name}</p>
        </div>

        <div className="space-y-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              value={shiftData.shift_date}
              onChange={(e) => setShiftData({...shiftData, shift_date: e.target.value})}
              min={weekStart}
              max={weekEnd}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={shiftData.start_time}
                onChange={(e) => setShiftData({...shiftData, start_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={shiftData.end_time}
                onChange={(e) => setShiftData({...shiftData, end_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calendar Color
            </label>
            <div className="flex gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  onClick={() => setShiftData({...shiftData, color: color.value})}
                  className={`w-10 h-10 rounded-lg transition-transform ${
                    shiftData.color === color.value ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Recurring Toggle */}
          <div className="border-t pt-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shiftData.recurring}
                onChange={(e) => setShiftData({...shiftData, recurring: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 flex items-center">
                <Repeat className="w-4 h-4 mr-1" />
                Create recurring shifts
              </span>
            </label>
            {shiftData.recurring && (
              <p className="text-xs text-gray-500 mt-1">
                Select which days to repeat this shift for the entire week
              </p>
            )}
          </div>

          {/* Recurring Days Selection */}
          {shiftData.recurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat on days:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {dayNames.map((day, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      shiftData.recurring_days.includes(index)
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={shiftData.recurring_days.includes(index)}
                      onChange={() => toggleDay(index)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {shiftData.recurring && shiftData.recurring_days.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
              <p className="text-sm text-gray-600">
                Will create shifts on {shiftData.recurring_days.map(d => dayNames[d]).join(', ')}
                <br />
                Time: {shiftData.start_time} - {shiftData.end_time}
                <br />
                {shiftData.recurring_days.length} shift(s) will be created
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading || (shiftData.recurring && shiftData.recurring_days.length === 0)}
          >
            {loading ? 'Creating...' : 'Create Shifts'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecurringShiftDialog;