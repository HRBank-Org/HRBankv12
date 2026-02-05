import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import SuperAdminSidebar from '../../components/layout/SuperAdminSidebar';
import api from '../../utils/api';
import { 
  FileWarning, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Send, 
  RefreshCw,
  Users,
  FileText,
  Calendar,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Unlock
} from 'lucide-react';

const DocumentExpiryDashboard = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [expiringDocs, setExpiringDocs] = useState([]);
  const [expiredDocs, setExpiredDocs] = useState([]);
  const [restrictedAccounts, setRestrictedAccounts] = useState([]);
  const [documentTypes, setDocumentTypes] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [daysFilter, setDaysFilter] = useState(30);
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [sendingReminder, setSendingReminder] = useState(null);
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, [daysFilter, userTypeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, expiringRes, expiredRes, restrictedRes, typesRes] = await Promise.all([
        api.get('/api/admin/document-expiry/summary'),
        api.get(`/api/admin/document-expiry/expiring?days_ahead=${daysFilter}${userTypeFilter ? `&user_type=${userTypeFilter}` : ''}`),
        api.get(`/api/admin/document-expiry/expired${userTypeFilter ? `?user_type=${userTypeFilter}` : ''}`),
        api.get('/api/admin/document-expiry/restricted-accounts'),
        api.get('/api/admin/document-expiry/document-types')
      ]);

      setSummary(summaryRes.data.data);
      setExpiringDocs(expiringRes.data.data.documents || []);
      setExpiredDocs(expiredRes.data.data.documents || []);
      setRestrictedAccounts(restrictedRes.data.data.users || []);
      setDocumentTypes(typesRes.data.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load document expiry data' });
    } finally {
      setLoading(false);
    }
  };

  const triggerAllReminders = async () => {
    setTriggeringReminders(true);
    try {
      const response = await api.post('/api/admin/document-expiry/trigger-reminders?send_sms=true');
      setMessage({ 
        type: 'success', 
        text: `Sent ${response.data.data.reminders_sent} reminders (${response.data.data.emails_sent} emails, ${response.data.data.sms_sent} SMS)` 
      });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to trigger reminders' });
    } finally {
      setTriggeringReminders(false);
    }
  };

  const sendSingleReminder = async (documentId) => {
    setSendingReminder(documentId);
    try {
      const response = await api.post(`/api/admin/document-expiry/send-reminder/${documentId}?send_sms=true`);
      setMessage({ 
        type: 'success', 
        text: `Reminder sent to ${response.data.data.user_email}` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send reminder' });
    } finally {
      setSendingReminder(null);
    }
  };

  const unrestrictAccount = async (userId) => {
    try {
      await api.post(`/api/admin/document-expiry/unrestrict-account/${userId}`);
      setMessage({ type: 'success', text: 'Account unrestricted successfully' });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unrestrict account' });
    }
  };

  const getUrgencyColor = (days) => {
    if (days <= 0) return 'text-red-600 bg-red-50';
    if (days <= 3) return 'text-orange-600 bg-orange-50';
    if (days <= 7) return 'text-yellow-600 bg-yellow-50';
    if (days <= 14) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const getUrgencyBadge = (days) => {
    if (days <= 0) return { text: 'EXPIRED', color: 'bg-red-500' };
    if (days === 1) return { text: 'TOMORROW', color: 'bg-red-500' };
    if (days <= 3) return { text: `${days} DAYS`, color: 'bg-orange-500' };
    if (days <= 7) return { text: `${days} DAYS`, color: 'bg-yellow-500' };
    return { text: `${days} DAYS`, color: 'bg-blue-500' };
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <SuperAdminSidebar />
        <div className="flex-1 ml-[70px] lg:ml-[260px] pt-20 p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <div className="flex-1 ml-[70px] lg:ml-[260px] pt-20 p-6">
        <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Expiry Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage expiring documents across the platform</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={triggerAllReminders}
            disabled={triggeringReminders}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {triggeringReminders ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send All Reminders
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{summary.expired}</p>
                <p className="text-sm text-red-600">Expired</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{summary.expiring_today}</p>
                <p className="text-sm text-orange-600">Today</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileWarning className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700">{summary.expiring_7_days}</p>
                <p className="text-sm text-yellow-600">7 Days</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{summary.expiring_14_days}</p>
                <p className="text-sm text-blue-600">14 Days</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{summary.expiring_30_days}</p>
                <p className="text-sm text-green-600">30 Days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'summary', label: 'Expiring Documents', count: expiringDocs.length },
            { id: 'expired', label: 'Expired', count: expiredDocs.length },
            { id: 'restricted', label: 'Restricted Accounts', count: restrictedAccounts.length },
            { id: 'config', label: 'Configuration' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {(activeTab === 'summary' || activeTab === 'expired') && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
            </select>
          </div>
          <select
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All User Types</option>
            <option value="workforce">Workforce</option>
            <option value="employer">Employer</option>
            <option value="institution">Institution</option>
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Document</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Expiry Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Last Reminder</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expiringDocs.map(doc => {
                const badge = getUrgencyBadge(doc.days_until_expiry);
                return (
                  <tr key={doc.document_id} className={getUrgencyColor(doc.days_until_expiry)}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{doc.document_name}</p>
                        <p className="text-sm text-gray-500">{doc.document_type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{doc.user_name}</p>
                        <p className="text-sm text-gray-500">{doc.user_email}</p>
                        <span className="inline-block px-2 py-0.5 text-xs bg-gray-200 rounded mt-1">
                          {doc.user_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{new Date(doc.expiry_date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full ${badge.color}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.last_reminder_sent ? (
                        <p className="text-sm text-gray-600">
                          {new Date(doc.last_reminder_sent).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Never</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => sendSingleReminder(doc.document_id)}
                        disabled={sendingReminder === doc.document_id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {sendingReminder === doc.document_id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        Remind
                      </button>
                    </td>
                  </tr>
                );
              })}
              {expiringDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No expiring documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'expired' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Document</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Expired On</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Days Expired</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expiredDocs.map(doc => (
                <tr key={doc.document_id} className="bg-red-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{doc.document_name}</p>
                      <p className="text-sm text-gray-500">{doc.document_type}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{doc.user_name}</p>
                      <p className="text-sm text-gray-500">{doc.user_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-red-700">{new Date(doc.expiry_date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 text-sm font-bold text-white bg-red-600 rounded-full">
                      {doc.days_expired} days ago
                    </span>
                  </td>
                </tr>
              ))}
              {expiredDocs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No expired documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'restricted' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Restricted Since</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Expired Documents</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {restrictedAccounts.map(user => (
                <tr key={user.user_id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <span className="inline-block px-2 py-0.5 text-xs bg-gray-200 rounded mt-1">
                        {user.user_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {user.restricted_date ? new Date(user.restricted_date).toLocaleDateString() : 'Unknown'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(user.expired_documents || []).map((doc, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => unrestrictAccount(user.user_id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Unlock className="w-3 h-3" />
                      Unrestrict
                    </button>
                  </td>
                </tr>
              ))}
              {restrictedAccounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No restricted accounts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'config' && documentTypes && (
        <div className="space-y-6">
          {/* Reminder Intervals */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reminder Schedule</h3>
            <p className="text-gray-600 mb-4">Automated reminders are sent via Email + SMS at these intervals before expiry:</p>
            <div className="flex flex-wrap gap-2">
              {documentTypes.reminder_intervals_days.map(days => (
                <span key={days} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium">
                  {days === 0 ? 'Expiry Day' : `${days} days before`}
                </span>
              ))}
            </div>
          </div>

          {/* Document Types Requiring Expiry */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Requiring Expiry Date</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(documentTypes.requires_expiry).map(([key, info]) => (
                <div key={key} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{info.name}</p>
                  <p className="text-sm text-gray-500">Typical validity: {info.typical_validity_years} years</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Without Expiry */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Without Expiry</h3>
            <div className="flex flex-wrap gap-2">
              {documentTypes.no_expiry.map(type => (
                <span key={type} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
      </div>
    </div>
  );
};

export default DocumentExpiryDashboard;
