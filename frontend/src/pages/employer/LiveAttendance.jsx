import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiCalendar, FiUser } from 'react-icons/fi';
import api from '../../services/api';
import moment from 'moment';
import ModernSidebar from '../../components/layout/ModernSidebar';

const LiveAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));

  useEffect(() => {
    loadAttendance();
    
    // Auto-refresh every 30 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadAttendance, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedDate]);

  const loadAttendance = async () => {
    try {
      const res = await api.get(`/api/live-attendance/today?date=${selectedDate}`);
      setAttendance(res.data.data.records);
      setSummary(res.data.data.summary);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { color: 'bg-gray-100 text-gray-700', icon: FiClock, label: 'Scheduled' },
      clocked_in: { color: 'bg-green-100 text-green-700', icon: FiCheckCircle, label: 'Clocked In' },
      clocked_out: { color: 'bg-blue-100 text-blue-700', icon: FiCheckCircle, label: 'Completed' },
      late: { color: 'bg-orange-100 text-orange-700', icon: FiAlertCircle, label: 'Late' },
      missed: { color: 'bg-red-100 text-red-700', icon: FiXCircle, label: 'Missed' },
      on_time_off: { color: 'bg-purple-100 text-purple-700', icon: FiCalendar, label: 'Time Off' }
    };
    
    const badge = badges[status] || badges.scheduled;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const groupByWorkplace = () => {
    const grouped = {};
    attendance.forEach(record => {
      const workplace = record.workplace_name;
      if (!grouped[workplace]) {
        grouped[workplace] = [];
      }
      grouped[workplace].push(record);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading live attendance...</p>
        </div>
      </div>
    );
  }

  const groupedAttendance = groupByWorkplace();

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      
      <div className="ml-[70px] transition-all duration-300">
        {/* Header */}
        <div className="px-8 py-6 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Attendance</h1>
              <p className="text-gray-600 mt-1">
                {moment(selectedDate).format('dddd, MMMM DD, YYYY')} • Last updated: {moment().format('h:mm A')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={loadAttendance}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-gray-600 text-sm mb-1">Total Shifts</div>
            <div className="text-2xl font-bold text-gray-900">{summary.total || 0}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-4 border border-green-200">
            <div className="text-green-700 text-sm mb-1">Clocked In</div>
            <div className="text-2xl font-bold text-green-700">{summary.clocked_in || 0}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm p-4 border border-blue-200">
            <div className="text-blue-700 text-sm mb-1">Completed</div>
            <div className="text-2xl font-bold text-blue-700">{summary.clocked_out || 0}</div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow-sm p-4 border border-orange-200">
            <div className="text-orange-700 text-sm mb-1">Late</div>
            <div className="text-2xl font-bold text-orange-700">{summary.late || 0}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm p-4 border border-red-200">
            <div className="text-red-700 text-sm mb-1">Missed</div>
            <div className="text-2xl font-bold text-red-700">{summary.missed || 0}</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-sm p-4 border border-purple-200">
            <div className="text-purple-700 text-sm mb-1">Time Off</div>
            <div className="text-2xl font-bold text-purple-700">{summary.on_time_off || 0}</div>
          </div>
        </div>

        {/* Attendance Records */}
        {Object.entries(groupedAttendance).map(([workplace, records]) => (
          <div key={workplace} className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
              <h2 className="font-semibold text-blue-900">{workplace}</h2>
              <p className="text-sm text-blue-700">{records.length} shifts today</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={`${record.shift_id}_${record.worker_id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {record.worker_photo ? (
                            <img
                              src={record.worker_photo}
                              alt={record.worker_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{record.worker_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {moment(record.scheduled_start).format('h:mm A')}
                        </div>
                        <div className="text-xs text-gray-500">
                          to {moment(record.scheduled_end).format('h:mm A')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.clock_in_time ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              {moment(record.clock_in_time).format('h:mm A')}
                            </div>
                            {record.minutes_late > 0 && (
                              <div className="text-xs text-orange-600">
                                {record.minutes_late} min late
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.clock_out_time ? (
                          <div className="text-sm text-gray-900">
                            {moment(record.clock_out_time).format('h:mm A')}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {attendance.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shifts Today</h3>
            <p className="text-gray-600">There are no scheduled shifts for today.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default LiveAttendance;
