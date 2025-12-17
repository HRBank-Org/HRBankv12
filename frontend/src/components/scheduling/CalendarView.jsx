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
import CopyShiftModal from '../../components/scheduling/CopyShiftModal';

const CalendarView = ({ embedded = false, initialWorkplace = 'all', setupComplete = true }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('roster'); // week, day, month, roster - Default to roster
  const [currentDate, setCurrentDate] = useState(moment());
  const [shifts, setShifts] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState(initialWorkplace);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShiftDetail, setShowShiftDetail] = useState(false);
  const [showAssignWorker, setShowAssignWorker] = useState(false);
  const [showCopyShift, setShowCopyShift] = useState(false);
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

      // Load shifts from employer API (where the actual data is)
      const shiftsRes = await api.get('/api/employer/shifts');
      
      // Filter by date range and workplace
      let allShifts = shiftsRes.data.data?.shifts || [];
      
      if (selectedWorkplace && selectedWorkplace !== 'all') {
        allShifts = allShifts.filter(s => s.workplace_id === selectedWorkplace);
      }
      
      // Filter by date range using moment
      allShifts = allShifts.filter(s => {
        const shiftDate = moment(s.shift_date || s.start_time);
        return shiftDate.isBetween(moment(startDate), moment(endDate), 'day', '[]');
      });
      
      setShifts(allShifts);
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

  const handleCopyShift = (shift) => {
    setSelectedShift(shift);
    setShowCopyShift(true);
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

  // Calculate columns for overlapping shifts
  const calculateShiftColumns = (dayShifts) => {
    const shiftsWithColumns = dayShifts.map(shift => ({
      ...shift,
      column: 0,
      totalColumns: 1
    }));

    // Sort by start time
    shiftsWithColumns.sort((a, b) => 
      moment(a.start_time).diff(moment(b.start_time))
    );

    // Detect overlaps and assign columns
    for (let i = 0; i < shiftsWithColumns.length; i++) {
      const currentShift = shiftsWithColumns[i];
      const currentStart = moment(currentShift.start_time);
      const currentEnd = moment(currentShift.end_time);
      
      // Find all shifts that overlap with current shift
      const overlapping = [];
      for (let j = 0; j < shiftsWithColumns.length; j++) {
        if (i === j) continue;
        
        const otherShift = shiftsWithColumns[j];
        const otherStart = moment(otherShift.start_time);
        const otherEnd = moment(otherShift.end_time);
        
        // Check if times overlap
        const hasOverlap = currentStart.isBefore(otherEnd) && currentEnd.isAfter(otherStart);
        
        if (hasOverlap) {
          overlapping.push(otherShift);
        }
      }

      if (overlapping.length > 0) {
        // Assign columns to avoid overlap
        const usedColumns = new Set(overlapping.map(s => s.column));
        let assignedColumn = 0;
        
        // Find first available column
        while (usedColumns.has(assignedColumn)) {
          assignedColumn++;
        }
        
        currentShift.column = assignedColumn;
        const maxColumns = Math.max(assignedColumn + 1, ...overlapping.map(s => s.totalColumns));
        
        // Update totalColumns for all overlapping shifts
        currentShift.totalColumns = maxColumns;
        overlapping.forEach(s => {
          s.totalColumns = maxColumns;
        });
      }
    }

    return shiftsWithColumns;
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

  // Header removed - title is handled by parent Roster component
  const renderDateHeader = () => null;

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
            <button
              onClick={() => setViewMode('roster')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'roster'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Roster
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
                {hours.map(hour => {
                  const slotKey = `${day.format('YYYY-MM-DD')}_${hour}`;
                  const isHighlighted = dragOverSlot === slotKey;
                  
                  return (
                    <div
                      key={hour}
                      className={`h-20 border-b border-gray-200 transition-colors ${
                        isHighlighted 
                          ? 'bg-blue-200 border-blue-400' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => handleTimeSlotClick(day, hour)}
                      onDragOver={(e) => handleDragOver(e, day, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    />
                  );
                })}
                
                {/* Render shifts */}
                <div className="absolute inset-0 pointer-events-none p-1">
                  {calculateShiftColumns(dayShifts).map(shift => {
                    const startTime = moment(shift.start_time);
                    const endTime = moment(shift.end_time);
                    const startHour = startTime.hours() + startTime.minutes() / 60;
                    const duration = endTime.diff(startTime, 'hours', true);
                    const top = startHour * 5; // 5rem per hour (h-20)
                    const height = duration * 5;

                    const isDragging = draggingShift?.shift_id === shift.shift_id;
                    
                    // Calculate column-based positioning
                    const columnWidth = 100 / shift.totalColumns;
                    const leftPercent = shift.column * columnWidth;
                    
                    return (
                      <div
                        key={shift.shift_id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, shift)}
                        onDragEnd={handleDragEnd}
                        className={`absolute rounded-lg p-2 pointer-events-auto cursor-move shadow hover:shadow-lg transition-all ${getShiftColor(shift)} ${
                          isDragging ? 'opacity-50 scale-95' : ''
                        }`}
                        style={{
                          top: `${top}rem`,
                          height: `${Math.max(height, 3)}rem`,
                          minHeight: '3rem',
                          left: `${leftPercent}%`,
                          width: `${columnWidth - 1}%` // -1% for gap
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
            {hours.map(hour => {
              const slotKey = `${currentDate.format('YYYY-MM-DD')}_${hour}`;
              const isHighlighted = dragOverSlot === slotKey;
              
              return (
                <div
                  key={hour}
                  className={`h-24 border-b border-gray-200 transition-colors ${
                    isHighlighted 
                      ? 'bg-blue-200 border-blue-400' 
                      : 'hover:bg-blue-50 cursor-pointer'
                  }`}
                  onClick={() => handleTimeSlotClick(currentDate, hour)}
                  onDragOver={(e) => handleDragOver(e, currentDate, hour)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, currentDate, hour)}
                />
              );
            })}

            {/* Shifts */}
            <div className="absolute inset-0 pointer-events-none p-2">
              {calculateShiftColumns(dayShifts).map(shift => {
                const startTime = moment(shift.start_time);
                const endTime = moment(shift.end_time);
                const startHour = startTime.hours() + startTime.minutes() / 60;
                const duration = endTime.diff(startTime, 'hours', true);
                const top = startHour * 6; // 6rem per hour (h-24)
                const height = duration * 6;

                const isDragging = draggingShift?.shift_id === shift.shift_id;
                
                // Calculate column-based positioning
                const columnWidth = 100 / shift.totalColumns;
                const leftPercent = shift.column * columnWidth;
                
                return (
                  <div
                    key={shift.shift_id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, shift)}
                    onDragEnd={handleDragEnd}
                    className={`absolute rounded-lg p-3 pointer-events-auto cursor-move shadow-md hover:shadow-lg transition-all ${getShiftColor(shift)} ${
                      isDragging ? 'opacity-50 scale-95' : ''
                    }`}
                    style={{
                      top: `${top}rem`,
                      height: `${Math.max(height, 4)}rem`,
                      left: `${leftPercent}%`,
                      width: `${columnWidth - 1}%` // -1% for gap
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

  const renderRosterView = () => {
    // Get all shifts for the current week
    const weekStart = currentDate.clone().startOf('week');
    const weekEnd = currentDate.clone().endOf('week');
    const daysInWeek = [];
    
    for (let i = 0; i < 7; i++) {
      daysInWeek.push(weekStart.clone().add(i, 'days'));
    }

    // Group shifts by position and date
    const shiftsByPosition = {};
    
    shifts.forEach(shift => {
      const shiftDate = moment(shift.start_time);
      if (shiftDate.isBetween(weekStart, weekEnd, 'day', '[]')) {
        const position = shift.position_title;
        if (!shiftsByPosition[position]) {
          shiftsByPosition[position] = {};
          daysInWeek.forEach(day => {
            shiftsByPosition[position][day.format('YYYY-MM-DD')] = [];
          });
        }
        shiftsByPosition[position][shiftDate.format('YYYY-MM-DD')].push(shift);
      }
    });

    const positions = Object.keys(shiftsByPosition);

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold w-48">Position</th>
                {daysInWeek.map(day => (
                  <th key={day.format('YYYY-MM-DD')} className="px-4 py-3 text-center font-semibold min-w-36">
                    <div className="text-sm">{day.format('ddd')}</div>
                    <div className="text-lg font-bold">{day.format('DD')}</div>
                    <div className="text-xs opacity-90">{day.format('MMM')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FiCalendar className="w-12 h-12 text-gray-300" />
                      <p className="text-lg font-medium">No shifts scheduled</p>
                      <p className="text-sm">Create shifts to see them in the roster</p>
                    </div>
                  </td>
                </tr>
              ) : (
                positions.map((position, idx) => (
                  <tr key={position} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium text-gray-900 border-r border-gray-200">
                      {position}
                    </td>
                    {daysInWeek.map(day => {
                      const dayKey = day.format('YYYY-MM-DD');
                      const dayShifts = shiftsByPosition[position][dayKey] || [];
                      
                      return (
                        <td key={dayKey} className="px-2 py-2 border-l border-gray-100">
                          {dayShifts.length === 0 ? (
                            <div className="text-center text-gray-300 text-sm">-</div>
                          ) : (
                            <div className="space-y-2">
                              {dayShifts.map(shift => {
                                const startTime = moment(shift.start_time);
                                const endTime = moment(shift.end_time);
                                
                                return (
                                  <div
                                    key={shift.shift_id}
                                    onClick={() => handleShiftClick(shift)}
                                    className={`p-2 rounded cursor-pointer hover:shadow-md transition-all ${getShiftColor(shift)}`}
                                  >
                                    <div className="text-xs font-semibold truncate">
                                      {startTime.format('h:mm A')}
                                    </div>
                                    <div className="text-xs truncate text-gray-700">
                                      {shift.workplace_name}
                                    </div>
                                    <div className="text-xs flex items-center gap-1 mt-1">
                                      <FiUsers className="w-3 h-3" />
                                      <span>{shift.positions_filled || 0}/{shift.positions_needed}</span>
                                    </div>
                                    {shift.assigned_workers && shift.assigned_workers.length > 0 && (
                                      <div className="text-xs mt-1 flex flex-wrap gap-1">
                                        {shift.assigned_workers.slice(0, 2).map((worker, idx) => {
                                          // Handle both worker objects and worker IDs
                                          const workerName = typeof worker === 'string' ? 'Worker' : (worker.worker_name || worker.name || 'Worker');
                                          const initials = typeof worker === 'string' ? 
                                            (idx + 1).toString() : 
                                            workerName.split(' ').map(n => n[0]).join('').substring(0, 2);
                                          
                                          return (
                                            <span
                                              key={idx}
                                              className="px-1.5 py-0.5 bg-white/50 rounded text-xs"
                                              title={typeof worker === 'string' ? `Worker ${idx + 1}` : workerName}
                                            >
                                              {initials}
                                            </span>
                                          );
                                        })}
                                        {shift.assigned_workers.length > 2 && (
                                          <span className="px-1.5 py-0.5 bg-white/50 rounded text-xs">
                                            +{shift.assigned_workers.length - 2}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {renderDateHeader()}
      {renderControls()}
      
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'roster' && renderRosterView()}

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
          onCopyShift={handleCopyShift}
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

      {showCopyShift && selectedShift && (
        <CopyShiftModal
          isOpen={showCopyShift}
          onClose={() => {
            setShowCopyShift(false);
            setSelectedShift(null);
          }}
          shift={selectedShift}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default CalendarView;
