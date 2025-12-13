import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ModernSidebar from '../../components/layout/ModernSidebar';
import api from '../../utils/api';
import { FiCalendar, FiUsers, FiFileText, FiTrendingUp, FiClock, FiMapPin, FiAlertCircle, FiCheckCircle, FiDollarSign, FiAward, FiUserCheck } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Home = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeEmployees: 0,
    scheduledShifts: 0,
    workplaces: 0,
    hoursThisWeek: 0,
    pendingTimesheets: 0,
    openRoles: 0,
    pendingRatings: 0,
    attendanceToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [attentionItems, setAttentionItems] = useState([]);

  // Chart data
  const attendanceData = [
    { day: 'Mon', attendance: 22, scheduled: 25 },
    { day: 'Tue', attendance: 24, scheduled: 25 },
    { day: 'Wed', attendance: 23, scheduled: 26 },
    { day: 'Thu', attendance: 25, scheduled: 27 },
    { day: 'Fri', attendance: 26, scheduled: 28 },
    { day: 'Sat', attendance: 18, scheduled: 20 },
    { day: 'Sun', attendance: 15, scheduled: 18 }
  ];

  const hoursData = [
    { week: 'Week 1', hours: 320 },
    { week: 'Week 2', hours: 335 },
    { week: 'Week 3', hours: 342 },
    { week: 'Week 4', hours: 355 }
  ];

  const departmentData = [
    { name: 'Kitchen', value: 8, color: '#3b82f6' },
    { name: 'Service', value: 12, color: '#8b5cf6' },
    { name: 'Bar', value: 4, color: '#10b981' },
    { name: 'Management', value: 3, color: '#f59e0b' }
  ];

  const payrollData = [
    { month: 'Sep', amount: 45000 },
    { month: 'Oct', amount: 48000 },
    { month: 'Nov', amount: 52000 },
    { month: 'Dec', amount: 49000 }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load stats from various endpoints
      const [workforceRes, shiftsRes, workplacesRes] = await Promise.all([
        api.get('/api/employer/workforce/stats').catch(() => ({ data: { data: { active_count: 0 } } })),
        api.get('/api/calendar/shifts/stats').catch(() => ({ data: { data: { upcoming_count: 0 } } })),
        api.get('/api/employer/workplaces').catch(() => ({ data: { data: { workplaces: [] } } }))
      ]);

      setStats({
        activeEmployees: workforceRes.data.data?.active_count || 24,
        scheduledShifts: shiftsRes.data.data?.upcoming_count || 18,
        workplaces: workplacesRes.data.data?.workplaces?.length || 3,
        hoursThisWeek: 342,
        pendingTimesheets: 5,
        openRoles: 3,
        pendingRatings: 10,
        attendanceToday: 15
      });

      // Build attention items
      const items = [];
      if (stats.pendingRatings > 0) {
        items.push({
          title: `${stats.pendingRatings} shifts need ratings`,
          description: 'Help your workers grow with feedback',
          action: 'Rate Now',
          path: '/employer/dashboard',
          state: { activeTab: 'kpis' },
          priority: 'high'
        });
      }
      if (stats.pendingTimesheets > 0) {
        items.push({
          title: `${stats.pendingTimesheets} timesheets pending approval`,
          description: 'Review and approve for payroll',
          action: 'Review',
          path: '/employer/timesheets',
          priority: 'medium'
        });
      }
      if (stats.openRoles > 0) {
        items.push({
          title: `${stats.openRoles} open positions to fill`,
          description: 'Start recruiting to fill roles',
          action: 'View Roles',
          path: '/employer/dashboard',
          state: { activeTab: 'workforce', showInvitations: true },
          priority: 'medium'
        });
      }
      setAttentionItems(items);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getWeatherMessage = () => {
    return "It's a beautiful day! ☀️ 22°C";
  };

  const moduleHighlights = [
    {
      title: 'Operations',
      modules: [
        {
          name: 'Roster',
          icon: FiCalendar,
          stat: `${stats.scheduledShifts} shifts`,
          description: 'Upcoming this week',
          path: '/employer/roster',
          color: '#3b82f6'
        },
        {
          name: 'Workplaces',
          icon: FiMapPin,
          stat: `${stats.workplaces} locations`,
          description: 'Active sites',
          path: '/employer/dashboard',
          state: { activeTab: 'schedule', showWorkplaces: true },
          color: '#06b6d4'
        }
      ]
    },
    {
      title: 'HR Management',
      modules: [
        {
          name: 'Roles',
          icon: FiUsers,
          stat: `${stats.openRoles} open`,
          description: 'Positions to fill',
          path: '/employer/dashboard',
          state: { activeTab: 'workforce', showInvitations: true },
          color: '#8b5cf6'
        },
        {
          name: 'Team',
          icon: FiUserCheck,
          stat: `${stats.activeEmployees} active`,
          description: 'Employees',
          path: '/employer/dashboard',
          state: { activeTab: 'workforce' },
          color: '#10b981'
        },
        {
          name: 'Live Attendance',
          icon: FiClock,
          stat: `${stats.attendanceToday} today`,
          description: 'Workers clocked in',
          path: '/employer/live-attendance',
          color: '#f59e0b'
        }
      ]
    },
    {
      title: 'Finances',
      modules: [
        {
          name: 'Timesheets',
          icon: FiFileText,
          stat: `${stats.pendingTimesheets} pending`,
          description: 'Need approval',
          path: '/employer/timesheets',
          color: '#14b8a6'
        },
        {
          name: 'Payroll',
          icon: FiDollarSign,
          stat: `${stats.hoursThisWeek}hrs`,
          description: 'This week',
          path: '/employer/payroll',
          color: '#10b981'
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      
      {/* Main Content */}
      <div className="ml-[70px] transition-all duration-300">
        {/* Custom Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="p-8">
            {/* Top Row: Logo + User Info + Weather */}
            <div className="flex items-start justify-between mb-6">
              {/* Left: Company Logo + Info */}
              <div className="flex items-center gap-4">
                {user?.profile?.photo_url ? (
                  <img 
                    src={user.profile.photo_url.startsWith('http') 
                      ? user.profile.photo_url 
                      : `${process.env.REACT_APP_BACKEND_URL}${user.profile.photo_url}`
                    }
                    alt={user?.profile?.business_name || 'Company Logo'}
                    className="w-16 h-16 rounded-xl shadow-lg"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {(user?.profile?.business_name?.[0] || user?.profile?.first_name?.[0] || 'C').toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user?.profile?.business_name || 'Loose Goose Bar & Bistro'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {user?.profile?.address || '1997 Whitewood Drive'} • {user?.profile?.city || 'Bella Roses'}
                  </p>
                </div>
              </div>

              {/* Right: Weather */}
              <div className="text-right">
                <div className="text-sm text-gray-600">☀️ {getWeatherMessage()}</div>
              </div>
            </div>

            {/* Bottom Row: Greeting + User Details */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                  {getGreeting()}, {user?.profile?.first_name || 'there'}! 👋
                </h2>
                <p className="text-gray-600">
                  Here's your workforce overview and insights
                </p>
              </div>

              {/* User Badge */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl">
                {user?.profile?.photo_url ? (
                  <img 
                    src={user.profile.photo_url} 
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {(user?.profile?.first_name?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">
                    {user?.profile?.first_name} {user?.profile?.last_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {user?.user_type === 'employer' ? 'HR Manager' : 'Manager'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Attention Needed Section */}
          {attentionItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiAlertCircle className="text-orange-500" size={24} />
                Needs Your Attention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attentionItems.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl p-5 border-2 ${
                      item.priority === 'high' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${
                          item.priority === 'high' ? 'text-red-900' : 'text-yellow-900'
                        }`}>
                          {item.title}
                        </h3>
                        <p className={`text-sm ${
                          item.priority === 'high' ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (item.state) {
                          navigate(item.path, { state: item.state });
                        } else {
                          navigate(item.path);
                        }
                      }}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        item.priority === 'high'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                    >
                      {item.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts & Analytics Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiTrendingUp size={24} className="text-blue-600" />
              Analytics & Insights
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Attendance Trend Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Weekly Attendance</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={attendanceData}>
                    <defs>
                      <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
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
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#colorAttendance)" 
                      name="Present"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="scheduled" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      fillOpacity={0.1}
                      fill="#94a3b8" 
                      name="Scheduled"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Hours Worked Trend */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Hours Worked (Monthly)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={hoursData}>
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
                    />
                    <Bar dataKey="hours" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Team Distribution */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Team by Department</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Payroll Trend */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Payroll Expenses</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={payrollData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', r: 5 }}
                      name="Amount ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Module Highlights */}
          {moduleHighlights.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.modules.map((module, moduleIndex) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={moduleIndex}
                      onClick={() => {
                        if (module.state) {
                          navigate(module.path, { state: module.state });
                        } else {
                          navigate(module.path);
                        }
                      }}
                      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-left group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${module.color}15` }}
                        >
                          <Icon size={24} style={{ color: module.color }} />
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {module.name}
                      </h3>
                      <div className="text-2xl font-bold mb-1" style={{ color: module.color }}>
                        {module.stat}
                      </div>
                      <p className="text-sm text-gray-600">
                        {module.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
