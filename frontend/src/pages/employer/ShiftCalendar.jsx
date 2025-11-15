import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Calendar from '../../components/common/Calendar';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar as CalendarIcon, Plus, Users, MapPin, Filter, Download } from 'lucide-react';
import api from '../../utils/api';
import moment from 'moment';

const ShiftCalendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  
  const [events, setEvents] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  
  // Create shift form state
  const [shiftData, setShiftData] = useState({
    workplace_id: '',
    role: '',
    workers_needed: 1,
    recurrence_type: 'none',
    recurrence_end_date: ''
  });

  useEffect(() => {
    fetchWorkplaces();
    fetchShifts();
    checkGoogleCalendarSync();
  }, []);

  useEffect(() => {
    if (selectedWorkplace) {
      fetchShifts();
    }
  }, [selectedWorkplace]);

  const fetchWorkplaces = async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      setWorkplaces(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workplaces:', error);
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const params = selectedWorkplace !== 'all' ? `?workplace_id=${selectedWorkplace}` : '';
      const response = await api.get(`/api/employer/shifts${params}`);
      const shiftsData = response.data.data || [];
      
      // Convert shifts to calendar events
      const shiftEvents = shiftsData.map(shift => {
        const statusColor = {
          'open': '#10B981',      // Green - available
          'filled': '#3B82F6',    // Blue - fully staffed
          'partial': '#F59E0B',   // Amber - partially filled
          'completed': '#6B7280', // Gray - past
          'cancelled': '#EF4444'  // Red - cancelled
        };
        
        return {
          id: shift.shift_id,
          title: `${shift.role} (${shift.assigned_workers}/${shift.workers_needed})`,
          start: new Date(shift.shift_date + 'T' + shift.start_time),
          end: new Date(shift.shift_date + 'T' + shift.end_time),
          type: 'shift',
          color: statusColor[shift.status] || '#3B82F6',
          data: shift
        };
      });
      
      setEvents(shiftEvents);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const handleSelectSlot = useCallback((slotInfo) => {
    if (workplaces.length === 0) {
      alert('Please create a workplace first');
      navigate('/employer/workplace-setup');
      return;
    }
    
    setSelectedSlot(slotInfo);
    setShiftData({
      ...shiftData,
      workplace_id: workplaces[0]?.workplace_id || '',
      start_time: moment(slotInfo.start).format('HH:mm'),
      end_time: moment(slotInfo.end).format('HH:mm'),
      shift_date: moment(slotInfo.start).format('YYYY-MM-DD')
    });
    setShowCreateDialog(true);
  }, [workplaces, navigate]);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    navigate(`/employer/shifts/${event.id}`);
  }, [navigate]);

  const handleCreateShift = async () => {
    try {
      await api.post('/api/employer/shifts/create', shiftData);
      
      await fetchShifts();
      setShowCreateDialog(false);
      setSelectedSlot(null);
      setShiftData({
        workplace_id: '',
        role: '',
        workers_needed: 1,
        recurrence_type: 'none',
        recurrence_end_date: ''
      });
    } catch (error) {
      alert('Failed to create shift: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleExportCalendar = async () => {
    try {
      const response = await api.get('/api/employer/shifts/export-calendar', {
        params: { workplace_id: selectedWorkplace !== 'all' ? selectedWorkplace : null },
        responseType: 'blob'
      });
      
      // Download ICS file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shifts-${moment().format('YYYY-MM-DD')}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export calendar');
    }
  };

  const checkGoogleCalendarSync = async () => {
    try {
      const response = await api.get('/api/employer/google-calendar/status');
      setSyncStatus(response.data.data);
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  };

  const handleGoogleCalendarSync = async () => {
    try {
      const response = await api.get('/api/employer/google-calendar/auth-url');
      window.location.href = response.data.data.auth_url;
    } catch (error) {
      alert('Failed to connect to Google Calendar');
    }
  };

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
            <h1 className=\"text-3xl font-bold text-gray-900\">Shift Calendar</h1>
            <p className=\"text-gray-600 mt-1\">Schedule and manage shifts across all workplaces</p>
          </div>
          <div className=\"flex gap-3\">
            <Button
              variant=\"outline\"
              onClick={handleExportCalendar}
              className=\"flex items-center gap-2\"
            >
              <Download className=\"w-4 h-4\" />
              Export
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
                Sync Google Calendar
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className=\"mb-6\">
          <CardContent className=\"py-4\">
            <div className=\"flex items-center gap-4\">
              <Filter className=\"w-5 h-5 text-gray-500\" />
              <Select value={selectedWorkplace} onValueChange={setSelectedWorkplace}>
                <SelectTrigger className=\"w-64\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"all\">
                    <div className=\"flex items-center gap-2\">
                      <MapPin className=\"w-4 h-4\" />
                      All Workplaces
                    </div>
                  </SelectItem>
                  {workplaces.map(workplace => (
                    <SelectItem key={workplace.workplace_id} value={workplace.workplace_id}>
                      <div className=\"flex items-center gap-2\">
                        <MapPin className=\"w-4 h-4\" />
                        {workplace.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className=\"ml-auto flex gap-6\">
                <div className=\"flex items-center gap-2\">
                  <div className=\"w-4 h-4 rounded\" style={{ backgroundColor: '#10B981' }}></div>
                  <span className=\"text-sm text-gray-700\">Open</span>
                </div>
                <div className=\"flex items-center gap-2\">
                  <div className=\"w-4 h-4 rounded\" style={{ backgroundColor: '#3B82F6' }}></div>
                  <span className=\"text-sm text-gray-700\">Filled</span>
                </div>
                <div className=\"flex items-center gap-2\">
                  <div className=\"w-4 h-4 rounded\" style={{ backgroundColor: '#F59E0B' }}></div>
                  <span className=\"text-sm text-gray-700\">Partial</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Calendar
          events={events}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable={true}
          editable={false}
          defaultView=\"week\"
        />

        {/* Create Shift Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
            </DialogHeader>
            
            <div className=\"space-y-4 py-4\">
              {selectedSlot && (
                <div>
                  <label className=\"text-sm font-medium text-gray-700\">Date & Time</label>
                  <p className=\"text-sm text-gray-600 mt-1\">
                    {moment(selectedSlot.start).format('dddd, MMMM D, YYYY')}
                    <br />
                    {moment(selectedSlot.start).format('h:mm A')} - {moment(selectedSlot.end).format('h:mm A')}
                  </p>
                </div>
              )}
              
              <div>
                <label className=\"text-sm font-medium text-gray-700 mb-2 block\">Workplace</label>
                <Select value={shiftData.workplace_id} onValueChange={(value) => setShiftData({...shiftData, workplace_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder=\"Select workplace\" />
                  </SelectTrigger>
                  <SelectContent>
                    {workplaces.map(workplace => (
                      <SelectItem key={workplace.workplace_id} value={workplace.workplace_id}>
                        {workplace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className=\"text-sm font-medium text-gray-700 mb-2 block\">Role/Position</label>
                <input
                  type=\"text\"
                  value={shiftData.role}
                  onChange={(e) => setShiftData({...shiftData, role: e.target.value})}
                  placeholder=\"e.g., Server, Cook, Cashier\"
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md\"
                />
              </div>
              
              <div>
                <label className=\"text-sm font-medium text-gray-700 mb-2 block\">
                  <Users className=\"w-4 h-4 inline mr-1\" />
                  Workers Needed
                </label>
                <input
                  type=\"number\"
                  min=\"1\"
                  value={shiftData.workers_needed}
                  onChange={(e) => setShiftData({...shiftData, workers_needed: parseInt(e.target.value)})}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md\"
                />
              </div>
              
              <div>
                <label className=\"text-sm font-medium text-gray-700 mb-2 block\">Recurring Pattern</label>
                <Select value={shiftData.recurrence_type} onValueChange={(value) => setShiftData({...shiftData, recurrence_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"none\">One-time shift</SelectItem>
                    <SelectItem value=\"daily\">Daily</SelectItem>
                    <SelectItem value=\"weekly\">Weekly</SelectItem>
                    <SelectItem value=\"weekdays\">Weekdays only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {shiftData.recurrence_type !== 'none' && (
                <div>
                  <label className=\"text-sm font-medium text-gray-700\">End Date</label>
                  <input
                    type=\"date\"
                    value={shiftData.recurrence_end_date}
                    onChange={(e) => setShiftData({...shiftData, recurrence_end_date: e.target.value})}
                    className=\"w-full mt-1 px-3 py-2 border border-gray-300 rounded-md\"
                    min={moment(selectedSlot?.start).format('YYYY-MM-DD')}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant=\"outline\" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateShift} 
                disabled={!shiftData.workplace_id || !shiftData.role}
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className=\"w-4 h-4 mr-2\" />
                Create Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ShiftCalendar;
