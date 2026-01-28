import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import WorkPassportSidebar from '../../components/layout/WorkPassportSidebar';
import WorkPassportHeader from '../../components/layout/WorkPassportHeader';
import api from '../../utils/api';
import { 
  FiAward, 
  FiEye, 
  FiShare2, 
  FiPlus, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle,
  FiBriefcase,
  FiTrendingUp,
  FiGlobe,
  FiBook,
  FiArrowRight,
  FiCopy,
  FiExternalLink
} from 'react-icons/fi';

const WorkPassportDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [occupations, setOccupations] = useState([]);
  const [stats, setStats] = useState({
    totalCredentials: 0,
    verifiedCredentials: 0,
    pendingCredentials: 0,
    profileViews: 0,
    occupationCount: 0
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getUserName = () => {
    return user?.profile?.full_name?.split(' ')[0] || 'there';
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      const [profileRes, credentialsRes, occupationsRes, pendingPaymentsRes] = await Promise.all([
        api.get('/api/workpassport/profile', {
          headers: { 'X-User-ID': user.user_id }
        }).catch(() => ({ data: { success: false } })),
        api.get('/api/workpassport/credentials', {
          headers: { 'X-User-ID': user.user_id }
        }).catch(() => ({ data: { data: { credentials: [], summary: {} } } })),
        api.get('/api/workpassport/occupations', {
          headers: { 'X-User-ID': user.user_id }
        }).catch(() => ({ data: { data: { occupations: [] } } })),
        api.get('/api/credential-payments/my-pending').catch(() => ({ data: { data: { pending_credentials: [] } } }))
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.data.profile);
      }
      
      const creds = credentialsRes.data.data?.credentials || [];
      const summary = credentialsRes.data.data?.summary || {};
      // Only show verified credentials (not self-reported)
      const verifiedCreds = creds.filter(c => c.status === 'verified' || c.status === 'issued');
      setCredentials(verifiedCreds);
      
      const occs = occupationsRes.data.data?.occupations || [];
      setOccupations(occs);
      
      // Pending credentials awaiting payment
      const pendingPayments = pendingPaymentsRes.data.data?.pending_credentials || [];

      setStats({
        totalCredentials: verifiedCreds.length + pendingPayments.length,
        verifiedCredentials: verifiedCreds.length,
        pendingCredentials: pendingPayments.length, // Now shows credentials awaiting payment
        profileViews: profileRes.data.data?.profile?.profile_views || 0,
        occupationCount: occs.length
      });

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (profile?.share_token) {
      const url = `${window.location.origin}/passport/${profile.share_token}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCanadian = profile?.country === 'CA';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkPassportHeader />
      <WorkPassportSidebar />
      
      {/* Main Content */}
      <div className="transition-all duration-300 pt-16" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Page Title Section */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {getGreeting()}, {getUserName()}! 👋
          </h1>
          <p className="text-gray-600">
            Build your verified credential portfolio
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Verified Credentials */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/workpassport/credentials')}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <FiCheckCircle size={24} className="text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Verified Credentials</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.verifiedCredentials}
              </div>
              <p className="text-sm text-gray-500">
                of {stats.totalCredentials} total
              </p>
            </div>

            {/* Awaiting Payment */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/workpassport/credentials')}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <FiClock size={24} className="text-orange-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Awaiting Payment</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.pendingCredentials}
              </div>
              <p className="text-sm text-gray-500">
                credentials to claim
              </p>
            </div>

            {/* Profile Views */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/workpassport/public-profile')}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FiEye size={24} className="text-blue-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Profile Views</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.profileViews}
              </div>
              <p className="text-sm text-gray-500">
                employers viewed
              </p>
            </div>

            {/* Occupations */}
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate('/workpassport/occupations')}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <FiBriefcase size={24} className="text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Occupations</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stats.occupationCount}
              </div>
              <p className="text-sm text-gray-500">
                career profiles
              </p>
            </div>
          </div>

          {/* Upgrade Banner for Canadian Users */}
          {isCanadian && (
            <div className="mb-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Ready to Work in Canada?</h3>
                  <p className="text-purple-100 mb-4">
                    Upgrade to a Workforce account to access job matching, shift management, and get hired by verified employers.
                  </p>
                  <button
                    onClick={() => navigate('/workpassport/upgrade')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    Upgrade to Workforce
                    <FiArrowRight />
                  </button>
                </div>
                <div className="hidden lg:block">
                  <div className="w-32 h-32 bg-white/10 rounded-2xl flex items-center justify-center">
                    <FiTrendingUp size={64} className="text-white/50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Share Profile Card */}
          <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Share Your Profile</h3>
                <p className="text-sm text-gray-500">Share your verified credentials with employers worldwide</p>
              </div>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors"
              >
                {copied ? <FiCheckCircle /> : <FiCopy />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-sm text-gray-600 truncate">
                {profile?.share_token ? `${window.location.origin}/passport/${profile.share_token}` : 'Loading...'}
              </div>
              <button
                onClick={() => profile?.share_token && window.open(`/passport/${profile.share_token}`, '_blank')}
                className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FiExternalLink />
                Preview
              </button>
            </div>
          </div>

          {/* Action Items / Alerts */}
          {(stats.occupationCount === 0 || stats.totalCredentials === 0) && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiAlertCircle className="text-orange-500" size={24} />
                Complete Your Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.totalCredentials === 0 && (
                  <div className="bg-cyan-50 border-2 border-cyan-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-cyan-900 mb-1 flex items-center gap-2">
                      <FiAward className="text-cyan-500" />
                      Add Your First Credential
                    </h3>
                    <p className="text-sm text-cyan-700 mb-3">
                      Start building your verified credential portfolio
                    </p>
                    <button
                      onClick={() => navigate('/workpassport/credentials/add')}
                      className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Add Credential
                    </button>
                  </div>
                )}

                {stats.occupationCount === 0 && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-purple-900 mb-1 flex items-center gap-2">
                      <FiBriefcase className="text-purple-500" />
                      Create Occupation Profile
                    </h3>
                    <p className="text-sm text-purple-700 mb-3">
                      Define your skills and experience in your field
                    </p>
                    <button
                      onClick={() => navigate('/workpassport/occupations/create')}
                      className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Create Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Credentials */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FiAward size={20} className="text-cyan-600" />
                  Recent Credentials
                </h3>
                <button
                  onClick={() => navigate('/workpassport/credentials')}
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  View All
                </button>
              </div>
              
              {credentials.length === 0 ? (
                <div className="text-center py-8">
                  <FiAward size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No credentials yet</p>
                  <button
                    onClick={() => navigate('/workpassport/credentials/add')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-cyan-600 hover:bg-cyan-50 rounded-lg font-medium transition-colors"
                  >
                    <FiPlus />
                    Add Credential
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {credentials.slice(0, 4).map((cred, index) => (
                    <div 
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{cred.credential_name}</h4>
                          <p className="text-sm text-gray-500">{cred.institution_name || 'Self-reported'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          cred.status === 'verified' 
                            ? 'bg-green-100 text-green-800'
                            : cred.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {cred.status === 'self_reported' ? 'Unverified' : cred.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Career Guidance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FiBook size={20} className="text-purple-600" />
                  Career Guidance
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-2">Improve Your Employability</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Chat with Emma to get personalized career advice and course recommendations.
                  </p>
                  <button
                    onClick={() => {
                      // Trigger Emma chat
                      localStorage.setItem('emma_minimized', 'false');
                      window.location.reload();
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Talk to Emma →
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-2">Recommended Courses</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Based on your occupation profiles, here are some courses that could help:
                  </p>
                  <button
                    onClick={() => navigate('/workpassport/courses')}
                    className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Browse Courses →
                  </button>
                </div>

                <div className="p-4 border border-gray-200 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-2">Find Institutions</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Get your credentials verified by accredited institutions.
                  </p>
                  <button
                    onClick={() => navigate('/institutions')}
                    className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Browse Institutions →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Global Information for Non-Canadian Users */}
          {!isCanadian && (
            <div className="mt-8 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <FiGlobe className="w-8 h-8 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Global Work Identity</h3>
                  <p className="text-slate-300 text-sm mb-4">
                    WorkPassport lets you carry your verified credentials anywhere in the world. 
                    Share your profile with employers when applying for jobs manually. 
                    Full job marketplace features are currently available in Canada, with more regions coming soon.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">🇨🇦 Canada - Full Features</span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">🇬🇧 UK - Coming Soon</span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">🇦🇺 Australia - Coming Soon</span>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs">🇦🇪 UAE - Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkPassportDashboard;
