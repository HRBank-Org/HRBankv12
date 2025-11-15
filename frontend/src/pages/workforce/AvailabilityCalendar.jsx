import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/common/Calendar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Repeat, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import moment from 'moment';

const AvailabilityCalendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [events, setEvents] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  
  // Dialog form state
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  useEffect(() => {
    fetchAvailability();
    fetchShifts();
    checkGoogleCalendarSync();
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await api.get('/api/workforce/me/availability');
      const availabilityData = response.data.data;
      
      // Convert availability to calendar events
      const availabilityEvents = convertAvailabilityToEvents(availabilityData);
      setEvents(availabilityEvents);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await api.get('/api/workforce/me/shifts');
      const shiftsData = response.data.data || [];
      
      // Convert shifts to calendar events
      const shiftEvents = shiftsData.map(shift => ({
        id: shift.booking_id,
        title: `Shift: ${shift.workplace_name}`,
        start: new Date(shift.shift_date + 'T' + shift.start_time),
        end: new Date(shift.shift_date + 'T' + shift.end_time),
        type: 'shift',
        color: '#3B82F6',
        data: shift,
        editable: false
      }));
      
      setShifts(shiftEvents);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const convertAvailabilityToEvents = (availabilityData) => {
    const events = [];
    const availability = availabilityData.availability_hours || {};
    
    // Convert weekly availability to events for the next 8 weeks
    const startDate = moment().startOf('week');
    const endDate = moment().add(8, 'weeks');
    
    for (let date = moment(startDate); date.isBefore(endDate); date.add(1, 'day')) {
      const dayName = date.format('dddd').toLowerCase();
      const daySlots = availability[dayName] || [];
      
      daySlots.forEach(slot => {
        const [startTime, endTime] = slot.split('-');
        const start = moment(date).set({
          hour: parseInt(startTime.split(':')[0]),
          minute: parseInt(startTime.split(':')[1] || 0)
        }).toDate();
        const end = moment(date).set({
          hour: parseInt(endTime.split(':')[0]),
          minute: parseInt(endTime.split(':')[1] || 0)
        }).toDate();
        
        events.push({
          id: `avail-${date.format('YYYY-MM-DD')}-${slot}`,
          title: 'Available',
          start,
          end,
          type: 'availability',
          color: '#10B981',
          data: { slot, dayName }
        });
      });
    }
    
    // Add blackout dates
    if (availabilityData.blackout_dates) {
      availabilityData.blackout_dates.forEach(blackout => {
        events.push({
          id: `blackout-${blackout.date}`,
          title: blackout.reason || 'Unavailable',
          start: new Date(blackout.date),
          end: new Date(blackout.date),
          type: 'blackout',
          color: '#EF4444',
          allDay: true,
          data: blackout
        });
      });
    }
    
    return events;
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedSlot(slotInfo);
    setSelectedEvent(null);
    setShowDialog(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    if (event.type === 'shift') {
      // View shift details (read-only)
      alert(`Shift at ${event.data.workplace_name}\n${moment(event.start).format('MMM D, YYYY h:mm A')} - ${moment(event.end).format('h:mm A')}`);
    } else {
      setSelectedEvent(event);
      setShowDialog(true);
    }
  }, []);

  const handleSaveAvailability = async () => {
    if (!selectedSlot) return;
    
    try {
      const dayName = moment(selectedSlot.start).format('dddd').toLowerCase();
      const startTime = moment(selectedSlot.start).format('HH:mm');
      const endTime = moment(selectedSlot.end).format('HH:mm');
      const timeSlot = `${startTime}-${endTime}`;
      
      // Create recurring availability if needed
      const data = {
        day: dayName,
        time_slot: timeSlot,
        recurrence_type: recurrenceType,
        recurrence_end_date: recurrenceEndDate || null
      };
      
      await api.post('/api/workforce/me/availability/add-slot', data);
      
      // Refresh availability
      await fetchAvailability();
      setShowDialog(false);
      setSelectedSlot(null);
      setRecurrenceType('none');
    } catch (error) {
      if (error.response?.status === 409) {
        const conflicts = error.response.data?.detail?.conflicts || [];
        alert(`Cannot add availability - conflicts with accepted shifts:\n${conflicts.map(c => `• ${c.workplace} on ${c.shift_date}`).join('\n')}`);
      } else {
        alert('Failed to save availability');
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      if (selectedEvent.type === 'availability') {
        await api.delete(`/api/workforce/me/availability/slot`, {
          data: { slot_id: selectedEvent.id }
        });
      } else if (selectedEvent.type === 'blackout') {
        await api.delete(`/api/workforce/me/availability/blackout`, {
          data: { date: selectedEvent.data.date }
        });
      }
      
      await fetchAvailability();
      setShowDialog(false);
      setSelectedEvent(null);
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const checkGoogleCalendarSync = async () => {
    try {
      const response = await api.get('/api/workforce/me/google-calendar/status');
      setSyncStatus(response.data.data);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleGoogleCalendarSync = async () => {
    try {
      // Initiate Google OAuth flow
      const response = await api.get('/api/workforce/me/google-calendar/auth-url');
      window.location.href = response.data.data.auth_url;
    } catch (error) {
      alert('Failed to connect to Google Calendar');
    }
  };

  const allEvents = [...events, ...shifts];

  if (loading) {
    return (
      <div className=\"min-h-screen flex items-center justify-center\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2\" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen p-6\" style={{ backgroundColor: theme.bgColor }}>
      <div className=\"max-w-7xl mx-auto\">
        {/* Header */}
        <div className=\"flex justify-between items-center mb-6\">
          <div>
            <h1 className=\"text-3xl font-bold text-gray-900\">My Availability Calendar</h1>
            <p className=\"text-gray-600 mt-1\">Manage your availability and view upcoming shifts</p>
          </div>
          <div className=\"flex gap-3\">
            <Button
              variant=\"outline\"
              onClick={() => navigate('/workforce/availability')}
              className=\"flex items-center gap-2\"
            >
              <Clock className=\"w-4 h-4\" />
              Time Grid View
            </Button>
            {syncStatus?.connected ? (
              <Button
                variant=\"outline\"
                className=\"flex items-center gap-2 text-green-600 border-green-600\"
              >
                <CalendarIcon className=\"w-4 h-4\" />
                Synced with Google
              </Button>
            ) : (
              <Button
                onClick={handleGoogleCalendarSync}
                className=\"flex items-center gap-2\"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <CalendarIcon className=\"w-4 h-4\" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <Card className=\"mb-6\">
          <CardContent className=\"py-4\">
            <div className=\"flex flex-wrap gap-6\">
              <div className=\"flex items-center gap-2\">
                <div className=\"w-4 h-4 rounded\" style={{ backgroundColor: '#10B981' }}></div>
                <span className=\"text-sm text-gray-700\">Available</span>
              </div>
              <div className=\"flex items-center gap-2\">
                <div className=\"w-4 h-4 rounded\" style={{ backgroundColor: '#3B82F6' }}></div>
                <span className=\"text-sm text-gray-700\">Scheduled Shift</span>
              </div>
              <div className=\"flex items-center gap-2\">
                <div className=\"w-4 h-4 rounded\" style={{ backgroundColor: '#EF4444', opacity: 0.5 }}></div>
                <span className=\"text-sm text-gray-700\">Blackout/Unavailable</span>
              </div>
              <div className=\"flex items-center gap-2 ml-auto\">
                <AlertCircle className=\"w-4 h-4 text-blue-600\" />
                <span className=\"text-sm text-gray-600\">Click on calendar to add availability • Click events to edit/delete</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Calendar
          events={allEvents}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={true}
          editable={false}
          defaultView=\"week\"
        />

        {/* Add/Edit Availability Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedEvent ? 'Edit Availability' : 'Add Availability'}
              </DialogTitle>
            </DialogHeader>
            
            <div className=\"space-y-4 py-4\">
              {selectedSlot && (
                <>
                  <div>
                    <label className=\"text-sm font-medium text-gray-700\">Date & Time</label>
                    <p className=\"text-sm text-gray-600 mt-1\">
                      {moment(selectedSlot.start).format('dddd, MMMM D, YYYY')}
                      <br />
                      {moment(selectedSlot.start).format('h:mm A')} - {moment(selectedSlot.end).format('h:mm A')}
                    </p>
                  </div>
                  
                  <div>
                    <label className=\"text-sm font-medium text-gray-700 mb-2 block\">
                      <Repeat className=\"w-4 h-4 inline mr-1\" />
                      Recurring Pattern
                    </label>
                    <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=\"none\">This date only</SelectItem>
                        <SelectItem value=\"weekly\">Every week (same day & time)</SelectItem>
                        <SelectItem value=\"daily\">Every day (same time)</SelectItem>
                        <SelectItem value=\"weekdays\">Weekdays only (Mon-Fri)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {recurrenceType !== 'none' && (
                    <div>
                      <label className=\"text-sm font-medium text-gray-700\">End Date (optional)</label>
                      <input
                        type=\"date\"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        className=\"w-full mt-1 px-3 py-2 border border-gray-300 rounded-md\"
                        min={moment(selectedSlot.start).format('YYYY-MM-DD')}
                      />
                      <p className=\"text-xs text-gray-500 mt-1\">Leave empty for ongoing availability</p>
                    </div>
                  )}
                </>
              )}
              
              {selectedEvent && (
                <div>
                  <p className=\"text-sm text-gray-600\">
                    {selectedEvent.type === 'availability' ? 'Available' : 'Blackout'} on {moment(selectedEvent.start).format('MMM D, YYYY')}
                  </p>
                  {selectedEvent.type !== 'shift' && (
                    <Button
                      variant=\"destructive\"
                      onClick={handleDeleteEvent}
                      className=\"mt-4 w-full\"
                    >
                      <Trash2 className=\"w-4 h-4 mr-2\" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant=\"outline\" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              {selectedSlot && (
                <Button onClick={handleSaveAvailability} style={{ backgroundColor: theme.primaryColor }}>
                  <Plus className=\"w-4 h-4 mr-2\" />
                  Add Availability
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
