import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import { FiUsers, FiCalendar, FiAward, FiDollarSign, FiSun, FiCloud, FiCloudRain, FiStar, FiClock, FiPlus } from 'react-icons/fi';
import CalendarView from '../../components/scheduling/CalendarView';
import RatingModal from '../../components/ratings/RatingModal';
import WorkerDetailModal from '../../components/workforce/WorkerDetailModal';
import InvitationManager from '../../components/workforce/InvitationManager';

const EmployerDashboardNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const [activeTab, setActiveTab] = useState('schedule'); // schedule (embedded calendar), kpis, finances, workforce
  const [employerProfile, setEmployerProfile] = useState(null);
  const [weather, setWeather] = useState(null);
  const [workforce, setWorkforce] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [pendingRatings, setPendingRatings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInvitations, setShowInvitations] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadWeather();
    
    // Check if we're navigating back from another page with state
    if (location.state) {
      if (location.state.activeTab) {
        setActiveTab(location.state.activeTab);
      }
      if (location.state.showInvitations) {
        setShowInvitations(true);
      }
    }
  }, [location]);
  
  // Get showWorkplaces flag from location state
  const showWorkplacesFromState = location.state?.showWorkplaces || false;

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
      const [profileRes, statsRes, workforceRes, ratingsRes] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/employer/dashboard/stats'),
        api.get('/api/employer/dashboard/workforce'),
        api.get('/api/employer/ratings/pending')
      ]);

      setEmployerProfile(profileRes.data.data.profile);
      
      const stats = statsRes.data.data;
      setWorkplaces(stats.workplaces || []);
      
      const ratings = ratingsRes.data.data;
      setPendingRatings(ratings.count || 0);
      
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
    { id: 'workforce', label: 'Workforce', icon: FiUsers, badge: null },
    { id: 'finances', label: 'Finances', icon: FiDollarSign, badge: null },
    { id: 'kpis', label: 'KPIs', icon: FiAward, badge: pendingRatings > 0 ? pendingRatings : null }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-all duration-150 ease-in-out" style={{ backgroundColor: theme.bgColor, marginRight: 0 }}>
      <UserHeader 
        showBack={false} 
        greeting={`${getGreeting()}, ${getUserName()}`}
        weather={weather ? getWeatherMessage() : null}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 transition-all duration-150 ease-in-out">
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
            {activeTab === 'schedule' && <ScheduleTab theme={theme} navigate={navigate} initialShowWorkplaces={showWorkplacesFromState} />}
            {activeTab === 'kpis' && <KPIsTab theme={theme} navigate={navigate} pendingRatings={pendingRatings} onRatingSuccess={loadDashboardData} />}
            {activeTab === 'finances' && <FinancesTab theme={theme} navigate={navigate} />}
            {activeTab === 'workforce' && <WorkforceTab workforce={workforce} workplaces={workplaces} theme={theme} navigate={navigate} initialShowInvitations={showInvitations} />}
          </div>
        </div>
      </main>
    </div>
  );
};

// Workforce Tab Component
const WorkforceTab = ({ workforce, workplaces, theme, navigate, initialShowInvitations = false }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showInvitations, setShowInvitations] = useState(initialShowInvitations);
  const [selectedWorkplace, setSelectedWorkplace] = useState('all');
  
  // Update when initialShowInvitations changes
  useEffect(() => {
    if (initialShowInvitations) {
      setShowInvitations(true);
    }
  }, [initialShowInvitations]);

  const handleWorkerClick = (workerId) => {
    setSelectedWorkerId(workerId);
    setShowWorkerModal(true);
  };

  // Filter workforce by selected workplace
  const filteredWorkforce = selectedWorkplace === 'all' 
    ? workforce 
    : workforce.filter(w => w.workplace_id === selectedWorkplace);

  if (showInvitations) {
    return (
      <div>
        <button
          onClick={() => setShowInvitations(false)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          ← Back to Workforce
        </button>
        <InvitationManager />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Workforce Inventory</h2>
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Navigate to Schedule tab and show workplaces view
              navigate('/employer/dashboard', { state: { activeTab: 'schedule', showWorkplaces: true } });
            }}
            className="px-4 py-2 rounded-lg border-2 font-medium hover:opacity-90 transition-all"
            style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
          >
            🏢 Manage Workplaces
          </button>
          <button
            onClick={() => setShowInvitations(true)}
            className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.primaryColor }}
          >
            📧 Roles & Invitations
          </button>
        </div>
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

      {/* Worker Cards Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">All Workers</h3>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter by workplace:</label>
            <select
              value={selectedWorkplace}
              onChange={(e) => setSelectedWorkplace(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Workplaces ({workforce.length})</option>
              {workplaces.map(workplace => {
                const count = workforce.filter(w => w.workplace_id === workplace.workplace_id).length;
                return (
                  <option key={workplace.workplace_id} value={workplace.workplace_id}>
                    {workplace.workplace_name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkforce.map(worker => (
            <WorkerCard 
              key={worker.user_id} 
              worker={worker} 
              theme={theme} 
              onClick={() => handleWorkerClick(worker.user_id)} 
            />
          ))}
        </div>
        
        {filteredWorkforce.length === 0 && selectedWorkplace !== 'all' && (
          <div className="text-center py-12">
            <p className="text-gray-600">No workers at this workplace</p>
          </div>
        )}
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

      {/* Worker Detail Modal */}
      <WorkerDetailModal
        isOpen={showWorkerModal}
        onClose={() => {
          setShowWorkerModal(false);
          setSelectedWorkerId(null);
        }}
        workerId={selectedWorkerId}
      />
    </div>
  );
};

