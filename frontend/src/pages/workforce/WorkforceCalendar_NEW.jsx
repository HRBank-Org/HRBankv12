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
  const [loading, setLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    startTime: '09:00',
    endTime: '17:00',
    untilDate: ''
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/workforce/availability/calendar');
      const availabilityEvents = response.data.data || [];
      
      // Convert to calendar events
      const calendarEvents = availabilityEvents.map(event => ({
        id: event.id,
        title: event.type === 'available' ? 'Available' : 'Unavailable',
        start: new Date(event.start),
        end: new Date(event.end),
        type: event.type,
        allDay: false
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const selectedDays = Object.keys(formData.days).filter(day => formData.days[day]);
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }
    
    if (!formData.untilDate) {
      alert('Please select an end date');
      return;
    }
    
    if (formData.startTime >= formData.endTime) {
      alert('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      // If editing, delete old availability first
      if (editingEvent) {
        await api.delete(`/api/workforce/availability/calendar/${editingEvent.id}`);
      }

      // Create availability blocks for each selected day
      const requests = [];
      const startDate = new Date();
      const endDate = new Date(formData.untilDate);
      
      // Generate all dates until end date
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        if (formData.days[dayName]) {
          // Create availability event for this day
          const eventStart = new Date(currentDate);
          const [startHour, startMin] = formData.startTime.split(':');
          eventStart.setHours(parseInt(startHour), parseInt(startMin), 0);
          
          const eventEnd = new Date(currentDate);
          const [endHour, endMin] = formData.endTime.split(':');
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
      
      await Promise.all(requests);
      
      // Reload availability
      await loadAvailability();
      
      // Switch to calendar view
      setView('calendar');
      setEditingEvent(null);
      
      // Reset form
      setFormData({
        days: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false
        },
        startTime: '09:00',
        endTime: '17:00',
        untilDate: ''
      });
      
      alert('Availability saved successfully!');
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    if (window.confirm('Do you want to edit this availability block?')) {
      // Load event data into form
      const dayName = event.start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const startTime = moment(event.start).format('HH:mm');
      const endTime = moment(event.end).format('HH:mm');
      
      setEditingEvent(event);
      setFormData({
        days: {
          monday: dayName === 'monday',
          tuesday: dayName === 'tuesday',
          wednesday: dayName === 'wednesday',
          thursday: dayName === 'thursday',
          friday: dayName === 'friday',
          saturday: dayName === 'saturday',
          sunday: dayName === 'sunday'
        },
        startTime: startTime,
        endTime: endTime,
        untilDate: moment(event.end).format('YYYY-MM-DD')
      });
      setView('form');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL availability? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // Delete all events
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
    const style = {
      backgroundColor: event.type === 'available' ? '#10b981' : '#ef4444',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
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

        {/* FORM VIEW */}
        {view === 'form' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingEvent ? 'Edit Your Availability' : 'Set Your Availability'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              {/* Days Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Days
                </label>
                <div className="space-y-2">
                  {dayNames.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.days[key]}
                        onChange={() => handleDayToggle(key)}
                        className="w-5 h-5 rounded border-gray-300 mr-3"
                        style={{ accentColor: theme.primaryColor }}
                      />
                      <span className="font-medium text-gray-900">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    style={{ focusRing: theme.primaryColor }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    style={{ focusRing: theme.primaryColor }}
                    required
                  />
                </div>
              </div>

              {/* Until Date */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Available Until
                </label>
                <input
                  type="date"
                  value={formData.untilDate}
                  onChange={(e) => setFormData({ ...formData, untilDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  style={{ focusRing: theme.primaryColor }}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your availability will repeat on selected days until this date
                </p>
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
                          monday: false,
                          tuesday: false,
                          wednesday: false,
                          thursday: false,
                          friday: false,
                          saturday: false,
                          sunday: false
                        },
                        startTime: '09:00',
                        endTime: '17:00',
                        untilDate: ''
                      });
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
                  🗑️ Delete All
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

            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg text-gray-600 mb-4">No availability set yet</p>
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
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  view={calendarView}
                  onView={setCalendarView}
                  onSelectEvent={handleEventClick}
                  eventPropGetter={eventStyleGetter}
                  style={{ height: '100%' }}
                  min={new Date(2024, 0, 1, 6, 0, 0)}
                  max={new Date(2024, 0, 1, 23, 0, 0)}
                  step={30}
                  timeslots={2}
                />
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Click on any availability block in the calendar to edit it. You can change the days, times, or end date.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkforceCalendar;
