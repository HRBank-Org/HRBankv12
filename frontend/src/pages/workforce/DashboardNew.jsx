import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import RatingBadge from '../../components/workforce/RatingBadge';
import OccupationProfileCard from '../../components/workforce/OccupationProfileCard';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { 
  FiCalendar, FiClock, FiDollarSign, FiAward, FiBriefcase, 
  FiCheckCircle, FiAlertCircle, FiTrendingUp, FiMapPin,
  FiStar, FiUsers, FiFileText, FiMail, FiList, FiGrid, FiMap
} from 'react-icons/fi';
import moment from 'moment';

const localizer = momentLocalizer(moment);

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

const WorkforceDashboardNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Tab management: schedule, earnings, jobs, profile
  const [activeTab, setActiveTab] = useState('schedule');
  const [profile, setProfile] = useState(null);
  const [occupationProfiles, setOccupationProfiles] = useState([]);
  const [stats, setStats] = useState({
    upcomingShifts: [],
    thisWeekHours: 0,
    thisWeekEarnings: 0,
    monthEarnings: 0,
    rating: 0,
    completedShifts: 0,
    pendingOffers: 0,
    activeJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Check location state for tab
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    return profile?.first_name || user?.first_name || 'there';
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data
      const [profileRes, shiftsRes, offersRes, occupationsRes] = await Promise.all([
        api.get('/api/workforce/me/profile').catch(() => ({ data: { data: {} } })),
        api.get('/api/jobs/my-shifts').catch(() => ({ data: { data: { shifts: [] } } })),
        api.get('/api/job-matching/offers').catch(() => ({ data: { data: { offers: [] } } })),
        api.get('/api/occupations/me').catch(() => ({ data: { data: { occupations: [] } } }))
      ]);

      const profileData = profileRes.data.data;
      const shifts = shiftsRes.data.data.shifts || [];
      const offers = offersRes.data.data.offers || [];
      const occupations = occupationsRes.data.data.occupations || [];

      setProfile(profileData);
      setOccupationProfiles(occupations);

      // Calculate stats
      const now = moment();
      const weekStart = moment().startOf('week'); // Sunday
      const weekEnd = moment().endOf('week'); // Saturday
      
      const upcomingShifts = shifts.filter(s => 
        moment(s.shift_date).isAfter(now) && s.status === 'accepted'
      );
      
      const thisWeekShifts = shifts.filter(s => {
        const shiftDate = moment(s.shift_date);
        return shiftDate.isBetween(weekStart, weekEnd, 'day', '[]') && s.status === 'accepted';
      });
      
      const thisWeekHours = thisWeekShifts.reduce((sum, s) => sum + (s.hours || 8), 0);
      const thisWeekEarnings = thisWeekShifts.reduce((sum, s) => 
        sum + ((s.hours || 8) * (s.hourly_rate || 18)), 0
      );
      
      const monthStart = moment().startOf('month');
      const monthShifts = shifts.filter(s => 
        moment(s.shift_date).isAfter(monthStart) && s.status === 'completed'
      );
      const monthEarnings = monthShifts.reduce((sum, s) => 
        sum + ((s.hours || 8) * (s.hourly_rate || 18)), 0
      );

      setStats({
        upcomingShifts: upcomingShifts.slice(0, 5),
        thisWeekHours,
        thisWeekEarnings,
        monthEarnings,
        rating: profileData.rating || 4.5,
        completedShifts: shifts.filter(s => s.status === 'completed').length,
        pendingOffers: offers.filter(o => o.status === 'pending').length,
        activeJobs: shifts.filter(s => s.status === 'accepted').length
      });

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      
      {/* Main Content - Full Width */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section with Greeting */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {getGreeting()}, {getUserName()}! 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  Here's your work overview for today
                </p>
              </div>
            </div>
          </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<FiClock className="w-6 h-6" />}
            label="This Week"
            value={`${stats.thisWeekHours}h`}
            subtext={`$${stats.thisWeekEarnings.toFixed(0)}`}
            color="blue"
          />
          <StatCard
            icon={<FiDollarSign className="w-6 h-6" />}
            label="Month Earnings"
            value={`$${stats.monthEarnings.toFixed(0)}`}
            subtext={`${stats.completedShifts} shifts`}
            color="green"
          />
          <StatCard
            icon={<FiStar className="w-6 h-6" />}
            label="Your Rating"
            value={stats.rating.toFixed(1)}
            subtext="⭐⭐⭐⭐⭐"
            color="yellow"
          />
          <StatCard
            icon={<FiBriefcase className="w-6 h-6" />}
            label="Active Jobs"
            value={stats.activeJobs}
            subtext={`${stats.pendingOffers} new offers`}
            color="purple"
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <TabButton
                active={activeTab === 'schedule'}
                onClick={() => setActiveTab('schedule')}
                icon={<FiCalendar />}
                label="My Schedule"
              />
              <TabButton
                active={activeTab === 'earnings'}
                onClick={() => setActiveTab('earnings')}
                icon={<FiDollarSign />}
                label="Earnings"
              />
              <TabButton
                active={activeTab === 'career'}
                onClick={() => setActiveTab('career')}
                icon={<FiBriefcase />}
                label="Career"
              />
              <TabButton
                active={activeTab === 'profile'}
                onClick={() => setActiveTab('profile')}
                icon={<FiUsers />}
                label="My Profile"
              />
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'schedule' && <ScheduleTab stats={stats} theme={theme} navigate={navigate} />}
            {activeTab === 'earnings' && <EarningsTab stats={stats} theme={theme} />}
            {activeTab === 'career' && <CareerTab stats={stats} theme={theme} navigate={navigate} />}
            {activeTab === 'profile' && <ProfileTab profile={profile} occupationProfiles={occupationProfiles} theme={theme} navigate={navigate} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, subtext, color }) => {
  const colors = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    green: 'from-green-50 to-green-100 border-green-200 text-green-700',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-700',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <div className="text-right">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs opacity-75">{label}</div>
        </div>
      </div>
      <div className="text-xs opacity-75 mt-2">{subtext}</div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {icon}
    {label}
  </button>
);

