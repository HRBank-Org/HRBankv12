import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Award,
  Heart,
  Users,
  Building2,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  ArrowUpRight,
  Percent
} from 'lucide-react';

const RevenueDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [revenueData, setRevenueData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRevenueData();
  }, [dateRange]);

  const loadRevenueData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/admin/revenue/overview?days=${dateRange}`);
      if (response.data.success) {
        setRevenueData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load revenue data:', err);
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  const data = revenueData || {};

  return (
    <div className="min-h-screen bg-gray-50" data-testid="revenue-dashboard">
      <UserHeader />
      
      <div className="pt-[64px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <PieChart className="w-8 h-8" />
                  <h1 className="text-3xl font-bold">Platform Revenue</h1>
                </div>
                <p className="text-slate-300">Complete financial overview of HR Bank</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  data-testid="date-range-select"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                  <option value="all">All time</option>
                </select>
                <button
                  onClick={loadRevenueData}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  data-testid="refresh-btn"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
          )}

          {/* Total Revenue Banner */}
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl p-8 text-white mb-8" data-testid="total-revenue-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Total Platform Revenue</p>
                <p className="text-5xl font-bold">{formatCurrency(data.total_revenue)}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    {(data.revenue_growth || 0) >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-200" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-300" />
                    )}
                    <span className="text-emerald-100 text-sm">
                      {(data.revenue_growth || 0) >= 0 ? '+' : ''}{(data.revenue_growth || 0).toFixed(1)}% vs previous period
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-12 h-12" />
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Credential Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="credential-revenue-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Credential Verification</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.credential_revenue)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Share (50%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.credential_platform_share)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Institution Share (50%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.credential_institution_share)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Credentials Sold</span>
                  <span className="font-bold">{formatNumber(data.credentials_sold)}</span>
                </div>
              </div>
            </div>

            {/* Fundraiser Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="fundraiser-revenue-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fundraiser Donations</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.fundraiser_gross_revenue)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Fee (5%)</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(data.fundraiser_platform_fees)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To Institutions (95%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(data.fundraiser_institution_share)}</span>
                </div>
                <div className="flex justify-between text-pink-600">
                  <span>Total Donations</span>
                  <span className="font-bold">{formatNumber(data.total_donations)}</span>
                </div>
              </div>
            </div>

            {/* Shift/Workforce Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="workforce-revenue-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Workforce/Shift Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.workforce_revenue)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Employers</span>
                  <span className="font-medium text-gray-900">{formatNumber(data.active_employers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Workers</span>
                  <span className="font-medium text-gray-900">{formatNumber(data.active_workers)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>Shifts Completed</span>
                  <span className="font-bold">{formatNumber(data.shifts_completed)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Users className="w-4 h-4" />
                Total Users
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.total_users)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Building2 className="w-4 h-4" />
                Institutions
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.total_institutions)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <CreditCard className="w-4 h-4" />
                Active Fundraisers
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(data.active_fundraisers)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Percent className="w-4 h-4" />
                Avg. Credential Price
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.avg_credential_price)}</p>
            </div>
          </div>

          {/* Revenue by Institution */}
          {data.top_institutions && data.top_institutions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8" data-testid="top-institutions">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Top Revenue-Generating Institutions</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {data.top_institutions.map((inst, idx) => (
                  <div key={inst.institution_id || idx} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{inst.institution_name}</p>
                          <p className="text-sm text-gray-500">
                            {inst.credentials_sold} credentials • {inst.donations_received} donations
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(inst.total_revenue)}</p>
                        <p className="text-sm text-gray-500">total generated</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/institution-payouts')}
              className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">Manage Payouts</span>
            </button>
            <button
              onClick={() => navigate('/admin/institutions')}
              className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-medium">View Institutions</span>
            </button>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Full Analytics</span>
            </button>
            <button
              onClick={() => navigate('/admin/soc2')}
              className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-5 h-5 text-amber-600" />
              <span className="font-medium">Compliance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
