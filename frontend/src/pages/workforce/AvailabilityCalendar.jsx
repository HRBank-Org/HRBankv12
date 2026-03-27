import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/common/Calendar';
import api from '../../utils/api';
import moment from 'moment';

import { useLanguage } from '../../contexts/LanguageContext';

const AvailabilityCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    start: null,
    end: null,
    type: 'availability',
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
        type: event.type || 'availability'
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to load availability:', error);
      // If endpoint doesn't exist yet, start with empty events
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedSlot(slotInfo);
    setEventForm({
      title: 'Available',
      start: slotInfo.start,
      end: slotInfo.end,
      type: 'availability',
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setShowEventModal(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    if (window.confirm('Do you want to delete this availability slot?')) {
      deleteEvent(event.id);
    }
  }, []);

  const deleteEvent = async (eventId) => {
    try {
      await api.delete(`/api/workforce/availability/calendar/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete availability. Please try again.');
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.start || !eventForm.end) {
      alert('Please select a valid time slot');
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        title: eventForm.title,
        start: eventForm.start.toISOString(),
        end: eventForm.end.toISOString(),
        type: eventForm.type,
        recurring: eventForm.recurring,
        recurringPattern: eventForm.recurring ? eventForm.recurringPattern : null,
        recurringEndDate: eventForm.recurring && eventForm.recurringEndDate 
          ? eventForm.recurringEndDate.toISOString() 
          : null
      };

      const response = await api.post('/api/workforce/availability/calendar', eventData);
      
      // Add new event(s) to the calendar
      const newEvents = response.data.data || [response.data];
      const formattedNewEvents = newEvents.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      }));
      
      setEvents([...events, ...formattedNewEvents]);
      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Failed to save event:', error);
      
      if (error.response?.status === 409) {
        alert('❌ Conflict: This availability overlaps with an accepted shift. Please adjust your availability or cancel the conflicting shift.');
      } else {
        alert('Failed to save availability. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      start: null,
      end: null,
      type: 'availability',
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setSelectedSlot(null);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    resetEventForm();
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
      {/* Header */}
      <header className="text-white px-4 py-4 shadow-md" style={{ backgroundColor: theme.primaryColor }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workforce/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">My Availability Calendar</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Set Your Availability</h2>
            <p className="text-sm text-gray-600 mt-1">
              Click and drag on the calendar to set when you're available to work. Click on existing slots to remove them.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444', opacity: 0.5 }}></div>
              <span>Blackout</span>
            </div>
          </div>

          {/* Calendar */}
          <Calendar
            events={events}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable={true}
            view="week"
            step={30}
            timeslots={2}
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong>Tips:</strong> 
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Click and drag to create availability blocks with specific times</li>
                <li>Click on an existing block to delete it</li>
                <li>Use recurring events to set weekly patterns</li>
                <li>You cannot set availability during accepted shifts</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Availability</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Available, Morning shift"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("pages.common.type")}</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="availability">Available</option>
                  <option value="blackout">Blackout (Unavailable)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="text"
                  value={eventForm.start ? moment(eventForm.start).format('MMM DD, YYYY h:mm A') : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="text"
                  value={eventForm.end ? moment(eventForm.end).format('MMM DD, YYYY h:mm A') : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eventForm.recurring}
                    onChange={(e) => setEventForm({ ...eventForm, recurring: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Recurring Event</span>
                </label>
              </div>

              {eventForm.recurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Pattern</label>
                    <select
                      value={eventForm.recurringPattern}
                      onChange={(e) => setEventForm({ ...eventForm, recurringPattern: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Until</label>
                    <input
                      type="date"
                      value={eventForm.recurringEndDate ? moment(eventForm.recurringEndDate).format('YYYY-MM-DD') : ''}
                      onChange={(e) => setEventForm({ 
                        ...eventForm, 
                        recurringEndDate: e.target.value ? new Date(e.target.value) : null 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving}
                className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
