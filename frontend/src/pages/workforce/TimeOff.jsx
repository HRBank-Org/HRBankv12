import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Calendar,
  Clock,
  Plus,
  Sun,
  Heart,
  Coffee,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  CalendarDays
} from 'lucide-react';

const TimeOff = () => {
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [employers, setEmployers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, requestsRes] = await Promise.all([
        api.get('/api/time-off/summary'),
        api.get('/api/time-off/requests')
      ]);
      setSummary(summaryRes.data.data);
      setRequests(requestsRes.data.data.requests || []);
      
      // Load employers for request modal
      try {
        const empRes = await api.get('/api/workforce/me/employers');
        setEmployers(empRes.data.data?.employers || []);
      } catch (e) {
        
      }
    } catch (error) {
      console.error('Failed to load time-off data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'vacation': return <Sun className="w-4 h-4" />;
      case 'sick': return <Heart className="w-4 h-4" />;
      case 'personal': return <Coffee className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkforceHeader />
      <div className="flex">
        <WorkforceSidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('pages.workforce.timeOffTitle')}</h1>
                <p className="text-gray-600">Manage your leave requests and balances</p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Plus className="w-5 h-5" />
                Request Time Off
              </button>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <BalanceCard
                title="Vacation"
                icon={<Sun className="w-5 h-5" />}
                available={summary?.balances?.vacation_available || 0}
                color="#F59E0B"
              />
              <BalanceCard
                title="Sick Leave"
                icon={<Heart className="w-5 h-5" />}
                available={summary?.balances?.sick_available || 0}
                color="#EF4444"
              />
              <BalanceCard
                title="Personal Days"
                icon={<Coffee className="w-5 h-5" />}
                available={summary?.balances?.personal_available || 0}
                color="#8B5CF6"
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Requests</p>
                    <p className="text-xl font-bold text-gray-900">{summary?.pending_requests || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CalendarDays className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Upcoming Time Off</p>
                    <p className="text-xl font-bold text-gray-900">{summary?.upcoming_time_off?.length || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Requests</p>
                    <p className="text-xl font-bold text-gray-900">{requests.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">My Requests</h2>
                <div className="flex gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-full text-sm capitalize ${
                        filter === f ? 'text-white' : 'text-gray-600 bg-gray-100'
                      }`}
                      style={filter === f ? { backgroundColor: theme.primaryColor } : {}}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y">
                {filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No time-off requests found</p>
                  </div>
                ) : (
                  filteredRequests.map(request => (
                    <div key={request.request_id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-gray-100">
                            {getTypeIcon(request.type)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {request.type} - {request.total_days} day(s)
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                            </p>
                            {request.reason && (
                              <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          {request.status === 'pending' && (
                            <button
                              onClick={() => cancelRequest(request.request_id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                      {request.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
                          <strong>Rejection reason:</strong> {request.rejection_reason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <TimeOffRequestModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            loadData();
          }}
          employers={employers}
          theme={theme}
        />
      )}
    </div>
  );

  async function cancelRequest(requestId) {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      await api.delete(`/api/time-off/requests/${requestId}`);
      loadData();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      alert('Failed to cancel request');
    }
  }
};

const BalanceCard = ({ title, icon, available, color }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border">
    <div className="flex items-center justify-between mb-3">
      <span className="text-gray-600 font-medium">{title}</span>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-gray-900">{available}</span>
      <span className="text-gray-500">days available</span>
    </div>
  </div>
);

const TimeOffRequestModal = ({ onClose, onSuccess, employers, theme }) => {
  const [form, setForm] = useState({
    employer_id: employers[0]?.user_id || '',
    type: 'vacation',
    start_date: '',
    end_date: '',
    reason: '',
    is_full_day: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.employer_id) {
      setError('Please select an employer');
      return;
    }
    if (!form.start_date || !form.end_date) {
      setError('Please select start and end dates');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/api/time-off/request', form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('pages.workforce.requestTimeOff')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          
          {employers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
              <select
                value={form.employer_id}
                onChange={(e) => setForm({...form, employer_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {employers.map(emp => (
                  <option key={emp.user_id} value={emp.user_id}>
                    {emp.company_name || emp.business_name || 'Employer'}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({...form, type: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal Day</option>
              <option value="unpaid">Unpaid Leave</option>
              <option value="emergency">Emergency Leave</option>
              <option value="bereavement">Bereavement</option>
              <option value="medical">Medical Appointment</option>
              <option value="mental_health">Mental Health Day</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({...form, start_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({...form, end_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min={form.start_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({...form, reason: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe your reason for time off..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fullDay"
              checked={form.is_full_day}
              onChange={(e) => setForm({...form, is_full_day: e.target.checked})}
              className="rounded"
            />
            <label htmlFor="fullDay" className="text-sm text-gray-700">Full day(s)</label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeOff;
