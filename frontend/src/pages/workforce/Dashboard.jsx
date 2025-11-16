import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import UserHeader from '../../components/common/UserHeader';

const WorkforceDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('financial'); // financial, schedule, career, jobs, attendance
  const [acceptedShifts, setAcceptedShifts] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [workforceProfile, setWorkforceProfile] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [stats, setStats] = useState({
    occupation_count: 0,
    total_hours: 0,
    current_week_earnings: 0,
    last_week_earnings: 0,
    current_month_earnings: 0,
    last_month_earnings: 0,
    pending_payment: 0,
    general_rating: 0,
    upcoming_shifts: [],
    occupations: [],
    availability_summary: { total_hours: 0, days_available: 0 },
    job_offers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [profileRes, occupationsRes, offersRes, shiftsRes, messagesRes, notificationsRes] = await Promise.all([
        api.get('/api/workforce/me/profile'),
        api.get('/api/occupations/me'),
        api.get('/api/jobs/offers').catch(() => ({ data: { data: { job_offers: [] } } })),
        api.get('/api/jobs/my-shifts').catch(() => ({ data: { data: { shifts: [] } } })),
        api.get('/api/messages/threads').catch(() => ({ data: { data: { threads: [], total_unread: 0 } } })),
        api.get('/api/notifications/my-notifications?unread_only=true').catch(() => ({ data: { data: { unread_count: 0 } } }))
      ]);

      const profile = profileRes.data.data;
      const occupations = occupationsRes.data.data.occupations;
      const jobOffers = offersRes.data.data.job_offers || [];
      const myShifts = shiftsRes.data.data.shifts || [];

      setWorkforceProfile(profile);
      setAcceptedShifts(myShifts);
      setUnreadMessages(messagesRes.data.data.total_unread || 0);
      setUnreadNotifications(notificationsRes.data.data.unread_count || 0);

      // Calculate availability summary
      const availHours = profile.availability_hours || {};
      setAvailabilityData(availHours); // Store for use in render
      const totalAvailableHours = Object.values(availHours).reduce((sum, slots) => sum + slots.length, 0);
      const daysAvailable = Object.values(availHours).filter(slots => slots.length > 0).length;

      setStats({
        occupation_count: occupations.length,
        total_hours: profile.total_hours_worked || 0,
        current_week_earnings: 0,
        last_week_earnings: 0,
        current_month_earnings: 0,
        last_month_earnings: 0,
        pending_payment: 0,
        general_rating: profile.general_rating_avg || 0,
        upcoming_shifts: myShifts.filter(s => s.status !== 'completed'),
        occupations: occupations,
        availability_summary: { total_hours: totalAvailableHours, days_available: daysAvailable },
        job_offers: jobOffers
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* UserHeader with Welcome Message and Actions */}
      <UserHeader 
        showBack={false}
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/workforce/settings')}
              className="hover:opacity-80 cursor-pointer"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button 
              onClick={() => navigate('/workforce/messages')}
              className="relative hover:opacity-80 cursor-pointer"
              title="Messages"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {unreadMessages}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/workforce/notifications')}
              className="relative hover:opacity-80 cursor-pointer" 
              title="Notifications"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        }
      />

      {/* Welcome Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back, {
                  workforceProfile?.first_name || 
                  user?.profile?.first_name || 
                  workforceProfile?.full_name || 
                  user?.profile?.full_name || 
                  'there'
                }! 👋
              </h2>
              <p className="text-gray-600">Here's what's happening with your work today</p>
            </div>
            {stats.job_offers.length > 0 && (
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
                <p className="text-sm text-gray-600">New Job Offers</p>
                <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>{stats.job_offers.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'financial' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'financial' ? theme.primaryColor : undefined, color: activeTab === 'financial' ? theme.primaryColor : undefined }}
              >
                💰 Financial
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'schedule' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'schedule' ? theme.primaryColor : undefined, color: activeTab === 'schedule' ? theme.primaryColor : undefined }}
              >
                📅 Work Schedule
              </button>
              <button
                onClick={() => setActiveTab('career')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'career' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'career' ? theme.primaryColor : undefined, color: activeTab === 'career' ? theme.primaryColor : undefined }}
              >
                📈 Career Dashboard
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'jobs' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'jobs' ? theme.primaryColor : undefined, color: activeTab === 'jobs' ? theme.primaryColor : undefined }}
              >
                💼 Find New Work {stats.job_offers.length > 0 && `(${stats.job_offers.length})`}
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'attendance' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'attendance' ? theme.primaryColor : undefined, color: activeTab === 'attendance' ? theme.primaryColor : undefined }}
              >
                🕐 Attendance
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* FINANCIAL TAB */}
            {activeTab === 'financial' && (
              <div>
              {/* Week Tabs */}
              <div className="flex gap-2 mb-4">
                <button className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg">
                  This Week
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                  Last Week
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                  This Month
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                  Last Month
                </button>
              </div>

              {/* Financial Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.current_week_earnings}</p>
                  <p className="text-xs text-gray-500 mt-1">This week</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Hours</p>
                  <p className="text-2xl font-bold text-gray-900">0h</p>
                  <p className="text-xs text-gray-500 mt-1">This week</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.pending_payment}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Avg Rate</p>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                  <p className="text-xs text-gray-500 mt-1">Per hour</p>
                </div>
              </div>

              {/* Mini Chart */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-3">Earnings Trend (Last 4 Weeks)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={[
                    { week: 'W1', amount: 0 },
                    { week: 'W2', amount: 0 },
                    { week: 'W3', amount: 0 },
                    { week: 'W4', amount: 0 }
                  ]}>
                    <XAxis dataKey="week" tick={{fontSize: 11}} />
                    <YAxis tick={{fontSize: 11}} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke={theme.primaryColor} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
              <div>
              {/* Availability Summary */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Available</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.availability_summary.total_hours}h</p>
                  <p className="text-xs text-gray-500 mt-1">Per week</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Days Set</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.availability_summary.days_available}/7</p>
                  <p className="text-xs text-gray-500 mt-1">Days per week</p>
                </div>
              </div>

              {/* Mini Calendar View */}
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-3">This Week's Availability</p>
                <div className="space-y-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][idx];
                    const dayHours = stats.availability_summary.total_hours > 0 ? 
                      (availabilityData?.[dayKey]?.length || 0) : 0;
                    return (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 w-12">{day}</span>
                        <div className="flex-1 mx-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                backgroundColor: theme.primaryColor,
                                width: `${(dayHours / 24) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{dayHours}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upcoming Shifts */}
              <div className="mt-4">
                <p className="text-xs text-gray-600 mb-2">Scheduled Shifts (0)</p>
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500">No scheduled shifts</p>
                </div>
              </div>
              </div>
            )}

            {/* CAREER TAB */}
            {activeTab === 'career' && (
              <div>
              {/* Occupation Profiles Mini Cards */}
              <div className="space-y-3 mb-4">
                {stats.occupations.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-600 mb-3">No occupation profiles yet</p>
                    <button
                      onClick={() => navigate('/workforce/occupations/create')}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      Create First Profile
                    </button>
                  </div>
                ) : (
                  stats.occupations.map((occ) => (
                    <div 
                      key={occ.occupation_id}
                      onClick={() => navigate(`/workforce/occupations/${occ.occupation_id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{occ.occupation_title}</h4>
                          <p className="text-xs text-gray-500">{occ.occupation_category}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {occ.profile_completeness || 40}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>⏱️ {occ.total_hours_worked || 0}h</span>
                        <span>⭐ {occ.skill_rating_avg || 'New'}</span>
                        <span>📜 {occ.certifications?.length || 0} certs</span>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Add slot if < 3 */}
                {stats.occupation_count < 3 && (
                  <button
                    onClick={() => navigate('/workforce/occupations/create')}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-center"
                  >
                    <p className="text-sm text-gray-600">+ Add Occupation ({3 - stats.occupation_count} slots left)</p>
                  </button>
                )}
              </div>

              {/* AI Course Recommendations */}
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">AI Recommendation</h4>
                    <p className="text-xs text-blue-800">
                      <strong>First Aid & CPR</strong> certification is in high demand. 
                      Completing this could increase your job matches by 35%.
                    </p>
                    <button className="text-xs font-medium mt-2 hover:underline" style={{ color: theme.primaryColor }}>
                      View Courses →
                    </button>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* JOBS TAB */}
            {activeTab === 'jobs' && (
              <div>
              {/* Job Offers Count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">{stats.job_offers.length} job offers available</p>
                <button className="text-xs text-gray-500 hover:text-gray-700">
                  Filter
                </button>
              </div>

              {/* Map/List View */}
              {stats.job_offers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-medium text-gray-900 mb-2">No Job Offers Yet</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete your occupation profiles and set availability to start receiving offers
                  </p>
                  <div className="flex gap-3 justify-center">
                    {stats.occupation_count === 0 && (
                      <button
                        onClick={() => navigate('/workforce/occupations/create')}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        Create Occupation
                      </button>
                    )}
                    {stats.availability_summary.total_hours === 0 && (
                      <button
                        onClick={() => navigate('/workforce/availability')}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{ backgroundColor: theme.accentColor }}
                      >
                        Set Availability
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {stats.job_offers.map((offer) => (
                    <div key={offer.offer_id} className="border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all bg-white">
                      {/* Summary Card - Minimal Info */}
                      <div className="text-center space-y-3">
                        {/* Business Name & Distance */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">📍 {offer.company_name}</h4>
                          <p className="text-sm text-gray-500">{offer.distance_km} km away</p>
                        </div>

                        {/* Role */}
                        <div className="py-3">
                          <p className="text-2xl font-bold text-gray-900">{offer.role_title}</p>
                        </div>

                        {/* Date & Time */}
                        <div className="text-gray-700">
                          <p className="font-medium">
                            {new Date(offer.shift_date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm mt-1">{offer.start_time} - {offer.end_time}</p>
                        </div>

                        {/* Pay Rate */}
                        <div className="py-2">
                          <p className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
                            ${offer.hourly_rate}/hour
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-4">
                          <button
                            onClick={async () => {
                              await api.post(`/api/jobs/offers/${offer.offer_id}/decline`);
                              loadDashboard();
                            }}
                            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                          >
                            PASS
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/api/jobs/offers/${offer.offer_id}/accept`);
                                alert('Application submitted! ✓\n\nYou can now view full details and message the employer.');
                                loadDashboard();
                              } catch (err) {
                                alert(err.response?.data?.error?.detail || 'Failed to apply');
                              }
                            }}
                            className="px-6 py-3 rounded-lg text-white font-semibold transition-all"
                            style={{ backgroundColor: theme.accentColor }}
                          >
                            APPLY
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Shifts & Attendance</h3>
                
                {/* Upcoming Shifts with Clock In */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-sm font-medium text-gray-700">Upcoming Shifts ({acceptedShifts.length})</h4>
                  
                  {acceptedShifts.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-600 mb-2">No upcoming shifts</p>
                      <p className="text-xs text-gray-500">Accept job offers to see your schedule here</p>
                      <button
                        onClick={() => setActiveTab('jobs')}
                        className="mt-4 px-6 py-2 rounded-lg text-white font-medium"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        View Job Offers
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {acceptedShifts.map((shift) => {
                        const isToday = new Date(shift.shift_date).toDateString() === new Date().toDateString();
                        
                        return (
                          <div key={shift.booking_id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-semibold text-gray-900">{shift.role_title}</h5>
                                <p className="text-sm text-gray-600">{shift.company_name}</p>
                                <p className="text-sm text-gray-500">{shift.workplace_name}</p>
                              </div>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                shift.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                shift.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {shift.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <span>📅 {new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                              <span>⏰ {shift.start_time} - {shift.end_time}</span>
                              <span>💰 ${shift.hourly_rate}/hr</span>
                            </div>

                            {isToday && shift.status === 'accepted' && (
                              <button
                                onClick={() => navigate(`/workforce/clock/${shift.booking_id}`)}
                                className="w-full px-4 py-3 rounded-lg text-white font-semibold"
                                style={{ backgroundColor: theme.accentColor }}
                              >
                                🕐 Clock In Now
                              </button>
                            )}

                            {!isToday && (
                              <p className="text-xs text-gray-500 text-center py-2">
                                Clock-in available on shift day
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Attendance History */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Attendance History</h4>
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-500">No attendance records yet</p>
                    <p className="text-xs text-gray-400 mt-1">Complete shifts to build your work history</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkforceDashboard;
