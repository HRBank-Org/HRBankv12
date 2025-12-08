import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import { FiUsers, FiCalendar, FiAward, FiDollarSign, FiSun, FiCloud, FiCloudRain, FiStar, FiClock } from 'react-icons/fi';
import CalendarView from '../../components/scheduling/CalendarView';

const EmployerDashboardNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [activeTab, setActiveTab] = useState('schedule'); // schedule (embedded calendar), kpis, finances, workforce
  const [employerProfile, setEmployerProfile] = useState(null);
  const [weather, setWeather] = useState(null);
  const [workforce, setWorkforce] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [pendingRatings, setPendingRatings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadWeather();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    return employerProfile?.first_name || 
           user?.profile?.first_name || 
           employerProfile?.contact_name?.split(' ')[0] || 
           'there';
  };

  const getWeatherMessage = () => {
    if (!weather) return '';
    
    const temp = Math.round(weather.main?.temp || 0);
    const condition = weather.weather?.[0]?.main?.toLowerCase() || '';
    const description = weather.weather?.[0]?.description || '';
    
    if (condition.includes('clear') || condition.includes('sun')) {
      return `It's a beautiful sunny day! ☀️ ${temp}°C`;
    } else if (condition.includes('cloud')) {
      return `It's a bit cloudy today. ☁️ ${temp}°C`;
    } else if (condition.includes('rain')) {
      return `Rainy day ahead. 🌧️ ${temp}°C`;
    } else if (condition.includes('snow')) {
      return `Snow is falling! ❄️ ${temp}°C`;
    }
    return `${description}. ${temp}°C`;
  };

  const loadWeather = async () => {
    try {
      // Using OpenWeather API - free tier
      // For production, you should add API key to .env
      const API_KEY = 'demo'; // User needs to add their own key
      const city = employerProfile?.city || 'Toronto';
      
      // For demo, using a mock weather response
      // In production: const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
      
      setWeather({
        main: { temp: 22 },
        weather: [{ main: 'Clear', description: 'clear sky' }]
      });
    } catch (error) {
      console.error('Failed to load weather:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [profileRes, statsRes, workforceRes] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/employer/dashboard/stats'),
        api.get('/api/employer/dashboard/workforce')
      ]);

      setEmployerProfile(profileRes.data.data.profile);
      
      const stats = statsRes.data.data;
      setWorkplaces(stats.workplaces || []);
      setPendingRatings(stats.pending_ratings || 0);
      
      const workers = workforceRes.data.data.workers || [];
      setWorkforce(workers);
      
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: FiCalendar, badge: null },
    { id: 'kpis', label: 'KPIs', icon: FiAward, badge: pendingRatings > 0 ? pendingRatings : null },
    { id: 'finances', label: 'Finances', icon: FiDollarSign, badge: null },
    { id: 'workforce', label: 'Workforce', icon: FiUsers, badge: null }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader showBack={false} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Greeting Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {getGreeting()}, {getUserName()}! 👋
          </h1>
          {employerProfile?.company_name && (
            <p className="text-gray-600">{employerProfile.company_name}</p>
          )}
          {weather && (
            <p className="text-sm text-gray-500 mt-1">{getWeatherMessage()}</p>
          )}
        </div>

        {/* Pending Ratings Banner */}
        {pendingRatings > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiAward className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">
                  {pendingRatings} shift{pendingRatings > 1 ? 's' : ''} need{pendingRatings === 1 ? 's' : ''} ratings
                </p>
                <p className="text-sm text-blue-700">Takes just 2 minutes • Help your workers grow!</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('kpis')}
              className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-all"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Rate Now
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all relative ${
                      isActive 
                        ? 'border-b-2 text-gray-900' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    style={isActive ? { borderColor: theme.primaryColor, color: theme.primaryColor } : {}}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                    {tab.badge && (
                      <span 
                        className="ml-1 px-2 py-0.5 text-xs font-bold text-white rounded-full"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'schedule' && <ScheduleTab theme={theme} navigate={navigate} />}
            {activeTab === 'kpis' && <KPIsTab theme={theme} navigate={navigate} pendingRatings={pendingRatings} />}
            {activeTab === 'finances' && <FinancesTab theme={theme} navigate={navigate} />}
            {activeTab === 'workforce' && <WorkforceTab workforce={workforce} workplaces={workplaces} theme={theme} navigate={navigate} />}
          </div>
        </div>
      </main>
    </div>
  );
};

