import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import UserHeader from '../../components/common/UserHeader';
import { 
  FiCalendar, FiClock, FiDollarSign, FiAward, FiBriefcase, 
  FiCheckCircle, FiAlertCircle, FiTrendingUp, FiMapPin,
  FiStar, FiUsers, FiFileText, FiMail
} from 'react-icons/fi';
import moment from 'moment';

const WorkforceDashboardNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  // Tab management: schedule, earnings, jobs, profile
  const [activeTab, setActiveTab] = useState('schedule');
  const [profile, setProfile] = useState(null);
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
      const [profileRes, shiftsRes, offersRes] = await Promise.all([
        api.get('/api/workforce/me/profile').catch(() => ({ data: { data: {} } })),
        api.get('/api/jobs/my-shifts').catch(() => ({ data: { data: { shifts: [] } } })),
        api.get('/api/job-matching/offers').catch(() => ({ data: { data: { offers: [] } } }))
      ]);

      const profileData = profileRes.data.data;
      const shifts = shiftsRes.data.data.shifts || [];
      const offers = offersRes.data.data.offers || [];

      setProfile(profileData);

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
      
      <div className="flex">
        {/* Sidebar */}
        <Sidebar profile={profile} theme={theme} />
        
        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section with Personality Ratings */}
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
              {/* Personality Ratings */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Personality Traits</div>
                <div className="space-y-2">
                  <RatingBadge label="Teamwork" value={4.7} />
                  <RatingBadge label="Reliability" value={4.8} />
                  <RatingBadge label="Communication" value={4.6} />
                  <RatingBadge label="Professionalism" value={4.9} />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Overall</span>
                    <span className="text-lg font-bold text-gray-900">{stats.rating.toFixed(1)} ⭐</span>
                  </div>
                </div>
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
                active={activeTab === 'jobs'}
                onClick={() => setActiveTab('jobs')}
                icon={<FiBriefcase />}
                label="Find Jobs"
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
            {activeTab === 'jobs' && <JobsTab stats={stats} theme={theme} navigate={navigate} />}
            {activeTab === 'profile' && <ProfileTab profile={profile} theme={theme} navigate={navigate} />}
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

// Schedule Tab
const ScheduleTab = ({ stats, theme, navigate }) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">Upcoming Shifts</h2>
      <button
        onClick={() => navigate('/workforce/calendar')}
        className="px-4 py-2 rounded-lg text-white font-medium"
        style={{ backgroundColor: theme.primaryColor }}
      >
        View Calendar
      </button>
    </div>

    {stats.upcomingShifts.length === 0 ? (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Shifts</h3>
        <p className="text-gray-600 mb-4">Browse available jobs to get started</p>
        <button
          onClick={() => navigate('/workforce/find-jobs')}
          className="px-6 py-2 rounded-lg text-white font-medium"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Find Jobs
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        {stats.upcomingShifts.map((shift, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/workforce/shift/${shift.booking_id || shift.shift_id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{shift.role_title || shift.position_title}</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Confirmed
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    <span>{moment(shift.shift_date).format('dddd, MMMM D, YYYY')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    <span>{shift.start_time} - {shift.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMapPin className="w-4 h-4" />
                    <span>{shift.workplace_name}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  ${((shift.hours || 8) * (shift.hourly_rate || 18)).toFixed(0)}
                </div>
                <div className="text-xs text-gray-500">
                  {shift.hours || 8}h × ${shift.hourly_rate || 18}/h
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* Quick Actions */}
    <div className="grid grid-cols-2 gap-4 mt-6">
      <button
        onClick={() => navigate('/workforce/my-tasks')}
        className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
      >
        <FiCheckCircle className="w-5 h-5" />
        <span className="font-medium">My Tasks</span>
      </button>
      <button
        onClick={() => navigate('/workforce/attendance')}
        className="flex items-center justify-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
      >
        <FiClock className="w-5 h-5" />
        <span className="font-medium">Attendance</span>
      </button>
    </div>
  </div>
);

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

// Jobs Tab
const JobsTab = ({ stats, theme, navigate }) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">Job Opportunities</h2>
      <button
        onClick={() => navigate('/workforce/find-jobs')}
        className="px-4 py-2 rounded-lg text-white font-medium"
        style={{ backgroundColor: theme.primaryColor }}
      >
        Browse All Jobs
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {stats.pendingOffers}
          </div>
          <div>
            <div className="font-semibold text-gray-900">New Job Offers</div>
            <div className="text-sm text-gray-600">Review and respond</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/workforce/find-jobs')}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          View Offers
        </button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
            {stats.activeJobs}
          </div>
          <div>
            <div className="font-semibold text-gray-900">Active Jobs</div>
            <div className="text-sm text-gray-600">Current positions</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/workforce/my-jobs')}
          className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          View Active Jobs
        </button>
      </div>
    </div>
  </div>
);

// Profile Tab
const ProfileTab = ({ profile, theme, navigate }) => (
  <div>
    <h2 className="text-xl font-bold text-gray-900 mb-6">My Profile</h2>
    
    <div className="space-y-4">
      <ProfileMenuItem
        icon={<FiUsers />}
        title="Personal Information"
        description="Update your contact details and address"
        onClick={() => navigate('/workforce/profile')}
      />
      <ProfileMenuItem
        icon={<FiAward />}
        title="Certifications & Skills"
        description={`${profile?.certifications?.length || 0} certifications`}
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
      <ProfileMenuItem
        icon={<FiClock />}
        title="Availability"
        description="Set your work schedule preferences"
        onClick={() => navigate('/workforce/availability')}
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
