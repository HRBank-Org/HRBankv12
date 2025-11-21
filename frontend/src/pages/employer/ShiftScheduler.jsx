import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import moment from 'moment';
import { FiPlus, FiFilter, FiCalendar, FiList, FiClock, FiUsers, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const ShiftScheduler = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('calendar'); // calendar or list
  const [currentWeek, setCurrentWeek] = useState(moment().startOf('week'));
  const [shifts, setShifts] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftDetail, setShowShiftDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentWeek, selectedWorkplace]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load workplaces
      const wpRes = await api.get('/api/employer/workplaces');
      setWorkplaces(wpRes.data.data?.workplaces || []);

      // Load shifts for current week
      const weekStart = currentWeek.toISOString();
      const weekEnd = currentWeek.clone().add(7, 'days').toISOString();
      
      const shiftsRes = await api.get('/api/employer/shift-management/shifts', {
        params: {
          workplace_id: selectedWorkplace,
          start_date: weekStart,
          end_date: weekEnd
        }
      });
      
      setShifts(shiftsRes.data.data?.shifts || []);

      // Load weekly summary
      const summaryRes = await api.get('/api/employer/shift-management/weekly-summary', {
        params: { week_start: weekStart }
      });
      
      setWeeklySummary(summaryRes.data.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(currentWeek.clone().subtract(7, 'days'));
  };

  const handleNextWeek = () => {
    setCurrentWeek(currentWeek.clone().add(7, 'days'));
  };

  const handleToday = () => {
    setCurrentWeek(moment().startOf('week'));
  };

  const handleTimeSlotClick = (date, hour) => {
    setSelectedDate(date);
    setSelectedTime(hour);
    setShowCreateModal(true);
  };

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setShowShiftDetail(true);
  };

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => {
      const shiftDate = moment(shift.start_time).format('YYYY-MM-DD');
      const checkDate = date.format('YYYY-MM-DD');
      return shiftDate === checkDate;
    });
  };

  const getShiftColor = (shift) => {
    const status = shift.status;
    if (status === 'fully_staffed') return 'bg-green-100 border-green-500 text-green-800';
    if (status === 'partially_filled') return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    return 'bg-gray-100 border-gray-500 text-gray-800';
  };

  const renderWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = currentWeek.clone().add(i, 'days');
      const isToday = day.isSame(moment(), 'day');
      
      days.push(
        <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0">
          <div className={`p-4 text-center border-b border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <div className="text-xs font-medium text-gray-600 uppercase">
              {day.format('ddd')}
            </div>
            <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
              {day.format('DD')}
            </div>
            <div className="text-xs text-gray-500">
              {day.format('MMM')}
            </div>
          </div>
        </div>
      );
    }
    return days;
  };

  const renderCalendarView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = Array.from({ length: 7 }, (_, i) => currentWeek.clone().add(i, 'days'));

    return (
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
        {/* Day headers */}
        <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50"></div>
          {renderWeekDays()}
        </div>

        {/* Time grid */}
        <div className="flex">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-200 px-2 py-1">
                <span className="text-xs text-gray-600">
                  {moment().hour(hour).format('h A')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayShifts = getShiftsForDay(day);
            
            return (
              <div key={dayIndex} className="flex-1 border-r border-gray-200 last:border-r-0 relative">
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  />
                ))}
                
                {/* Render shifts */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayShifts.map(shift => {
                    const startTime = moment(shift.start_time);
                    const endTime = moment(shift.end_time);
                    const startHour = startTime.hours() + startTime.minutes() / 60;
                    const duration = endTime.diff(startTime, 'hours', true);
                    const top = startHour * 4; // 4rem per hour (h-16)
                    const height = duration * 4;

                    return (
                      <div
                        key={shift.shift_id}
                        className={`absolute left-1 right-1 rounded-lg border-l-4 p-2 pointer-events-auto cursor-pointer shadow-sm hover:shadow-md transition-shadow ${getShiftColor(shift)}`}
                        style={{
                          top: `${top}rem`,
                          height: `${height}rem`,
                          minHeight: '3rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShiftClick(shift);
                        }}
                      >
                        <div className="text-xs font-semibold truncate">
                          {shift.shift_name}
                        </div>
                        <div className="text-xs truncate">
                          {startTime.format('h:mm A')}
                        </div>
                        <div className="text-xs flex items-center gap-1 mt-1">
                          <FiUsers className="w-3 h-3" />
                          <span>{shift.positions_filled}/{shift.positions_needed}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Shift Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Workplace
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Staffing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shifts.map(shift => {
              const startTime = moment(shift.start_time);
              
              return (
                <tr
                  key={shift.shift_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleShiftClick(shift)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {startTime.format('ddd, MMM DD')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {startTime.format('h:mm A')} - {moment(shift.end_time).format('h:mm A')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{shift.shift_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{shift.workplace_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{shift.position_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {shift.positions_filled}/{shift.positions_needed}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      shift.status === 'fully_staffed' ? 'bg-green-100 text-green-800' :
                      shift.status === 'partially_filled' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {shift.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftClick(shift);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {shifts.length === 0 && (
          <div className="text-center py-12">
            <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No shifts scheduled</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new shift.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FiPlus className="mr-2" />
                Create Shift
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/employer/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shift Scheduler</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your team's schedule</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            Create Shift
          </button>
        </div>

        {/* Weekly Summary */}
        {weeklySummary && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Shifts</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {weeklySummary.total_shifts}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Positions</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {weeklySummary.total_positions}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Filled</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {weeklySummary.total_filled}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Open Positions</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {weeklySummary.open_positions}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {weeklySummary.total_hours.toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded ${
                  viewMode === 'calendar'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiCalendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FiList className="w-5 h-5" />
              </button>
            </div>

            {/* Workplace filter */}
            <select
              value={selectedWorkplace}
              onChange={(e) => setSelectedWorkplace(e.target.value)}
              className="ml-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Workplaces</option>
              {workplaces.map(wp => (
                <option key={wp.workplace_id} value={wp.workplace_id}>
                  {wp.workplace_name}
                </option>
              ))}
            </select>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePreviousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {currentWeek.format('MMM DD')} - {currentWeek.clone().add(6, 'days').format('MMM DD, YYYY')}
            </div>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

      {/* TODO: Add modals for create shift, shift detail, assign worker */}
    </div>
  );
};

export default ShiftScheduler;
