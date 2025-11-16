import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';

const InstitutionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await api.get('/api/institution/analytics/dashboard');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const StatCard = ({ icon, label, value, color, bgColor, onClick }) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-6 border-2 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all' : ''}`}
      style={{ borderColor: color || theme.primaryColor }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1 font-medium">{label}</p>
          <p className="text-3xl font-bold" style={{ color: color || theme.primaryColor }}>{value}</p>
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

  // Get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getContactName = () => {
    if (!user?.profile) return 'there';
    return user.profile.contact_name || user.profile.full_name || 
           `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim() || 'there';
  };

  const getInstitutionName = () => {
    return user?.profile?.institution_name || 'Your Institution';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl shadow-lg p-8 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10">
            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {getContactName()}! 🎓</h1>
            <p className="text-purple-100 text-lg">{getInstitutionName()}</p>
            <p className="text-purple-200 text-sm mt-1">Empowering students through verified credentials</p>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon="🎓"
            label="Total Credentials Issued"
            value={analytics?.total_credentials_issued || 0}
            color="#10b981"
            bgColor="#dcfce7"
            onClick={() => navigate('/institution/credentials')}
          />
          <StatCard
            icon="📚"
            label="Active Classes"
            value={analytics?.active_classes || 0}
            color="#6366f1"
            bgColor="#e0e7ff"
            onClick={() => navigate('/institution/classes')}
          />
          <StatCard
            icon="⏰"
            label="Upcoming Expirations"
            value={analytics?.upcoming_expirations || 0}
            color="#f59e0b"
            bgColor="#fef3c7"
          />
          <StatCard
            icon="👥"
            label="Total Students Enrolled"
            value={analytics?.total_students_enrolled || 0}
            color="#a855f7"
            bgColor="#f3e8ff"
          />
          <StatCard
            icon="✅"
            label="Pending Verifications"
            value={analytics?.pending_verification_requests || 0}
            color="#ec4899"
            bgColor="#fce7f3"
            onClick={() => navigate('/institution/verification-requests')}
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickActionCard
              icon="➕"
              title="Create New Class"
              description="Start a new class and enroll students"
              onClick={() => navigate('/institution/classes/create')}
              color="#6366f1"
            />
            <QuickActionCard
              icon="📝"
              title="Manage Templates"
              description="Create and manage class templates"
              onClick={() => navigate('/institution/templates')}
              color="#a855f7"
            />
            <QuickActionCard
              icon="🎓"
              title="Issue Credentials"
              description="Issue credentials to students"
              onClick={() => navigate('/institution/credentials/issue')}
              color="#10b981"
            />
            <QuickActionCard
              icon="📧"
              title="Invite Students"
              description="Send invitations to new students"
              onClick={() => navigate('/institution/students/invite')}
              color="#f59e0b"
            />
            <QuickActionCard
              icon="✅"
              title="Verify Credentials"
              description="Review pending verification requests"
              onClick={() => navigate('/institution/verification-requests')}
              color="#ec4899"
            />
            <QuickActionCard
              icon="📄"
              title="View All Credentials"
              description="See all issued credentials"
              onClick={() => navigate('/institution/credentials')}
              color="#06b6d4"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Classes */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Recent Classes</h3>
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
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cls.title}</p>
                      <p className="text-xs text-gray-500">{cls.credential_type} • {cls.total_enrolled} students</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      cls.status === 'active' ? 'bg-green-100 text-green-700' :
                      cls.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      cls.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {cls.status}
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
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Recent Credentials Issued</h3>
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
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{cred.credential_name}</p>
                      <p className="text-xs text-gray-500">
                        {cred.credential_type} • {new Date(cred.issued_date).toLocaleDateString()}
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
