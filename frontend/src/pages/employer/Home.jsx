import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ModernSidebar from '../../components/layout/ModernSidebar';
import { FiCalendar, FiUsers, FiFileText, FiTrendingUp, FiClock, FiMapPin } from 'react-icons/fi';

const Home = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Schedule a Shift',
      description: 'Create new shift assignments',
      icon: FiCalendar,
      color: '#3b82f6',
      path: '/employer/roster'
    },
    {
      title: 'Manage Team',
      description: 'View and manage your workforce',
      icon: FiUsers,
      color: '#8b5cf6',
      path: '/employer/dashboard',
      state: { activeTab: 'workforce' }
    },
    {
      title: 'Review Timesheets',
      description: 'Approve pending timesheets',
      icon: FiFileText,
      color: '#10b981',
      path: '/employer/timesheets'
    },
    {
      title: 'Track Attendance',
      description: 'Monitor live attendance',
      icon: FiClock,
      color: '#f59e0b',
      path: '/employer/live-attendance'
    }
  ];

  const stats = [
    { label: 'Active Employees', value: '24', icon: FiUsers, color: '#3b82f6' },
    { label: 'Scheduled Shifts', value: '18', icon: FiCalendar, color: '#8b5cf6' },
    { label: 'Workplaces', value: '3', icon: FiMapPin, color: '#10b981' },
    { label: 'Hours This Week', value: '342', icon: FiClock, color: '#f59e0b' }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    return user?.profile?.first_name || 'there';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      
      {/* Main Content */}
      <div className="ml-[70px] transition-all duration-300">
        {/* Header */}
        <div 
          className="px-8 py-6 shadow-sm"
          style={{ backgroundColor: 'white' }}
        >
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {getUserName()}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your workforce today
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <Icon size={24} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (action.state) {
                        navigate(action.path, { state: action.state });
                      } else {
                        navigate(action.path);
                      }
                    }}
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-left group"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <Icon size={24} style={{ color: action.color }} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
            <div className="text-center py-12">
              <FiTrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Activity feed coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
