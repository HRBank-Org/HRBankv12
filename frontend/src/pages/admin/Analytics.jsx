import React, { useState, useEffect } from 'react';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { BarChart3, Users, Building2, TrendingUp, DollarSign, Calendar, RefreshCw } from 'lucide-react';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/api/admin/analytics/platform');
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      // Set default values if API fails
      setAnalytics({
        overview: { total_revenue: 0, total_shifts: 0, active_users: 0, avg_rating: 0 },
        users: { total_workforce: 0, total_employers: 0, total_institutions: 0 },
        shifts: { completed: 0, pending: 0, cancelled: 0 },
        zones: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-CA').format(num || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const { overview = {}, users = {}, shifts = {} } = analytics || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                    <p className="text-gray-600">Comprehensive platform metrics and insights</p>
                  </div>
                </div>
                <button
                  onClick={fetchAnalytics}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-sm opacity-80">Total Revenue</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(overview.total_revenue)}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-sm opacity-80">Total Shifts</span>
                  </div>
                  <p className="text-3xl font-bold">{formatNumber(overview.total_shifts)}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-sm opacity-80">Active Users</span>
                  </div>
                  <p className="text-3xl font-bold">{formatNumber(overview.active_users)}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm opacity-80">Avg Rating</span>
                  </div>
                  <p className="text-3xl font-bold">{(overview.avg_rating || 0).toFixed(1)} ⭐</p>
                </div>
              </div>

              {/* User Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    User Distribution
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-900">Workforce</span>
                      <span className="text-2xl font-bold text-blue-600">{formatNumber(users.total_workforce)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-900">Employers</span>
                      <span className="text-2xl font-bold text-green-600">{formatNumber(users.total_employers)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-purple-900">Institutions</span>
                      <span className="text-2xl font-bold text-purple-600">{formatNumber(users.total_institutions)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    Shift Status
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-900">Completed</span>
                      <span className="text-2xl font-bold text-green-600">{formatNumber(shifts.completed)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="font-medium text-yellow-900">Pending</span>
                      <span className="text-2xl font-bold text-yellow-600">{formatNumber(shifts.pending)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="font-medium text-red-900">Cancelled</span>
                      <span className="text-2xl font-bold text-red-600">{formatNumber(shifts.cancelled)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <a href="/admin/regional-stats" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                    <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <span className="text-sm font-medium">Regional Stats</span>
                  </a>
                  <a href="/admin/users" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <span className="text-sm font-medium">All Users</span>
                  </a>
                  <a href="/admin/employers" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <span className="text-sm font-medium">Employers</span>
                  </a>
                  <a href="/admin/audit-logs" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <span className="text-sm font-medium">Audit Logs</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;
