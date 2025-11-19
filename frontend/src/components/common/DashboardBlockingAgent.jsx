import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';

const DashboardBlockingAgent = () => {
  const [checkStatus, setCheckStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    checkDashboardStatus();
  }, []);

  const checkDashboardStatus = async () => {
    try {
      const response = await api.get('/api/dashboard/check-status');
      setCheckStatus(response.data.data);
    } catch (error) {
      console.error('Failed to check dashboard status:', error);
      // Don't block on error
      setCheckStatus({ should_block: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !checkStatus || !checkStatus.should_block) {
    return null;
  }

  const agentInfo = user.user_type === 'workforce' 
    ? {
        name: 'Suzie',
        photo: 'https://images.unsplash.com/photo-1655249493799-9cee4fe983bb'
      }
    : {
        name: 'Emma',
        photo: 'https://images.unsplash.com/photo-1652471949169-9c587e8898cd'
      };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src={agentInfo.photo} 
                alt={agentInfo.name}
                className="w-16 h-16 rounded-full object-cover shadow-lg"
              />
              <div 
                className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white bg-green-500"
                title="Online"
              ></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getGreeting()}!</h2>
              <p className="text-sm text-gray-600">I'm {agentInfo.name}, your HR Bank assistant</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900 font-medium">
              Before you can access your dashboard, let's complete a few important items:
            </p>
          </div>

          <div className="space-y-3">
            {checkStatus.blocking_issues.map((issue, index) => (
              <div key={index} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 text-lg">{issue.title}</h3>
                    <p className="text-sm text-red-700 mt-1">{issue.description}</p>
                    <button
                      onClick={() => window.location.href = issue.link}
                      className="mt-3 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                    >
                      {issue.action} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {checkStatus.warnings && checkStatus.warnings.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">⚠️</span> Important Reminders:
              </h3>
              <div className="space-y-2">
                {checkStatus.warnings.map((warning, index) => (
                  <div key={index} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                    <p className="text-sm font-medium text-yellow-900">{warning.title}</p>
                    <p className="text-sm text-yellow-700 mt-1">{warning.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Need help? Chat with me anytime in Messages!
            </p>
            <button
              onClick={checkDashboardStatus}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardBlockingAgent;
