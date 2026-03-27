import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Clock,
  Building2, Users, Calendar, Zap, Settings, History,
  ExternalLink, Shield, CloudOff, Cloud
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PROVIDER_INFO = {
  gusto: {
    name: 'Gusto',
    logo: '🟢',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    borderColor: 'border-green-500',
    description: 'Best for US small businesses',
    features: ['Time tracking sync', 'Employee management', 'Pay period automation']
  },
  dayforce: {
    name: 'Ceridian Dayforce',
    logo: '🔵',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    borderColor: 'border-blue-500',
    description: 'Canadian market leader',
    features: ['Employee punches', 'Labor allocation', 'Schedule import']
  },
  adp: {
    name: 'ADP Workforce Now',
    logo: '🔴',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    borderColor: 'border-red-500',
    description: 'Enterprise-grade payroll',
    features: ['Time cards', 'Worker management', 'Benefits sync']
  }
};

export default function PayrollSync() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const token = localStorage.getItem('access_token');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [providers, setProviders] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: getDefaultEndDate()
  });
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() - 7);
    return date.toISOString().split('T')[0];
  }

  function getDefaultEndDate() {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() - 1);
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    fetchProviders();
    fetchSyncStatus();
    fetchSyncHistory();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payroll-sync/providers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProviders(data.data.providers);
      }
    } catch (err) {
      setError('Failed to fetch providers');
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payroll-sync/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (err) {
      // Silent fail for status
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/payroll-sync/history?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSyncHistory(data.data.syncs);
      }
    } catch (err) {
      // Silent fail for history
    }
  };

  const testConnection = async (providerId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payroll-sync/providers/${providerId}/test`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Update provider with connection status
        setProviders(prev => prev.map(p => 
          p.provider_id === providerId 
            ? { ...p, connectionTested: true, connectionInfo: data.data }
            : p
        ));
      }
    } catch (err) {
      setError('Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedProvider) return;
    
    setSyncing(selectedProvider);
    setSyncResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/payroll-sync/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider_id: selectedProvider,
          start_date: dateRange.start,
          end_date: dateRange.end
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Sync failed');
      }

      setSyncResult(data.data);
      fetchSyncHistory();
      fetchSyncStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/employer/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pages.employer.payrollSyncTitle')}</h1>
              <p className="text-gray-500 dark:text-gray-400">Direct API integration with payroll providers</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/employer/payroll-export')}>
            File Export
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-200">Mock Mode Active</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  All integrations are running in mock mode. Configure API credentials in environment variables to enable live sync.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4 flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </CardContent>
          </Card>
        )}

        {/* Sync Summary */}
        {syncStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Syncs</p>
                    <p className="text-xl font-bold">{syncStatus.sync_summary.total_syncs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="text-xl font-bold">{syncStatus.sync_summary.success_rate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Records Synced</p>
                    <p className="text-xl font-bold">{syncStatus.sync_summary.total_records_synced}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Sync</p>
                    <p className="text-sm font-medium">
                      {syncStatus.last_sync 
                        ? new Date(syncStatus.last_sync.synced_at).toLocaleDateString() 
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Select Payroll Provider
            </CardTitle>
            <CardDescription>
              Choose your payroll system for direct API sync
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map((provider) => {
                const info = PROVIDER_INFO[provider.provider_id] || {};
                const isSelected = selectedProvider === provider.provider_id;
                
                return (
                  <div
                    key={provider.provider_id}
                    onClick={() => setSelectedProvider(provider.provider_id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? `${info.borderColor} bg-gray-50 dark:bg-gray-800` 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                    data-testid={`provider-${provider.provider_id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{info.logo}</span>
                        <div>
                          <h3 className="font-semibold">{info.name}</h3>
                          <p className="text-xs text-gray-500">{info.description}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={info.color}>
                        {provider.is_mock_mode ? (
                          <><CloudOff className="w-3 h-3 mr-1" /> Mock</>
                        ) : (
                          <><Cloud className="w-3 h-3 mr-1" /> Live</>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        API {provider.api_version}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      {info.features?.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        testConnection(provider.provider_id);
                      }}
                      disabled={loading}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Date Range Selection */}
        {selectedProvider && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Select Pay Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setDate(today.getDate() - today.getDay() - 7);
                    const end = new Date(today);
                    end.setDate(today.getDate() - today.getDay() - 1);
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0]
                    });
                  }}
                >
                  Last Week
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const today = new Date();
                    const start = new Date(today);
                    start.setDate(today.getDate() - today.getDay() - 14);
                    const end = new Date(today);
                    end.setDate(today.getDate() - today.getDay() - 1);
                    setDateRange({
                      start: start.toISOString().split('T')[0],
                      end: end.toISOString().split('T')[0]
                    });
                  }}
                >
                  Last 2 Weeks
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sync Button */}
        {selectedProvider && (
          <div className="flex justify-end">
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="bg-indigo-600 hover:bg-indigo-700"
              size="lg"
              data-testid="sync-payroll-btn"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing to {PROVIDER_INFO[selectedProvider]?.name}...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Sync to {PROVIDER_INFO[selectedProvider]?.name}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Sync Result */}
        {syncResult && (
          <Card className={syncResult.success ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {syncResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                Sync {syncResult.success ? 'Complete' : 'Completed with Errors'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-semibold">{syncResult.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mode</p>
                  <Badge variant="outline">{syncResult.mode}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Records Synced</p>
                  <p className="font-semibold text-green-600">{syncResult.records_synced}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Records Failed</p>
                  <p className="font-semibold text-red-600">{syncResult.records_failed}</p>
                </div>
              </div>
              
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium mb-2">Batch ID</p>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {syncResult.batch_id}
                </code>
              </div>

              {syncResult.errors?.length > 0 && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Errors</p>
                  <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                    {syncResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.note && (
                <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
                  {syncResult.note}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Syncs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncHistory.map((sync, idx) => {
                  const info = PROVIDER_INFO[sync.provider?.toLowerCase()] || {};
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{info.logo || '📊'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{sync.provider}</p>
                            {sync.success ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {sync.period_start} to {sync.period_end} • {sync.records_synced} records
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{sync.mode}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(sync.synced_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
