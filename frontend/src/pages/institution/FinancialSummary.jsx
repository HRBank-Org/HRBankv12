import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import {
  DollarSign,
  TrendingUp,
  Award,
  Heart,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  PieChart,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Building2,
  Users,
  Percent,
  ExternalLink
} from 'lucide-react';

const FinancialSummary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [financialData, setFinancialData] = useState(null);
  const [credentialTransactions, setCredentialTransactions] = useState([]);
  const [fundraiserTransactions, setFundraiserTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFinancialData();
  }, [dateRange]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Load credential revenue
      const [balanceRes, fundraisersRes] = await Promise.all([
        api.get('/api/stripe-connect/balance').catch(() => ({ data: { success: false } })),
        api.get('/api/fundraisers/institution/list').catch(() => ({ data: { success: false } }))
      ]);

      let credentialRevenue = 0;
      let credentialCount = 0;
      let recentCredentialSales = [];

      if (balanceRes.data?.success) {
        credentialRevenue = balanceRes.data.data?.total_earned_cad || 0;
        credentialCount = balanceRes.data.data?.paid_credentials_count || 0;
        recentCredentialSales = balanceRes.data.data?.recent_sales || [];
      }

      let fundraiserRevenue = 0;
      let donationCount = 0;
      let platformFees = 0;
      let fundraiserList = [];

      if (fundraisersRes.data?.success) {
        fundraiserList = fundraisersRes.data.data?.fundraisers || [];
        fundraiserList.forEach(f => {
          fundraiserRevenue += f.raised_amount || 0;
          donationCount += f.donor_count || 0;
          platformFees += f.platform_fees_total || 0;
        });
      }

      // Get detailed fundraiser donations
      const donationsPromises = fundraiserList.slice(0, 5).map(f => 
        api.get(`/api/fundraisers/institution/${f.fundraiser_id}`).catch(() => ({ data: { success: false } }))
      );
      const donationsResults = await Promise.all(donationsPromises);
      
      let allDonations = [];
      donationsResults.forEach(res => {
        if (res.data?.success && res.data.data?.recent_donations) {
          allDonations = [...allDonations, ...res.data.data.recent_donations];
        }
      });

      // Sort by date
      allDonations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setFinancialData({
        totalRevenue: credentialRevenue + fundraiserRevenue,
        credentialRevenue,
        fundraiserRevenue,
        credentialCount,
        donationCount,
        platformFees,
        fundraiserList
      });

      setCredentialTransactions(recentCredentialSales);
      setFundraiserTransactions(allDonations.slice(0, 10));

    } catch (err) {
      console.error('Failed to load financial data:', err);
      setError('Failed to load financial data');
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportToCSV = () => {
    const rows = [
      ['Type', 'Description', 'Amount', 'Date', 'Status']
    ];

    credentialTransactions.forEach(t => {
      rows.push([
        'Credential Sale',
        t.credential_name,
        t.institution_payout_cad,
        t.paid_at,
        'Completed'
      ]);
    });

    fundraiserTransactions.forEach(t => {
      rows.push([
        'Donation',
        `From ${t.anonymous ? 'Anonymous' : t.donor_name}`,
        t.net_amount || t.amount,
        t.created_at,
        'Completed'
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial data...</p>
        </div>
      </div>
    );
  }

  const credentialPercent = financialData?.totalRevenue > 0 
    ? ((financialData.credentialRevenue / financialData.totalRevenue) * 100).toFixed(1)
    : 0;
  const fundraiserPercent = financialData?.totalRevenue > 0
    ? ((financialData.fundraiserRevenue / financialData.totalRevenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="financial-summary-page">
      <UserHeader />
      
      <div className="pt-[64px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <PieChart className="w-8 h-8" />
                  <h1 className="text-3xl font-bold">Financial Summary</h1>
                </div>
                <p className="text-emerald-100">Complete overview of your institution's revenue</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadFinancialData}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  data-testid="refresh-btn"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
                  data-testid="export-btn"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
          )}

          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white mb-8" data-testid="total-revenue-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Total Revenue</p>
                <p className="text-5xl font-bold">{formatCurrency(financialData?.totalRevenue)}</p>
                <p className="text-emerald-100 mt-2">
                  From {financialData?.credentialCount || 0} credentials & {financialData?.donationCount || 0} donations
                </p>
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
                  <p className="text-sm text-gray-500">Credential Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(financialData?.credentialRevenue)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{financialData?.credentialCount || 0} credentials sold</span>
                <span className="text-blue-600 font-medium">{credentialPercent}%</span>
              </div>
              <div className="mt-3 bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${credentialPercent}%` }}
                ></div>
              </div>
              <button
                onClick={() => navigate('/institution/payouts')}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                View Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Fundraiser Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="fundraiser-revenue-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fundraiser Donations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(financialData?.fundraiserRevenue)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{financialData?.donationCount || 0} donations</span>
                <span className="text-pink-600 font-medium">{fundraiserPercent}%</span>
              </div>
              <div className="mt-3 bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${fundraiserPercent}%` }}
                ></div>
              </div>
              <button
                onClick={() => navigate('/institution/fundraisers')}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors text-sm font-medium"
              >
                View Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Fees */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-testid="platform-fees-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Percent className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Platform Fees (5%)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(financialData?.platformFees)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                5% platform fee on donations helps maintain HR Bank services
              </p>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>Note:</strong> You receive 95% of all donations. Credential sales have a 50/50 revenue split.
                </p>
              </div>
            </div>
          </div>

          {/* Active Fundraisers */}
          {financialData?.fundraiserList?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8" data-testid="fundraisers-section">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    Active Fundraisers
                  </h2>
                  <button
                    onClick={() => navigate('/institution/fundraisers')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    Manage All <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {financialData.fundraiserList.slice(0, 5).map((fundraiser) => (
                  <div key={fundraiser.fundraiser_id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{fundraiser.title}</h3>
                        <p className="text-sm text-gray-500">
                          {fundraiser.donor_count} donors • Created {formatDate(fundraiser.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(fundraiser.raised_amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          of {formatCurrency(fundraiser.goal_amount)} goal
                        </p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min((fundraiser.raised_amount / fundraiser.goal_amount) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {((fundraiser.raised_amount / fundraiser.goal_amount) * 100).toFixed(1)}% funded
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Credential Sales */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200" data-testid="credential-transactions">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-500" />
                  Recent Credential Sales
                </h3>
              </div>
              {credentialTransactions.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {credentialTransactions.slice(0, 5).map((sale, idx) => (
                    <div key={sale.pending_credential_id || idx} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{sale.credential_name}</p>
                          <p className="text-sm text-gray-500">{sale.recipient_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +{formatCurrency(sale.institution_payout_cad)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(sale.paid_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No credential sales yet</p>
                </div>
              )}
            </div>

            {/* Donation Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200" data-testid="donation-transactions">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Recent Donations
                </h3>
              </div>
              {fundraiserTransactions.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {fundraiserTransactions.slice(0, 5).map((donation, idx) => (
                    <div key={donation.donation_id || idx} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {donation.anonymous ? 'Anonymous Donor' : donation.donor_name}
                          </p>
                          {donation.message && (
                            <p className="text-sm text-gray-500 truncate max-w-[200px]">
                              "{donation.message}"
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            +{formatCurrency(donation.net_amount || donation.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(donation.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No donations yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 bg-gray-100 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/institution/payouts')}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-gray-700">Payouts</span>
              </button>
              <button
                onClick={() => navigate('/institution/fundraisers')}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <Heart className="w-5 h-5 text-pink-600" />
                <span className="font-medium text-gray-700">Fundraisers</span>
              </button>
              <button
                onClick={() => navigate('/institution/credentials')}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-700">Credentials</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-all"
              >
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-700">Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
