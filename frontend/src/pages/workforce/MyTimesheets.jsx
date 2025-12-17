import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';

const MyTimesheets = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [timesheets, setTimesheets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, paid

  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    try {
      const response = await api.get('/api/attendance/my-timesheets');
      setTimesheets(response.data.data.timesheets);
      setStats({
        total: response.data.data.total_timesheets,
        hours: response.data.data.total_hours,
        earnings: response.data.data.total_earnings
      });
    } catch (error) {
      console.error('Failed to load timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTimesheets = timesheets.filter(ts => {
    if (filter === 'all') return true;
    return ts.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'submitted': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'paid': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Timesheets</h1>
          <p className="text-gray-600">View your work hours and earnings history</p>
        </div>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-1">Total Timesheets</div>
              <div className="text-3xl font-bold text-gray-900">{stats.total || 0}</div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-1">Total Hours</div>
              <div className="text-3xl font-bold text-gray-900">{stats.hours?.toFixed(2) || '0.00'}</div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-500">
              <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
              <div className="text-3xl font-bold text-gray-900">${stats.earnings?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-2xl shadow-sm p-2 mb-6 flex gap-2">
            {['all', 'submitted', 'approved', 'paid'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === status 
                    ? 'text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={{ backgroundColor: filter === status ? theme.primaryColor : 'transparent' }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Timesheets List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Timesheets</h2>
            </div>

          {filteredTimesheets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Timesheets Found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'Complete your first shift to see timesheets here' 
                  : `No ${filter} timesheets at this time`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTimesheets.map((timesheet) => (
                <div key={timesheet.timesheet_id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {timesheet.employer_name || 'Employer'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {timesheet.workplace_name || 'Workplace'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(timesheet.status)}`}>
                      {timesheet.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Week Ending:</span>
                      <div className="font-medium text-gray-900">
                        {new Date(timesheet.week_ending_date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Total Hours:</span>
                      <div className="font-medium text-gray-900">{timesheet.total_hours.toFixed(2)} hrs</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Gross Pay:</span>
                      <div className="font-medium text-green-600">${timesheet.gross_pay.toFixed(2)}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Net Pay:</span>
                      <div className="font-bold text-blue-600">${timesheet.net_pay.toFixed(2)}</div>
                    </div>
                  </div>

                  {timesheet.overtime_hours > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-yellow-700">⚡ Overtime:</span>
                        <span className="font-medium text-yellow-900">
                          {timesheet.overtime_hours.toFixed(2)} hrs @ ${timesheet.overtime_rate.toFixed(2)}/hr = ${timesheet.overtime_pay.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-all">
                      View Details
                    </button>
                    {timesheet.status === 'approved' || timesheet.status === 'paid' ? (
                      <button className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
                        Download PDF
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTimesheets;
