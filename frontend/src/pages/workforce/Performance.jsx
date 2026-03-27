import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import { FiAward, FiStar, FiTrendingUp } from 'react-icons/fi';

import { useLanguage } from '../../contexts/LanguageContext';

const Performance = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  // Mock data - will be replaced with API
  const stats = {
    averageRating: 4.7,
    totalRatings: 0,
    badges: [],
    recentRatings: []
  };

  const badges = [
    { id: 1, name: 'Top Performer', icon: '🏆', earned: false },
    { id: 2, name: 'Punctual Star', icon: '⏰', earned: false },
    { id: 3, name: 'Team Player', icon: '🤝', earned: false },
    { id: 4, name: 'Quality Expert', icon: '⭐', earned: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Performance</h1>
          <p className="text-gray-600">Track your ratings and achievements</p>
        </div>

        <div className="p-8">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f59e0b15' }}>
                  <FiStar size={24} style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Average Rating</h3>
              <div className="text-3xl font-bold text-gray-900">{stats.averageRating} ⭐</div>
              <p className="text-sm text-gray-500 mt-1">{stats.totalRatings} ratings</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                  <FiAward size={24} style={{ color: '#3b82f6' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Badges Earned</h3>
              <div className="text-3xl font-bold text-gray-900">{stats.badges.length}</div>
              <p className="text-sm text-gray-500 mt-1">Out of {badges.length} available</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                  <FiTrendingUp size={24} style={{ color: '#10b981' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Performance Trend</h3>
              <div className="text-3xl font-bold text-gray-900">--</div>
              <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
            </div>
          </div>

          {/* Badges Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Achievement Badges</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`border-2 rounded-lg p-4 text-center transition-all ${
                    badge.earned
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p className={`text-sm font-semibold ${
                    badge.earned ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {badge.name}
                  </p>
                  {!badge.earned && (
                    <p className="text-xs text-gray-400 mt-1">Not earned yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Ratings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Ratings from Employers</h3>
            
            {stats.recentRatings.length === 0 ? (
              <div className="text-center py-12">
                <FiStar size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No ratings yet</p>
                <p className="text-sm text-gray-500">Complete shifts to receive ratings from employers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Ratings will be listed here */}
              </div>
            )}
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="font-semibold text-blue-900 mb-2">🚧 Feature Under Development</h4>
            <p className="text-sm text-blue-800">
              Full performance tracking with detailed ratings, feedback, and achievement system is coming soon. You'll be able to rate employers and view comprehensive performance analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;