import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import { useTheme } from '../../contexts/ThemeContext';

const localizer = momentLocalizer(moment);

const WorkforceCalendar = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State
  const [view, setView] = useState('form'); // 'form' or 'calendar'
  const [calendarView, setCalendarView] = useState('week'); // 'day', 'week', 'month', 'agenda'
  const [events, setEvents] = useState([]);
  const [confirmedShifts, setConfirmedShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    days: {
      monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
      sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
    },
    untilDate: ''
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadAvailability();
    loadConfirmedShifts();
  }, []);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/workforce/availability/calendar');
      const availabilityEvents = response.data.data || [];
      
      // Convert to calendar events
      const calendarEvents = availabilityEvents.map(event => ({
        id: event.id,
        title: 'Available',
        start: new Date(event.start),
        end: new Date(event.end),
        type: 'available',
        allDay: false,
        resource: { editable: true }
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfirmedShifts = async () => {
    try {
      const response = await api.get('/api/workforce/my-shifts');
      const shifts = response.data.data || [];
      
      // Filter for confirmed/assigned shifts only
      const confirmed = shifts
        .filter(s => s.status === 'assigned' || s.status === 'confirmed')
        .map(shift => ({
          id: shift.shift_id,
          title: `🔒 ${shift.role_name}`,
          start: new Date(`${shift.shift_date}T${shift.start_time}`),
          end: new Date(`${shift.shift_date}T${shift.end_time}`),
          type: 'confirmed_shift',
          allDay: false,
          resource: { 
            editable: false, 
            shiftData: shift,
            canRequestDayOff: isMoreThan48Hours(shift.shift_date, shift.start_time)
          }
        }));
      
      setConfirmedShifts(confirmed);
    } catch (error) {
      console.error('Failed to load confirmed shifts:', error);
    }
  };

  const isMoreThan48Hours = (shiftDate, startTime) => {
    const shiftDateTime = new Date(`${shiftDate}T${startTime}`);
    const hoursUntil = (shiftDateTime - new Date()) / (1000 * 60 * 60);
    return hoursUntil >= 48;
  };

  const validateForm = () => {
    const errors = {};
    
    // Check if at least one day is selected
    const selectedDays = Object.entries(formData.days).filter(([_, day]) => day.enabled);
    if (selectedDays.length === 0) {
      errors.days = 'Please select at least one day';
    }
    
    // Check each enabled day for valid times and 12-hour limit
    const dayErrors = {};
    Object.entries(formData.days).forEach(([dayKey, day]) => {
      if (day.enabled) {
        // Check if end time is after start time
        if (day.startTime >= day.endTime) {
          dayErrors[dayKey] = 'End time must be after start time';
        }
        
        // Check 12-hour daily limit
        const startHour = parseInt(day.startTime.split(':')[0]);
        const startMin = parseInt(day.startTime.split(':')[1]);
        const endHour = parseInt(day.endTime.split(':')[0]);
        const endMin = parseInt(day.endTime.split(':')[1]);
        
        const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        const totalHours = totalMinutes / 60;
        
        if (totalHours > 12) {
          dayErrors[dayKey] = 'Cannot schedule more than 12 hours per day';
        }
      }
    });
    
    if (Object.keys(dayErrors).length > 0) {
      errors.dayErrors = dayErrors;
    }
    
    // Check until date
    if (!formData.untilDate) {
      errors.untilDate = 'Please select an end date';
    } else {
      const untilDate = new Date(formData.untilDate);
      if (untilDate < new Date()) {
        errors.untilDate = 'End date must be in the future';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkConflicts = async (startDate, endDate) => {
    try {
      const response = await api.get('/api/workforce/availability/conflicts', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      return { has_conflicts: false, conflicts: [] };
    }
  };

  const handleDayToggle = (dayKey) => {
    setFormData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          enabled: !prev.days[dayKey].enabled
        }
      }
    }));
    setFormErrors(prev => ({ ...prev, days: undefined }));
  };

  const handleDayTimeChange = (dayKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dayKey]: {
          ...prev.days[dayKey],
          [field]: value
        }
      }
    }));
    // Clear error for this specific day
    if (formErrors.dayErrors && formErrors.dayErrors[dayKey]) {
      const newDayErrors = { ...formErrors.dayErrors };
      delete newDayErrors[dayKey];
      setFormErrors(prev => ({ 
        ...prev, 
        dayErrors: Object.keys(newDayErrors).length > 0 ? newDayErrors : undefined 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date(formData.untilDate);
      
      // Check for conflicts with confirmed shifts
      const conflictCheck = await checkConflicts(startDate, endDate);
      if (conflictCheck.has_conflicts) {
        const conflictDates = conflictCheck.conflicts.map(c => 
          new Date(c.shift_date).toLocaleDateString()
        ).join(', ');
        
        if (!window.confirm(
          `Warning: You have confirmed shifts on: ${conflictDates}. ` +
          `You cannot change availability for these dates. Continue with other dates?`
        )) {
          setLoading(false);
          return;
        }
      }
      
      // If editing, delete old availability first
      if (editingEvent) {
        await api.delete(`/api/workforce/availability/calendar/${editingEvent.id}`);
      }

      // Create availability blocks for each selected day
      const requests = [];
      const currentDate = new Date(startDate);
      const conflictDates = new Set(
        conflictCheck.conflicts.map(c => new Date(c.shift_date).toDateString())
      );
      
      while (currentDate <= endDate) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayData = formData.days[dayName];
        
        // Skip if this day has a confirmed shift or is not enabled
        if (!conflictDates.has(currentDate.toDateString()) && dayData && dayData.enabled) {
          const eventStart = new Date(currentDate);
          const [startHour, startMin] = dayData.startTime.split(':');
          eventStart.setHours(parseInt(startHour), parseInt(startMin), 0);
          
          const eventEnd = new Date(currentDate);
          const [endHour, endMin] = dayData.endTime.split(':');
          eventEnd.setHours(parseInt(endHour), parseInt(endMin), 0);
          
          requests.push(
            api.post('/api/workforce/availability/calendar', {
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              type: 'available',
              title: 'Available'
            })
          );
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (requests.length === 0) {
        alert('No availability blocks to create (all selected dates have confirmed shifts)');
        setLoading(false);
        return;
      }
      
      await Promise.all(requests);
      
      // Reload availability
      await loadAvailability();
      
      // Switch to calendar view
      setView('calendar');
      setEditingEvent(null);
      
      // Reset form
      setFormData({
        days: {
          monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
          tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
          wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
          thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
          friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
          saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
          sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
        },
        untilDate: ''
      });
      
      alert(`Availability saved successfully! ${requests.length} time blocks created.`);
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    if (event.type === 'confirmed_shift') {
      // Show day off request option
      setSelectedShift(event);
      setShowDayOffModal(true);
    } else {
      // Edit availability block
      if (window.confirm('Do you want to edit this availability block?')) {
        const dayName = event.start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const startTime = moment(event.start).format('HH:mm');
        const endTime = moment(event.end).format('HH:mm');
        
        setEditingEvent(event);
        const newDays = {};
        Object.keys(formData.days).forEach(key => {
          newDays[key] = {
            enabled: key === dayName,
            startTime: key === dayName ? startTime : '09:00',
            endTime: key === dayName ? endTime : '17:00'
          };
        });
        
        setFormData({
          days: newDays,
          untilDate: moment(event.end).format('YYYY-MM-DD')
        });
        setView('form');
      }
    }
  };

  const handleRequestDayOff = async (reason) => {
    if (!selectedShift) return;
    
    setLoading(true);
    try {
      const response = await api.post('/api/workforce/request-day-off', {
        shift_id: selectedShift.id,
        reason: reason
      });
      
      alert(
        `Day off request submitted successfully!\n\n` +
        `${response.data.data.suggested_replacements_count} replacement workers suggested to your employer.\n` +
        `You will be notified when the employer responds.`
      );
      
      setShowDayOffModal(false);
      setSelectedShift(null);
    } catch (error) {
      console.error('Failed to request day off:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to submit request';
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL availability? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const deleteRequests = events.map(event => 
        api.delete(`/api/workforce/availability/calendar/${event.id}`)
      );
      await Promise.all(deleteRequests);
      
      setEvents([]);
      alert('All availability deleted successfully');
    } catch (error) {
      console.error('Failed to delete availability:', error);
      alert('Failed to delete some availability blocks');
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#10b981'; // green for available
    let borderColor = '#059669';
    
    if (event.type === 'confirmed_shift') {
      backgroundColor = '#3b82f6'; // blue for confirmed shifts
      borderColor = '#2563eb';
    }
    
    const style = {
      backgroundColor: backgroundColor,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '500'
    };
    return { style };
  };

  const dayNames = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  // Combine availability and confirmed shifts for calendar display
  const allEvents = [...events, ...confirmedShifts];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        showBack={true}
        onBackClick={() => navigate('/workforce/dashboard')}
        title="My Availability"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* View Toggle Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setView('form')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              view === 'form'
                ? 'text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            style={view === 'form' ? { backgroundColor: theme.primaryColor } : {}}
          >
            {editingEvent ? '✏️ Edit Availability' : '➕ Set Availability'}
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              view === 'calendar'
                ? 'text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            style={view === 'calendar' ? { backgroundColor: theme.primaryColor } : {}}
          >
            📅 View Calendar
          </button>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Important Rules</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>24-hour availability:</strong> You can set availability at any time of day</li>
            <li><strong>12-hour daily limit:</strong> Maximum 12 hours per day allowed</li>
            <li><strong>Confirmed shifts:</strong> Cannot change availability for dates with confirmed shifts (shown with 🔒)</li>
            <li><strong>Request day off:</strong> Click on confirmed shifts to request time off (must be 48+ hours in advance)</li>
          </ul>
        </div>

        {/* FORM VIEW */}
        {view === 'form' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingEvent ? 'Edit Your Availability' : 'Set Your Availability'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              {/* Days Selection with Individual Time Pickers */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Days and Set Times *
                </label>
                <div className="space-y-3">
                  {dayNames.map(({ key, label }) => (
                    <div 
                      key={key}
                      className={`border rounded-lg p-4 transition-all ${
                        formData.days[key].enabled 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {/* Day Checkbox */}
                      <label className="flex items-center mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.days[key].enabled}
                          onChange={() => handleDayToggle(key)}
                          className="w-5 h-5 rounded border-gray-300 mr-3"
                          style={{ accentColor: theme.primaryColor }}
                        />
                        <span className="font-semibold text-gray-900">{label}</span>
                      </label>
                      
                      {/* Time Pickers (only show when day is enabled) */}
                      {formData.days[key].enabled && (
                        <div className="grid grid-cols-2 gap-3 ml-8">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              From
                            </label>
                            <input
                              type="time"
                              value={formData.days[key].startTime}
                              onChange={(e) => handleDayTimeChange(key, 'startTime', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              To
                            </label>
                            <input
                              type="time"
                              value={formData.days[key].endTime}
                              onChange={(e) => handleDayTimeChange(key, 'endTime', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Error for this specific day */}
                      {formErrors.dayErrors && formErrors.dayErrors[key] && (
                        <p className="text-red-500 text-xs mt-2 ml-8">{formErrors.dayErrors[key]}</p>
                      )}
                    </div>
                  ))}
                </div>
                {formErrors.days && (
                  <p className="text-red-500 text-sm mt-2">{formErrors.days}</p>
                )}
              </div>

              {/* Until Date */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Available Until *
                </label>
                <input
                  type="date"
                  value={formData.untilDate}
                  onChange={(e) => {
                    setFormData({ ...formData, untilDate: e.target.value });
                    setFormErrors(prev => ({ ...prev, untilDate: undefined }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  style={{ focusRing: theme.primaryColor }}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your availability will repeat on selected days until this date (skipping dates with confirmed shifts)
                </p>
                {formErrors.untilDate && (
                  <p className="text-red-500 text-sm mt-2">{formErrors.untilDate}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {loading ? 'Saving...' : editingEvent ? 'Update Availability' : 'Save Availability'}
                </button>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(null);
                      setFormData({
                        days: {
                          monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                          tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                          wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                          thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                          friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                          saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
                          sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
                        },
                        untilDate: ''
                      });
                      setFormErrors({});
                    }}
                    className="px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Availability Calendar</h2>
              {events.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  🗑️ Delete All Availability
                </button>
              )}
            </div>

            {/* Calendar View Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setCalendarView('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  calendarView === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setCalendarView('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  calendarView === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarView('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  calendarView === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarView('agenda')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  calendarView === 'agenda' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Agenda
              </button>
            </div>

            {/* Legend */}
            <div className="flex gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-700">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-gray-700">Confirmed Shift (🔒)</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : allEvents.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg text-gray-600 mb-4">No availability or shifts yet</p>
                <button
                  onClick={() => setView('form')}
                  className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Set Your Availability
                </button>
              </div>
            ) : (
              <div style={{ height: '600px' }}>
                <BigCalendar
                  localizer={localizer}
                  events={allEvents}
                  startAccessor="start"
                  endAccessor="end"
                  view={calendarView}
                  onView={setCalendarView}
                  onSelectEvent={handleEventClick}
                  eventPropGetter={eventStyleGetter}
                  style={{ height: '100%' }}
                  min={new Date(2024, 0, 1, 0, 0, 0)}
                  max={new Date(2024, 0, 1, 23, 59, 59)}
                  step={30}
                  timeslots={2}
                />
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Click on green blocks to edit availability. Click on blue 🔒 blocks to request a day off (must be 48+ hours in advance).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Day Off Request Modal */}
      {showDayOffModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Request Day Off</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Shift Details:</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{selectedShift.title.replace('🔒 ', '')}</p>
                <p className="text-sm text-gray-600">
                  {moment(selectedShift.start).format('dddd, MMMM D, YYYY')}
                </p>
                <p className="text-sm text-gray-600">
                  {moment(selectedShift.start).format('h:mm A')} - {moment(selectedShift.end).format('h:mm A')}
                </p>
              </div>
            </div>

            {selectedShift.resource?.canRequestDayOff ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    id="dayOffReason"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="e.g., Personal, Medical, Family emergency"
                  ></textarea>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Your employer will be notified and will have access to replacement worker suggestions.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const reason = document.getElementById('dayOffReason').value;
                      handleRequestDayOff(reason);
                    }}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDayOffModal(false);
                      setSelectedShift(null);
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">
                    ❌ Cannot request day off for this shift. Day off requests must be made at least 48 hours before the shift start time.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDayOffModal(false);
                    setSelectedShift(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceCalendar;