// Worker Card Component
const WorkerCard = ({ worker, theme, onClick }) => {
  // Determine badge color and text based on shift status
  const getShiftStatusBadge = () => {
    if (!worker.days_without_shift && worker.days_without_shift !== 0) return null;
    
    const days = worker.days_without_shift;
    
    if (worker.shift_status === 'at_risk_pool_return' || worker.shift_status === 'no_shifts_given') {
      return {
        text: `⚠️ ${days} days - Returns to pool`,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300'
      };
    } else if (worker.shift_status === 'warning') {
      return {
        text: `⏰ ${days} days - ${14 - days} days left`,
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300'
      };
    } else if (worker.shift_status === 'new_hire') {
      return {
        text: `🆕 New hire - ${days} days`,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300'
      };
    } else if (days <= 7) {
      return {
        text: `✅ ${days} days ago`,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300'
      };
    } else {
      return {
        text: `📅 ${days} days ago`,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-300'
      };
    }
  };
  
  const shiftBadge = getShiftStatusBadge();
  
  return (
    <div
      onClick={onClick}
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

      {/* Shift Status Badge */}
      {shiftBadge && (
        <div className={`mb-3 px-2 py-1 rounded text-xs font-medium border ${shiftBadge.bgColor} ${shiftBadge.textColor} ${shiftBadge.borderColor}`}>
          {shiftBadge.text}
        </div>
      )}

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
const ScheduleTab = ({ theme, navigate, initialShowWorkplaces = false }) => {
  const [workplaces, setWorkplaces] = useState([]);
  const [showWorkplaces, setShowWorkplaces] = useState(initialShowWorkplaces);
  const [selectedWorkplaceFilter, setSelectedWorkplaceFilter] = useState('all');
  
  const loadWorkplaces = async () => {
    try {
      const statsRes = await api.get('/api/employer/dashboard/stats');
      setWorkplaces(statsRes.data.data.workplaces || []);
    } catch (error) {
      console.error('Failed to load workplaces:', error);
    }
  };
  
  useEffect(() => {
    loadWorkplaces();
  }, []);
  
  // Update showWorkplaces when initialShowWorkplaces changes
  useEffect(() => {
    if (initialShowWorkplaces) {
      setShowWorkplaces(true);
    }
  }, [initialShowWorkplaces]);
  
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
      {!showWorkplaces && <CalendarView embedded={true} initialWorkplace={selectedWorkplaceFilter} />}
      
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
                {workplaces.map((workplace) => {
                  const isActive = workplace.is_active !== false; // Default to true if not set
                  const hasActiveShifts = workplace.active_shifts_count > 0;
                  const canDeactivate = isActive && !hasActiveShifts;
                  
                  return (
                    <div
                      key={workplace.workplace_id}
                      className={`bg-white rounded-lg border p-6 hover:shadow-lg transition-all ${
                        isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {/* Workplace Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {workplace.workplace_name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {workplace.address && (
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600 flex items-start gap-1">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{workplace.address}</span>
                              </p>
                              {workplace.postal_code && (
                                <p className="text-xs text-gray-500 ml-5">
                                  {workplace.postal_code}
                                </p>
                              )}
                              {workplace.attendance_geofence_radius_m && (
                                <p className="text-xs text-gray-500 ml-5">
                                  Geofence: {workplace.attendance_geofence_radius_m}m radius
                                </p>
                              )}
                              {hasActiveShifts && (
                                <p className="text-xs font-medium text-blue-600 ml-5 mt-1">
                                  {workplace.active_shifts_count} upcoming shift{workplace.active_shifts_count > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                          isActive ? '' : 'opacity-50'
                        }`}
                          style={{ backgroundColor: theme.primaryColor }}>
                          {workplace.workplace_name?.charAt(0) || 'W'}
                        </div>
                      </div>
                      
                      {/* Worker Icons - Workforce Distribution */}
                      {workplace.workers && workplace.workers.length > 0 && (
                        <div className="mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Assigned Workers</span>
                            <span className="text-xs text-gray-500">{workplace.total_workers} total</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {workplace.workers.slice(0, 12).map((worker, idx) => (
                              <div
                                key={worker.worker_id || idx}
                                className="relative group"
                                title={worker.name}
                              >
                                {worker.photo_url ? (
                                  <img
                                    src={worker.photo_url}
                                    alt={worker.name}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                                  />
                                ) : (
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                                    style={{ backgroundColor: theme.primaryColor }}
                                  >
                                    {worker.name?.charAt(0) || '?'}
                                  </div>
                                )}
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  {worker.name}
                                </div>
                              </div>
                            ))}
                            {workplace.total_workers > 12 && (
                              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-gray-600 text-xs font-semibold">
                                +{workplace.total_workers - 12}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Workplace Actions */}
                      <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                        {hasActiveShifts && isActive && (
                          <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-800">
                              Cannot deactivate with upcoming shifts
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!canDeactivate && isActive) {
                                alert(`Cannot deactivate ${workplace.workplace_name}. It has ${workplace.active_shifts_count} upcoming shift(s). Please remove or reassign shifts first.`);
                                return;
                              }
                              try {
                                await api.patch(`/api/employer/dashboard/workplaces/${workplace.workplace_id}/toggle`);
                                await loadWorkplaces(); // Reload to show updated status
                              } catch (error) {
                                console.error('Failed to toggle workplace status:', error);
                                const errorMsg = error.response?.data?.detail || 'Failed to update workplace status';
                                alert(errorMsg);
                              }
                            }}
                            disabled={!canDeactivate && isActive}
                            className={`flex-1 px-3 py-2 text-sm rounded-lg border font-medium transition-all ${
                              isActive 
                                ? canDeactivate
                                  ? 'border-red-300 text-red-700 hover:bg-red-50 cursor-pointer'
                                  : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50 cursor-pointer'
                            }`}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkplaceFilter(workplace.workplace_id);
                              setShowWorkplaces(false);
                            }}
                            className="flex-1 px-3 py-2 text-sm rounded-lg text-white hover:opacity-90 transition-all"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            View Shifts
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/employer/workplaces/${workplace.workplace_id}/edit`);
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>
                  );
                })}
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
const KPIsTab = ({ theme, navigate, pendingRatings, onRatingSuccess }) => {
  const [pendingShifts, setPendingShifts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    loadKPIData();
  }, []);

  const loadKPIData = async () => {
    try {
      const [pendingRes, analyticsRes] = await Promise.all([
        api.get('/api/employer/ratings/pending'),
        api.get('/api/employer/ratings/analytics')
      ]);
      
      setPendingShifts(pendingRes.data.data.pending_ratings || []);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      console.error('Failed to load KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateShift = (shift) => {
    setSelectedShift(shift);
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async (ratingData) => {
    try {
      await api.post('/api/employer/ratings/submit', ratingData);
      // Reload KPI data
      await loadKPIData();
      // Call parent callback to update badge count
      if (onRatingSuccess) {
        await onRatingSuccess();
      }
      setShowRatingModal(false);
      setSelectedShift(null);
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Performance & Ratings</h2>

      {/* Stats Overview */}
      {analytics && analytics.total_ratings > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Ratings</div>
            <div className="text-3xl font-bold text-gray-900">{analytics.total_ratings}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Average Rating</div>
            <div className="text-3xl font-bold" style={{ color: theme.primaryColor }}>
              {analytics.average_rating}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Top Performers</div>
            <div className="text-3xl font-bold text-green-600">{analytics.top_performers.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Pending Ratings</div>
            <div className="text-3xl font-bold text-blue-600">{pendingShifts.length}</div>
          </div>
        </div>
      )}

      {/* Pending Ratings */}
      {pendingShifts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Ratings ({pendingShifts.length})</h3>
          <div className="space-y-3">
            {pendingShifts.slice(0, 10).map((shift) => (
              <div
                key={`${shift.shift_id}-${shift.worker_id}`}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {shift.worker_photo ? (
                      <img
                        src={shift.worker_photo}
                        alt={shift.worker_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {shift.worker_name?.charAt(0) || 'W'}
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{shift.worker_name}</div>
                      <div className="text-sm text-gray-600">
                        {shift.position_title} • {shift.workplace_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(shift.shift_date).toLocaleDateString()} • 
                        {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRateShift(shift)}
                    className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-all"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Rate Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      {analytics && analytics.top_performers && analytics.top_performers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.top_performers.slice(0, 6).map((performer, idx) => (
              <div key={performer.worker_id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primaryColor }}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{performer.worker_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{performer.average_rating}</span>
                      <span className="text-xs text-gray-500">({performer.total_ratings} ratings)</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingShifts.length === 0 && (!analytics || analytics.total_ratings === 0) && (
        <div className="text-center py-12">
          <FiAward className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Ratings Yet</h3>
          <p className="text-gray-600">Complete shifts will appear here for rating</p>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedShift && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedShift(null);
          }}
          shift={selectedShift}
          onSuccess={handleRatingSubmit}
        />
      )}
    </div>
  );
};

// Finances Tab Component
const FinancesTab = ({ theme, navigate }) => {
  const [activeView, setActiveView] = useState('attendance'); // attendance, timesheets, payroll
  const [liveAttendance, setLiveAttendance] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [approvedTimesheets, setApprovedTimesheets] = useState([]);
  const [financialStats, setFinancialStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [adjustedHours, setAdjustedHours] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  useEffect(() => {
    console.log('FinancesTab useEffect triggered');
    loadFinanceData();
  }, [selectedDate, activeView]);

  const loadFinanceData = async () => {
    try {
      // Load live attendance for selected date
      const attendanceRes = await api.get(`/api/live-attendance/today?date=${selectedDate}`);
      setLiveAttendance(attendanceRes.data.data);

      // Load weekly timesheets (pending approval)
      const timesheetsRes = await api.get('/api/employer/weekly-timesheets/pending');
      console.log('Weekly Timesheets API Response:', timesheetsRes.data);
      const loadedTimesheets = timesheetsRes.data.data.timesheets || [];
      console.log('Loaded weekly timesheets:', loadedTimesheets.length);
      setTimesheets(loadedTimesheets);

      // Load approved weekly timesheets for payroll tab
      const approvedRes = await api.get('/api/employer/weekly-timesheets/approved');
      console.log('Approved Weekly Timesheets API Response:', approvedRes.data);
      const loadedApproved = approvedRes.data.data.timesheets || [];
      console.log('Loaded approved weekly timesheets:', loadedApproved.length);
      setApprovedTimesheets(loadedApproved);

      // Load financial stats from timesheets
      setFinancialStats({
        total_hours_today: attendanceRes.data.data?.summary?.total_hours || 0,
        estimated_payroll_today: attendanceRes.data.data?.summary?.estimated_cost || 0,
        pending_approvals: loadedTimesheets.length,
        total_pending_pay: loadedTimesheets.reduce((sum, ts) => sum + (ts.adjusted_pay || ts.total_pay || 0), 0),
        approved_count: loadedApproved.length,
        approved_total: loadedApproved.reduce((sum, ts) => sum + (ts.adjusted_pay || ts.total_pay || 0), 0)
      });

    } catch (error) {
      console.error('Failed to load finance data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Move timesheet back to pending for editing
  const handleMoveBackForEdit = async (timesheetId) => {
    try {
      await api.post(`/api/employer/weekly-timesheets/${timesheetId}/move-back`);
      alert('Timesheet moved back to Timesheets tab for editing');
      loadFinanceData(); // Reload data
    } catch (error) {
      alert('Failed to move timesheet: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Open edit modal
  const openEditModal = (timesheet) => {
    setEditingTimesheet(timesheet);
    setAdjustedHours(timesheet.adjusted_hours || timesheet.total_hours || '');
    setAdjustmentReason('');
    setShowEditModal(true);
  };

  // Adjust hours in Timesheets tab
  const handleAdjustHours = async () => {
    if (!editingTimesheet || !adjustedHours || !adjustmentReason) {
      alert('Please enter adjusted hours and reason');
      return;
    }

    try {
      const response = await api.put(`/api/employer/weekly-timesheets/${editingTimesheet.timesheet_id}/adjust`, {
        adjusted_hours: parseFloat(adjustedHours),
        adjustment_reason: adjustmentReason
      });
      
      alert('Hours adjusted successfully!');
      setShowEditModal(false);
      setEditingTimesheet(null);
      loadFinanceData(); // Reload data
    } catch (error) {
      console.error('Adjust error:', error);
      alert('Failed to adjust hours: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Process payroll batch
  const handleProcessPayroll = async () => {
    if (approvedTimesheets.length === 0) {
      alert('No approved timesheets to process');
      return;
    }

    const confirmed = window.confirm(
      `Process ${approvedTimesheets.length} timesheets for payroll?\n\nTotal Amount: $${approvedTimesheets.reduce((sum, ts) => sum + (ts.adjusted_pay || ts.actual_pay || 0), 0).toFixed(2)}\n\nThis will send the batch to your payment processor.`
    );

    if (!confirmed) return;

    try {
      const timesheetIds = approvedTimesheets.map(ts => ts.timesheet_id);
      const response = await api.post('/api/employer/payroll-management/process-batch', {
        timesheet_ids: timesheetIds,
        batch_name: `Payroll ${new Date().toISOString().split('T')[0]}`
      });

      const data = response.data.data;
      alert(`Payroll batch created successfully!\n\nWorkers: ${data.total_workers}\nTotal: $${data.total_amount.toFixed(2)}\n${data.workers_missing_sin > 0 ? `\nWarning: ${data.workers_missing_sin} workers missing SIN` : ''}`);
      
      loadFinanceData(); // Reload data
    } catch (error) {
      alert('Failed to process payroll: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div>
      {/* View Toggle Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveView('attendance')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'attendance'
              ? 'text-white'
              : 'bg-white border-2 text-gray-700 hover:bg-gray-50'
          }`}
          style={activeView === 'attendance' ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor } : { borderColor: theme.primaryColor }}
        >
          📊 Live Attendance
        </button>
        <button
          onClick={() => setActiveView('timesheets')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'timesheets'
              ? 'text-white'
              : 'bg-white border-2 text-gray-700 hover:bg-gray-50'
          }`}
          style={activeView === 'timesheets' ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor } : { borderColor: theme.primaryColor }}
        >
          ⏰ Timesheets {timesheets.length > 0 && `(${timesheets.length})`}
        </button>
        <button
          onClick={() => setActiveView('payroll')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeView === 'payroll'
              ? 'text-white'
              : 'bg-white border-2 text-gray-700 hover:bg-gray-50'
          }`}
          style={activeView === 'payroll' ? { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor } : { borderColor: theme.primaryColor }}
        >
          💰 Payroll
        </button>
      </div>

      {/* Date Picker - Only for Live Attendance */}
      {activeView === 'attendance' && (
        <div className="flex items-center justify-end mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
            style={{ focusRing: `${theme.primaryColor}40` }}
          />
        </div>
      )}

      {/* Financial Stats Overview - Only for Live Attendance */}
      {activeView === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Workers Today</div>
            <div className="text-3xl font-bold text-gray-900">
              {liveAttendance?.summary?.total || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Clocked In</div>
            <div className="text-3xl font-bold text-green-600">
              {liveAttendance?.summary?.clocked_in || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Missed Clock-In</div>
            <div className="text-3xl font-bold text-red-600">
              {liveAttendance?.summary?.missed || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">On Time Off</div>
            <div className="text-3xl font-bold text-blue-600">
              {liveAttendance?.summary?.on_time_off || 0}
            </div>
          </div>
        </div>
      )}

      {/* TIMESHEETS VIEW */}
      {activeView === 'timesheets' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Timesheets</h2>
              <p className="text-sm text-gray-600 mt-1">Review and approve worker timesheets</p>
            </div>
            <div>
              <select 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ focusRing: `${theme.primaryColor}40` }}
                defaultValue="current"
              >
                <option value="current">Current Week</option>
                <option value="last">Last Week</option>
                <option value="2weeks">2 Weeks Ago</option>
                <option value="3weeks">3 Weeks Ago</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {timesheets && timesheets.length > 0 ? (
            <div className="mb-6">

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workplace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.slice(0, 10).map((timesheet) => (
                  <tr key={timesheet.timesheet_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{timesheet.worker_name || 'Unknown Worker'}</div>
                      <div className="text-xs text-gray-500">Week: {timesheet.week_start} to {timesheet.week_end}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{timesheet.position || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{timesheet.workplace_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${(timesheet.adjusted_pay || timesheet.total_pay || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(timesheet.adjusted_hours || timesheet.total_hours || 0).toFixed(2)}h • {timesheet.shift_count || 0} shifts
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await api.post(`/api/employer/weekly-timesheets/${timesheet.timesheet_id}/approve`);
                              loadFinanceData(); // Reload data
                              alert('Timesheet approved!');
                            } catch (error) {
                              alert('Failed to approve: ' + (error.response?.data?.detail || error.message));
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openEditModal(timesheet)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                        >
                          Edit Hours
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No timesheets pending approval</p>
            </div>
          )}
        </div>
      )}

      {/* LIVE ATTENDANCE VIEW */}
      {activeView === 'attendance' && (
        <div>
          {/* Live Attendance Table */}
      {liveAttendance && liveAttendance.records && liveAttendance.records.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Attendance</h3>
            <button
              onClick={() => navigate('/employer/live-attendance')}
              className="text-sm font-medium hover:underline"
              style={{ color: theme.primaryColor }}
            >
              View Full Details
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workplace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {liveAttendance.records.slice(0, 10).map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.worker_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{record.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{record.workplace_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        record.status === 'CLOCKED_IN' ? 'bg-green-100 text-green-800' :
                        record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                        record.status === 'MISSED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

          {/* QR Code & Geofencing Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Attendance Methods Active</h3>
        <div className="flex items-center gap-6 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
            </svg>
            <span className="font-medium">QR Code Check-In</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Geofencing Enabled</span>
          </div>
        </div>
          </div>
        </div>
      )}

      {/* PAYROLL VIEW */}
      {activeView === 'payroll' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Payroll</h2>
              <p className="text-sm text-gray-600 mt-1">Process approved timesheets for payroll</p>
            </div>
            {approvedTimesheets.length > 0 && (
              <button
                onClick={handleProcessPayroll}
                className="px-6 py-2 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Process All ({approvedTimesheets.length})
              </button>
            )}
          </div>

          {approvedTimesheets && approvedTimesheets.length > 0 ? (
            <div className="mb-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workplace</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {approvedTimesheets.map((timesheet) => (
                      <tr key={timesheet.timesheet_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{timesheet.worker_name || 'Unknown Worker'}</div>
                          <div className="text-xs text-gray-500">Week: {timesheet.week_start} to {timesheet.week_end}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{timesheet.position || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{timesheet.workplace_name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${(timesheet.adjusted_pay || timesheet.total_pay || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(timesheet.adjusted_hours || timesheet.total_hours || 0).toFixed(2)}h • {timesheet.shift_count || 0} shifts
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleMoveBackForEdit(timesheet.timesheet_id)}
                            className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Ready for Processing</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {approvedTimesheets.length} timesheets • {approvedTimesheets.reduce((sum, ts) => sum + (ts.adjusted_hours || ts.actual_hours || 0), 0).toFixed(2)} hours
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      ${approvedTimesheets.reduce((sum, ts) => sum + (ts.adjusted_pay || ts.actual_pay || 0), 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-700">Gross Payroll</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FiDollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No approved timesheets ready for payroll</p>
              <p className="text-sm text-gray-500 mt-2">Approve timesheets to process payroll</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Hours Modal */}
      {showEditModal && editingTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Adjust Hours</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Worker: <span className="font-medium">{editingTimesheet.worker_name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Week: <span className="font-medium">{editingTimesheet.week_start} to {editingTimesheet.week_end}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Shifts: <span className="font-medium">{editingTimesheet.shift_count || 0} shifts</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Original Hours: <span className="font-medium">{(editingTimesheet.total_hours || 0).toFixed(2)}h</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Original Pay: <span className="font-medium">${(editingTimesheet.total_pay || 0).toFixed(2)}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjusted Hours
              </label>
              <input
                type="number"
                step="0.25"
                value={adjustedHours}
                onChange={(e) => setAdjustedHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ focusRing: `${theme.primaryColor}40` }}
              />
              {adjustedHours && editingTimesheet.total_hours && (
                <p className="text-sm text-gray-600 mt-1">
                  New Pay: ${(parseFloat(adjustedHours) * (editingTimesheet.total_pay / editingTimesheet.total_hours)).toFixed(2)}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Adjustment
              </label>
              <textarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                rows="3"
                placeholder="Explain why hours are being adjusted..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdjustHours}
                className="flex-1 px-4 py-2 text-white font-medium rounded-lg hover:opacity-90"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTimesheet(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboardNew;
