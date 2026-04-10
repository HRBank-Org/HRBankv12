import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import RateEmployer from '../../components/ratings/RateEmployer';
import api from '../../utils/api';
import { FiCalendar, FiClock, FiDollarSign, FiAward, FiAlertCircle, FiBriefcase, FiStar, FiSun, FiLogIn, FiSearch, FiArrowRight } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';

const WorkforceDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [pendingRatings, setPendingRatings] = useState([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [hasEmployment, setHasEmployment] = useState(null);
  const [employmentInfo, setEmploymentInfo] = useState({});
  const [stats, setStats] = useState({
    upcomingShifts: [],
    thisWeekHours: 0,
    thisWeekEarnings: 0,
    expectedWeeklyIncome: 0,
    pendingTasks: 0,
    averageRating: 0,
    occupationCount: 0,
    jobOffers: 0,
    totalBadges: 0,
    timeOffBalance: 0,
    nextPayday: null,
    nextShift: null,
    isClockedIn: false
  });

  useEffect(() => {
    loadDashboard();
    checkPendingJobApplication();
    checkEmployment();
  }, []);

  const checkEmployment = async () => {
    try {
      const res = await api.get('/api/workforce/me/employment-status');
      setHasEmployment(res.data.data?.has_active_employment || false);
      setEmploymentInfo(res.data.data || {});
    } catch {
      setHasEmployment(false);
    }
  };

  const checkPendingJobApplication = async () => {
    const pendingJobId = localStorage.getItem('pending_job_application');
    if (pendingJobId) {
      try {
        await api.post(`/api/jobs/${pendingJobId}/apply`);
        localStorage.removeItem('pending_job_application');
        alert('Your job application has been submitted successfully!');
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 409) {
          localStorage.removeItem('pending_job_application');
        }
      }
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.goodMorning');
    if (hour < 18) return t('common.goodAfternoon');
    return t('common.goodEvening');
  };

  const getUserName = () => {
    return user?.profile?.first_name || user?.profile?.full_name?.split(' ')[0] || 'there';
  };

  const loadDashboard = async () => {
    try {
      const [shiftsRes, occupationsRes, offersRes, ratingsRes] = await Promise.all([
        api.get('/api/jobs/my-shifts').catch(() => ({ data: { data: { shifts: [] } } })),
        api.get('/api/occupations/me').catch(() => ({ data: { data: { occupations: [] } } })),
        api.get('/api/jobs/offers').catch(() => ({ data: { data: { job_offers: [] } } })),
        api.get('/api/ratings/pending').catch(() => ({ data: { data: { pending_ratings: [] } } }))
      ]);

      const shifts = shiftsRes.data.data?.shifts || [];
      const occupations = occupationsRes.data.data?.occupations || [];
      const offers = offersRes.data.data?.job_offers || [];
      const pendingRatingsData = ratingsRes.data.data?.pending_ratings || [];
      
      setPendingRatings(pendingRatingsData);

      const upcomingShifts = shifts.filter(s => s.status !== 'completed').slice(0, 5);
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
          return sum + (end - start) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);

      const thisWeekEarnings = thisWeekShifts.reduce((sum, s) => {
        if (s.hourly_rate && s.start_time && s.end_time) {
          const start = new Date(`2000-01-01 ${s.start_time}`);
          const end = new Date(`2000-01-01 ${s.end_time}`);
          return sum + ((end - start) / (1000 * 60 * 60)) * s.hourly_rate;
        }
        return sum;
      }, 0);

      // Find next upcoming shift
      const now = new Date();
      const nextShift = shifts
        .filter(s => new Date(s.shift_date) >= now && s.status !== 'completed')
        .sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date))[0] || null;

      setStats({
        upcomingShifts,
        thisWeekHours: Math.round(thisWeekHours),
        thisWeekEarnings: Math.round(thisWeekEarnings),
        expectedWeeklyIncome: Math.round(thisWeekEarnings * 1.2),
        pendingTasks: 0,
        averageRating: 4.7,
        occupationCount: occupations.length,
        jobOffers: offers.length,
        totalBadges: 3,
        timeOffBalance: 0,
        nextShift,
        isClockedIn: false
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Time helpers
  const formatShiftTime = (shift) => {
    if (!shift) return '';
    const date = new Date(shift.shift_date);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    let dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (date.toDateString() === today.toDateString()) dayLabel = 'Today';
    else if (date.toDateString() === tomorrow.toDateString()) dayLabel = 'Tomorrow';
    return `${dayLabel} \u2022 ${shift.start_time} - ${shift.end_time}`;
  };

  const getShiftCountdown = (shift) => {
    if (!shift) return null;
    const now = new Date();
    const shiftDateTime = new Date(`${shift.shift_date}T${shift.start_time}`);
    const diffMs = shiftDateTime - now;
    if (diffMs < 0) return 'In progress';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `in ${Math.ceil(hours / 24)} day(s)`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins} min`;
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
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Greeting Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {getGreeting()}, {getUserName()}!
          </h1>
          <p className="text-gray-500 text-sm">
            {hasEmployment
              ? `${employmentInfo.position_title || 'Employed'} \u2022 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
              : "Here's your career overview"
            }
          </p>
        </div>

        <div className="p-8">
          {/* ============ EMPLOYED VIEW: "Today" Dashboard ============ */}
          {hasEmployment ? (
            <>
              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="quick-actions">
                <button
                  onClick={() => navigate('/workforce/schedule')}
                  data-testid="quick-action-clockin"
                  className="flex items-center gap-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <FiLogIn size={24} />
                  <div className="text-left">
                    <div className="font-bold text-base">Clock In</div>
                    <div className="text-xs text-emerald-100">Start your shift</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/workforce/time-off')}
                  data-testid="quick-action-timeoff"
                  className="flex items-center gap-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <FiSun size={24} />
                  <div className="text-left">
                    <div className="font-bold text-base">Time Off</div>
                    <div className="text-xs text-blue-100">Request leave</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/workforce/schedule')}
                  data-testid="quick-action-schedule"
                  className="flex items-center gap-3 bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <FiCalendar size={24} />
                  <div className="text-left">
                    <div className="font-bold text-base">Schedule</div>
                    <div className="text-xs text-violet-100">View shifts</div>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/workforce/find-jobs')}
                  data-testid="quick-action-findjobs"
                  className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  <FiSearch size={24} />
                  <div className="text-left">
                    <div className="font-bold text-base">Find Shifts</div>
                    <div className="text-xs text-amber-100">Extra work</div>
                  </div>
                </button>
              </div>

              {/* Today's Focus: Next Shift + Pay Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Next Shift Card — takes 2 cols */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden" data-testid="next-shift-card">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FiClock size={18} className="text-violet-500" />
                      Next Shift
                    </h3>
                    {stats.nextShift && (
                      <span className="text-xs font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                        {getShiftCountdown(stats.nextShift)}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    {stats.nextShift ? (
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <FiBriefcase size={28} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-bold text-gray-900">{stats.nextShift.role_title || stats.nextShift.position_title || 'Shift'}</h4>
                          <p className="text-gray-500">{stats.nextShift.company_name || stats.nextShift.workplace_name || ''}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1"><FiCalendar size={14} /> {formatShiftTime(stats.nextShift)}</span>
                            {stats.nextShift.hourly_rate && (
                              <span className="flex items-center gap-1"><FiDollarSign size={14} /> ${stats.nextShift.hourly_rate}/hr</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/workforce/schedule')}
                          className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all text-white flex-shrink-0"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          View Details
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <FiCalendar size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">No upcoming shifts</p>
                        <p className="text-sm text-gray-400 mt-1">Check for available shifts in your area</p>
                        <button
                          onClick={() => navigate('/workforce/find-jobs')}
                          className="mt-4 px-5 py-2 text-sm font-medium rounded-lg text-white"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          Find Shifts
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upcoming shifts mini-list */}
                  {stats.upcomingShifts.length > 1 && (
                    <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          +{stats.upcomingShifts.length - 1} more this week
                        </span>
                        <button
                          onClick={() => navigate('/workforce/schedule')}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          View all <FiArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pay & Hours Summary */}
                <div className="space-y-4">
                  {/* This Week Earnings */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm" data-testid="weekly-earnings-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <FiDollarSign size={20} className="text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-500">This Week</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">${stats.thisWeekEarnings}</div>
                    <div className="text-sm text-gray-500 mt-1">{stats.thisWeekHours}h worked</div>
                    <button
                      onClick={() => navigate('/workforce/wallet')}
                      className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      View earnings <FiArrowRight size={12} />
                    </button>
                  </div>

                  {/* Hours & Rating */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm" data-testid="rating-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <FiStar size={20} className="text-amber-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-500">Your Rating</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stats.averageRating}</div>
                    <div className="text-sm text-gray-500 mt-1">{stats.totalBadges} badges earned</div>
                    <button
                      onClick={() => navigate('/workforce/performance')}
                      className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      View performance <FiArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Items */}
              {(pendingRatings.length > 0 || stats.jobOffers > 0) && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FiAlertCircle className="text-orange-500" size={20} />
                    Needs Your Attention
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingRatings.length > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                        <h3 className="font-semibold text-amber-900 mb-1 flex items-center gap-2">
                          <FiStar className="text-amber-500" />
                          {pendingRatings.length} Employer{pendingRatings.length > 1 ? 's' : ''} to Rate
                        </h3>
                        <p className="text-sm text-amber-700 mb-3">Share your experience from completed shifts</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {pendingRatings.slice(0, 3).map((rating, index) => (
                            <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-800">{rating.employer_name || 'Employer'}</span>
                                <span className="text-gray-500 ml-2">{rating.role_title}</span>
                              </div>
                              <button
                                onClick={() => { setSelectedBooking(rating); setShowRatingModal(true); }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
                              >
                                Rate
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stats.jobOffers > 0 && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                        <h3 className="font-semibold text-blue-900 mb-1">{stats.jobOffers} New Job Offers</h3>
                        <p className="text-sm text-blue-700 mb-3">Employers are interested in hiring you</p>
                        <button
                          onClick={() => navigate('/workforce/find-jobs')}
                          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          View Offers
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ============ NON-EMPLOYED VIEW: Getting Started ============ */
            <>
              {/* Quick Stats for Building Mode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('/workforce/occupations')}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#3b82f615' }}>
                    <FiBriefcase size={24} style={{ color: '#3b82f6' }} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Occupations</h3>
                  <div className="text-3xl font-bold text-gray-900">{stats.occupationCount}</div>
                  <p className="text-sm text-gray-500">profiles created</p>
                </div>

                <div
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('/workforce/credentials')}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#10b98115' }}>
                    <FiAward size={24} style={{ color: '#10b981' }} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Credentials</h3>
                  <div className="text-3xl font-bold text-gray-900">0</div>
                  <p className="text-sm text-gray-500">verified</p>
                </div>

                <div
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('/workforce/find-jobs')}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#f59e0b15' }}>
                    <FiSearch size={24} style={{ color: '#f59e0b' }} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Job Offers</h3>
                  <div className="text-3xl font-bold text-gray-900">{stats.jobOffers}</div>
                  <p className="text-sm text-gray-500">available</p>
                </div>
              </div>

              {/* Getting Started Checklist */}
              <div className="mb-8 bg-white rounded-2xl p-8 shadow-sm" data-testid="getting-started-checklist">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Getting Started</h2>
                <p className="text-gray-500 text-sm mb-6">Complete these steps to start receiving job offers and building your career profile.</p>
                <div className="space-y-4">
                  {[
                    { done: !!user?.profile?.first_name, label: 'Complete your profile', desc: 'Add your name, photo, and contact details', action: () => navigate('/workforce/profile'), btn: 'Edit Profile' },
                    { done: stats.occupationCount > 0, label: 'Add your first occupation', desc: 'Tell employers what you do and your skill level', action: () => navigate('/workforce/occupations'), btn: 'Add Occupation' },
                    { done: false, label: 'Get verified by an institution', desc: 'Blockchain-verified credentials make you stand out', action: () => navigate('/institutions'), btn: 'Find Institutions' },
                    { done: stats.jobOffers > 0, label: 'Browse job opportunities', desc: 'Find your first job or shift', action: () => navigate('/workforce/find-jobs'), btn: 'Browse Jobs' }
                  ].map((step, idx) => (
                    <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${step.done ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {step.done ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="font-bold text-sm">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${step.done ? 'text-green-800 line-through' : 'text-gray-900'}`}>{step.label}</p>
                        <p className="text-sm text-gray-500">{step.desc}</p>
                      </div>
                      {!step.done && (
                        <button
                          onClick={step.action}
                          className="px-4 py-2 text-sm font-medium rounded-lg text-white flex-shrink-0"
                          style={{ backgroundColor: theme.primaryColor }}
                        >
                          {step.btn}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedBooking && (
        <RateEmployer
          booking={selectedBooking}
          onComplete={() => {
            setShowRatingModal(false);
            setSelectedBooking(null);
            setPendingRatings(prev => prev.filter(r => r.booking_id !== selectedBooking.booking_id));
          }}
          onCancel={() => {
            setShowRatingModal(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkforceDashboard;
