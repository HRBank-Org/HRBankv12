import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import { FiDollarSign, FiTrendingUp, FiClock, FiCalendar } from 'react-icons/fi';

const Wallet = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Mock data - will be replaced with API
  const stats = {
    currentPeriodHours: 0,
    currentPeriodEarnings: 0,
    expectedWeeklyIncome: 0,
    lastPayment: 0
  };

  const employers = [];

  const getPayPeriodDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      start: startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const period = getPayPeriodDates();

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Wallet</h1>
          <p className="text-gray-600">Track your earnings and expected income</p>
        </div>

        <div className="p-8">
          {/* Current Pay Period Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-100 text-sm mb-2">Current Pay Period</p>
                <h2 className="text-4xl font-bold">${stats.currentPeriodEarnings}</h2>
                <p className="text-blue-100 mt-2">
                  {period.start} - {period.end}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-sm mb-2">Hours Worked</p>
                <p className="text-4xl font-bold">{stats.currentPeriodHours}h</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                  <FiTrendingUp size={24} style={{ color: '#10b981' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Expected This Week</h3>
              <div className="text-3xl font-bold text-gray-900">${stats.expectedWeeklyIncome}</div>
              <p className="text-sm text-gray-500 mt-1">Based on scheduled shifts</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                  <FiDollarSign size={24} style={{ color: '#3b82f6' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Last Payment</h3>
              <div className="text-3xl font-bold text-gray-900">${stats.lastPayment}</div>
              <p className="text-sm text-gray-500 mt-1">--</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f59e0b15' }}>
                  <FiCalendar size={24} style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Active Employers</h3>
              <div className="text-3xl font-bold text-gray-900">{employers.length}</div>
              <p className="text-sm text-gray-500 mt-1">Current period</p>
            </div>
          </div>

          {/* Breakdown by Employer */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Earnings Breakdown by Employer</h3>
            
            {employers.length === 0 ? (
              <div className="text-center py-12">
                <FiDollarSign size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No earnings this period</p>
                <p className="text-sm text-gray-500">Complete shifts to start tracking your earnings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Employer earnings will be listed here */}
              </div>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Payment History</h3>
              <button
                onClick={() => navigate('/workforce/timesheets')}
                className="text-sm font-medium hover:underline"
                style={{ color: theme.primaryColor }}
              >
                View All Timesheets →
              </button>
            </div>
            
            <div className="text-center py-12">
              <FiClock size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No payment history</p>
              <p className="text-sm text-gray-500">Your payment records will appear here</p>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h4 className="font-semibold text-blue-900 mb-2">🚧 Feature Under Development</h4>
            <p className="text-sm text-blue-800">
              Comprehensive wallet with real-time earnings tracking, pay period management, employer breakdowns, and payment history is coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;