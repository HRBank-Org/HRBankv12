import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  BarChart3,
  MapPin,
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

const RegionalDashboard = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [regionalStats, setRegionalStats] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/super-admin/regional-stats');
      setRegionalStats(response.data.data.regional_stats || []);
    } catch (error) {
      console.error('Failed to load regional stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getProvinceColor = (code) => {
    const colors = {
      ON: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
      BC: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
      AB: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
      QC: { bg: 'bg-purple-100', text: 'text-purple-700', bar: 'bg-purple-500' },
      MB: { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' },
      SK: { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
      NS: { bg: 'bg-teal-100', text: 'text-teal-700', bar: 'bg-teal-500' },
      NB: { bg: 'bg-pink-100', text: 'text-pink-700', bar: 'bg-pink-500' },
      NL: { bg: 'bg-indigo-100', text: 'text-indigo-700', bar: 'bg-indigo-500' },
      PE: { bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-500' },
      NT: { bg: 'bg-cyan-100', text: 'text-cyan-700', bar: 'bg-cyan-500' },
      YT: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
      NU: { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'bg-violet-500' }
    };
    return colors[code] || { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-500' };
  };

  const totalStats = regionalStats.reduce(
    (acc, region) => ({
      workforce: acc.workforce + region.workforce_count,
      employers: acc.employers + region.employer_count,
      pending: acc.pending + region.pending_activations,
      zones: acc.zones + region.zone_count
    }),
    { workforce: 0, employers: 0, pending: 0, zones: 0 }
  );

  const maxUsers = Math.max(...regionalStats.map(r => r.total_users), 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] pt-20 transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Regional Analytics</h1>
                      <p className="text-gray-600">User distribution across Canadian provinces</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* National Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Workforce</p>
                      <p className="text-3xl font-bold text-gray-900">{totalStats.workforce.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-100">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Employers</p>
                      <p className="text-3xl font-bold text-gray-900">{totalStats.employers.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-100">
                      <Building2 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Pending Activations</p>
                      <p className="text-3xl font-bold text-orange-600">{totalStats.pending.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-orange-100">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Zones</p>
                      <p className="text-3xl font-bold text-gray-900">{totalStats.zones}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-100">
                      <MapPin className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Regional Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-gray-900">Provincial Distribution</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {regionalStats.map((region) => {
                      const colors = getProvinceColor(region.province_code);
                      const percentage = maxUsers > 0 ? (region.total_users / maxUsers) * 100 : 0;
                      
                      return (
                        <div
                          key={region.province_code}
                          className="cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                          onClick={() => setSelectedProvince(
                            selectedProvince === region.province_code ? null : region.province_code
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center font-bold ${colors.text}`}>
                                {region.province_code}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{region.province_name}</p>
                                <p className="text-sm text-gray-500">
                                  {region.workforce_count} workforce • {region.employer_count} employers
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {region.pending_activations > 0 && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                  {region.pending_activations} pending
                                </span>
                              )}
                              <span className="text-lg font-semibold text-gray-900">
                                {region.total_users.toLocaleString()}
                              </span>
                              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                                selectedProvince === region.province_code ? 'rotate-90' : ''
                              }`} />
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          {/* Expanded Details */}
                          {selectedProvince === region.province_code && (
                            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Zones</p>
                                <p className="text-lg font-semibold">{region.zone_count}</p>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Admins Assigned</p>
                                <p className="text-lg font-semibold">{region.admin_count}</p>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Workforce</p>
                                <p className="text-lg font-semibold">{region.workforce_count}</p>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Employers</p>
                                <p className="text-lg font-semibold">{region.employer_count}</p>
                              </div>
                              
                              {/* Assigned Admins */}
                              {region.assigned_admins && region.assigned_admins.length > 0 && (
                                <div className="col-span-full">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Assigned Administrators</p>
                                  <div className="flex flex-wrap gap-2">
                                    {region.assigned_admins.map((admin) => (
                                      <div
                                        key={admin.admin_id}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-full text-sm"
                                      >
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                                          {admin.full_name?.charAt(0) || admin.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{admin.full_name || admin.email}</span>
                                        <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                                          {admin.role?.replace('_', ' ')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Zones List */}
                              {region.zones && region.zones.length > 0 && (
                                <div className="col-span-full">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Zones</p>
                                  <div className="flex flex-wrap gap-2">
                                    {region.zones.map((zone) => (
                                      <span
                                        key={zone.zone_code}
                                        className="px-3 py-1.5 bg-white border rounded-lg text-sm"
                                      >
                                        {zone.zone_name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/admin/zones"
                  className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                >
                  <div className="p-3 rounded-xl bg-blue-100">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Manage Zones</p>
                    <p className="text-sm text-gray-500">Create and edit geographic zones</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </a>
                <a
                  href="/admin/admins"
                  className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                >
                  <div className="p-3 rounded-xl bg-green-100">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Assign Admins</p>
                    <p className="text-sm text-gray-500">Assign admins to provinces</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </a>
                <a
                  href="/admin/pending-activations"
                  className="bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                >
                  <div className="p-3 rounded-xl bg-orange-100">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Pending Activations</p>
                    <p className="text-sm text-gray-500">Review by region</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RegionalDashboard;
