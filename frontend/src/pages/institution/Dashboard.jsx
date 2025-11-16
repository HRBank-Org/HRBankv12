import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';

const InstitutionDashboard = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      {/* UserHeader */}
      <UserHeader 
        showBack={false}
      />

      {/* Welcome Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border border-purple-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {user?.profile?.contact_name || user?.profile?.contact_person || 'there'}! 👋
          </h2>
          <p className="text-gray-600">
            {user?.profile?.institution_name && `${user.profile.institution_name} • `}
            Credential Verification Portal
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-8">

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">0</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Completed This Month</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">0</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Avg Time</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">-- days</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/institution/verification-queue')}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primaryColor}20` }}>
              <svg className="w-6 h-6" fill="none" stroke={theme.primaryColor} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Verification Queue</h3>
            <p className="text-sm text-gray-600 mt-1">Review pending credentials</p>
          </button>

          <button className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left">
            <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.accentColor}20` }}>
              <svg className="w-6 h-6" fill="none" stroke={theme.accentColor} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Demand Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">View skills demand</p>
          </button>

          <button 
            onClick={() => navigate('/institution/invite-students')}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Invite Students</h3>
            <p className="text-sm text-gray-600 mt-1">Bulk invite via CSV</p>
          </button>

          <button 
            onClick={() => navigate('/institution/issue-credential')}
            className="text-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center bg-white/20">
              <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold">Issue Blockchain Credential</h3>
            <p className="text-sm opacity-90 mt-1">Tamper-proof certificates</p>
          </button>

          <button 
            onClick={() => navigate('/institution/manage-credentials')}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow text-left"
          >
            <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Manage Credentials</h3>
            <p className="text-sm text-gray-600 mt-1">View & revoke issued</p>
          </button>
        </div>
      </main>
    </div>
  );
};

export default InstitutionDashboard;
