import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import { FiClock, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Attendance = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [loading, setLoading] = useState(false);

  // Mock data - will be replaced with API
  const stats = {
    todayHours: 0,
    weekHours: 0,
    monthHours: 0
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Attendance</h1>
          <p className="text-gray-600">Track your work hours and attendance history</p>
        </div>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                  <FiClock size={24} style={{ color: '#3b82f6' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Today</h3>
              <div className="text-3xl font-bold text-gray-900">{stats.todayHours}h</div>
              <p className="text-sm text-gray-500 mt-1">Hours worked</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                  <FiCalendar size={24} style={{ color: '#10b981' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">This Week</h3>
              <div className="text-3xl font-bold text-gray-900">{stats.weekHours}h</div>
              <p className="text-sm text-gray-500 mt-1">Cumulative hours</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#8b5cf615' }}>
                  <FiClock size={24} style={{ color: '#8b5cf6' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">This Month</h3>
              <div className="text-3xl font-bold text-gray-900">{stats.monthHours}h</div>
              <p className="text-sm text-gray-500 mt-1">Total hours</p>
            </div>
          </div>

          {/* View Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'day'
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={{ backgroundColor: viewMode === 'day' ? theme.primaryColor : 'transparent' }}
                >
                  Day View
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={{ backgroundColor: viewMode === 'week' ? theme.primaryColor : 'transparent' }}
                >
                  Week View
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateDate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiChevronLeft size={20} />
                </button>
                
                <div className="text-center min-w-[200px]">
                  <p className="font-semibold text-gray-900">
                    {viewMode === 'day'
                      ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                      : `Week of ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    }
                  </p>
                </div>
                
                <button
                  onClick={() => navigateDate(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="text-center py-12">
              <FiClock size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No attendance records</p>
              <p className="text-sm text-gray-500">Clock in to shifts to build your attendance history</p>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="font-semibold text-blue-900 mb-2">🚧 Feature Under Development</h4>
            <p className="text-sm text-blue-800">
              Comprehensive attendance tracking with day/week views, cumulative hours calculation, and detailed work history is coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;