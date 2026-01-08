import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GenericHeader from '../../components/layout/GenericHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/admin/analytics/platform');
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      setError('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-CA').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        </div>
      </div>
    );
  }

  const { overview, users, shifts, zones, top_zones } = analytics;

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 lg:ml-[260px] transition-all duration-300">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="text-gray-600">Platform performance and metrics</p>
              </div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="text-sm text-gray-600">Comprehensive CEO Dashboard</p>
              </div>
            </div>
            <button
              onClick={fetchAnalytics}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium opacity-90">Total Revenue</h3>
            <p className="text-3xl font-bold mt-2">{formatCurrency(overview.total_revenue)}</p>
            <p className="text-xs opacity-75 mt-2">{formatNumber(overview.total_hours_worked)} hours @ $2/hr</p>
          </div>

          {/* Total Users */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium opacity-90">Total Active Users</h3>
            <p className="text-3xl font-bold mt-2">{formatNumber(users.workforce.active + users.employers.active + users.institutions.active)}</p>
            <p className="text-xs opacity-75 mt-2">
              {formatNumber(users.workforce.new_last_30d + users.employers.new_last_30d)} new this month
            </p>
          </div>

          {/* Total Shifts */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium opacity-90">Shifts Completed</h3>
            <p className="text-3xl font-bold mt-2">{formatNumber(overview.total_shifts_completed)}</p>
            <p className="text-xs opacity-75 mt-2">{overview.completion_rate}% completion rate</p>
          </div>

          {/* Average Shift Duration */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-sm font-medium opacity-90">Avg Shift Duration</h3>
            <p className="text-3xl font-bold mt-2">{shifts.avg_duration_hours.toFixed(1)}h</p>
            <p className="text-xs opacity-75 mt-2">{formatNumber(overview.total_hours_worked)} total hours</p>
          </div>
        </div>

        {/* User Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">User Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Workforce */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Workforce</h3>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(users.workforce.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-sm font-semibold text-green-600">{formatNumber(users.workforce.active)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New (30d)</span>
                  <span className="text-sm font-semibold text-blue-600">+{formatNumber(users.workforce.new_last_30d)}</span>
                </div>
              </div>
            </div>

            {/* Employers */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Employers</h3>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(users.employers.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-sm font-semibold text-green-600">{formatNumber(users.employers.active)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New (30d)</span>
                  <span className="text-sm font-semibold text-blue-600">+{formatNumber(users.employers.new_last_30d)}</span>
                </div>
              </div>
            </div>

            {/* Institutions */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Institutions</h3>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(users.institutions.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-sm font-semibold text-green-600">{formatNumber(users.institutions.active)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Zones */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Zones</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shifts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workforce
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {top_zones.map((zone, index) => (
                  <tr key={zone.zone_id} className={index < 3 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-100 text-gray-600'
                      } font-bold text-sm`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{zone.zone_name}</div>
                      <div className="text-xs text-gray-500">{zone.provinces.join(', ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600">{formatCurrency(zone.revenue)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(zone.hours_worked)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(zone.total_shifts)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatNumber(zone.workforce?.total || 0)}</div>
                      <div className="text-xs text-gray-500">
                        <span className="text-green-600">{formatNumber(zone.workforce?.active || 0)} active</span>
                        {zone.workforce?.new_last_30d > 0 && <span className="text-blue-600"> • +{zone.workforce?.new_last_30d} new</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{formatNumber(zone.employers?.total || 0)}</div>
                      <div className="text-xs text-gray-500">
                        <span className="text-green-600">{formatNumber(zone.employers?.active || 0)} active</span>
                        {zone.employers?.new_last_30d > 0 && <span className="text-blue-600"> • +{zone.employers?.new_last_30d} new</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Zones */}
        {zones.length > 5 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">All Zones Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <div key={zone.zone_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <h3 className="font-semibold text-gray-900 mb-1">{zone.zone_name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{zone.provinces.join(', ')}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(zone.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hours:</span>
                      <span className="font-semibold text-gray-900">{formatNumber(zone.hours_worked)}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shifts:</span>
                      <span className="font-semibold text-gray-900">{formatNumber(zone.total_shifts)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Workforce:</span>
                        <span className="font-semibold text-gray-900">{formatNumber(zone.workforce?.total || 0)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        <span className="text-green-600">{zone.workforce?.active || 0} active</span>
                        {zone.workforce?.new_last_30d > 0 && <span> • <span className="text-blue-600">+{zone.workforce?.new_last_30d} new</span></span>}
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Employers:</span>
                        <span className="font-semibold text-gray-900">{formatNumber(zone.employers?.total || 0)}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="text-green-600">{zone.employers?.active || 0} active</span>
                        {zone.employers?.new_last_30d > 0 && <span> • <span className="text-blue-600">+{zone.employers?.new_last_30d} new</span></span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shift Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Shift Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(shifts.total_created)}</p>
              <p className="text-sm text-gray-600 mt-1">Total Created</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatNumber(shifts.completed)}</p>
              <p className="text-sm text-gray-600 mt-1">Completed</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{formatNumber(shifts.active)}</p>
              <p className="text-sm text-gray-600 mt-1">Active</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{formatNumber(shifts.pending)}</p>
              <p className="text-sm text-gray-600 mt-1">Pending</p>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Workforce */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🏆</span>
              <span>Top Workforce by Revenue</span>
            </h2>
            {analytics.top_workforce && analytics.top_workforce.length > 0 ? (
              <div className="space-y-3">
                {analytics.top_workforce.map((worker, index) => (
                  <div key={worker.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{worker.name}</p>
                        <p className="text-xs text-gray-500">{worker.shifts_completed} shifts • {formatNumber(worker.total_hours)}h</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(worker.revenue_generated)}</p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No workforce data available</p>
            )}
          </div>

          {/* Top Employers */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🏢</span>
              <span>Top Employers by Revenue</span>
            </h2>
            {analytics.top_employers && analytics.top_employers.length > 0 ? (
              <div className="space-y-3">
                {analytics.top_employers.map((employer, index) => (
                  <div key={employer.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{employer.company_name}</p>
                        <p className="text-xs text-gray-500">{employer.shifts_created} shifts • {formatNumber(employer.total_hours)}h</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(employer.revenue_generated)}</p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No employer data available</p>
            )}
          </div>
        </div>

        {/* Market Demand Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Skills in Demand */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>💼</span>
              <span>Top Skills in Demand</span>
            </h2>
            {analytics.skills_demand && analytics.skills_demand.length > 0 ? (
              <div className="space-y-2">
                {analytics.skills_demand.slice(0, 10).map((skill, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{skill.skill}</p>
                      <p className="text-xs text-gray-500">{skill.total_positions} positions across {skill.job_count} jobs</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                        {skill.job_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active job postings</p>
            )}
          </div>

          {/* Top Certifications in Demand */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>🎓</span>
              <span>Top Certifications in Demand</span>
            </h2>
            {analytics.certifications_demand && analytics.certifications_demand.length > 0 ? (
              <div className="space-y-2">
                {analytics.certifications_demand.slice(0, 10).map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{cert.certification}</p>
                      <p className="text-xs text-gray-500">{cert.total_positions} positions across {cert.job_count} jobs</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                        {cert.job_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No certification requirements found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
