import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FiCheckCircle, FiClock, FiTrendingUp, FiUsers } from 'react-icons/fi';

const TaskAnalytics = ({ theme }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerDetails, setWorkerDetails] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/employer/task-analytics/overview?days=${days}`);
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Failed to load task analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkerDetails = async (workerId) => {
    try {
      const res = await api.get(`/api/employer/task-analytics/by-worker/${workerId}?days=${days}`);
      setWorkerDetails(res.data.data);
      setSelectedWorker(workerId);
    } catch (error) {
      console.error('Failed to load worker details:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unable to load task analytics</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">📋 Task Completion Analytics</h3>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
          style={{ focusRingColor: theme.primaryColor }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <FiCheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-blue-700">Total Tasks</div>
              <div className="text-2xl font-bold text-blue-900">{analytics.total_tasks}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <FiTrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-green-700">Completed</div>
              <div className="text-2xl font-bold text-green-900">{analytics.total_completions}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <FiClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-purple-700">Completion Rate</div>
              <div className="text-2xl font-bold text-purple-900">{analytics.completion_rate}%</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <FiUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-orange-700">Shifts with Tasks</div>
              <div className="text-2xl font-bold text-orange-900">{analytics.total_shifts_with_tasks}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      {analytics.top_performers && analytics.top_performers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performers</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.top_performers.slice(0, 5).map((worker, index) => (
              <div
                key={worker.worker_id}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => loadWorkerDetails(worker.worker_id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {worker.worker_name?.charAt(0) || 'W'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{worker.worker_name}</div>
                    <div className="text-xs text-gray-500">Click for details</div>
                  </div>
                  {index === 0 && (
                    <div className="text-2xl">🥇</div>
                  )}
                  {index === 1 && (
                    <div className="text-2xl">🥈</div>
                  )}
                  {index === 2 && (
                    <div className="text-2xl">🥉</div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tasks Completed</span>
                    <span className="font-semibold">{worker.tasks_completed}/{worker.tasks_total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${worker.completion_rate}%`,
                        backgroundColor: worker.completion_rate >= 90 ? '#10b981' : worker.completion_rate >= 70 ? '#f59e0b' : '#ef4444'
                      }}
                    ></div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${
                      worker.completion_rate >= 90 ? 'text-green-600' :
                      worker.completion_rate >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {worker.completion_rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Workers Performance */}
      {analytics.worker_stats && analytics.worker_stats.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Worker Performance</h4>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.worker_stats.map((worker) => (
                    <tr key={worker.worker_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mr-3"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {worker.worker_name?.charAt(0) || 'W'}
                          </div>
                          <div className="font-medium text-gray-900">{worker.worker_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.tasks_completed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.tasks_total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${worker.completion_rate}%`,
                                backgroundColor: worker.completion_rate >= 90 ? '#10b981' : worker.completion_rate >= 70 ? '#f59e0b' : '#ef4444'
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {worker.completion_rate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => loadWorkerDetails(worker.worker_id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {analytics.total_tasks === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FiCheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Data Yet</h3>
          <p className="text-gray-600 mb-4">Start assigning tasks to shifts to track performance</p>
        </div>
      )}

      {/* Worker Detail Modal */}
      {workerDetails && selectedWorker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {workerDetails.worker.name} - Task Performance
              </h3>
              <button
                onClick={() => {
                  setSelectedWorker(null);
                  setWorkerDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-blue-700">Total Shifts</div>
                  <div className="text-2xl font-bold text-blue-900">{workerDetails.total_shifts}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-green-700">Tasks Completed</div>
                  <div className="text-2xl font-bold text-green-900">{workerDetails.total_completions}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-purple-700">Success Rate</div>
                  <div className="text-2xl font-bold text-purple-900">{workerDetails.completion_rate}%</div>
                </div>
              </div>

              {/* Shift Performance */}
              <h4 className="font-semibold text-gray-900 mb-3">Recent Shifts</h4>
              <div className="space-y-3">
                {workerDetails.shift_performance.map((shift) => (
                  <div key={shift.shift_id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{shift.position_title}</div>
                        <div className="text-sm text-gray-600">{shift.workplace_name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(shift.shift_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {shift.completed_tasks}/{shift.total_tasks} tasks
                        </div>
                        <div className={`text-lg font-bold ${
                          shift.completion_rate === 100 ? 'text-green-600' :
                          shift.completion_rate >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {shift.completion_rate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${shift.completion_rate}%`,
                          backgroundColor: shift.completion_rate === 100 ? '#10b981' : shift.completion_rate >= 70 ? '#f59e0b' : '#ef4444'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAnalytics;
