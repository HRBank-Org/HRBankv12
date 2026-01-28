import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { FiExternalLink, FiCheckCircle } from 'react-icons/fi';

// Stat Card Component
const StatCard = ({ icon, label, value, color, bgColor, onClick, primaryColor }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm p-6 border-2 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all' : ''}`}
    style={{ borderColor: color || primaryColor }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-600 mb-1 font-medium">{label}</p>
        <p className="text-3xl font-bold" style={{ color: color || primaryColor }}>{value}</p>
      </div>
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ backgroundColor: bgColor }}
      >
        {icon}
      </div>
    </div>
  </div>
);

// Quick Action Card Component
const QuickActionCard = ({ icon, title, description, onClick, color }) => (
  <div 
    onClick={onClick}
    className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-6 border-2 border-gray-100 cursor-pointer hover:shadow-xl hover:border-indigo-200 transition-all group"
  >
    <div className="flex items-start gap-4">
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all group-hover:scale-110 shadow-sm"
        style={{ backgroundColor: color, color: 'white' }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <svg className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);

// Wallet Status Widget Component
const WalletStatusWidget = ({ walletLoading, walletStatus }) => {
  if (walletLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 animate-pulse">
        <div className="h-6 bg-indigo-200 rounded w-48 mb-3"></div>
        <div className="h-4 bg-indigo-100 rounded w-32"></div>
      </div>
    );
  }

  const network = walletStatus?.network_name || 'Polygon';

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FiCheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-900">Blockchain Credential System</h3>
          </div>
          <p className="text-sm mb-3 text-green-700">
            ✓ Ready to issue blockchain credentials
          </p>
          
          <div className="bg-white/60 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Network</span>
              <span className="font-semibold text-gray-900">{network}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className="text-sm font-semibold text-green-600">Active ✓</span>
            </div>
            {walletStatus?.issuer_address && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Issuer Wallet</span>
                <span className="font-mono text-xs text-gray-700">
                  {walletStatus.issuer_address.slice(0, 6)}...{walletStatus.issuer_address.slice(-4)}
                </span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>💡 Monetization Model:</strong> HR Bank covers all gas fees for credential minting. 
              Revenue from credential issuance is shared between HR Bank and your institution.
            </p>
          </div>
        </div>
        
        {walletStatus?.explorer_url && (
          <a
            href={walletStatus.explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="View on Explorer"
          >
            <FiExternalLink className="w-5 h-5" />
          </a>
        )}
      </div>
    </div>
  );
};

const InstitutionDashboard = () => {
  const { updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [walletStatus, setWalletStatus] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [payoutBalance, setPayoutBalance] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const [analyticsRes, profileRes] = await Promise.all([
        api.get('/api/institution/analytics/dashboard'),
        api.get('/api/institutions/me/profile')
      ]);
      
      setAnalytics(analyticsRes.data.data);
      setProfile(profileRes.data.data);
      
      if (profileRes.data.data) {
        updateUserProfile(profileRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [updateUserProfile]);

  const loadWalletStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/blockchain-credentials/issuer-status?network=polygon');
      setWalletStatus(response.data.data);
    } catch (error) {
      console.error('Failed to load wallet status:', error);
      setWalletStatus({ success: false, error: 'Could not fetch wallet status' });
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const loadStripeStatus = useCallback(async () => {
    try {
      const [statusRes, balanceRes] = await Promise.all([
        api.get('/api/stripe-connect/account-status'),
        api.get('/api/stripe-connect/balance')
      ]);
      setStripeStatus(statusRes.data.data);
      setPayoutBalance(balanceRes.data.data);
    } catch (error) {
      console.error('Failed to load Stripe status:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadWalletStatus();
    loadStripeStatus();
  }, [loadDashboardData, loadWalletStatus, loadStripeStatus]);

  // Get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getContactName = () => {
    if (!profile) return 'there';
    return profile.contact_name || profile.contact_person || profile.full_name || 
           `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'there';
  };

  const getInstitutionName = () => {
    return profile?.institution_name || 'Your Institution';
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
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stripe Connect Banner - Show if not connected and has earnings */}
        {stripeStatus && !stripeStatus.has_account && payoutBalance && payoutBalance.total_earned_cad > 0 && (
          <div 
            onClick={() => navigate('/institution/payouts')}
            className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white cursor-pointer hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                  💰
                </div>
                <div>
                  <h3 className="font-bold text-xl">You have ${payoutBalance.total_earned_cad.toFixed(2)} CAD in earnings!</h3>
                  <p className="text-emerald-100">Connect your bank account to receive weekly payouts</p>
                </div>
              </div>
              <button className="px-6 py-3 bg-white text-emerald-600 rounded-lg font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2">
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stripe Connect Pending Banner - Show if account exists but not complete */}
        {stripeStatus && stripeStatus.has_account && !stripeStatus.onboarding_complete && (
          <div 
            onClick={() => navigate('/institution/payouts')}
            className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 text-white cursor-pointer hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                  ⏳
                </div>
                <div>
                  <h3 className="font-bold text-xl">Complete Your Payout Setup</h3>
                  <p className="text-amber-100">Finish connecting your bank account to start receiving payouts</p>
                </div>
              </div>
              <button className="px-6 py-3 bg-white text-amber-600 rounded-lg font-bold hover:bg-amber-50 transition-colors flex items-center gap-2">
                Continue Setup
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {getGreeting()}, {getContactName()}! 🎓
              </h2>
              <p className="text-slate-700 font-medium">{getInstitutionName()}</p>
              <p className="text-gray-600 text-sm">Empowering students through verified credentials</p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-4xl shadow-lg">
                🎓
              </div>
            </div>
          </div>
        </div>

        {/* Blockchain Status & Transcripts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WalletStatusWidget walletLoading={walletLoading} walletStatus={walletStatus} />
          
          {/* Transcript Processing Card */}
          <div 
            onClick={() => navigate('/institution/transcripts')}
            className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200 cursor-pointer hover:shadow-lg hover:border-purple-400 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                📄
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1">AI Transcript Processing</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Upload PDF transcripts and let AI extract course data automatically
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-purple-600">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    AI Extraction
                  </span>
                  <span className="flex items-center gap-1 text-indigo-600">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Blockchain Verified
                  </span>
                </div>
              </div>
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon="🎓"
            label="Total Credentials Issued"
            value={analytics?.total_credentials_issued || 0}
            color="#1e3a8a"
            bgColor="#dbeafe"
            onClick={() => navigate('/institution/credentials')}
            primaryColor={theme.primaryColor}
          />
          <StatCard
            icon="📚"
            label="Active Classes"
            value={analytics?.active_classes || 0}
            color="#1e40af"
            bgColor="#dbeafe"
            onClick={() => navigate('/institution/classes')}
            primaryColor={theme.primaryColor}
          />
          <StatCard
            icon="⏰"
            label="Upcoming Expirations"
            value={analytics?.upcoming_expirations || 0}
            color="#475569"
            bgColor="#e2e8f0"
            primaryColor={theme.primaryColor}
          />
          <StatCard
            icon="👥"
            label="Total Students Enrolled"
            value={analytics?.total_students_enrolled || 0}
            color="#334155"
            bgColor="#e2e8f0"
            primaryColor={theme.primaryColor}
          />
          <StatCard
            icon="✅"
            label="Pending Verifications"
            value={analytics?.pending_verification_requests || 0}
            color="#1e293b"
            bgColor="#e2e8f0"
            onClick={() => navigate('/institution/verification-requests')}
            primaryColor={theme.primaryColor}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-slate-700 to-slate-800 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              icon="💰"
              title="Credential Marketplace"
              description="Issue & sell credentials, track revenue"
              onClick={() => navigate('/institution/marketplace')}
              color="#f59e0b"
            />
            <QuickActionCard
              icon="💳"
              title="Payouts Dashboard"
              description="Manage earnings, connect bank account"
              onClick={() => navigate('/institution/payouts')}
              color="#10b981"
            />
            <QuickActionCard
              icon="📊"
              title="Financial Summary"
              description="Credentials & fundraising revenue overview"
              onClick={() => navigate('/institution/financials')}
              color="#0ea5e9"
            />
            <QuickActionCard
              icon="❤️"
              title="Fundraisers"
              description="Create campaigns for your graduates"
              onClick={() => navigate('/institution/fundraisers')}
              color="#ec4899"
            />
            <QuickActionCard
              icon="📄"
              title="Upload Transcripts"
              description="Process transcripts with AI extraction"
              onClick={() => navigate('/institution/transcripts')}
              color="#7c3aed"
            />
            <QuickActionCard
              icon="➕"
              title="Create New Class"
              description="Start a new class and enroll students"
              onClick={() => navigate('/institution/classes/create')}
              color="#1e40af"
            />
            <QuickActionCard
              icon="🎓"
              title="Issue Credentials"
              description="Issue blockchain-verified credentials"
              onClick={() => navigate('/institution/credentials/issue')}
              color="#1e3a8a"
            />
            <QuickActionCard
              icon="📝"
              title="Manage Templates"
              description="Create and manage class templates"
              onClick={() => navigate('/institution/templates')}
              color="#334155"
            />
            <QuickActionCard
              icon="📧"
              title="Invite Students"
              description="Send invitations to new students"
              onClick={() => navigate('/institution/students/invite')}
              color="#475569"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Classes */}
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm p-6 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white text-xl">
                  📚
                </div>
                <h3 className="text-lg font-bold text-gray-900">Recent Classes</h3>
              </div>
              <button 
                onClick={() => navigate('/institution/classes')}
                className="text-sm font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                View All →
              </button>
            </div>
            {analytics?.recent_classes && analytics.recent_classes.length > 0 ? (
              <div className="space-y-3">
                {analytics.recent_classes.slice(0, 5).map((cls) => (
                  <div 
                    key={cls.class_id} 
                    onClick={() => navigate(`/institution/classes/${cls.class_id}`)}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{cls.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="inline-flex items-center">
                          📖 {cls.credential_type} • 👥 {cls.total_enrolled} students
                        </span>
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      cls.status === 'active' ? 'bg-green-100 text-green-700' :
                      cls.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      cls.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {cls.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No classes yet</p>
                <button 
                  onClick={() => navigate('/institution/classes/create')}
                  className="text-sm font-medium hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  Create your first class
                </button>
              </div>
            )}
          </div>

          {/* Recent Credentials */}
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-sm p-6 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-white text-xl">
                  🎓
                </div>
                <h3 className="text-lg font-bold text-gray-900">Recent Credentials Issued</h3>
              </div>
              <button 
                onClick={() => navigate('/institution/credentials')}
                className="text-sm font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                View All →
              </button>
            </div>
            {analytics?.recent_credentials && analytics.recent_credentials.length > 0 ? (
              <div className="space-y-3">
                {analytics.recent_credentials.slice(0, 5).map((cred) => (
                  <div 
                    key={cred.credential_id}
                    className="flex items-center gap-3 p-4 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{cred.credential_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        🎓 {cred.credential_type} • 📅 {new Date(cred.issued_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No credentials issued yet</p>
                <button 
                  onClick={() => navigate('/institution/credentials/issue')}
                  className="text-sm font-medium hover:underline"
                  style={{ color: theme.primaryColor }}
                >
                  Issue your first credential
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstitutionDashboard;
