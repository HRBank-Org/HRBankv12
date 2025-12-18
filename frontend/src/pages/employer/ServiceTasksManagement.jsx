import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ModernSidebar from '../../components/layout/ModernSidebar';
import GenericHeader from '../../components/layout/GenericHeader';
import api from '../../utils/api';
import { 
  FiMapPin, FiClock, FiUser, FiCheck, FiX, FiCalendar, 
  FiFilter, FiRefreshCw, FiNavigation, FiPhone, FiDollarSign,
  FiUserPlus, FiChevronDown, FiAlertCircle, FiCheckCircle,
  FiExternalLink, FiHome
} from 'react-icons/fi';

const ServiceTasksManagement = () => {
  const { theme } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [assigningWorker, setAssigningWorker] = useState(false);

  // Fetch field service workplaces
  const fetchWorkplaces = useCallback(async () => {
    try {
      const response = await api.get('/api/employer/workplaces');
      if (response.data.success) {
        const fieldServiceWps = (response.data.data.workplaces || [])
          .filter(wp => wp.work_mode === 'field_service');
        setWorkplaces(fieldServiceWps);
        if (fieldServiceWps.length === 1) {
          setSelectedWorkplace(fieldServiceWps[0].workplace_id);
        }
      }
    } catch (error) {
      console.error('Error fetching workplaces:', error);
    }
  }, []);

  // Fetch workers for assignment
  const fetchWorkers = useCallback(async () => {
    try {
      const response = await api.get('/api/employer/workers');
      if (response.data.success) {
        setWorkers(response.data.data.workers || []);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  }, []);

  // Fetch service tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/service-tasks?';
      if (selectedWorkplace !== 'all') url += `workplace_id=${selectedWorkplace}&`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (selectedDate) url += `date=${selectedDate}&`;
      
      const response = await api.get(url);
      if (response.data.success) {
        setTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkplace, selectedStatus, selectedDate]);

  useEffect(() => {
    fetchWorkplaces();
    fetchWorkers();
  }, [fetchWorkplaces, fetchWorkers]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Assign worker to task
  const handleAssignWorker = async (taskId, workerId) => {
    setAssigningWorker(true);
    try {
      const response = await api.post(`/api/service-tasks/${taskId}/assign?worker_id=${workerId}`);
      if (response.data.success) {
        await fetchTasks();
        setShowAssignModal(null);
      }
    } catch (error) {
      console.error('Error assigning worker:', error);
    } finally {
      setAssigningWorker(false);
    }
  };

  // Cancel task
  const handleCancelTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to cancel this task?')) return;
    try {
      await api.post(`/api/service-tasks/${taskId}/cancel`);
      await fetchTasks();
    } catch (error) {
      console.error('Error cancelling task:', error);
    }
  };

  // Status badge styles
  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Assigned' },
      in_progress: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelled' }
    };
    return styles[status] || styles.pending;
  };

  // Stats calculation
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  // Get worker name by ID
  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w.user_id === workerId || w.worker_id === workerId);
    return worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || worker.email : 'Unknown';
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ModernSidebar />
      <div className="ml-64">
        <GenericHeader 
          title="Service Tasks" 
          subtitle="Manage incoming bookings from Neatify" 
        />
        
        <main className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Tasks</p>
            </div>
            <div className="bg-yellow-50 rounded-xl shadow-sm p-4 border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-xs text-yellow-600">Pending Assignment</p>
            </div>
            <div className="bg-blue-50 rounded-xl shadow-sm p-4 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{stats.assigned}</p>
              <p className="text-xs text-blue-600">Assigned</p>
            </div>
            <div className="bg-orange-50 rounded-xl shadow-sm p-4 border border-orange-200">
              <p className="text-2xl font-bold text-orange-700">{stats.inProgress}</p>
              <p className="text-xs text-orange-600">In Progress</p>
            </div>
            <div className="bg-green-50 rounded-xl shadow-sm p-4 border border-green-200">
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              <p className="text-xs text-green-600">Completed</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FiFilter className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              {/* Workplace Filter */}
              {workplaces.length > 1 && (
                <select
                  value={selectedWorkplace}
                  onChange={(e) => setSelectedWorkplace(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">All Locations</option>
                  {workplaces.map(wp => (
                    <option key={wp.workplace_id} value={wp.workplace_id}>
                      {wp.workplace_name}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              {/* Date Filter */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              
              {/* Refresh Button */}
              <button
                onClick={fetchTasks}
                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <FiRefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiNavigation className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No service tasks</h3>
                <p className="text-gray-500">Tasks from Neatify bookings will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client / Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Schedule</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Worker</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tasks.map((task) => {
                      const address = task.address || {};
                      const status = getStatusBadge(task.status);
                      const isActionable = !['completed', 'cancelled'].includes(task.status);
                      
                      return (
                        <tr key={task.task_id} className="hover:bg-gray-50">
                          {/* Task Info */}
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">{task.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {task.external_source && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs mr-2">
                                    <FiExternalLink size={10} />
                                    {task.external_source}
                                  </span>
                                )}
                                {task.estimated_duration_minutes && `~${task.estimated_duration_minutes} min`}
                              </p>
                            </div>
                          </td>
                          
                          {/* Client / Location */}
                          <td className="px-4 py-4">
                            <div className="max-w-xs">
                              {address.client_name && (
                                <p className="font-medium text-gray-900 flex items-center gap-1">
                                  <FiUser size={12} className="text-gray-400" />
                                  {address.client_name}
                                </p>
                              )}
                              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                <FiMapPin size={12} className="text-gray-400 flex-shrink-0" />
                                <span className="truncate">{address.street_address}, {address.city}</span>
                              </p>
                              {address.client_phone && (
                                <a href={`tel:${address.client_phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                  <FiPhone size={10} />
                                  {address.client_phone}
                                </a>
                              )}
                            </div>
                          </td>
                          
                          {/* Schedule */}
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{task.scheduled_date}</p>
                              <p className="text-gray-500">
                                {task.scheduled_start_time} - {task.scheduled_end_time}
                              </p>
                            </div>
                          </td>
                          
                          {/* Worker */}
                          <td className="px-4 py-4">
                            {task.worker_id ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <FiUser className="text-green-600" size={14} />
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {getWorkerName(task.worker_id)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          
                          {/* Status */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </td>
                          
                          {/* Price */}
                          <td className="px-4 py-4">
                            {task.billing_amount ? (
                              <span className="font-semibold text-green-600">
                                ${task.billing_amount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {task.status === 'pending' && (
                                <button
                                  onClick={() => setShowAssignModal(task)}
                                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                                >
                                  <FiUserPlus size={14} />
                                  Assign
                                </button>
                              )}
                              {isActionable && (
                                <button
                                  onClick={() => handleCancelTask(task.task_id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Cancel Task"
                                >
                                  <FiX size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Assign Worker Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Assign Worker</h2>
              <p className="text-sm text-gray-500 mt-1">{showAssignModal.title}</p>
            </div>
            
            <div className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {showAssignModal.scheduled_date}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Time:</strong> {showAssignModal.scheduled_start_time} - {showAssignModal.scheduled_end_time}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong> {showAssignModal.address?.city}
                </p>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Worker
              </label>
              
              {workers.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <FiAlertCircle className="mx-auto mb-2" size={24} />
                  <p>No workers available</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {workers.map(worker => (
                    <button
                      key={worker.user_id || worker.worker_id}
                      onClick={() => handleAssignWorker(showAssignModal.task_id, worker.user_id || worker.worker_id)}
                      disabled={assigningWorker}
                      className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {worker.first_name} {worker.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{worker.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAssignModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceTasksManagement;