// Workforce Tab Component
const WorkforceTab = ({ workforce, workplaces, theme, navigate }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Workforce Inventory</h2>
        <button
          onClick={() => navigate('/employer/find-workers')}
          className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-all"
          style={{ backgroundColor: theme.primaryColor }}
        >
          + Recruit Workers
        </button>
      </div>

      {/* Workforce Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1">Total Workforce</div>
          <div className="text-3xl font-bold text-blue-900">{workforce.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">Active Workers</div>
          <div className="text-3xl font-bold text-green-900">
            {workforce.filter(w => w.status === 'active').length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-700 mb-1">Workplaces</div>
          <div className="text-3xl font-bold text-purple-900">{workplaces.length}</div>
        </div>
      </div>

      {/* Workplace Distribution */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution by Workplace</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workplaces.map(workplace => {
            const workersAtLocation = workforce.filter(w => w.workplace_id === workplace.workplace_id);
            
            return (
              <div key={workplace.workplace_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{workplace.workplace_name}</h4>
                  <span className="text-sm text-gray-500">{workersAtLocation.length} workers</span>
                </div>
                
                {/* Worker Icons */}
                <div className="flex flex-wrap gap-1">
                  {workersAtLocation.slice(0, 12).map((worker, idx) => (
                    <div
                      key={idx}
                      className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm cursor-pointer hover:scale-110 transition-transform"
                      title={`${worker.name} - ${worker.occupation}`}
                    >
                      {worker.photo_url ? (
                        <img src={worker.photo_url} alt={worker.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        worker.name?.charAt(0) || '?'
                      )}
                    </div>
                  ))}
                  {workersAtLocation.length > 12 && (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold">
                      +{workersAtLocation.length - 12}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Worker Cards Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Workers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workforce.map(worker => (
            <WorkerCard key={worker.user_id} worker={worker} theme={theme} navigate={navigate} />
          ))}
        </div>
      </div>

      {workforce.length === 0 && (
        <div className="text-center py-12">
          <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workers yet</h3>
          <p className="text-gray-600 mb-4">Start building your team by recruiting workers</p>
          <button
            onClick={() => navigate('/employer/find-workers')}
            className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Find Workers
          </button>
        </div>
      )}
    </div>
  );
};

// Worker Card Component
const WorkerCard = ({ worker, theme, navigate }) => {
  return (
    <div
      onClick={() => navigate(`/employer/workforce/${worker.user_id}`)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Worker Photo */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          {worker.photo_url ? (
            <img
              src={worker.photo_url}
              alt={worker.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-gray-200"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {worker.name?.charAt(0) || '?'}
            </div>
          )}
          
          {/* Status Badge */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            worker.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {worker.name}
          </h4>
          <p className="text-sm text-gray-600 truncate">{worker.occupation || 'No occupation'}</p>
          
          {/* Rating */}
          {worker.rating && (
            <div className="flex items-center gap-1 mt-1">
              <FiStar className="w-3 h-3 text-yellow-500 fill-current" />
              <span className="text-sm font-medium text-gray-700">{worker.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({worker.rating_count || 0})</span>
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {worker.skills && worker.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {worker.skills.slice(0, 3).map((skill, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
              {skill}
            </span>
          ))}
          {worker.skills.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
              +{worker.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Certifications */}
      {worker.certifications && worker.certifications.length > 0 && (
        <div className="text-xs text-gray-600">
          <span className="font-medium">{worker.certifications.length}</span> certification{worker.certifications.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

// Schedule Tab Component - Embedded Calendar + Workplaces
const ScheduleTab = ({ theme, navigate }) => {
  const [workplaces, setWorkplaces] = useState([]);
  const [showWorkplaces, setShowWorkplaces] = useState(false);
  
  useEffect(() => {
    loadWorkplaces();
  }, []);
  
  const loadWorkplaces = async () => {
    try {
      const statsRes = await api.get('/api/employer/dashboard/stats');
      setWorkplaces(statsRes.data.data.workplaces || []);
    } catch (error) {
      console.error('Failed to load workplaces:', error);
    }
  };
  
  return (
    <div className="-m-6">
      {/* Toggle Button for Workplaces */}
      <div className="px-6 pt-4 pb-2 bg-white border-b border-gray-200">
        <button
          onClick={() => setShowWorkplaces(!showWorkplaces)}
          className="px-4 py-2 rounded-lg border-2 font-medium hover:bg-gray-50 transition-all"
          style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
        >
          {showWorkplaces ? 'View Calendar' : `View Workplaces (${workplaces.length})`}
        </button>
      </div>
      
      {/* Calendar View */}
      {!showWorkplaces && <CalendarView embedded={true} />}
      
      {/* Workplaces Management View */}
      {showWorkplaces && (
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Workplace Management</h2>
                <p className="text-gray-600 mt-1">Manage your business locations</p>
              </div>
              <button
                onClick={() => navigate('/employer/workplaces/add')}
                className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <FiPlus className="w-5 h-5" />
                Add Workplace
              </button>
            </div>
            
            {/* Workplace Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">Total Workplaces</div>
                <div className="text-3xl font-bold text-gray-900">{workplaces.length}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">Active Locations</div>
                <div className="text-3xl font-bold text-green-600">{workplaces.length}</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-600 mb-1">With Active Shifts</div>
                <div className="text-3xl font-bold text-blue-600">{workplaces.length}</div>
              </div>
            </div>
            
            {/* Workplaces Grid */}
            {workplaces.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workplaces.map((workplace) => (
                  <div
                    key={workplace.workplace_id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/employer/workplaces/${workplace.workplace_id}`)}
                  >
                    {/* Workplace Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {workplace.workplace_name}
                        </h3>
                        {workplace.address && (
                          <p className="text-sm text-gray-600 flex items-start gap-1">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{workplace.address}</span>
                          </p>
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: theme.primaryColor }}>
                        {workplace.workplace_name?.charAt(0) || 'W'}
                      </div>
                    </div>
                    
                    {/* Workplace Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employer/workplaces/${workplace.workplace_id}/edit`);
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employer/workplaces/${workplace.workplace_id}/shifts`);
                        }}
                        className="flex-1 px-3 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-all"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        View Shifts
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workplaces yet</h3>
                <p className="text-gray-600 mb-6">Add your first workplace to start scheduling shifts</p>
                <button
                  onClick={() => navigate('/employer/workplaces/add')}
                  className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Add Your First Workplace
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// KPIs Tab Component (Performance & Ratings)
const KPIsTab = ({ theme, navigate, pendingRatings }) => {
  return (
    <div className="text-center py-12">
      <FiAward className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Key Performance Indicators</h3>
      <p className="text-gray-600 mb-4">Rate your workers and track performance metrics</p>
      {pendingRatings > 0 && (
        <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg mb-4">
          <span className="font-semibold">{pendingRatings}</span> shift{pendingRatings > 1 ? 's' : ''} pending rating
        </div>
      )}
      <p className="text-sm text-gray-500">(Coming in Phase 3)</p>
    </div>
  );
};

// Finances Tab Component (Placeholder)
const FinancesTab = ({ theme, navigate }) => {
  return (
    <div className="text-center py-12">
      <FiDollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance & Finances</h3>
      <p className="text-gray-600 mb-4">Live attendance and financial overview</p>
      <button
        onClick={() => navigate('/employer/live-attendance')}
        className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-all"
        style={{ backgroundColor: theme.primaryColor }}
      >
        View Live Attendance
      </button>
    </div>
  );
};

export default EmployerDashboardNew;