// Schedule Tab with Calendar, My Tasks, and Attendance toggle
const ScheduleTab = ({ stats, theme, navigate }) => {
  const [scheduleView, setScheduleView] = useState('calendar'); // calendar, tasks, attendance
  const [calendarView, setCalendarView] = useState('month'); // day, week, month
  
  return (
    <div>
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setScheduleView('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              scheduleView === 'calendar'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4" />
              Calendar
            </div>
          </button>
          <button
            onClick={() => setScheduleView('tasks')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              scheduleView === 'tasks'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiList className="w-4 h-4" />
              My Tasks
            </div>
          </button>
          <button
            onClick={() => setScheduleView('attendance')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              scheduleView === 'attendance'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiClock className="w-4 h-4" />
              Attendance
            </div>
          </button>
        </div>
        
        {/* Calendar View Toggle (only show when calendar is selected) */}
        {scheduleView === 'calendar' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1 text-sm rounded ${
                calendarView === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1 text-sm rounded ${
                calendarView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1 text-sm rounded ${
                calendarView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Month
            </button>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {scheduleView === 'calendar' && (
        <div className="bg-white rounded-lg p-4" style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={stats.upcomingShifts.map(shift => ({
              title: shift.role_title || shift.position_title,
              start: new Date(shift.shift_date + 'T' + shift.start_time),
              end: new Date(shift.shift_date + 'T' + shift.end_time),
              resource: shift
            }))}
            startAccessor="start"
            endAccessor="end"
            view={calendarView}
            onView={(view) => setCalendarView(view)}
            onSelectEvent={(event) => navigate(`/workforce/shift/${event.resource.booking_id || event.resource.shift_id}`)}
            style={{ height: '100%' }}
            views={['day', 'week', 'month']}
          />
        </div>
      )}

      {/* My Tasks View */}
      {scheduleView === 'tasks' && (
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Today's Tasks</h3>
            <button
              onClick={() => navigate('/workforce/my-tasks')}
              className="text-sm font-medium hover:underline"
              style={{ color: theme.primaryColor }}
            >
              View All Tasks →
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <FiCheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No tasks for today</p>
            <p className="text-sm mt-2">Tasks will appear here when you have scheduled shifts</p>
          </div>
        </div>
      )}

      {/* Attendance View */}
      {scheduleView === 'attendance' && (
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Recent Attendance</h3>
            <button
              onClick={() => navigate('/workforce/attendance')}
              className="text-sm font-medium hover:underline"
              style={{ color: theme.primaryColor }}
            >
              View Full History →
            </button>
          </div>
          <div className="text-center py-12 text-gray-500">
            <FiClock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No attendance records yet</p>
            <p className="text-sm mt-2">Your clock-in/out history will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Earnings Tab
const EarningsTab = ({ stats, theme }) => (
  <div>
    <h2 className="text-xl font-bold text-gray-900 mb-6">Earnings Overview</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="text-sm text-blue-700 mb-1">This Week</div>
        <div className="text-3xl font-bold text-blue-900">${stats.thisWeekEarnings.toFixed(2)}</div>
        <div className="text-xs text-blue-600 mt-2">{stats.thisWeekHours} hours worked</div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-sm text-green-700 mb-1">This Month</div>
        <div className="text-3xl font-bold text-green-900">${stats.monthEarnings.toFixed(2)}</div>
        <div className="text-xs text-green-600 mt-2">{stats.completedShifts} shifts completed</div>
      </div>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="text-sm text-purple-700 mb-1">Average Rate</div>
        <div className="text-3xl font-bold text-purple-900">$18.50/h</div>
        <div className="text-xs text-purple-600 mt-2">Across all jobs</div>
      </div>
    </div>

    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <FiAlertCircle className="w-5 h-5 text-yellow-700" />
        <div>
          <div className="font-medium text-yellow-900">Payroll Processing</div>
          <div className="text-sm text-yellow-700">Your earnings will be processed at the end of the pay period (Saturday)</div>
        </div>
      </div>
    </div>
  </div>
);

// Career Tab - Job Offers and Interview Calendar
const CareerTab = ({ stats, theme, navigate }) => {
  const [showMarketInsights, setShowMarketInsights] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  // Sample market data with locations (Toronto area)
  const marketData = [
    { id: 1, title: 'Food Service', count: 42, lat: 43.6532, lng: -79.3832, location: 'Downtown Toronto' },
    { id: 2, title: 'Security', count: 28, lat: 43.7184, lng: -79.5181, location: 'Etobicoke' },
    { id: 3, title: 'Bartending', count: 15, lat: 43.6529, lng: -79.3849, location: 'Entertainment District' },
    { id: 4, title: 'Food Service', count: 18, lat: 43.7615, lng: -79.4111, location: 'North York' },
    { id: 5, title: 'Security', count: 12, lat: 43.6426, lng: -79.3871, location: 'Financial District' },
  ];
  
  const mapCenter = { lat: 43.6532, lng: -79.3832 };
  
  const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '8px'
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Career Hub</h2>
        <button
          onClick={() => setShowMarketInsights(!showMarketInsights)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 border-2 rounded-lg transition-all"
          style={{ 
            borderColor: showMarketInsights ? theme.primaryColor : '#d1d5db',
            backgroundColor: showMarketInsights ? `${theme.primaryColor}10` : 'white',
            color: showMarketInsights ? theme.primaryColor : '#4b5563'
          }}
        >
          <FiMap className="w-4 h-4" />
          {showMarketInsights ? 'Hide' : 'Show'} Market Insights
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Job Offers */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
              {stats.pendingOffers}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">Job Offers</div>
              <div className="text-sm text-gray-600">Matched by system</div>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Review offers matched to your skills and availability
          </p>
          <button
            onClick={() => navigate('/workforce/job-offers')}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            View Job Offers
          </button>
        </div>

        {/* Interviews */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-xl">
              0
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg">Interviews</div>
              <div className="text-sm text-gray-600">Upcoming schedule</div>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            Manage your interview calendar and preparations
          </p>
          <button
            onClick={() => navigate('/workforce/interviews')}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            View Interview Calendar
          </button>
        </div>
      </div>

      {/* Market Insights Map (Collapsible) */}
      {showMarketInsights && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <FiTrendingUp className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Market Insights Map</h3>
              <p className="text-sm text-gray-600">
                See where job opportunities are located in your area
              </p>
            </div>
          </div>
          
          {/* Map */}
          <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
            {GOOGLE_MAPS_API_KEY ? (
              <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={11}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                  {/* Your location circle */}
                  <Circle
                    center={mapCenter}
                    radius={1000}
                    options={{
                      fillColor: theme.primaryColor,
                      fillOpacity: 0.2,
                      strokeColor: theme.primaryColor,
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                    }}
                  />
                  
                  {/* Job markers */}
                  {marketData.map((job) => (
                    <Marker
                      key={job.id}
                      position={{ lat: job.lat, lng: job.lng }}
                      onClick={() => setSelectedMarker(job)}
                      icon={{
                        path: window.google?.maps?.SymbolPath?.CIRCLE,
                        scale: 10,
                        fillColor: job.title === 'Food Service' ? '#3b82f6' : job.title === 'Security' ? '#8b5cf6' : '#10b981',
                        fillOpacity: 0.9,
                        strokeColor: 'white',
                        strokeWeight: 2,
                      }}
                      label={{
                        text: job.count.toString(),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    />
                  ))}
                  
                  {/* Info window */}
                  {selectedMarker && (
                    <InfoWindow
                      position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                      onCloseClick={() => setSelectedMarker(null)}
                    >
                      <div className="p-2">
                        <div className="font-bold text-gray-900">{selectedMarker.title}</div>
                        <div className="text-sm text-gray-600">{selectedMarker.count} opportunities</div>
                        <div className="text-xs text-gray-500 mt-1">{selectedMarker.location}</div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              </LoadScript>
            ) : (
              <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FiMap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Map unavailable</p>
                  <p className="text-sm mt-1">Google Maps API key not configured</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-700">Food Service</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-700">Security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-700">Bartending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primaryColor, opacity: 0.3 }}></div>
              <span className="text-sm text-gray-700">Your Location</span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {marketData.filter(j => j.title === 'Food Service').reduce((sum, j) => sum + j.count, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Food Service</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {marketData.filter(j => j.title === 'Security').reduce((sum, j) => sum + j.count, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Security</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {marketData.filter(j => j.title === 'Bartending').reduce((sum, j) => sum + j.count, 0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Bartending</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> These are general market statistics for your area. You'll receive personalized job offers based on your profile, skills, and availability through our matching system.
            </p>
          </div>
        </div>
      )}

      {/* Active Jobs Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">My Active Positions</h3>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            {stats.activeJobs} active
          </span>
        </div>
        
        {stats.activeJobs === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiBriefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No active positions</p>
            <p className="text-sm mt-2">Accept job offers to start working</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">You have {stats.activeJobs} active position(s)</p>
            <button
              onClick={() => navigate('/workforce/my-jobs')}
              className="px-6 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: theme.primaryColor }}
            >
              View My Active Jobs
            </button>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How the matching system works:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Our system automatically matches you with suitable job opportunities</li>
              <li>You'll receive job offers based on your skills, certifications, and availability</li>
              <li>Review and accept/decline offers in the Job Offers section</li>
              <li>Accepted offers may lead to interview invitations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab with Occupational Profiles
const ProfileTab = ({ profile, occupationProfiles, theme, navigate }) => (
  <div>
    <h2 className="text-xl font-bold text-gray-900 mb-6">Occupational Profiles</h2>
    
    {/* Occupation Profile Cards */}
    {occupationProfiles.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {occupationProfiles.map((occ, idx) => (
          <OccupationProfileCard key={idx} occupation={occ} theme={theme} />
        ))}
      </div>
    ) : (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-8">
        <FiBriefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Occupation Profiles Yet</h3>
        <p className="text-gray-600 mb-4">Add your skills and certifications to create your first profile</p>
        <button
          onClick={() => navigate('/workforce/occupations')}
          className="px-6 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Create Profile
        </button>
      </div>
    )}

    <h2 className="text-xl font-bold text-gray-900 mb-6 mt-8">Account Management</h2>
    
    <div className="space-y-4">
      <ProfileMenuItem
        icon={<FiUsers />}
        title="Personal Information"
        description="Update your contact details and address"
        onClick={() => navigate('/workforce/profile')}
      />
      <ProfileMenuItem
        icon={<FiAward />}
        title="Certifications"
        description={`${profile?.certifications?.length || 3} certifications`}
        onClick={() => navigate('/workforce/credentials')}
      />
      <ProfileMenuItem
        icon={<FiBriefcase />}
        title="Work Experience"
        description="Manage your employment history"
        onClick={() => navigate('/workforce/employment-history')}
      />
      <ProfileMenuItem
        icon={<FiFileText />}
        title="Documents"
        description="Upload and manage documents"
        onClick={() => navigate('/workforce/documents')}
      />
    </div>
  </div>
);

const ProfileMenuItem = ({ icon, title, description, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
  >
    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
      {icon}
    </div>
    <div className="flex-1">
      <div className="font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
    <div className="text-gray-400">→</div>
  </div>
);

export default WorkforceDashboardNew;
