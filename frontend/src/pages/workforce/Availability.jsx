import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceLayout from '../../components/layout/WorkforceLayout';
import api from '../../utils/api';
import { Check, ChevronLeft, Save, Sun, Sunset, Moon, Clock } from 'lucide-react';

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

const Availability = () => {
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [minHours, setMinHours] = useState(10);
  const [maxHours, setMaxHours] = useState(40);
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
      
      // Load simplified format if exists
      if (profile.availability_simple) {
        setSelectedDays(profile.availability_simple.days || []);
        setSelectedPeriods(profile.availability_simple.periods || []);
        setMinHours(profile.availability_simple.min_hours || 10);
        setMaxHours(profile.availability_simple.max_hours || 40);
      } 
      // Convert from old format if needed
      else if (profile.availability_hours) {
        const days = Object.keys(profile.availability_hours).filter(
          day => profile.availability_hours[day]?.length > 0
        );
        setSelectedDays(days);
        // Default to daytime periods for existing users
        setSelectedPeriods(['morning', 'afternoon']);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const selectWeekdays = () => {
    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  };

  const selectAllDays = () => {
    setSelectedDays(DAYS.map(d => d.id));
  };

  const selectDaytime = () => {
    setSelectedPeriods(['morning', 'afternoon']);
  };

  const selectAnytime = () => {
    setSelectedPeriods(TIME_PERIODS.map(p => p.id));
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
            // Generate hour slots for this period
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

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }
    if (selectedPeriods.length === 0) {
      alert('Please select at least one time period');
      return;
    }

    setSaving(true);
    try {
      // Save both formats for compatibility
      await api.patch('/api/workforce/me/profile/availability', {
        availability_hours: convertToLegacyFormat(),
        availability_simple: {
          days: selectedDays,
          periods: selectedPeriods,
          min_hours: minHours,
          max_hours: maxHours
        }
      });
      alert('✅ Availability updated successfully!');
      navigate('/workforce/dashboard');
    } catch (error) {
      console.error('Failed to save availability:', error);
      if (error.response?.status === 409) {
        alert('Cannot update - conflicts with accepted shifts. Please cancel conflicting shifts first.');
      } else {
        alert('Failed to save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <WorkforceLayout title="My Availability">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </WorkforceLayout>
    );
  }

  return (
    <WorkforceLayout title="My Availability">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Days Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Which days can you work?</h2>
          <p className="text-sm text-gray-500 mb-4">Select all days you're generally available</p>
          
          {/* Day Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {DAYS.map(day => {
              const isSelected = selectedDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`relative px-4 py-3 rounded-xl font-medium transition-all ${
                    isSelected 
                      ? 'text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
                >
                  <span className="block text-sm">{day.label}</span>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <button
              onClick={selectWeekdays}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Weekdays Only
            </button>
            <button
              onClick={selectAllDays}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              All Days
            </button>
            <button
              onClick={() => setSelectedDays([])}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Time Periods Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Which times work for you?</h2>
          <p className="text-sm text-gray-500 mb-4">Select all time periods you can work</p>
          
          {/* Period Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {TIME_PERIODS.map(period => {
              const isSelected = selectedPeriods.includes(period.id);
              const IconComponent = period.icon;
              return (
                <button
                  key={period.id}
                  onClick={() => togglePeriod(period.id)}
                  className={`relative p-4 rounded-xl text-left transition-all ${
                    isSelected 
                      ? 'text-white shadow-md' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                  style={isSelected ? { backgroundColor: theme.primaryColor } : {}}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent size={24} className={isSelected ? 'text-white/80' : 'text-gray-400'} />
                    <div>
                      <div className="font-semibold">{period.label}</div>
                      <div className={`text-sm ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        {period.time}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Select */}
          <div className="flex gap-2">
            <button
              onClick={selectDaytime}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Daytime Only
            </button>
            <button
              onClick={selectAnytime}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Any Time
            </button>
            <button
              onClick={() => setSelectedPeriods([])}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Hours Preference */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">How many hours per week?</h2>
          <p className="text-sm text-gray-500 mb-4">Set your preferred weekly hours range</p>
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum</label>
              <div className="relative">
                <input
                  type="number"
                  value={minHours}
                  onChange={(e) => setMinHours(Math.max(0, Math.min(parseInt(e.target.value) || 0, maxHours)))}
                  min="0"
                  max={maxHours}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-lg font-medium"
                  style={{ '--tw-ring-color': theme.primaryColor }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">hrs</span>
              </div>
            </div>
            <div className="text-gray-400 pt-6">to</div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum</label>
              <div className="relative">
                <input
                  type="number"
                  value={maxHours}
                  onChange={(e) => setMaxHours(Math.max(minHours, Math.min(parseInt(e.target.value) || 0, 80)))}
                  min={minHours}
                  max="80"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-lg font-medium"
                  style={{ '--tw-ring-color': theme.primaryColor }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">hrs</span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setMinHours(10); setMaxHours(20); }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Part-Time
            </button>
            <button
              onClick={() => { setMinHours(35); setMaxHours(40); }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Full-Time
            </button>
            <button
              onClick={() => { setMinHours(0); setMaxHours(80); }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Flexible
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Your Availability Summary</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Days:</span>{' '}
              {selectedDays.length > 0 
                ? selectedDays.map(d => DAYS.find(day => day.id === d)?.full).join(', ')
                : <span className="text-gray-400">None selected</span>
              }
            </p>
            <p>
              <span className="font-medium">Times:</span>{' '}
              {selectedPeriods.length > 0
                ? selectedPeriods.map(p => TIME_PERIODS.find(per => per.id === p)?.label).join(', ')
                : <span className="text-gray-400">None selected</span>
              }
            </p>
            <p>
              <span className="font-medium">Hours:</span>{' '}
              {minHours}-{maxHours} hours/week
            </p>
          </div>
        </div>

        {/* Save Button (Mobile) */}
        <button
          onClick={handleSave}
          disabled={saving || selectedDays.length === 0 || selectedPeriods.length === 0}
          className="w-full py-4 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 transition-all hover:opacity-90"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </WorkforceLayout>
  );
};

export default Availability;
