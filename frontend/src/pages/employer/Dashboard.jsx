import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import UserHeader from '../../components/common/UserHeader';

const EmployerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('overview'); // overview, schedule, workforce, financial, attendance
  const [stats, setStats] = useState({
    total_workplaces: 0,
    total_shifts: 0,
    active_workers: 0,
    total_hours: 0,
    total_payroll: 0,
    shifts_by_status: [],
    upcoming_shifts: []
  });
  const [employerProfile, setEmployerProfile] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [workplacesRes, shiftsRes, profileRes, messagesRes, notificationsRes] = await Promise.all([
        api.get('/api/employer/workplaces'),
        api.get('/api/employer/shifts'),
        api.get('/api/users/me'),
        api.get('/api/messages/threads').catch(() => ({ data: { data: { threads: [], total_unread: 0 } } })),
        api.get('/api/notifications/my-notifications?unread_only=true').catch(() => ({ data: { data: { unread_count: 0 } } }))
      ]);

      const workplaces = workplacesRes.data.data.workplaces;
      const shifts = shiftsRes.data.data.shifts;
      setEmployerProfile(profileRes.data.data.profile);
      setUnreadMessages(messagesRes.data.data.total_unread || 0);
      setUnreadNotifications(notificationsRes.data.data.unread_count || 0);

      // Calculate stats
      const shiftsByStatus = [
        { name: 'Open', value: shifts.filter(s => s.status === 'open').length, color: '#3B82F6' },
        { name: 'Filled', value: shifts.filter(s => s.status === 'filled').length, color: '#10B981' },
        { name: 'Completed', value: shifts.filter(s => s.status === 'completed').length, color: '#6B7280' }
      ];

      setStats({
        total_workplaces: workplaces.length,
        total_shifts: shifts.length,
        active_workers: 0,
        total_hours: 0,
        total_payroll: 0,
        shifts_by_status: shiftsByStatus,
        upcoming_shifts: shifts.filter(s => s.status === 'open').slice(0, 5)
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
      {/* UserHeader with Actions */}
      <UserHeader 
        showBack={false}
        actions={
          <div className="flex items-center gap-3">
            {employerProfile?.rating_avg > 0 && (
              <div className="flex items-center gap-1 px-3 py-2 bg-white/20 rounded-lg">
                <span className="text-yellow-300 text-lg">★</span>
                <span className="text-sm font-semibold">{employerProfile.rating_avg.toFixed(1)}</span>
              </div>
            )}
            <button 
              onClick={() => navigate('/employer/messages')}
              className="relative hover:opacity-80"
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
              onClick={() => navigate('/employer/notifications')}
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
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 mb-6 border border-orange-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {
              employerProfile?.first_name || 
              user?.profile?.first_name || 
              employerProfile?.contact_name || 
              employerProfile?.contact_person || 
              user?.profile?.contact_name || 
              'there'
            }! 👋
          </h2>
          <p className="text-gray-600">
            {employerProfile?.company_name && `Managing ${employerProfile.company_name} • `}
            {stats.total_shifts} total shifts created
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate('/employer/workforce-management')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100"
          >
            <div className="text-3xl mb-2">👥</div>
            <p className="font-semibold text-gray-900 text-sm">Workforce</p>
            <p className="text-xs text-gray-500">Manage workers</p>
          </button>
          <button
            onClick={() => navigate('/employer/shift-calendar')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100"
          >
            <div className="text-3xl mb-2">📅</div>
            <p className="font-semibold text-gray-900 text-sm">Shifts</p>
            <p className="text-xs text-gray-500">Schedule & manage</p>
          </button>
          <button
            onClick={() => navigate('/employer/jobs/post')}
            className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100"
          >
            <div className="text-3xl mb-2">📝</div>
            <p className="font-semibold text-gray-900 text-sm">Post Job</p>
            <p className="text-xs text-gray-500">Create job posting</p>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Workplaces</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total_workplaces}</div>
            <button
              onClick={() => navigate('/employer/workplaces')}
              className="text-xs mt-2 hover:underline"
              style={{ color: theme.primaryColor }}
            >
              View all →
            </button>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Total Shifts</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total_shifts}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Active Workers</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.active_workers}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Payroll (Week)</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">${stats.total_payroll}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'overview' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'overview' ? theme.primaryColor : undefined, color: activeTab === 'overview' ? theme.primaryColor : undefined }}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'schedule' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'schedule' ? theme.primaryColor : undefined, color: activeTab === 'schedule' ? theme.primaryColor : undefined }}
              >
                📅 Schedule & Shifts
              </button>
              <button
                onClick={() => setActiveTab('workforce')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'workforce' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'workforce' ? theme.primaryColor : undefined, color: activeTab === 'workforce' ? theme.primaryColor : undefined }}
              >
                👥 Workforce Performance
              </button>
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
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'attendance' ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ borderColor: activeTab === 'attendance' ? theme.primaryColor : undefined, color: activeTab === 'attendance' ? theme.primaryColor : undefined }}
              >
                🕐 Attendance Tracking
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shifts by Status - Pie Chart */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Shifts by Status</h3>
                    {stats.shifts_by_status.some(s => s.value > 0) ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={stats.shifts_by_status}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {stats.shifts_by_status.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <p className="text-sm">No shift data yet</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Workforce Overview */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Workforce Overview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Total Workers Hired</p>
                          <p className="text-2xl font-bold text-gray-900">0</p>
                        </div>
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Shifts This Week</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.total_shifts}</p>
                        </div>
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Fill Rate</p>
                          <p className="text-2xl font-bold text-gray-900">--</p>
                        </div>
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULE & SHIFTS TAB */}
            {activeTab === 'schedule' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Management</h3>
                  <button
                    onClick={() => navigate('/employer/workplaces')}
                    className="px-4 py-2 rounded-lg text-white font-medium text-sm"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    + Create Shift
                  </button>
                </div>

                {/* Calendar View Toggle */}
                <div className="flex gap-2 mb-6">
                  <button className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg">
                    Week View
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
                    Month View
                  </button>
                </div>

                {/* Shifts List */}
                <div className="space-y-3">
                  {stats.upcoming_shifts.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600 mb-4">No shifts scheduled</p>
                      <button
                        onClick={() => navigate('/employer/workplaces')}
                        className="px-6 py-3 rounded-lg text-white font-semibold"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        Create First Shift
                      </button>
                    </div>
                  ) : (
                    stats.upcoming_shifts.map((shift) => (
                      <div key={shift.shift_id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(shift.shift_date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              shift.status === 'open' ? 'bg-blue-100 text-blue-800' :
                              shift.status === 'filled' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {shift.status}
                            </span>
                            <button
                              onClick={() => navigate(`/employer/shifts/${shift.shift_id}`)}
                              className="px-4 py-2 text-sm rounded-lg text-white font-medium"
                              style={{ backgroundColor: theme.primaryColor }}
                            >
                              Manage
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* WORKFORCE PERFORMANCE TAB */}
            {activeTab === 'workforce' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Workforce Performance Metrics</h3>
                
                {/* Performance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Total Workers Hired</p>
                    <p className="text-4xl font-bold text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-2">All time</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Average Rating</p>
                    <div className="flex items-center gap-2">
                      <p className="text-4xl font-bold text-gray-900">--</p>
                      <span className="text-yellow-500 text-2xl">★</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Worker performance</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Attendance Rate</p>
                    <p className="text-4xl font-bold text-gray-900">--%</p>
                    <p className="text-xs text-gray-500 mt-2">On-time clock-ins</p>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Top Performers</h4>
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-600">No workers yet</p>
                    <p className="text-sm text-gray-500 mt-1">Hire workers to see performance metrics</p>
                  </div>
                </div>
              </div>
            )}

            {/* FINANCIAL TAB */}
            {activeTab === 'financial' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Financial Overview</h3>
                
                {/* Financial Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">This Week</p>
                    <p className="text-3xl font-bold text-gray-900">$0</p>
                    <p className="text-xs text-gray-500 mt-1">Payroll</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">$0</p>
                    <p className="text-xs text-gray-500 mt-1">Total payroll</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">$0</p>
                    <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">Avg Hourly Cost</p>
                    <p className="text-3xl font-bold text-gray-900">--</p>
                    <p className="text-xs text-gray-500 mt-1">Per worker</p>
                  </div>
                </div>

                {/* Payroll Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/employer/timesheets')}
                    className="border border-gray-200 rounded-lg p-6 text-left hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Approve Timesheets</h4>
                        <p className="text-sm text-gray-600">Review & pay workers</p>
                      </div>
                    </div>
                  </button>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Payment History</h4>
                        <p className="text-sm text-gray-600">View past payments</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ATTENDANCE TRACKING TAB */}
            {activeTab === 'attendance' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Attendance Overview</h3>
                
                {/* Attendance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Today's Shifts</p>
                    <p className="text-4xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Clocked In</p>
                    <p className="text-4xl font-bold text-green-600">0</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Completed</p>
                    <p className="text-4xl font-bold text-blue-600">0</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">No Show</p>
                    <p className="text-4xl font-bold text-red-600">0</p>
                  </div>
                </div>

                {/* Recent Attendance */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Recent Attendance</h4>
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-600">No attendance records yet</p>
                    <p className="text-sm text-gray-500 mt-1">Records will appear after workers clock in</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => navigate('/employer/workplaces')}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                <svg className="w-6 h-6" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Workplaces</h3>
                <p className="text-sm text-gray-600">{stats.total_workplaces} location{stats.total_workplaces !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/employer/timesheets')}
            className="text-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Approve Timesheets</h3>
                <p className="text-sm opacity-90">Review & pay workers</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/employer/workers')}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.accentColor}20` }}>
                <svg className="w-6 h-6" fill="none" stroke={theme.accentColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Workforce</h3>
                <p className="text-sm text-gray-600">{stats.active_workers} workers</p>
              </div>
            </div>
          </button>
        </div>

        {/* Upcoming Shifts Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Shifts</h3>
            <button
              onClick={() => navigate('/employer/workplaces')}
              className="text-sm font-medium hover:underline"
              style={{ color: theme.primaryColor }}
            >
              View all →
            </button>
          </div>

          {stats.upcoming_shifts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h4 className="font-medium text-gray-900 mb-2">No Upcoming Shifts</h4>
              <p className="text-sm text-gray-600 mb-4">Create shifts to start scheduling workers</p>
              <button
                onClick={() => navigate('/employer/workplaces')}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Create Shift
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.upcoming_shifts.map((shift) => (
                <div key={shift.shift_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer">
                  <div className="flex-1" onClick={() => navigate(`/employer/shifts/${shift.shift_id}`)}>
                    <p className="font-medium text-gray-900">
                      {new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      shift.status === 'open' ? 'bg-blue-100 text-blue-800' :
                      shift.status === 'filled' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {shift.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/employer/shifts/${shift.shift_id}/attendance`);
                      }}
                      className="px-3 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50"
                      title="View QR Code"
                    >
                      📋 QR Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Getting Started Guide (only show if no workplaces) */}
        {stats.total_workplaces === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Getting Started</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: theme.primaryColor }}>1</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Create Your First Workplace</div>
                  <div className="text-sm text-gray-600">Add your business location and details</div>
                  <button
                    onClick={() => navigate('/employer/workplaces')}
                    className="mt-2 text-sm font-medium hover:underline"
                    style={{ color: theme.primaryColor }}
                  >
                    Create Workplace →
                  </button>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-300 text-white text-sm">2</div>
                <div>
                  <div className="font-medium text-gray-600">Create Shifts</div>
                  <div className="text-sm text-gray-500">Schedule your workforce needs</div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-300 text-white text-sm">3</div>
                <div>
                  <div className="font-medium text-gray-600">Find & Hire Workers</div>
                  <div className="text-sm text-gray-500">Match with verified workforce</div>
                </div>
              </li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
};

export default EmployerDashboard;
