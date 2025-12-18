import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import GenericHeader from '../../components/layout/GenericHeader';
import api from '../../utils/api';
import moment from 'moment';
import { 
  FiMapPin, FiClock, FiPhone, FiUser, FiCheck, FiPlay, 
  FiNavigation, FiCalendar, FiChevronLeft, FiChevronRight,
  FiHome, FiKey, FiCheckCircle, FiCamera, FiFileText,
  FiBriefcase, FiTruck, FiAlertCircle
} from 'react-icons/fi';

const UnifiedSchedule = () => {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [shifts, setShifts] = useState([]);
  const [serviceTasks, setServiceTasks] = useState([]);
  const [weekWorkDays, setWeekWorkDays] = useState({}); // Track which days have work
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  // Get the week dates for the week strip
  const getWeekDates = useCallback(() => {
    const startOfWeek = moment(selectedDate).startOf('week');
    return Array.from({ length: 7 }, (_, i) => 
      startOfWeek.clone().add(i, 'days').format('YYYY-MM-DD')
    );
  }, [selectedDate]);

  // Fetch work indicators for the entire week
  const fetchWeekIndicators = useCallback(async () => {
    const weekDates = getWeekDates();
    const startDate = weekDates[0];
    const endDate = weekDates[6];
    
    try {
      // Fetch week summary - we'll check each day
      const workDays = {};
      
      // For now, just mark the selected date if it has work
      // In production, you'd have a batch API endpoint
      for (const date of weekDates) {
        const [shiftsRes, tasksRes] = await Promise.all([
          api.get(`/api/workforce/my-shifts?date=${date}`).catch(() => ({ data: { data: { shifts: [] } } })),
          api.get(`/api/service-tasks?date=${date}`).catch(() => ({ data: { data: { tasks: [] } } }))
        ]);
        
        const shiftCount = shiftsRes.data.data?.shifts?.length || 0;
        const taskCount = tasksRes.data.data?.tasks?.length || 0;
        
        if (shiftCount > 0 || taskCount > 0) {
          workDays[date] = { shifts: shiftCount, tasks: taskCount };
        }
      }
      
      setWeekWorkDays(workDays);
    } catch (error) {
      console.error('Error fetching week indicators:', error);
    }
  }, [getWeekDates]);

  // Fetch all work for selected date
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both shifts and service tasks in parallel
      const [shiftsRes, tasksRes] = await Promise.all([
        api.get(`/api/workforce/my-shifts?date=${selectedDate}`).catch(() => ({ data: { data: { shifts: [] } } })),
        api.get(`/api/service-tasks?date=${selectedDate}`).catch(() => ({ data: { data: { tasks: [] } } }))
      ]);

      setShifts(shiftsRes.data.data?.shifts || []);
      setServiceTasks(tasksRes.data.data?.tasks || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Fetch week indicators when week changes
  useEffect(() => {
    fetchWeekIndicators();
  }, [fetchWeekIndicators]);

  // Date navigation
  const goToPrevDay = () => setSelectedDate(moment(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  const goToNextDay = () => setSelectedDate(moment(selectedDate).add(1, 'day').format('YYYY-MM-DD'));
  const goToToday = () => setSelectedDate(moment().format('YYYY-MM-DD'));

  // Get GPS location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Handle service task check-in
  const handleTaskCheckIn = async (taskId) => {
    setActionLoading(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      
      await api.post(`/api/service-tasks/${taskId}/check-in`, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy_m: loc.accuracy
      });
      
      await fetchSchedule();
      setExpandedCard(taskId); // Keep expanded to show reporting UI
    } catch (error) {
      setLocationError(error.response?.data?.detail || error.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle service task check-out
  const handleTaskCheckOut = async (taskId) => {
    setActionLoading(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      
      await api.post(`/api/service-tasks/${taskId}/check-out`, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy_m: loc.accuracy,
        notes: completionNotes
      });
      
      setCompletionNotes('');
      setExpandedCard(null);
      await fetchSchedule();
    } catch (error) {
      setLocationError(error.response?.data?.detail || error.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Group work items by employer
  const groupedWork = React.useMemo(() => {
    const groups = {};

    // Add shifts (on-site work)
    shifts.forEach(shift => {
      const employerKey = shift.employer_id || 'unknown';
      const employerName = shift.workplace_name || 'Employer';
      
      if (!groups[employerKey]) {
        groups[employerKey] = {
          employerName,
          workMode: 'on_site',
          items: []
        };
      }
      
      groups[employerKey].items.push({
        type: 'shift',
        id: shift.shift_id,
        ...shift
      });
    });

    // Add service tasks (field work)
    serviceTasks.forEach(task => {
      const employerKey = task.employer_id || 'unknown_field';
      const employerName = task.workplace_name || 'Field Service';
      
      if (!groups[employerKey]) {
        groups[employerKey] = {
          employerName,
          workMode: 'field_service',
          items: []
        };
      } else {
        // If this employer already has shifts, mark as field service
        groups[employerKey].workMode = 'field_service';
      }
      
      groups[employerKey].items.push({
        type: 'task',
        id: task.task_id,
        ...task
      });
    });

    // Sort items within each group by start time
    Object.values(groups).forEach(group => {
      group.items.sort((a, b) => {
        const timeA = a.scheduled_start_time || a.start_time || '00:00';
        const timeB = b.scheduled_start_time || b.start_time || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return groups;
  }, [shifts, serviceTasks]);

  // Calculate overall stats
  const stats = {
    totalShifts: shifts.length,
    totalTasks: serviceTasks.length,
    completedTasks: serviceTasks.filter(t => t.status === 'completed').length,
    inProgressTasks: serviceTasks.filter(t => t.status === 'in_progress').length
  };

  const isToday = selectedDate === moment().format('YYYY-MM-DD');

  // Render on-site shift card
  const renderShiftCard = (item) => {
    const startTime = item.start_time ? moment(item.start_time).format('h:mm A') : item.scheduled_start_time;
    const endTime = item.end_time ? moment(item.end_time).format('h:mm A') : item.scheduled_end_time;
    
    return (
      <div 
        key={item.id}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiBriefcase className="text-blue-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{item.position_title || item.role_name || 'Shift'}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <FiMapPin size={12} />
                {item.workplace_name}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <FiClock size={12} />
                {startTime} - {endTime}
              </p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              On-Site
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render service task card with progressive states
  const renderTaskCard = (item, routeOrder) => {
    const address = item.address || {};
    const isExpanded = expandedCard === item.id;
    const isInProgress = item.status === 'in_progress';
    const isCompleted = item.status === 'completed';
    const canCheckIn = ['assigned', 'en_route', 'pending'].includes(item.status);

    return (
      <div 
        key={item.id}
        className={`bg-white rounded-xl border overflow-hidden transition-all ${
          isInProgress 
            ? 'border-orange-300 ring-2 ring-orange-100' 
            : isCompleted 
              ? 'border-green-200 bg-green-50/50' 
              : 'border-gray-200 hover:shadow-md'
        }`}
      >
        {/* Main Card Content */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedCard(isExpanded ? null : item.id)}
        >
          <div className="flex items-start gap-3">
            {/* Route Order Number */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              isCompleted 
                ? 'bg-green-100 text-green-600' 
                : isInProgress 
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {isCompleted ? <FiCheck size={18} /> : routeOrder}
            </div>
            
            {/* Task Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.title}
                </h3>
                {isInProgress && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded animate-pulse">
                    In Progress
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <FiMapPin size={12} />
                {address.street_address}, {address.city}
              </p>
              
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FiClock size={12} />
                  {item.scheduled_start_time} - {item.scheduled_end_time}
                </span>
                {item.estimated_duration_minutes && (
                  <span>~{item.estimated_duration_minutes} min</span>
                )}
                {address.client_name && (
                  <span className="flex items-center gap-1">
                    <FiUser size={12} />
                    {address.client_name}
                  </span>
                )}
              </div>

              {isCompleted && item.actual_duration_minutes && (
                <p className="text-xs text-green-600 mt-1">
                  Completed in {item.actual_duration_minutes} minutes
                </p>
              )}
            </div>

            <FiChevronRight className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} size={20} />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
            {/* Location Error */}
            {locationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <FiAlertCircle />
                {locationError}
              </div>
            )}

            {/* Address Details */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiMapPin className="text-blue-600" size={18} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {address.street_address}
                  {address.unit_number && `, Unit ${address.unit_number}`}
                </p>
                <p className="text-sm text-gray-500">{address.city}, {address.province} {address.postal_code}</p>
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${address.street_address}, ${address.city}, ${address.province}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FiNavigation size={14} /> Navigate
                </a>
              </div>
            </div>

            {/* Client Info */}
            {(address.client_name || address.client_phone) && (
              <div className="flex items-center gap-4">
                {address.client_name && (
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <FiUser size={14} /> {address.client_name}
                  </span>
                )}
                {address.client_phone && (
                  <a 
                    href={`tel:${address.client_phone}`}
                    className="flex items-center gap-2 text-sm text-blue-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FiPhone size={14} /> {address.client_phone}
                  </a>
                )}
              </div>
            )}

            {/* Access Notes */}
            {address.access_notes && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <FiKey className="text-yellow-600 mt-0.5" size={14} />
                  <p className="text-sm text-yellow-800">{address.access_notes}</p>
                </div>
              </div>
            )}

            {/* In Progress - Reporting Fields */}
            {isInProgress && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FiClock className="text-orange-500" />
                  Started at {item.check_in ? moment(item.check_in.timestamp).format('h:mm A') : 'N/A'}
                </p>

                {/* Photo Upload Placeholder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiCamera className="inline mr-1" /> Photos
                  </label>
                  <button 
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    + Add Photo
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiFileText className="inline mr-1" /> Notes
                  </label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Add notes about this task..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              {canCheckIn && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleTaskCheckIn(item.id); }}
                  disabled={actionLoading}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiPlay size={18} />
                      Check In
                    </>
                  )}
                </button>
              )}

              {isInProgress && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleTaskCheckOut(item.id); }}
                  disabled={actionLoading}
                  className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiCheckCircle size={18} />
                      Complete & Check Out
                    </>
                  )}
                </button>
              )}

              {isCompleted && (
                <div className="text-center py-2 text-green-600 font-medium flex items-center justify-center gap-2">
                  <FiCheckCircle />
                  Completed
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <WorkforceSidebar />
      <div className="ml-[70px] lg:ml-64 transition-all duration-300">
        <GenericHeader 
          title="My Schedule" 
          subtitle={`${isToday ? "Today's" : moment(selectedDate).format('MMM D')} work schedule`}
        />
        
        <main className="p-4 md:p-6 max-w-4xl mx-auto">
          {/* Week Strip Navigation */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            {/* Month/Year Header with Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setSelectedDate(moment(selectedDate).subtract(7, 'days').format('YYYY-MM-DD'))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Previous week"
              >
                <FiChevronLeft size={20} />
              </button>
              
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  {moment(selectedDate).format('MMMM YYYY')}
                </h2>
              </div>
              
              <button 
                onClick={() => setSelectedDate(moment(selectedDate).add(7, 'days').format('YYYY-MM-DD'))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Next week"
              >
                <FiChevronRight size={20} />
              </button>
            </div>

            {/* Week Strip */}
            <div className="grid grid-cols-7 gap-1">
              {getWeekDates().map((date) => {
                const dayMoment = moment(date);
                const isSelected = date === selectedDate;
                const isCurrentDay = date === moment().format('YYYY-MM-DD');
                const hasWork = weekWorkDays[date];
                const workCount = hasWork ? (hasWork.shifts + hasWork.tasks) : 0;
                
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                      isSelected 
                        ? 'bg-blue-500 text-white shadow-md' 
                        : isCurrentDay
                          ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                          : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className={`text-xs font-medium ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                      {dayMoment.format('ddd')}
                    </span>
                    <span className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>
                      {dayMoment.format('D')}
                    </span>
                    {/* Work indicator dots */}
                    <div className="flex gap-0.5 mt-1 h-2">
                      {hasWork && (
                        <>
                          {hasWork.shifts > 0 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                          )}
                          {hasWork.tasks > 0 && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Today Button */}
            {!isToday && (
              <button
                onClick={goToToday}
                className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                Go to Today
              </button>
            )}
          </div>

          {/* Selected Day Header */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {isToday ? 'Today' : moment(selectedDate).format('dddd')}
            </h3>
            <p className="text-sm text-gray-500">
              {moment(selectedDate).format('MMMM D, YYYY')}
            </p>
          </div>

          {/* Stats Summary */}
          {(stats.totalShifts > 0 || stats.totalTasks > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stats.totalShifts > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalShifts}</p>
                  <p className="text-xs text-gray-500">Shifts</p>
                </div>
              )}
              {stats.totalTasks > 0 && (
                <>
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                    <p className="text-xs text-gray-500">Tasks</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{stats.inProgressTasks}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading schedule...</p>
            </div>
          ) : Object.keys(groupedWork).length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCalendar className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No work scheduled</h3>
              <p className="text-gray-500">You don&apos;t have any shifts or tasks for this date.</p>
            </div>
          ) : (
            /* Work Items Grouped by Employer */
            <div className="space-y-6">
              {Object.entries(groupedWork).map(([employerId, group]) => (
                <div key={employerId}>
                  {/* Employer Header */}
                  <div className="flex items-center gap-2 mb-3">
                    {group.workMode === 'field_service' ? (
                      <FiTruck className="text-orange-500" size={18} />
                    ) : (
                      <FiBriefcase className="text-blue-500" size={18} />
                    )}
                    <h3 className="font-semibold text-gray-700">{group.employerName}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      group.workMode === 'field_service' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {group.workMode === 'field_service' ? 'Field Service' : 'On-Site'}
                    </span>
                  </div>

                  {/* Work Items */}
                  <div className="space-y-3">
                    {group.items.map((item, index) => 
                      item.type === 'shift' 
                        ? renderShiftCard(item)
                        : renderTaskCard(item, index + 1)
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UnifiedSchedule;
