import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { Check, Sun, Sunset, Moon, Clock } from 'lucide-react';

const DAYS = [
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
  { id: 'sunday', label: 'Sun', full: 'Sunday' },
];

const TIME_PERIODS = [
  { id: 'morning', label: 'Morning', time: '6 AM - 12 PM', icon: Sun, startHour: 6, endHour: 12 },
  { id: 'afternoon', label: 'Afternoon', time: '12 PM - 6 PM', icon: Sunset, startHour: 12, endHour: 18 },
  { id: 'evening', label: 'Evening', time: '6 PM - 12 AM', icon: Moon, startHour: 18, endHour: 24 },
  { id: 'overnight', label: 'Overnight', time: '12 AM - 6 AM', icon: Clock, startHour: 0, endHour: 6 },
];

const AvailabilityStep = ({ data, onNext, onBack }) => {
  // Initialize from existing data
  const existingSimple = data.availability_simple || {};
  const [selectedDays, setSelectedDays] = useState(existingSimple.days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [selectedPeriods, setSelectedPeriods] = useState(existingSimple.periods || ['morning', 'afternoon']);
  const [minHours, setMinHours] = useState(existingSimple.min_hours || 20);
  const [maxHours, setMaxHours] = useState(existingSimple.max_hours || 40);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const toggleDay = (dayId) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const togglePeriod = (periodId) => {
    setSelectedPeriods(prev => 
      prev.includes(periodId)
        ? prev.filter(p => p !== periodId)
        : [...prev, periodId]
    );
  };

  // Convert simple format to legacy format for backward compatibility
  const convertToLegacyFormat = () => {
    const legacyFormat = {};
    
    DAYS.forEach(day => {
      if (selectedDays.includes(day.id)) {
        const slots = [];
        selectedPeriods.forEach(periodId => {
          const period = TIME_PERIODS.find(p => p.id === periodId);
          if (period) {
            for (let h = period.startHour; h < period.endHour; h++) {
              slots.push(`${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`);
            }
          }
        });
        legacyFormat[day.id] = slots.sort();
      } else {
        legacyFormat[day.id] = [];
      }
    });
    
    return legacyFormat;
  };

  const handleSubmit = async () => {
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }
    if (selectedPeriods.length === 0) {
      alert('Please select at least one time period');
      return;
    }

    setLoading(true);
    try {
      const availabilitySimple = {
        days: selectedDays,
        periods: selectedPeriods,
        min_hours: minHours,
        max_hours: maxHours
      };

      await api.patch('/api/workforce/me/profile/availability', {
        availability_hours: convertToLegacyFormat(),
        availability_simple: availabilitySimple,
        blackout_dates: []
      });
      
      onNext({ 
        availability_hours: convertToLegacyFormat(),
        availability_simple: availabilitySimple
      });
    } catch (err) {
      alert('Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">When Can You Work?</h2>
      <p className="text-gray-600 mb-6">This helps us match you with the right opportunities</p>

      {/* Days Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Available Days</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const isSelected = selectedDays.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                className={`relative px-4 py-2.5 rounded-lg font-medium transition-all ${
                  isSelected 
                    ? 'text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
              >
                {day.label}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
            className="text-sm text-blue-600 hover:underline"
          >
            Weekdays
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setSelectedDays(DAYS.map(d => d.id))}
            className="text-sm text-blue-600 hover:underline"
          >
            All Days
          </button>
        </div>
      </div>

      {/* Time Periods */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Available Times</label>
        <div className="grid grid-cols-2 gap-3">
          {TIME_PERIODS.map(period => {
            const isSelected = selectedPeriods.includes(period.id);
            const IconComponent = period.icon;
            return (
              <button
                key={period.id}
                type="button"
                onClick={() => togglePeriod(period.id)}
                className={`relative p-3 rounded-lg text-left transition-all border ${
                  isSelected 
                    ? 'text-white border-transparent shadow-md' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                }`}
                style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
              >
                <div className="flex items-center gap-2">
                  <IconComponent size={18} className={isSelected ? 'text-white/80' : 'text-gray-400'} />
                  <div>
                    <div className="font-medium text-sm">{period.label}</div>
                    <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      {period.time}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => setSelectedPeriods(['morning', 'afternoon'])}
            className="text-sm text-blue-600 hover:underline"
          >
            Daytime
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={() => setSelectedPeriods(TIME_PERIODS.map(p => p.id))}
            className="text-sm text-blue-600 hover:underline"
          >
            Any Time
          </button>
        </div>
      </div>

      {/* Hours per Week */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Weekly Hours</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <input
              type="number"
              value={minHours}
              onChange={(e) => setMinHours(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max={maxHours}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
            />
          </div>
          <span className="text-gray-400 pt-5">to</span>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Maximum</label>
            <input
              type="number"
              value={maxHours}
              onChange={(e) => setMaxHours(Math.max(minHours, parseInt(e.target.value) || 0))}
              min={minHours}
              max="80"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => { setMinHours(10); setMaxHours(20); }}
            className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            Part-Time
          </button>
          <button
            type="button"
            onClick={() => { setMinHours(35); setMaxHours(40); }}
            className="text-sm px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            Full-Time
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Summary:</strong> Available {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} per week, 
          {' '}{selectedPeriods.map(p => TIME_PERIODS.find(t => t.id === p)?.label).join(' + ') || 'no times selected'}, 
          {' '}{minHours}-{maxHours} hours/week
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || selectedDays.length === 0 || selectedPeriods.length === 0}
          className="flex-1 py-3 text-white rounded-lg font-medium disabled:opacity-50"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default AvailabilityStep;
