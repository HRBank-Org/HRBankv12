import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';

const MyShifts = () => {
  const navigate = useNavigate();
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
      setShifts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load shifts:', error);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Shifts</h1>
        <p className="text-gray-600">View and manage your scheduled shifts</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'upcoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All
        </button>
      </div>

      {/* Shifts List */}
      {shifts.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Shifts Found</h3>
          <p className="text-gray-600">You don't have any shifts scheduled yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => (
            <Card
              key={shift.shift_id}
              className="p-6 hover:shadow-lg transition-shadow"
              style={{ borderLeftWidth: '4px', borderLeftColor: shift.color || '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{shift.role_name}</h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyShifts;