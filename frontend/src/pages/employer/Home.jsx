import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import UnstaffedShiftsAlert from '../../components/dashboard/UnstaffedShiftsAlert';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  FiCalendar, FiUsers, FiClock, FiMapPin, FiAlertCircle, 
  FiTruck, FiBriefcase, FiRefreshCw, FiChevronRight,
  FiUserCheck, FiCheckCircle, FiActivity
} from 'react-icons/fi';

const Home = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [operationalKpis, setOperationalKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/api/employer/dashboard/operational-kpis');
      if (response.data.success) {
        setOperationalKpis(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.goodMorning');
    if (hour < 18) return t('common.goodAfternoon');
    return t('common.goodEvening');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const kpis = operationalKpis || {
    summary: { total_hours_this_week: 0, shift_hours_week: 0, task_hours_week: 0, active_workers: 0, workers_on_duty_today: 0, attendance_rate_today: 100 },
    shifts: { today_count: 0, week_total: 0, standard_shifts_week: 0, continental_shifts_week: 0 },
    field_service: { total_tasks_week: 0, completed: 0, in_progress: 0, pending: 0, completion_rate: 0 },
    continental: { rotation_groups: {}, total_shifts_week: 0 }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <ModernSidebar />
      
      {/* Main Content */}
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Title Section */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {getGreeting()}, {user?.profile?.first_name || 'there'}! 👋
              </h1>
              <p className="text-gray-600">
                Here&apos;s your operational overview for today
              </p>
            </div>
            <button 
              onClick={loadDashboardData}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh data"
            >
              <FiRefreshCw className="text-gray-500" size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Unstaffed Shifts Alert - Priority 1 */}
          <div className="mb-8">
            <UnstaffedShiftsAlert theme={theme} />
          </div>

          {/* Main KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiClock size={18} className="text-blue-200" />
                <span className="text-sm text-blue-100">{t('pages.workforce.hoursThisWeek')}</span>
              </div>
              <div className="text-3xl font-bold">{kpis.summary.total_hours_this_week}</div>
              <div className="text-xs text-blue-200 mt-1">
                {kpis.summary.shift_hours_week}h shifts + {kpis.summary.task_hours_week}h tasks
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiUsers size={18} className="text-green-200" />
                <span className="text-sm text-green-100">Workers Today</span>
              </div>
              <div className="text-3xl font-bold">{kpis.summary.workers_on_duty_today}</div>
              <div className="text-xs text-green-200 mt-1">of {kpis.summary.active_workers} active</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiUserCheck size={18} className="text-purple-200" />
                <span className="text-sm text-purple-100">Attendance Rate</span>
              </div>
              <div className="text-3xl font-bold">{kpis.summary.attendance_rate_today}%</div>
              <div className="text-xs text-purple-200 mt-1">Today&apos;s check-ins</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiCalendar size={18} className="text-orange-200" />
                <span className="text-sm text-orange-100">Today&apos;s Shifts</span>
              </div>
              <div className="text-3xl font-bold">{kpis.shifts.today_count}</div>
              <div className="text-xs text-orange-200 mt-1">{kpis.shifts.week_total} this week</div>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiTruck size={18} className="text-teal-200" />
                <span className="text-sm text-teal-100">Field Tasks</span>
              </div>
              <div className="text-3xl font-bold">{kpis.field_service.completed}</div>
              <div className="text-xs text-teal-200 mt-1">{kpis.field_service.completion_rate}% completion</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <FiRefreshCw size={18} className="text-indigo-200" />
                <span className="text-sm text-indigo-100">Continental</span>
              </div>
              <div className="text-3xl font-bold">{kpis.continental.total_shifts_week}</div>
              <div className="text-xs text-indigo-200 mt-1">12h shifts this week</div>
            </div>
          </div>

          {/* Work Mode Breakdown */}
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiActivity size={22} className="text-gray-600" />
            Work Mode Breakdown
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Standard Shifts Card */}
            <div 
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate('/employer/calendar-scheduling')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <FiBriefcase className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Standard Shifts</h3>
                    <p className="text-sm text-gray-500">On-site work</p>
                  </div>
                </div>
                <FiChevronRight className="text-gray-400" size={20} />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {kpis.shifts.standard_shifts_week}
              </div>
              <div className="text-sm text-gray-500">shifts this week</div>
            </div>

            {/* Field Service Card */}
            <div 
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate('/employer/service-tasks')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <FiTruck className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Field Service</h3>
                    <p className="text-sm text-gray-500">Route-based tasks</p>
                  </div>
                </div>
                <FiChevronRight className="text-gray-400" size={20} />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{kpis.field_service.completed}</div>
                  <div className="text-xs text-gray-500">completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{kpis.field_service.in_progress}</div>
                  <div className="text-xs text-gray-500">in progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{kpis.field_service.pending}</div>
                  <div className="text-xs text-gray-500">pending</div>
                </div>
              </div>
            </div>

            {/* Continental Shifts Card */}
            <div 
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate('/employer/calendar-scheduling')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <FiRefreshCw className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Continental</h3>
                    <p className="text-sm text-gray-500">12-hour rotating</p>
                  </div>
                </div>
                <FiChevronRight className="text-gray-400" size={20} />
              </div>
              {kpis.continental.rotation_groups && Object.keys(kpis.continental.rotation_groups).length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(kpis.continental.rotation_groups).map(([group, counts]) => (
                    <div key={group} className="px-3 py-1 bg-indigo-50 rounded-full text-sm">
                      <span className="font-medium text-indigo-700">Group {group}:</span>
                      <span className="ml-1 text-indigo-600">☀️{counts.day || 0} 🌙{counts.night || 0}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">No continental shifts this week</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/employer/calendar-scheduling')}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <FiCalendar className="text-blue-500 mb-2" size={24} />
              <div className="font-medium text-gray-900">Create Shift</div>
              <div className="text-sm text-gray-500">Schedule work</div>
            </button>

            <button
              onClick={() => navigate('/employer/workplaces')}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <FiMapPin className="text-green-500 mb-2" size={24} />
              <div className="font-medium text-gray-900">Workplaces</div>
              <div className="text-sm text-gray-500">Manage locations</div>
            </button>

            <button
              onClick={() => navigate('/employer/workforce-management')}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <FiUsers className="text-purple-500 mb-2" size={24} />
              <div className="font-medium text-gray-900">Team</div>
              <div className="text-sm text-gray-500">Manage workers</div>
            </button>

            <button
              onClick={() => navigate('/employer/live-attendance')}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left"
            >
              <FiCheckCircle className="text-orange-500 mb-2" size={24} />
              <div className="font-medium text-gray-900">Live Attendance</div>
              <div className="text-sm text-gray-500">Track check-ins</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
