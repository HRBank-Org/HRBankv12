import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/common/Calendar';
import api from '../../utils/api';
import moment from 'moment';

import { useLanguage } from '../../contexts/LanguageContext';

const WorkforceCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'available', // available or blackout
    start: null,
    end: null,
    recurring: false,
    recurringPattern: 'weekly',
    recurringEndDate: null
  });

  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const response = await api.get('/api/workforce/availability/calendar');
      const availabilityEvents = response.data.data || [];
      
      // Convert dates from backend to Date objects
      const formattedEvents = availabilityEvents.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        title: event.type === 'available' ? '✅ Available' : '❌ Blackout',
        color: event.type === 'available' ? '#10b981' : '#ef4444' // green for available, red for blackout
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to load availability:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedSlot(slotInfo);
    setEventForm({
      title: '',
      type: 'available',
      start: slotInfo.start,
      end: slotInfo.end,
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setEditingEvent(null);
    setShowEventModal(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      type: event.type || 'available',
      start: event.start,
      end: event.end,
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setShowEventModal(true);
  }, []);

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    if (!window.confirm('Are you sure you want to delete this availability block?')) {
      return;
    }

    try {
      await api.delete(`/api/workforce/availability/calendar/${editingEvent.id}`);
      setEvents(events.filter(e => e.id !== editingEvent.id));
      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Failed to delete availability:', error);
      alert('Failed to delete availability block. Please try again.');
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.start || !eventForm.end) {
      alert('Please select start and end times');
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        type: eventForm.type,
        title: eventForm.type === 'available' ? '✅ Available' : '❌ Blackout',
        start: eventForm.start.toISOString(),
        end: eventForm.end.toISOString(),
        recurring: eventForm.recurring,
        recurringPattern: eventForm.recurring ? eventForm.recurringPattern : null,
        recurringEndDate: eventForm.recurring && eventForm.recurringEndDate 
          ? eventForm.recurringEndDate.toISOString() 
          : null
      };

      if (editingEvent) {
        // Update existing availability
        const response = await api.put(`/api/workforce/availability/calendar/${editingEvent.id}`, eventData);
        const updatedEvent = response.data.data || response.data;
        
        setEvents(events.map(e => 
          e.id === editingEvent.id 
            ? { 
                ...updatedEvent, 
                start: new Date(updatedEvent.start), 
                end: new Date(updatedEvent.end),
                color: updatedEvent.type === 'available' ? '#10b981' : '#ef4444'
              }
            : e
        ));
      } else {
        // Create new availability block(s)
        const response = await api.post('/api/workforce/availability/calendar', eventData);
        
        const newEvents = response.data.data || [response.data];
        const formattedNewEvents = newEvents.map(event => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          title: event.type === 'available' ? '✅ Available' : '❌ Blackout',
          color: event.type === 'available' ? '#10b981' : '#ef4444'
        }));
        
        setEvents([...events, ...formattedNewEvents]);
      }

      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      type: 'available',
      start: null,
      end: null,
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setSelectedSlot(null);
    setEditingEvent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.primaryColor }}></div>
          <p className="text-gray-600">Loading your availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* Header */}
      <header className="text-white px-6 py-4" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/workforce/dashboard')}
              className="text-white hover:opacity-80"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">My Availability Calendar</h1>
              <p className="text-sm opacity-90">Set when you're available to work</p>
            </div>
          </div>
        </div>
      </header>

      {/* Instructions */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-900 font-semibold mb-2">📅 How to Use Your Calendar</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Click any time slot</strong> to mark yourself as available or set a blackout period</li>
            <li>• <strong>Green blocks (✅)</strong> = Times you're available for shifts</li>
            <li>• <strong>Red blocks (❌)</strong> = Blackout times (college, personal commitments)</li>
            <li>• <strong>Click an existing block</strong> to edit or delete it</li>
            <li>• <strong>Set recurring patterns</strong> (e.g., every Monday 9am-5pm)</li>
            <li>• Only shifts matching your available times will be shown to you</li>
          </ul>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <Calendar
            events={events}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            defaultView="week"
          />
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingEvent ? 'Edit Availability' : 'Set Availability'}
            </h3>

            {/* Availability Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEventForm({...eventForm, type: 'available'})}
                  className={`p-3 rounded-lg border-2 text-center font-medium transition-all ${
                    eventForm.type === 'available'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  ✅ Available
                </button>
                <button
                  type="button"
                  onClick={() => setEventForm({...eventForm, type: 'blackout'})}
                  className={`p-3 rounded-lg border-2 text-center font-medium transition-all ${
                    eventForm.type === 'blackout'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  ❌ Blackout
                </button>
              </div>
            </div>

            {/* Time Display */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Start:</strong> {eventForm.start ? moment(eventForm.start).format('ddd, MMM D, YYYY h:mm A') : 'Not set'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>End:</strong> {eventForm.end ? moment(eventForm.end).format('ddd, MMM D, YYYY h:mm A') : 'Not set'}
              </p>
            </div>

            {/* Recurring Option */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventForm.recurring}
                  onChange={(e) => setEventForm({...eventForm, recurring: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Repeat this {eventForm.type === 'available' ? 'availability' : 'blackout'}</span>
              </label>
              
              {eventForm.recurring && (
                <div className="mt-3 space-y-3">
                  <select
                    value={eventForm.recurringPattern}
                    onChange={(e) => setEventForm({...eventForm, recurringPattern: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Every Day</option>
                    <option value="weekly">Every Week</option>
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                  </select>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Repeat Until:</label>
                    <input
                      type="date"
                      onChange={(e) => setEventForm({...eventForm, recurringEndDate: e.target.value ? new Date(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEventModal(false);
                  resetEventForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {editingEvent && (
                <button
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              
              <button
                onClick={handleSaveEvent}
                disabled={saving}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {saving ? 'Saving...' : editingEvent ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforceCalendar;
