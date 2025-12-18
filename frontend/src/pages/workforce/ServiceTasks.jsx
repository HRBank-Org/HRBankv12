import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import GenericHeader from '../../components/layout/GenericHeader';
import api from '../../utils/api';
import { 
  FiMapPin, FiClock, FiPhone, FiUser, FiCheck, FiPlay, 
  FiNavigation, FiCalendar, FiChevronRight, FiAlertCircle,
  FiHome, FiKey, FiCheckCircle, FiXCircle
} from 'react-icons/fi';

const ServiceTasks = () => {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTask, setActiveTask] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(null);

  // Fetch tasks for selected date
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/service-tasks?date=${selectedDate}`);
      if (response.data.success) {
        const taskList = response.data.data.tasks || [];
        setTasks(taskList);
        // Find active task (in_progress)
        const active = taskList.find(t => t.status === 'in_progress');
        setActiveTask(active || null);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Get current GPS location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Check in to task
  const handleCheckIn = async (taskId) => {
    setCheckingIn(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      
      const response = await api.post(`/api/service-tasks/${taskId}/check-in`, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy_m: loc.accuracy
      });
      
      if (response.data.success) {
        await fetchTasks();
        setShowTaskDetail(null);
      }
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Check-in failed';
      setLocationError(message);
    } finally {
      setCheckingIn(false);
    }
  };

  // Check out from task
  const handleCheckOut = async (taskId, notes = '') => {
    setCheckingOut(true);
    setLocationError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      
      const response = await api.post(`/api/service-tasks/${taskId}/check-out`, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy_m: loc.accuracy,
        notes: notes
      });
      
      if (response.data.success) {
        await fetchTasks();
        setShowTaskDetail(null);
        setActiveTask(null);
      }
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Check-out failed';
      setLocationError(message);
    } finally {
      setCheckingOut(false);
    }
  };

  // Get status badge styles
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-600',
      assigned: 'bg-blue-100 text-blue-700',
      en_route: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-600'
    };
    return styles[status] || styles.pending;
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      assigned: 'Assigned',
      en_route: 'En Route',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  // Calculate stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    remaining: tasks.filter(t => ['pending', 'assigned'].includes(t.status)).length
  };

  // Task Detail Modal
  const TaskDetailModal = ({ task, onClose }) => {
    const [completionNotes, setCompletionNotes] = useState('');
    
    if (!task) return null;
    
    const address = task.address || {};
    const isActive = task.status === 'in_progress';
    const canCheckIn = ['assigned', 'en_route'].includes(task.status);
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className={`p-6 ${isActive ? 'bg-orange-500' : 'bg-gray-800'} text-white rounded-t-2xl`}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                  isActive ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {getStatusLabel(task.status)}
                </span>
                <h2 className="text-xl font-bold">{task.title}</h2>
                <p className="text-sm opacity-80 mt-1">
                  {task.scheduled_start_time} - {task.scheduled_end_time}
                </p>
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Location Error */}
            {locationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <FiAlertCircle />
                {locationError}
              </div>
            )}
            
            {/* Address */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiMapPin className="text-blue-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {address.street_address}
                    {address.unit_number && `, Unit ${address.unit_number}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.province} {address.postal_code}
                  </p>
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      `${address.street_address}, ${address.city}, ${address.province}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                  >
                    <FiNavigation size={14} /> Open in Maps
                  </a>
                </div>
              </div>
            </div>
            
            {/* Client Info */}
            {(address.client_name || address.client_phone) && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Client Info</h3>
                <div className="space-y-2">
                  {address.client_name && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiUser size={16} />
                      <span>{address.client_name}</span>
                    </div>
                  )}
                  {address.client_phone && (
                    <a 
                      href={`tel:${address.client_phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <FiPhone size={16} />
                      <span>{address.client_phone}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {/* Access Notes */}
            {address.access_notes && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <FiKey className="text-yellow-600 mt-0.5" size={16} />
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-800">Access Notes</h3>
                    <p className="text-sm text-yellow-700 mt-1">{address.access_notes}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Description */}
            {task.description && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Task Details</h3>
                <p className="text-sm text-gray-600">{task.description}</p>
              </div>
            )}
            
            {/* Completion Notes (for active task) */}
            {isActive && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Notes (optional)
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Any notes about the completed task..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>
            )}
            
            {/* Check-in Time (if in progress) */}
            {task.check_in && (
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                <span className="text-green-700">
                  ✓ Checked in at {new Date(task.check_in.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="p-6 border-t border-gray-200">
            {canCheckIn && (
              <button
                onClick={() => handleCheckIn(task.task_id)}
                disabled={checkingIn}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checkingIn ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <FiPlay size={20} />
                    Check In - Start Task
                  </>
                )}
              </button>
            )}
            
            {isActive && (
              <button
                onClick={() => handleCheckOut(task.task_id, completionNotes)}
                disabled={checkingOut}
                className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {checkingOut ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <FiCheck size={20} />
                    Complete Task
                  </>
                )}
              </button>
            )}
            
            {task.status === 'completed' && (
              <div className="text-center py-4 text-green-600 font-semibold flex items-center justify-center gap-2">
                <FiCheckCircle size={20} />
                Task Completed
                {task.actual_duration_minutes && (
                  <span className="text-gray-500 font-normal">
                    ({task.actual_duration_minutes} min)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <WorkforceSidebar />
      <div className="ml-64">
        <GenericHeader title="My Tasks" subtitle="Field service task management" />
        
        <main className="p-6">
          {/* Date Selector & Stats */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Date Picker */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              <FiCalendar className="text-gray-400" size={20} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-none focus:ring-0 text-gray-700 font-medium"
              />
            </div>
            
            {/* Stats Cards */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Tasks</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
                <p className="text-xs text-gray-500">In Progress</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.remaining}</p>
                <p className="text-xs text-gray-500">Remaining</p>
              </div>
            </div>
          </div>
          
          {/* Active Task Banner */}
          {activeTask && (
            <div 
              className="mb-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setShowTaskDetail(activeTask)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80 mb-1">Currently Working On</p>
                  <h3 className="text-xl font-bold">{activeTask.title}</h3>
                  <p className="text-sm opacity-80 mt-1 flex items-center gap-2">
                    <FiMapPin size={14} />
                    {activeTask.address?.street_address}, {activeTask.address?.city}
                  </p>
                </div>
                <button className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-colors">
                  Complete Task
                </button>
              </div>
            </div>
          )}
          
          {/* Task List */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Route" : 'Tasks'}
              </h2>
            </div>
            
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCalendar className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks scheduled</h3>
                <p className="text-gray-500">You don't have any tasks for this date.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {tasks.map((task, index) => {
                  const address = task.address || {};
                  const isCompleted = task.status === 'completed';
                  const isActive = task.status === 'in_progress';
                  
                  return (
                    <div 
                      key={task.task_id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isActive ? 'bg-orange-50' : ''
                      }`}
                      onClick={() => setShowTaskDetail(task)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Order Number */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          isCompleted 
                            ? 'bg-green-100 text-green-600' 
                            : isActive 
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isCompleted ? <FiCheck size={18} /> : index + 1}
                        </div>
                        
                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {task.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                            <FiMapPin size={12} />
                            {address.street_address}, {address.city}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <FiClock size={12} />
                              {task.scheduled_start_time} - {task.scheduled_end_time}
                            </span>
                            {task.estimated_duration_minutes && (
                              <span>~{task.estimated_duration_minutes} min</span>
                            )}
                            {address.client_name && (
                              <span className="flex items-center gap-1">
                                <FiUser size={12} />
                                {address.client_name}
                              </span>
                            )}
                          </div>
                          
                          {isCompleted && task.actual_duration_minutes && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Completed in {task.actual_duration_minutes} minutes
                            </p>
                          )}
                        </div>
                        
                        {/* Arrow */}
                        <FiChevronRight className="text-gray-300" size={20} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Task Detail Modal */}
      {showTaskDetail && (
        <TaskDetailModal 
          task={showTaskDetail} 
          onClose={() => setShowTaskDetail(null)} 
        />
      )}
    </div>
  );
};

export default ServiceTasks;
