import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';
import { FiCalendar, FiClock, FiMapPin, FiDollarSign } from 'react-icons/fi';

const MyShifts = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, completed, all

  useEffect(() => {
    loadShifts();
  }, [filter]);

  const loadShifts = async () => {
    try {
      // Get all rosters and filter for shifts assigned to this workforce member
      const response = await api.get('/api/workforce/my-shifts');
      const shiftsData = response.data.data?.shifts || response.data.data || response.data?.shifts || [];
      // Ensure it's always an array
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
    } catch (error) {
      console.error('Failed to load shifts:', error);
      setShifts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateHours = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diffMinutes = endMinutes - startMinutes;
    return (diffMinutes / 60).toFixed(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Shifts</h1>
          <p className="text-gray-600">View and manage your scheduled shifts across all employers</p>
        </div>

        <div className="p-8">

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 shadow-sm">
            <button
              onClick={() => setFilter('upcoming')}
              className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                filter === 'upcoming'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: filter === 'upcoming' ? theme.primaryColor : 'transparent' }}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                filter === 'completed'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: filter === 'completed' ? theme.primaryColor : 'transparent' }}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={{ backgroundColor: filter === 'all' ? theme.primaryColor : 'transparent' }}
            >
              All
            </button>
          </div>

          {/* Shifts List */}
          {shifts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <FiCalendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Shifts Found</h3>
              <p className="text-gray-600">You don't have any shifts scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.map((shift) => (
                <div
                  key={shift.shift_id}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: shift.color || theme.primaryColor }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{shift.role_name}</h3>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <FiMapPin className="mr-2" size={16} />
                        {shift.workplace_name}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(shift.status)}`}>
                      {shift.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Date</div>
                      <div className="text-sm font-medium text-gray-900">{formatDate(shift.shift_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Time</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Hours</div>
                      <div className="text-sm font-medium text-gray-900">
                        {calculateHours(shift.start_time, shift.end_time)} hrs
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Pay Rate</div>
                      <div className="text-sm font-medium text-green-600">
                        ${shift.hourly_rate || '17.60'}/hr
                      </div>
                    </div>
                  </div>

                  {shift.notes && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <strong>Notes:</strong> {shift.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyShifts;