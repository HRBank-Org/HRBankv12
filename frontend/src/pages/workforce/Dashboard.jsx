import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import RateEmployer from '../../components/ratings/RateEmployer';
import api from '../../utils/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiCalendar, FiClock, FiDollarSign, FiAward, FiTrendingUp, FiAlertCircle, FiBriefcase, FiStar } from 'react-icons/fi';

const WorkforceDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingShifts: [],
    thisWeekHours: 0,
    thisWeekEarnings: 0,
    expectedWeeklyIncome: 0,
    pendingTasks: 0,
    averageRating: 0,
    occupationCount: 0,
    jobOffers: 0,
    totalBadges: 0
  });
  
  const [earningsTrend, setEarningsTrend] = useState([
    { week: 'W1', amount: 0 },
    { week: 'W2', amount: 0 },
    { week: 'W3', amount: 0 },
    { week: 'W4', amount: 0 }
  ]);

  const [hoursTrend, setHoursTrend] = useState([
    { day: 'Mon', hours: 0 },
    { day: 'Tue', hours: 0 },
    { day: 'Wed', hours: 0 },
    { day: 'Thu', hours: 0 },
    { day: 'Fri', hours: 0 },
    { day: 'Sat', hours: 0 },
    { day: 'Sun', hours: 0 }
  ]);

  useEffect(() => {
    loadDashboard();
    checkPendingJobApplication();
  }, []);

  // Check and process pending job application from signup flow
  const checkPendingJobApplication = async () => {
    const pendingJobId = localStorage.getItem('pending_job_application');
    if (pendingJobId) {
      try {
        // Apply to the job
        await api.post(`/api/jobs/${pendingJobId}/apply`);
        localStorage.removeItem('pending_job_application');
        // Show success notification
        alert('🎉 Your job application has been submitted successfully!');
      } catch (error) {
        console.error('Failed to submit pending job application:', error);
        // Only remove if job doesn't exist or already applied
        if (error.response?.status === 404 || error.response?.status === 409) {
          localStorage.removeItem('pending_job_application');
        }
      }
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    return user?.profile?.first_name || user?.profile?.full_name?.split(' ')[0] || 'there';
  };

  const loadDashboard = async () => {
    try {
      const [shiftsRes, occupationsRes, offersRes] = await Promise.all([
        api.get('/api/jobs/my-shifts').catch(() => ({ data: { data: { shifts: [] } } })),
        api.get('/api/occupations/me').catch(() => ({ data: { data: { occupations: [] } } })),
        api.get('/api/jobs/offers').catch(() => ({ data: { data: { job_offers: [] } } }))
      ]);

      const shifts = shiftsRes.data.data?.shifts || [];
      const occupations = occupationsRes.data.data?.occupations || [];
      const offers = offersRes.data.data?.job_offers || [];

      // Calculate stats
      const upcomingShifts = shifts.filter(s => s.status !== 'completed').slice(0, 3);
      const thisWeekShifts = shifts.filter(s => {
        const shiftDate = new Date(s.shift_date);
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return shiftDate >= weekStart;
      });

      const thisWeekHours = thisWeekShifts.reduce((sum, s) => {
        if (s.start_time && s.end_time) {
          const start = new Date(`2000-01-01 ${s.start_time}`);
          const end = new Date(`2000-01-01 ${s.end_time}`);
          const hours = (end - start) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      const thisWeekEarnings = thisWeekShifts.reduce((sum, s) => {
        if (s.hourly_rate && s.start_time && s.end_time) {
          const start = new Date(`2000-01-01 ${s.start_time}`);
          const end = new Date(`2000-01-01 ${s.end_time}`);
          const hours = (end - start) / (1000 * 60 * 60);
          return sum + (hours * s.hourly_rate);
        }
        return sum;
      }, 0);

      setStats({
        upcomingShifts,
        thisWeekHours: Math.round(thisWeekHours),
        thisWeekEarnings: Math.round(thisWeekEarnings),
        expectedWeeklyIncome: Math.round(thisWeekEarnings * 1.2), // Mock expected
        pendingTasks: 0,
        averageRating: 4.7,
        occupationCount: occupations.length,
        jobOffers: offers.length,
        totalBadges: 3
      });

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      {/* Main Content */}
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Title Section */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {getGreeting()}, {getUserName()}! 👋
          </h1>
          <p className="text-gray-600">
            Here's your work overview and earnings
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* This Week Earnings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#10b98115' }}
                >
                  <FiDollarSign size={24} style={{ color: '#10b981' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">This Week Earnings</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${stats.thisWeekEarnings}
              </div>
              <p className="text-sm text-gray-500">
                {stats.thisWeekHours}h worked
              </p>
            </div>

            {/* Expected Income */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#3b82f615' }}
                >
                  <FiTrendingUp size={24} style={{ color: '#3b82f6' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Expected Weekly</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${stats.expectedWeeklyIncome}
              </div>
              <p className="text-sm text-gray-500">
                Based on scheduled shifts
              </p>
            </div>

            {/* Upcoming Shifts */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/workforce/my-shifts')}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#8b5cf615' }}
                >
                  <FiCalendar size={24} style={{ color: '#8b5cf6' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Upcoming Shifts</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.upcomingShifts.length}
              </div>
              <p className="text-sm text-gray-500">
                Next 7 days
              </p>
            </div>

            {/* Average Rating */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/workforce/performance')}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#f59e0b15' }}
                >
                  <FiAward size={24} style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Your Rating</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.averageRating} ⭐
              </div>
              <p className="text-sm text-gray-500">
                {stats.totalBadges} badges earned
              </p>
            </div>
          </div>

          {/* Action Items / Alerts */}
          {(stats.pendingTasks > 0 || stats.jobOffers > 0) && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiAlertCircle className="text-orange-500" size={24} />
                Needs Your Attention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.jobOffers > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-blue-900 mb-1">
                      {stats.jobOffers} New Job Offers
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Employers are interested in hiring you
                    </p>
                    <button
                      onClick={() => navigate('/workforce/find-jobs')}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      View Offers
                    </button>
                  </div>
                )}

                {stats.occupationCount === 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      Complete Your Profile
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Add occupation profiles to start receiving job offers
                    </p>
                    <button
                      onClick={() => navigate('/workforce/occupations')}
                      className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Create Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Earnings Trend */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiTrendingUp size={20} className="text-green-600" />
                Earnings Trend (Last 4 Weeks)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={earningsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => `$${value}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Hours This Week */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiClock size={20} className="text-blue-600" />
                Hours This Week
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hoursTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => `${value}h`}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Shifts List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiCalendar size={20} className="text-purple-600" />
              Upcoming Shifts
            </h3>
            
            {stats.upcomingShifts.length === 0 ? (
              <div className="text-center py-12">
                <FiCalendar size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No upcoming shifts scheduled</p>
                <p className="text-sm text-gray-500">Check out available job offers</p>
                <button
                  onClick={() => navigate('/workforce/find-jobs')}
                  className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingShifts.map((shift, index) => (
                  <div 
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => navigate('/workforce/my-shifts')}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{shift.role_title}</h4>
                        <p className="text-sm text-gray-600">{shift.company_name}</p>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {shift.status || 'Scheduled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 {new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>⏰ {shift.start_time} - {shift.end_time}</span>
                      <span>💰 ${shift.hourly_rate}/hr</span>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => navigate('/workforce/my-shifts')}
                  className="w-full py-3 text-center text-sm font-medium text-gray-600 hover:text-gray-900 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  View All Shifts →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkforceDashboard;
