import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { 
  FiShield, 
  FiActivity, 
  FiUsers, 
  FiLock, 
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDatabase,
  FiServer,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiEye
} from 'react-icons/fi';

const SOC2Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [auditSummary, setAuditSummary] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      const [securityRes, auditRes, healthRes, logsRes] = await Promise.all([
        api.get('/api/compliance/security/status').catch(() => ({ data: null })),
        api.get('/api/compliance/audit-logs/summary?days=7').catch(() => ({ data: null })),
        api.get('/api/health/detailed').catch(() => ({ data: null })),
        api.get('/api/compliance/audit-logs?severity=error&limit=10').catch(() => ({ data: null }))
      ]);

      if (securityRes.data?.data) setSecurityStatus(securityRes.data.data);
      if (auditRes.data?.data) setAuditSummary(auditRes.data.data);
      if (healthRes.data) setHealthStatus(healthRes.data);
      if (logsRes.data?.data?.logs) setRecentLogs(logsRes.data.data.logs);
    } catch (err) {
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <FiCheckCircle className="text-green-600" />;
      case 'degraded': return <FiAlertTriangle className="text-yellow-600" />;
      case 'unhealthy': return <FiXCircle className="text-red-600" />;
      default: return <FiActivity className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SOC2 Compliance Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" data-testid="soc2-dashboard">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FiShield className="text-blue-600" />
              SOC2 Compliance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Security monitoring and compliance status</p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            data-testid="refresh-btn"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* System Health Overview */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6" data-testid="health-section">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiServer />
            System Health
          </h2>
          
          {healthStatus && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${getStatusColor(healthStatus.status)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(healthStatus.status)}
                  <span className="font-medium">Overall Status</span>
                </div>
                <p className="text-2xl font-bold capitalize">{healthStatus.status}</p>
              </div>
              
              {healthStatus.components && Object.entries(healthStatus.components).map(([name, comp]) => (
                <div key={name} className={`p-4 rounded-lg ${getStatusColor(comp.status)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {name === 'database' && <FiDatabase />}
                    {name === 'sessions' && <FiUsers />}
                    {name === 'audit_logging' && <FiActivity />}
                    {name === 'security' && <FiLock />}
                    <span className="font-medium capitalize">{name.replace('_', ' ')}</span>
                  </div>
                  <p className="text-2xl font-bold capitalize">{comp.status}</p>
                  {comp.latency_ms && <p className="text-sm opacity-75">{comp.latency_ms}ms latency</p>}
                  {comp.active_sessions !== undefined && <p className="text-sm opacity-75">{comp.active_sessions} sessions</p>}
                  {comp.locked_accounts !== undefined && <p className="text-sm opacity-75">{comp.locked_accounts} locked</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6" data-testid="active-sessions-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FiUsers className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof securityStatus?.active_sessions === 'object' 
                    ? securityStatus?.active_sessions?.total || 0 
                    : securityStatus?.active_sessions || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6" data-testid="locked-accounts-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FiLock className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Locked Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {securityStatus?.locked_accounts || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6" data-testid="failed-logins-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FiAlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Failed Logins (1hr)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {securityStatus?.failed_logins_last_hour || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6" data-testid="security-events-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FiActivity className="text-purple-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Security Events (1hr)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {securityStatus?.security_events_last_hour || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Summary */}
        {auditSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6" data-testid="audit-by-type">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Events by Type (7 days)</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditSummary.by_event_type && Object.entries(auditSummary.by_event_type)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600 font-mono">{type}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6" data-testid="audit-by-severity">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Events by Severity (7 days)</h2>
              <div className="space-y-3">
                {['critical', 'error', 'warning', 'info'].map(severity => (
                  <div key={severity} className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      severity === 'critical' ? 'bg-red-100 text-red-700' :
                      severity === 'error' ? 'bg-orange-100 text-orange-700' :
                      severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {severity}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {auditSummary.by_severity?.[severity] || 0}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Total Events</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {auditSummary.total_events || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Security Events */}
        <div className="bg-white rounded-xl shadow-sm p-6" data-testid="recent-events">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Security Events</h2>
            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <FiEye size={16} />
              View All Logs
            </button>
          </div>
          
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiCheckCircle size={32} className="mx-auto mb-2 text-green-500" />
              <p>No recent security events</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Event Type</th>
                    <th className="pb-3 font-medium">Severity</th>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log, idx) => (
                    <tr key={log.event_id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          log.severity === 'error' ? 'bg-orange-100 text-orange-700' :
                          log.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600 max-w-xs truncate">
                        {log.description}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {log.actor_email || log.actor_id || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/audit-logs')}
            className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            data-testid="view-audit-logs-btn"
          >
            <FiActivity className="text-blue-600" />
            <span className="font-medium">View Audit Logs</span>
          </button>
          
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            data-testid="manage-users-btn"
          >
            <FiUsers className="text-green-600" />
            <span className="font-medium">Manage Users</span>
          </button>
          
          <button
            onClick={() => window.open('/docs/SOC2_READINESS.md', '_blank')}
            className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            data-testid="view-docs-btn"
          >
            <FiDownload className="text-purple-600" />
            <span className="font-medium">SOC2 Documentation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOC2Dashboard;
