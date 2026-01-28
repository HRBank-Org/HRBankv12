import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiXCircle, FiRefreshCw, FiClock, FiActivity } from 'react-icons/fi';

const StatusPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [incidents, setIncidents] = useState([]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health/detailed`);
      const data = await response.json();
      setStatus(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setStatus({ status: 'error', error: 'Failed to connect to API' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': 
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'degraded': return 'bg-yellow-50 border-yellow-200';
      case 'unhealthy':
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <FiCheckCircle className="text-green-500" size={24} />;
      case 'degraded': return <FiAlertCircle className="text-yellow-500" size={24} />;
      case 'unhealthy':
      case 'error': return <FiXCircle className="text-red-500" size={24} />;
      default: return <FiClock className="text-gray-500" size={24} />;
    }
  };

  const getOverallStatusMessage = (status) => {
    switch (status) {
      case 'healthy': return 'All Systems Operational';
      case 'degraded': return 'Partial System Outage';
      case 'unhealthy':
      case 'error': return 'Major System Outage';
      default: return 'Checking Status...';
    }
  };

  const componentLabels = {
    database: 'Database',
    sessions: 'Session Management',
    audit_logging: 'Audit Logging',
    security: 'Security Controls',
    email: 'Email Service',
    blockchain: 'Blockchain Service'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiActivity className="text-indigo-600" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HR Bank Status</h1>
                <p className="text-sm text-gray-500">System Status & Incidents</p>
              </div>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Overall Status Banner */}
        {status && (
          <div className={`rounded-xl p-6 mb-8 border ${getStatusBg(status.status)}`}>
            <div className="flex items-center gap-4">
              {getStatusIcon(status.status)}
              <div>
                <h2 className={`text-xl font-bold ${getStatusColor(status.status)}`}>
                  {getOverallStatusMessage(status.status)}
                </h2>
                {lastUpdated && (
                  <p className="text-sm text-gray-500">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Components Status */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Components</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading && !status ? (
              <div className="p-8 text-center">
                <FiRefreshCw className="animate-spin mx-auto text-indigo-600 mb-2" size={32} />
                <p className="text-gray-500">Loading status...</p>
              </div>
            ) : status?.components ? (
              <div className="divide-y divide-gray-100">
                {Object.entries(status.components).map(([key, component]) => (
                  <div key={key} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      {component.status === 'healthy' ? (
                        <FiCheckCircle className="text-green-500" size={20} />
                      ) : (
                        <FiAlertCircle className="text-yellow-500" size={20} />
                      )}
                      <span className="font-medium text-gray-900">
                        {componentLabels[key] || key}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {component.latency_ms && (
                        <span className="text-sm text-gray-500">
                          {component.latency_ms}ms
                        </span>
                      )}
                      <span className={`text-sm font-medium capitalize ${getStatusColor(component.status)}`}>
                        {component.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-red-500">
                <FiXCircle className="mx-auto mb-2" size={32} />
                <p>Unable to fetch system status</p>
              </div>
            )}
          </div>
        </section>

        {/* Uptime Stats */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uptime (Last 90 Days)</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-bold text-green-600">99.9%</span>
              <span className="text-sm text-gray-500">SLA Target: 99.5%</span>
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 90 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 flex-1 rounded-sm ${i === 45 ? 'bg-yellow-400' : 'bg-green-400'}`}
                  title={`Day ${90 - i}: ${i === 45 ? 'Degraded' : 'Operational'}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </section>

        {/* Scheduled Maintenance */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Maintenance</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center text-gray-500 py-4">
              <FiCheckCircle className="mx-auto mb-2 text-green-500" size={24} />
              <p>No scheduled maintenance at this time</p>
            </div>
          </div>
        </section>

        {/* Past Incidents */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Incidents</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="border-l-4 border-green-400 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">January 28, 2026</h4>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Resolved</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Scheduled maintenance for blockchain wallet migration. No service interruption.
                </p>
              </div>
              <div className="text-center text-gray-500 pt-4 border-t border-gray-100">
                <p className="text-sm">No other incidents in the last 90 days</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>For support, contact <a href="mailto:support@hrbank.ca" className="text-indigo-600 hover:underline">support@hrbank.ca</a></p>
          <p className="mt-2">Subscribe to status updates via email or RSS</p>
        </footer>
      </main>
    </div>
  );
};

export default StatusPage;
