import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AdminHeader from '../../components/layout/AdminHeader';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Users,
  Building2,
  GraduationCap,
  Briefcase,
  Globe,
  Shield,
  Clock,
  FileText,
  Bell,
  Star,
  Link2,
  Activity
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const config = {
    healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle, label: 'Healthy' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: AlertTriangle, label: 'Warning' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle, label: 'Critical' },
  };
  const c = config[status] || config.healthy;
  const Icon = c.icon;
  return (
    <span data-testid={`health-status-${status}`} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <Icon size={14} />
      {c.label}
    </span>
  );
};

const CollectionCard = ({ name, icon: Icon, total, orphans, color }) => {
  const isClean = orphans === 0;
  return (
    <div data-testid={`card-${name}`} className={`rounded-xl border p-4 transition-all duration-200 ${isClean ? 'bg-slate-800/50 border-slate-700/50' : 'bg-red-950/20 border-red-500/30'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={16} className="text-white" />
          </div>
          <span className="text-sm font-medium text-slate-200 capitalize">{name.replace(/_/g, ' ')}</span>
        </div>
        {isClean
          ? <CheckCircle size={16} className="text-emerald-400" />
          : <AlertTriangle size={16} className="text-red-400" />
        }
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-slate-400">total records</p>
        </div>
        {orphans > 0 && (
          <div className="text-right">
            <p className="text-lg font-bold text-red-400">{orphans}</p>
            <p className="text-xs text-red-400/70">orphans</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DataHealthDashboard = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get('/api/admin/data-health');
      setData(res.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load data health report');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const profileIcons = {
    admin: { icon: Shield, color: 'bg-violet-600' },
    employer: { icon: Building2, color: 'bg-blue-600' },
    institution: { icon: GraduationCap, color: 'bg-teal-600' },
    workpassport: { icon: Globe, color: 'bg-indigo-600' },
    workforce: { icon: Users, color: 'bg-emerald-600' },
  };

  const relatedIcons = {
    occupation_profiles: { icon: Briefcase, color: 'bg-amber-600' },
    employment_relationships: { icon: Link2, color: 'bg-cyan-600' },
    attendance_records: { icon: Clock, color: 'bg-orange-600' },
    timesheets: { icon: FileText, color: 'bg-pink-600' },
    notifications: { icon: Bell, color: 'bg-sky-600' },
    eula_acceptances: { icon: FileText, color: 'bg-slate-600' },
    workforce_credentials: { icon: Star, color: 'bg-rose-600' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <SuperAdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw size={32} className="animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex" data-testid="data-health-dashboard">
      <SuperAdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Database size={24} style={{ color: theme.primaryColor }} />
                Data Health Monitor
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time integrity scan across all profile types and related collections
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data && <StatusBadge status={data.health_status} />}
              <button
                data-testid="refresh-btn"
                onClick={() => loadHealth(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white border border-slate-600 hover:border-slate-500 transition-colors disabled:opacity-50"
                style={{ backgroundColor: refreshing ? 'transparent' : `${theme.primaryColor}20` }}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Scanning...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Summary Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Users</p>
                  <p className="text-3xl font-bold text-white mt-1">{data.user_accounts.total}</p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Total Issues</p>
                  <p className={`text-3xl font-bold mt-1 ${data.total_issues === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.total_issues}
                  </p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Rated Workers</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{data.special_checks.workforce_with_ratings}</p>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Last Scan</p>
                  <p className="text-sm font-medium text-slate-200 mt-2">
                    {new Date(data.scan_timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* User Type Breakdown */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 mb-8">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity size={16} style={{ color: theme.primaryColor }} />
                  User Accounts by Type
                </h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.user_accounts.by_type).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                    <div key={type} className="bg-slate-900/60 border border-slate-700/30 rounded-lg px-4 py-2 flex items-center gap-2">
                      <span className="text-sm text-slate-300 capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-bold text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile Collections */}
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Profile Collections
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                {Object.entries(data.profiles).map(([name, stats]) => {
                  const cfg = profileIcons[name] || { icon: Database, color: 'bg-slate-600' };
                  return (
                    <CollectionCard
                      key={name}
                      name={name}
                      icon={cfg.icon}
                      total={stats.total}
                      orphans={stats.orphans}
                      color={cfg.color}
                    />
                  );
                })}
              </div>

              {/* Related Data Collections */}
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Related Data Collections
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {Object.entries(data.related_data).map(([name, stats]) => {
                  const cfg = relatedIcons[name] || { icon: Database, color: 'bg-slate-600' };
                  return (
                    <CollectionCard
                      key={name}
                      name={name}
                      icon={cfg.icon}
                      total={stats.total}
                      orphans={stats.orphans}
                      color={cfg.color}
                    />
                  );
                })}
              </div>

              {/* Special Checks */}
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Special Checks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Shift Ratings</p>
                  <p className="text-xl font-bold text-white">{data.special_checks.shift_ratings.total}</p>
                  <p className="text-xs text-slate-500">total ratings recorded</p>
                </div>
                <div className={`rounded-xl border p-4 ${data.special_checks.blockchain_credentials.missing_workforce_id === 0 ? 'bg-slate-800/50 border-slate-700/50' : 'bg-red-950/20 border-red-500/30'}`}>
                  <p className="text-xs text-slate-400 mb-2">Blockchain Credentials</p>
                  <p className="text-xl font-bold text-white">{data.special_checks.blockchain_credentials.total}</p>
                  <p className="text-xs text-slate-500">
                    {data.special_checks.blockchain_credentials.missing_workforce_id > 0
                      ? <span className="text-red-400">{data.special_checks.blockchain_credentials.missing_workforce_id} missing workforce_id</span>
                      : 'all linked'
                    }
                  </p>
                </div>
                <div className={`rounded-xl border p-4 ${data.special_checks.occupation_count_mismatches === 0 ? 'bg-slate-800/50 border-slate-700/50' : 'bg-amber-950/20 border-amber-500/30'}`}>
                  <p className="text-xs text-slate-400 mb-2">Occupation Count Sync</p>
                  <p className="text-xl font-bold text-white">{data.special_checks.occupation_count_mismatches}</p>
                  <p className="text-xs text-slate-500">
                    {data.special_checks.occupation_count_mismatches === 0 ? 'all synced' : 'mismatches found'}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-2">Workers with Ratings</p>
                  <p className="text-xl font-bold text-amber-400">{data.special_checks.workforce_with_ratings}</p>
                  <p className="text-xs text-slate-500">profiles with rating data</p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DataHealthDashboard;
