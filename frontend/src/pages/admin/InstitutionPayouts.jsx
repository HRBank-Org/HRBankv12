import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import UserHeader from '../../components/common/UserHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Building2, CheckCircle, Clock, AlertCircle, DollarSign,
  Search, RefreshCw, ExternalLink, TrendingUp, Filter
} from 'lucide-react';

const InstitutionPayouts = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState([]);
  const [filter, setFilter] = useState('all'); // all, connected, pending, not_connected
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    pending: 0,
    not_connected: 0,
    total_platform_earnings: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/super-admin/institutions-stripe-status');
      if (response.data.success) {
        setInstitutions(response.data.data.institutions);
        setStats(response.data.data.stats);
      }
    } catch (error) {
      console.error('Failed to load institution data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Connected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Not Connected
          </span>
        );
    }
  };

  const filteredInstitutions = institutions.filter(inst => {
    const matchesFilter = filter === 'all' || 
      (filter === 'connected' && inst.stripe_status === 'active') ||
      (filter === 'pending' && inst.stripe_status === 'pending') ||
      (filter === 'not_connected' && !inst.stripe_status);
    
    const matchesSearch = !searchQuery || 
      inst.institution_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />
      <SuperAdminSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 256px)' }}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Institution Payouts</h1>
              <p className="text-gray-600">Monitor Stripe Connect status and platform earnings</p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Institutions</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.connected}</p>
                  <p className="text-sm text-gray-500">Stripe Connected</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  <p className="text-sm text-gray-500">Pending Setup</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.not_connected}</p>
                  <p className="text-sm text-gray-500">Not Connected</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">${stats.total_platform_earnings?.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Platform Earnings</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search institutions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Institutions</option>
                  <option value="connected">Stripe Connected</option>
                  <option value="pending">Pending Setup</option>
                  <option value="not_connected">Not Connected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Institutions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Institution</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">{t("pages.common.email")}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Province</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Stripe Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Credentials Sold</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Total Earned</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Platform Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInstitutions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No institutions found
                    </td>
                  </tr>
                ) : (
                  filteredInstitutions.map((inst, index) => (
                    <tr key={`${inst.institution_id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            {inst.logo_url ? (
                              <img src={inst.logo_url} alt="" className="w-8 h-8 rounded" />
                            ) : (
                              <Building2 className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className="font-medium text-gray-900">{inst.institution_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{inst.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{inst.province || 'N/A'}</td>
                      <td className="px-6 py-4">{getStatusBadge(inst.stripe_status)}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{inst.credentials_sold || 0}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">${(inst.total_earned || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">${(inst.platform_fee || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionPayouts;
