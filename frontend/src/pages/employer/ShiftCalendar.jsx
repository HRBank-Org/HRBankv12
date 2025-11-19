import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/common/Calendar';
import api from '../../utils/api';
import moment from 'moment';

const ShiftCalendar = () => {
  const [events, setEvents] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    workplace_id: '',
    start: null,
    end: null,
    positions_needed: 1,
    description: '',
    recurring: false,
    recurringPattern: 'weekly',
    recurringEndDate: null
  });

  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load workplaces
      const workplacesRes = await api.get('/api/employer/workplaces');
      const workplacesData = workplacesRes.data.data || workplacesRes.data || [];
      // Ensure workplacesData is an array
      setWorkplaces(Array.isArray(workplacesData) ? workplacesData : []);

      // Load shifts
      await loadShifts();
    } catch (error) {
      console.error('Failed to load data:', error);
      setWorkplaces([]); // Ensure workplaces is always an array
    } finally {
      setLoading(false);
    }
  };

  const loadShifts = async () => {
    try {
      const response = await api.get('/api/employer/shifts/calendar');
      const shiftEvents = response.data.data || [];
      
      // Convert dates from backend to Date objects
      const formattedEvents = shiftEvents.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        type: 'shift'
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      // If endpoint doesn't exist yet, start with empty events
      setEvents([]);
    }
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    if (workplaces.length === 0) {
      alert('Please create a workplace first before scheduling shifts.');
      return;
    }

    setSelectedSlot(slotInfo);
    setEventForm({
      title: '',
      workplace_id: workplaces[0]?.id || '',
      start: slotInfo.start,
      end: slotInfo.end,
      positions_needed: 1,
      description: '',
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setEditingEvent(null);
    setShowEventModal(true);
  }, [workplaces]);

  const handleSelectEvent = useCallback((event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      workplace_id: event.workplace_id || '',
      start: event.start,
      end: event.end,
      positions_needed: event.positions_needed || 1,
      description: event.description || '',
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setShowEventModal(true);
  }, []);

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    if (!window.confirm('Are you sure you want to delete this shift?')) {
      return;
    }

    try {
      await api.delete(`/api/employer/shifts/calendar/${editingEvent.id}`);
      setEvents(events.filter(e => e.id !== editingEvent.id));
      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Failed to delete shift:', error);
      alert('Failed to delete shift. Please try again.');
    }
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.workplace_id || !eventForm.start || !eventForm.end) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        title: eventForm.title,
        workplace_id: eventForm.workplace_id,
        start: eventForm.start.toISOString(),
        end: eventForm.end.toISOString(),
        positions_needed: parseInt(eventForm.positions_needed),
        description: eventForm.description,
        recurring: eventForm.recurring,
        recurringPattern: eventForm.recurring ? eventForm.recurringPattern : null,
        recurringEndDate: eventForm.recurring && eventForm.recurringEndDate 
          ? eventForm.recurringEndDate.toISOString() 
          : null
      };

      if (editingEvent) {
        // Update existing shift
        const response = await api.put(`/api/employer/shifts/calendar/${editingEvent.id}`, eventData);
        const updatedEvent = response.data.data || response.data;
        
        setEvents(events.map(e => 
          e.id === editingEvent.id 
            ? { ...updatedEvent, start: new Date(updatedEvent.start), end: new Date(updatedEvent.end) }
            : e
        ));
      } else {
        // Create new shift(s)
        const response = await api.post('/api/employer/shifts/calendar', eventData);
        
        const newEvents = response.data.data || [response.data];
        const formattedNewEvents = newEvents.map(event => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
          type: 'shift'
        }));
        
        setEvents([...events, ...formattedNewEvents]);
      }

      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      console.error('Failed to save shift:', error);
      alert('Failed to save shift. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      workplace_id: '',
      start: null,
      end: null,
      positions_needed: 1,
      description: '',
      recurring: false,
      recurringPattern: 'weekly',
      recurringEndDate: null
    });
    setSelectedSlot(null);
    setEditingEvent(null);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    resetEventForm();
  };

  // Filter events by workplace
  const filteredEvents = selectedWorkplace === 'all' 
    ? events 
    : events.filter(e => e.workplace_id === selectedWorkplace);

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
            <button onClick={() => navigate('/employer/dashboard')} className="hover:opacity-80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src={theme.logo} alt="HR Bank" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold">Shift Calendar</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manage Shifts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Click and drag on the calendar to create new shifts. Click on existing shifts to edit or delete.
              </p>
            </div>

            {/* Workplace Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Workplace:</label>
              <select
                value={selectedWorkplace}
                onChange={(e) => setSelectedWorkplace(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Workplaces</option>
                {Array.isArray(workplaces) && workplaces.map(wp => (
                  <option key={wp.id} value={wp.id}>{wp.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span>Scheduled Shift</span>
            </div>
          </div>

          {/* Calendar */}
          <Calendar
            events={filteredEvents}
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
                <li>Click and drag to create shifts with specific start and end times</li>
                <li>Click on a shift to view details, edit, or delete it</li>
                <li>Use recurring shifts to schedule repeating patterns</li>
                <li>Filter by workplace to focus on specific locations</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingEvent ? 'Edit Shift' : 'Create Shift'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Morning Shift, Night Shift"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workplace *</label>
                <select
                  value={eventForm.workplace_id}
                  onChange={(e) => setEventForm({ ...eventForm, workplace_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select workplace</option>
                  {workplaces.map(wp => (
                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input
                  type="text"
                  value={eventForm.start ? moment(eventForm.start).format('MMM DD, YYYY h:mm A') : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input
                  type="text"
                  value={eventForm.end ? moment(eventForm.end).format('MMM DD, YYYY h:mm A') : ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Positions Needed *</label>
                <input
                  type="number"
                  min="1"
                  value={eventForm.positions_needed}
                  onChange={(e) => setEventForm({ ...eventForm, positions_needed: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Shift details, requirements, etc."
                />
              </div>

              {!editingEvent && (
                <>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={eventForm.recurring}
                        onChange={(e) => setEventForm({ ...eventForm, recurring: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Recurring Shift</span>
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
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              {editingEvent && (
                <button
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              )}
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
                {saving ? 'Saving...' : editingEvent ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftCalendar;
