import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import moment from 'moment';
import { 
  FiCalendar, FiClock, FiUsers, FiPlus, FiChevronLeft, 
  FiChevronRight, FiFilter, FiUser 
} from 'react-icons/fi';
import CreateShiftModal from '../../components/scheduling/CreateShiftModal';
import ShiftDetailModal from '../../components/scheduling/ShiftDetailModal';
import AssignWorkerModal from '../../components/scheduling/AssignWorkerModal';

const CalendarScheduling = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('week'); // week, day, month
  const [currentDate, setCurrentDate] = useState(moment());
  const [shifts, setShifts] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShiftDetail, setShowShiftDetail] = useState(false);
  const [showAssignWorker, setShowAssignWorker] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  
  // Drag and Drop
  const [draggingShift, setDraggingShift] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentDate, selectedWorkplace, viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load workplaces
      const wpRes = await api.get('/api/employer/workplaces');
      setWorkplaces(wpRes.data.data?.workplaces || []);

      // Calculate date range based on view mode
      let startDate, endDate;
      
      if (viewMode === 'day') {
        startDate = currentDate.clone().startOf('day');
        endDate = currentDate.clone().endOf('day');
      } else if (viewMode === 'week') {
        startDate = currentDate.clone().startOf('week');
        endDate = currentDate.clone().endOf('week');
      } else { // month
        startDate = currentDate.clone().startOf('month').startOf('week');
        endDate = currentDate.clone().endOf('month').endOf('week');
      }

      // Load shifts
      const shiftsRes = await api.get('/api/calendar/shifts', {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          workplace_id: selectedWorkplace
        }
      });
      
      setShifts(shiftsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(currentDate.clone().subtract(1, 'day'));
    } else if (viewMode === 'week') {
      setCurrentDate(currentDate.clone().subtract(1, 'week'));
    } else {
      setCurrentDate(currentDate.clone().subtract(1, 'month'));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(currentDate.clone().add(1, 'day'));
    } else if (viewMode === 'week') {
      setCurrentDate(currentDate.clone().add(1, 'week'));
    } else {
      setCurrentDate(currentDate.clone().add(1, 'month'));
    }
  };

  const handleToday = () => {
    setCurrentDate(moment());
  };

  const handleTimeSlotClick = (date, hour) => {
    setSelectedTimeSlot({
      date: date.format('YYYY-MM-DD'),
      time: `${hour.toString().padStart(2, '0')}:00`
    });
    setShowCreateModal(true);
  };

  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setShowShiftDetail(true);
  };

  const handleAssignWorker = (shift) => {
    setSelectedShift(shift);
    setShowAssignWorker(true);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, shift) => {
    e.stopPropagation();
    setDraggingShift(shift);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, date, hour) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingShift) {
      const slotKey = `${date.format('YYYY-MM-DD')}_${hour}`;
      setDragOverSlot(slotKey);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverSlot(null);
  };

  const handleDrop = async (e, date, hour) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);

    if (!draggingShift) return;

    try {
      // Calculate new start and end times
      const oldStart = moment(draggingShift.start_time);
      const oldEnd = moment(draggingShift.end_time);
      const duration = moment.duration(oldEnd.diff(oldStart));
      
      const newStart = date.clone().hour(hour).minute(0).second(0);
      const newEnd = newStart.clone().add(duration);

      // Update shift via API
      await api.patch(`/api/calendar/shifts/${draggingShift.shift_id}`, {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString()
      });

      // Reload shifts to show updated position
      await loadData();
      
      // Show success message (optional)
      console.log('Shift rescheduled successfully');
    } catch (error) {
      console.error('Failed to reschedule shift:', error);
      alert('Failed to reschedule shift. Please try again.');
    } finally {
      setDraggingShift(null);
    }
  };

  const handleDragEnd = () => {
    setDraggingShift(null);
    setDragOverSlot(null);
  };

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => {
      const shiftDate = moment(shift.start_time).format('YYYY-MM-DD');
      const checkDate = date.format('YYYY-MM-DD');
      return shiftDate === checkDate;
    });
  };

  const getShiftColor = (shift) => {
    const filled = shift.positions_filled || 0;
    const needed = shift.positions_needed || 1;
    
    if (filled === 0) return 'bg-red-100 border-l-4 border-red-500 text-red-900';
    if (filled < needed) return 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900';
    return 'bg-green-100 border-l-4 border-green-500 text-green-900';
  };

  const getWorkplaceColor = (workplaceId) => {
    const colors = [
      'bg-blue-100 border-l-4 border-blue-500 text-blue-900',
      'bg-purple-100 border-l-4 border-purple-500 text-purple-900',
      'bg-pink-100 border-l-4 border-pink-500 text-pink-900',
      'bg-indigo-100 border-l-4 border-indigo-500 text-indigo-900',
    ];
    const index = workplaces.findIndex(w => w.workplace_id === workplaceId);
    return colors[index % colors.length];
  };

  const renderDateHeader = () => {
    let dateText = '';
    if (viewMode === 'day') {
      dateText = currentDate.format('dddd, MMMM DD, YYYY');
    } else if (viewMode === 'week') {
      const weekStart = currentDate.clone().startOf('week');
      const weekEnd = currentDate.clone().endOf('week');
      dateText = `${weekStart.format('MMM DD')} - ${weekEnd.format('MMM DD, YYYY')}`;
    } else {
      dateText = currentDate.format('MMMM YYYY');
    }

    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employer/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Calendar</h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          Create Shift
        </button>
      </div>
    );
  };

  const renderControls = () => {
    return (
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Workplace filter */}
          <select
            value={selectedWorkplace}
            onChange={(e) => setSelectedWorkplace(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Workplaces</option>
            {workplaces.map(wp => (
              <option key={wp.workplace_id} value={wp.workplace_id}>
                {wp.workplace_name}
              </option>
            ))}
          </select>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={handlePrevious}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-lg font-semibold text-gray-900 min-w-[280px] text-center">
            {viewMode === 'day' && currentDate.format('dddd, MMMM DD, YYYY')}
            {viewMode === 'week' && `${currentDate.clone().startOf('week').format('MMM DD')} - ${currentDate.clone().endOf('week').format('MMM DD, YYYY')}`}
            {viewMode === 'month' && currentDate.format('MMMM YYYY')}
          </div>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = Array.from({ length: 7 }, (_, i) => 
      currentDate.clone().startOf('week').add(i, 'days')
    );

    return (
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
        {/* Day headers */}
        <div className="flex sticky top-0 z-10 bg-white border-b-2 border-gray-200">
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50"></div>
          {days.map((day, i) => {
            const isToday = day.isSame(moment(), 'day');
            return (
              <div key={i} className="flex-1 border-r border-gray-200 last:border-r-0">
                <div className={`p-4 text-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="text-xs font-medium text-gray-600 uppercase">
                    {day.format('ddd')}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.format('DD')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {hours.map(hour => (
              <div key={hour} className="h-20 border-b border-gray-200 px-2 py-1 text-right">
                <span className="text-xs text-gray-600 font-medium">
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
                {/* Time slots */}
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-20 border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  />
                ))}
                
                {/* Render shifts */}
                <div className="absolute inset-0 pointer-events-none p-1">
                  {dayShifts.map(shift => {
                    const startTime = moment(shift.start_time);
                    const endTime = moment(shift.end_time);
                    const startHour = startTime.hours() + startTime.minutes() / 60;
                    const duration = endTime.diff(startTime, 'hours', true);
                    const top = startHour * 5; // 5rem per hour (h-20)
                    const height = duration * 5;

                    return (
                      <div
                        key={shift.shift_id}
                        className={`absolute left-0 right-0 rounded-lg p-2 pointer-events-auto cursor-pointer shadow hover:shadow-lg transition-all ${getShiftColor(shift)}`}
                        style={{
                          top: `${top}rem`,
                          height: `${Math.max(height, 3)}rem`,
                          minHeight: '3rem'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShiftClick(shift);
                        }}
                      >
                        <div className="text-xs font-bold truncate">
                          {shift.position_title}
                        </div>
                        <div className="text-xs truncate">
                          {startTime.format('h:mm A')}
                        </div>
                        <div className="text-xs truncate">
                          {shift.workplace_name}
                        </div>
                        <div className="text-xs flex items-center gap-1 mt-1">
                          <FiUsers className="w-3 h-3" />
                          <span>{shift.positions_filled}/{shift.positions_needed}</span>
                        </div>
                        {shift.assigned_workers && shift.assigned_workers.length > 0 && (
                          <div className="text-xs mt-1 flex -space-x-2">
                            {shift.assigned_workers.slice(0, 3).map((worker, idx) => (
                              <div
                                key={idx}
                                className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                                title={worker.worker_name}
                              >
                                {worker.worker_name.charAt(0)}
                              </div>
                            ))}
                            {shift.assigned_workers.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-white flex items-center justify-center text-white text-xs">
                                +{shift.assigned_workers.length - 3}
                              </div>
                            )}
                          </div>
                        )}
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

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayShifts = getShiftsForDay(currentDate);

    return (
      <div className="flex-1 overflow-auto bg-white rounded-lg shadow">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-200">
          <div className="p-6 text-center bg-blue-50">
            <div className="text-sm font-medium text-gray-600 uppercase">
              {currentDate.format('dddd')}
            </div>
            <div className="text-4xl font-bold text-blue-600 mt-2">
              {currentDate.format('DD')}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {currentDate.format('MMMM YYYY')}
            </div>
          </div>
        </div>

        {/* Time slots */}
        <div className="flex">
          <div className="w-24 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {hours.map(hour => (
              <div key={hour} className="h-24 border-b border-gray-200 px-3 py-2 text-right">
                <span className="text-sm text-gray-600 font-medium">
                  {moment().hour(hour).format('h:mm A')}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 relative">
            {/* Time slot grid */}
            {hours.map(hour => (
              <div
                key={hour}
                className="h-24 border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleTimeSlotClick(currentDate, hour)}
              />
            ))}

            {/* Shifts */}
            <div className="absolute inset-0 pointer-events-none p-2">
              {dayShifts.map(shift => {
                const startTime = moment(shift.start_time);
                const endTime = moment(shift.end_time);
                const startHour = startTime.hours() + startTime.minutes() / 60;
                const duration = endTime.diff(startTime, 'hours', true);
                const top = startHour * 6; // 6rem per hour (h-24)
                const height = duration * 6;

                return (
                  <div
                    key={shift.shift_id}
                    className={`absolute left-0 right-0 rounded-lg p-3 pointer-events-auto cursor-pointer shadow-md hover:shadow-lg transition-all ${getShiftColor(shift)}`}
                    style={{
                      top: `${top}rem`,
                      height: `${Math.max(height, 4)}rem`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShiftClick(shift);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-sm">{shift.position_title}</div>
                        <div className="text-xs mt-1">
                          {startTime.format('h:mm A')} - {endTime.format('h:mm A')}
                        </div>
                        <div className="text-xs mt-1">{shift.workplace_name}</div>
                        <div className="text-xs flex items-center gap-1 mt-2">
                          <FiUsers className="w-4 h-4" />
                          <span>{shift.positions_filled}/{shift.positions_needed} filled</span>
                        </div>
                      </div>
                    </div>
                    
                    {shift.assigned_workers && shift.assigned_workers.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {shift.assigned_workers.map((worker, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold">
                              {worker.worker_name.charAt(0)}
                            </div>
                            <span>{worker.worker_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = currentDate.clone().startOf('month');
    const monthEnd = currentDate.clone().endOf('month');
    const calendarStart = monthStart.clone().startOf('week');
    const calendarEnd = monthEnd.clone().endOf('week');
    
    const weeks = [];
    let currentWeek = calendarStart.clone();
    
    while (currentWeek.isBefore(calendarEnd)) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(currentWeek.clone());
        currentWeek.add(1, 'day');
      }
      weeks.push(days);
    }

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {weeks.map((week, weekIdx) => (
            <React.Fragment key={weekIdx}>
              {week.map((day, dayIdx) => {
                const isCurrentMonth = day.month() === currentDate.month();
                const isToday = day.isSame(moment(), 'day');
                const dayShifts = getShiftsForDay(day);

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                      !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                    } hover:bg-blue-50 cursor-pointer transition-colors`}
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode('day');
                    }}
                  >
                    <div className={`text-sm font-semibold mb-2 ${
                      isToday ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center' : 
                      !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      {day.format('D')}
                    </div>
                    
                    <div className="space-y-1">
                      {dayShifts.slice(0, 3).map(shift => (
                        <div
                          key={shift.shift_id}
                          className={`text-xs p-1 rounded truncate ${getShiftColor(shift)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftClick(shift);
                          }}
                        >
                          {moment(shift.start_time).format('h:mm A')} - {shift.position_title}
                        </div>
                      ))}
                      {dayShifts.length > 3 && (
                        <div className="text-xs text-gray-600 pl-1">
                          +{dayShifts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
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
      {renderDateHeader()}
      {renderControls()}
      
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'month' && renderMonthView()}

      {/* Modals */}
      {showCreateModal && (
        <CreateShiftModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTimeSlot(null);
          }}
          onSuccess={loadData}
          workplaces={workplaces}
          initialDate={selectedTimeSlot?.date}
          initialTime={selectedTimeSlot?.time}
        />
      )}

      {showShiftDetail && selectedShift && (
        <ShiftDetailModal
          isOpen={showShiftDetail}
          onClose={() => {
            setShowShiftDetail(false);
            setSelectedShift(null);
          }}
          shift={selectedShift}
          onUpdate={loadData}
          onDelete={loadData}
          onAssignWorker={() => {
            setShowShiftDetail(false);
            setShowAssignWorker(true);
          }}
        />
      )}

      {showAssignWorker && selectedShift && (
        <AssignWorkerModal
          isOpen={showAssignWorker}
          onClose={() => {
            setShowAssignWorker(false);
            setSelectedShift(null);
          }}
          shift={selectedShift}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default CalendarScheduling;
