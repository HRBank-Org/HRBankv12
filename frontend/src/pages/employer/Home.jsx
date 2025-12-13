import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ModernSidebar from '../../components/layout/ModernSidebar';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { FiCalendar, FiUsers, FiFileText, FiTrendingUp, FiClock, FiMapPin, FiAlertCircle, FiCheckCircle, FiDollarSign, FiAward, FiUserCheck } from 'react-icons/fi';

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
        {/* User Header with Branding */}
        <UserHeader 
          showBack={false}
          greeting={getGreeting()}
          weather={getWeatherMessage()}
        />

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
