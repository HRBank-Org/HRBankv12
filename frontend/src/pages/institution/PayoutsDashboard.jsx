import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import InstitutionLayout from '../../components/layout/InstitutionLayout';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Wallet, DollarSign, Building2, CheckCircle, Clock, AlertCircle,
  ExternalLink, Loader2, TrendingUp, CreditCard, Calendar, RefreshCw,
  ArrowRight, Shield, Info, MapPin, Percent
} from 'lucide-react';

const PayoutsDashboard = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balanceRes, statusRes, taxRes] = await Promise.all([
        api.get('/api/stripe-connect/balance'),
        api.get('/api/stripe-connect/account-status'),
        api.get('/api/stripe-connect/tax-info')
      ]);

      if (balanceRes.data.success) {
        setBalanceData(balanceRes.data.data);
        setSelectedProvince(balanceRes.data.data.province || 'ON');
      }

      if (statusRes.data.success) {
        setAccountStatus(statusRes.data.data);
      }

      if (taxRes.data.success) {
        setProvinces(taxRes.data.data.provinces || []);
      }

      // Load payout history if account is connected
      if (statusRes.data.data?.has_account) {
        const historyRes = await api.get('/api/stripe-connect/payout-history');
        if (historyRes.data.success) {
          setPayoutHistory(historyRes.data.data.payouts || []);
        }
      }
    } catch (err) {
      console.error('Failed to load payout data:', err);
      setError('Failed to load payout information');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setOnboardingLoading(true);
      const createRes = await api.post('/api/stripe-connect/create-account');
      
      if (createRes.data.success) {
        // Get onboarding link
        const origin = window.location.origin;
        const linkRes = await api.post('/api/stripe-connect/onboarding-link', {
          return_url: `${origin}/institution/payouts?onboarding=complete`,
          refresh_url: `${origin}/institution/payouts?onboarding=refresh`
        });

        if (linkRes.data.success) {
          window.location.href = linkRes.data.data.url;
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create Stripe account');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      setOnboardingLoading(true);
      const origin = window.location.origin;
      const linkRes = await api.post('/api/stripe-connect/onboarding-link', {
        return_url: `${origin}/institution/payouts?onboarding=complete`,
        refresh_url: `${origin}/institution/payouts?onboarding=refresh`
      });

      if (linkRes.data.success) {
        window.location.href = linkRes.data.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create onboarding link');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const res = await api.get('/api/stripe-connect/dashboard-link');
      if (res.data.success) {
        window.open(res.data.data.url, '_blank');
      }
    } catch (err) {
      setError('Failed to open Stripe dashboard');
    }
  };

  const handleProvinceChange = async (e) => {
    const newProvince = e.target.value;
    setSelectedProvince(newProvince);
    try {
      await api.patch(`/api/stripe-connect/update-province?province=${newProvince}`);
      loadData();
    } catch (err) {
      console.error('Failed to update province:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{t("pages.common.pending")}</span>;
      case 'in_transit':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">In Transit</span>;
      case 'canceled':
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">{status}</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  if (loading) {
    return (
      <InstitutionLayout title="Payouts Dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </InstitutionLayout>
    );
  }

  return (
    <InstitutionLayout>
      <div data-testid="payouts-dashboard-page">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-8 py-8 rounded-xl mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Payouts Dashboard</h1>
          </div>
          <p className="text-emerald-100">Manage your earnings and receive automated weekly payouts</p>
        </div>

        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800">{error}</p>
                <button onClick={() => setError(null)} className="text-sm text-red-600 underline mt-1">Dismiss</button>
              </div>
            </div>
          )}

          {/* Stripe Connect Status */}
          {!accountStatus?.has_account && (
            <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Connect Your Bank Account</h2>
                  <p className="text-indigo-100 mb-4">
                    Set up your Stripe account to receive automatic weekly payouts directly to your bank account.
                    This is a one-time setup that takes about 5 minutes.
                  </p>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Secure & Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Weekly Payouts (Fridays)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Direct Bank Deposit</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateAccount}
                    disabled={onboardingLoading}
                    className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2"
                  >
                    {onboardingLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Setting up...</>
                    ) : (
                      <>Get Started <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Onboarding */}
          {accountStatus?.has_account && !accountStatus?.onboarding_complete && (
            <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-800">Complete Your Stripe Setup</h3>
                  <p className="text-yellow-700 mt-1">
                    You've started the setup process but haven't completed it yet. 
                    Finish setting up your account to start receiving payouts.
                  </p>
                  <button
                    onClick={handleContinueOnboarding}
                    disabled={onboardingLoading}
                    className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors flex items-center gap-2"
                  >
                    {onboardingLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                    ) : (
                      <>Continue Setup <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Balance Cards */}
          {balanceData && (
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">${balanceData.total_earned_cad?.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Total Earned</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">${balanceData.available_balance_cad?.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Available Balance</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">${balanceData.total_paid_out_cad?.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Total Paid Out</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{balanceData.paid_credentials_count}</p>
                    <p className="text-sm text-gray-500">Credentials Sold</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6">
            {/* Province & Tax Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Province & Taxes</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Province</label>
                  <select
                    value={selectedProvince}
                    onChange={handleProvinceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {balanceData?.tax_info && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Tax Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(balanceData.tax_info.total * 100).toFixed(2)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{balanceData.tax_info.description}</p>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Taxes are collected from buyers at checkout and remitted to the government. 
                      Your payout amount is calculated before tax.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Payout Schedule</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="font-medium text-emerald-800">Weekly Payouts</p>
                  <p className="text-sm text-emerald-700 mt-1">Every Friday</p>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <p>• Payouts are processed automatically</p>
                  <p>• Funds typically arrive within 2 business days</p>
                  <p>• 50% revenue share (you keep 50%)</p>
                </div>

                {accountStatus?.onboarding_complete && (
                  <button
                    onClick={handleOpenDashboard}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Stripe Dashboard
                  </button>
                )}
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
              </div>

              {accountStatus?.has_account ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {accountStatus.onboarding_complete ? (
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {accountStatus.onboarding_complete ? 'Account Active' : 'Setup Incomplete'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {accountStatus.onboarding_complete 
                          ? 'Ready to receive payouts' 
                          : 'Complete setup to receive payouts'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Charges Enabled</span>
                      <span className={accountStatus.charges_enabled ? 'text-green-600' : 'text-gray-400'}>
                        {accountStatus.charges_enabled ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payouts Enabled</span>
                      <span className={accountStatus.payouts_enabled ? 'text-green-600' : 'text-gray-400'}>
                        {accountStatus.payouts_enabled ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No account connected</p>
                  <p className="text-sm text-gray-400 mt-1">Set up Stripe to receive payouts</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales & Payout History */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Recent Sales</h3>
                <button 
                  onClick={loadData}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              
              {balanceData?.recent_sales?.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {balanceData.recent_sales.map((sale) => (
                    <div key={sale.pending_credential_id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{sale.credential_name}</p>
                          <p className="text-sm text-gray-500">{sale.recipient_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">+${sale.institution_payout_cad}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.paid_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No sales yet
                </div>
              )}
            </div>

            {/* Payout History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Payout History</h3>
              </div>
              
              {payoutHistory.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {payoutHistory.slice(0, 10).map((payout) => (
                    <div key={payout.payout_id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">${payout.amount_cad.toFixed(2)} CAD</p>
                          <p className="text-sm text-gray-500">
                            {payout.arrival_date 
                              ? `Arriving ${new Date(payout.arrival_date).toLocaleDateString()}`
                              : new Date(payout.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(payout.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {accountStatus?.has_account 
                    ? 'No payouts yet' 
                    : 'Connect your account to see payout history'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </InstitutionLayout>
  );
};

export default PayoutsDashboard;
