import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import GenericHeader from '../../components/layout/GenericHeader';
import ModernSidebar from '../../components/layout/ModernSidebar';
import api from '../../utils/api';
import {
  Calendar,
  Clock,
  Check,
  X,
  Users,
  Sun,
  Heart,
  Coffee,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Settings
} from 'lucide-react';

const TimeOffManagement = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // requests, calendar, policies
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [calendarData, setCalendarData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), entries: [] });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      loadCalendar(calendarData.month, calendarData.year);
    }
  }, [activeTab, calendarData.month, calendarData.year]);

  const loadData = async () => {
    try {
      const [summaryRes, requestsRes, policiesRes] = await Promise.all([
        api.get('/api/time-off/summary'),
        api.get('/api/time-off/requests'),
        api.get('/api/time-off/policies')
      ]);
      setSummary(summaryRes.data.data);
      setRequests(requestsRes.data.data.requests || []);
      setPolicies(policiesRes.data.data.policies || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async (month, year) => {
    try {
      const res = await api.get(`/api/time-off/calendar?month=${month}&year=${year}`);
      setCalendarData(prev => ({ ...prev, entries: res.data.data.entries || [] }));
    } catch (error) {
      console.error('Failed to load calendar:', error);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.post(`/api/time-off/requests/${requestId}/approve`, {});
      loadData();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert(error.response?.data?.detail || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId, reason) => {
    const rejectReason = reason || prompt('Enter rejection reason:');
    if (!rejectReason) return;
    try {
      await api.post(`/api/time-off/requests/${requestId}/reject`, { reason: rejectReason });
      loadData();
    } catch (error) {
      console.error('Failed to reject:', error);
      alert(error.response?.data?.detail || 'Failed to reject request');
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

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
      case 'vacation': return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'sick': return <Heart className="w-4 h-4 text-red-500" />;
      case 'personal': return <Coffee className="w-4 h-4 text-purple-500" />;
      default: return <Calendar className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GenericHeader />
      <div className="flex">
        <ModernSidebar />
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Time Off Management</h1>
              <p className="text-gray-600">Manage team leave requests and policies</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Pending Requests"
                value={summary?.pending_requests || 0}
                color="#F59E0B"
              />
              <StatCard
                icon={<Check className="w-5 h-5" />}
                label="Approved This Month"
                value={summary?.approved_this_month || 0}
                color="#10B981"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Off Today"
                value={summary?.workers_off_today || 0}
                color="#6366F1"
              />
              <StatCard
                icon={<Calendar className="w-5 h-5" />}
                label="Off This Week"
                value={summary?.workers_off_this_week || 0}
                color="#8B5CF6"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
              {['requests', 'calendar', 'policies'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-2 capitalize font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-current text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === tab ? { color: theme.primaryColor, borderColor: theme.primaryColor } : {}}
                >
                  {tab === 'requests' && <FileText className="w-4 h-4 inline mr-2" />}
                  {tab === 'calendar' && <Calendar className="w-4 h-4 inline mr-2" />}
                  {tab === 'policies' && <Settings className="w-4 h-4 inline mr-2" />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === 'requests' && (
              <RequestsTab
                requests={filteredRequests}
                filter={filter}
                setFilter={setFilter}
                getStatusColor={getStatusColor}
                getTypeIcon={getTypeIcon}
                onApprove={handleApprove}
                onReject={handleReject}
                theme={theme}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarTab
                data={calendarData}
                setData={setCalendarData}
                theme={theme}
              />
            )}

            {activeTab === 'policies' && (
              <PoliciesTab
                policies={policies}
                onRefresh={loadData}
                theme={theme}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

const RequestsTab = ({ requests, filter, setFilter, getStatusColor, getTypeIcon, onApprove, onReject, theme }) => (
  <div className="bg-white rounded-xl shadow-sm border">
    <div className="p-4 border-b flex justify-between items-center">
      <h2 className="font-semibold text-gray-900">Time Off Requests</h2>
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
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
      {requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No requests found</p>
        </div>
      ) : (
        requests.map(request => (
          <div key={request.request_id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {request.worker_photo ? (
                    <img src={request.worker_photo} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {request.worker_name?.charAt(0) || 'W'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{request.worker_name || 'Worker'}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {getTypeIcon(request.type)}
                    <span className="capitalize">{request.type}</span>
                    <span>•</span>
                    <span>{request.total_days} day(s)</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                  </p>
                  {request.reason && (
                    <p className="text-sm text-gray-500 mt-1 italic">&ldquo;{request.reason}&rdquo;</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(request.request_id)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      title="Approve"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onReject(request.request_id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      title="Reject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const CalendarTab = ({ data, setData, theme }) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();
  
  const daysInMonth = getDaysInMonth(data.month, data.year);
  const firstDay = getFirstDayOfMonth(data.month, data.year);
  
  const prevMonth = () => {
    if (data.month === 1) {
      setData(prev => ({ ...prev, month: 12, year: prev.year - 1 }));
    } else {
      setData(prev => ({ ...prev, month: prev.month - 1 }));
    }
  };
  
  const nextMonth = () => {
    if (data.month === 12) {
      setData(prev => ({ ...prev, month: 1, year: prev.year + 1 }));
    } else {
      setData(prev => ({ ...prev, month: prev.month + 1 }));
    }
  };
  
  const getEntriesForDay = (day) => {
    const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.entries.filter(e => e.date === dateStr);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold">
          {monthNames[data.month - 1]} {data.year}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
        ))}
        
        {/* Empty cells for days before first of month */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded" />
        ))}
        
        {/* Days of month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const entries = getEntriesForDay(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() + 1 === data.month && 
                         new Date().getFullYear() === data.year;
          
          return (
            <div
              key={day}
              className={`h-24 border rounded p-1 ${
                isToday ? 'border-2' : 'border-gray-200'
              }`}
              style={isToday ? { borderColor: theme.primaryColor } : {}}
            >
              <span className={`text-sm ${
                isToday ? 'font-bold' : ''
              }`} style={isToday ? { color: theme.primaryColor } : {}}>
                {day}
              </span>
              <div className="space-y-1 mt-1 overflow-y-auto max-h-16">
                {entries.slice(0, 2).map(entry => (
                  <div
                    key={entry.entry_id}
                    className="text-xs p-1 rounded truncate"
                    style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}
                    title={`${entry.worker_name} - ${entry.type}`}
                  >
                    {entry.worker_name?.split(' ')[0]}
                  </div>
                ))}
                {entries.length > 2 && (
                  <div className="text-xs text-gray-500">+{entries.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PoliciesTab = ({ policies, onRefresh, theme }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setShowEditModal(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">Time Off Policies</h2>
      </div>
      <div className="divide-y">
        {policies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No policies configured</p>
          </div>
        ) : (
          policies.map(policy => (
            <div key={policy.policy_id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{policy.policy_name}</h3>
                  {policy.is_default && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
                  )}
                </div>
                <button
                  onClick={() => handleEdit(policy)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-600">Vacation:</span>
                  <span className="font-medium">{policy.vacation_days_per_year} days/year</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600">Sick:</span>
                  <span className="font-medium">{policy.sick_days_per_year} days/year</span>
                </div>
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-600">Personal:</span>
                  <span className="font-medium">{policy.personal_days_per_year} days/year</span>
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-gray-500">
                <span>Accrual: {policy.accrual_period}</span>
                <span>•</span>
                <span>Max carryover: {policy.max_carryover_days} days</span>
                <span>•</span>
                <span>Notice required: {policy.min_advance_notice_days} days</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showEditModal && (
        <PolicyEditModal
          policy={editingPolicy}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false);
            onRefresh();
          }}
          theme={theme}
        />
      )}
    </div>
  );
};

const PolicyEditModal = ({ policy, onClose, onSave, theme }) => {
  const [form, setForm] = useState({
    policy_name: policy?.policy_name || '',
    vacation_days_per_year: policy?.vacation_days_per_year || 10,
    sick_days_per_year: policy?.sick_days_per_year || 3,
    personal_days_per_year: policy?.personal_days_per_year || 2,
    accrual_period: policy?.accrual_period || 'annual',
    allow_carryover: policy?.allow_carryover ?? true,
    max_carryover_days: policy?.max_carryover_days || 5,
    min_advance_notice_days: policy?.min_advance_notice_days || 7,
    max_consecutive_days: policy?.max_consecutive_days || 15,
    is_default: policy?.is_default ?? false
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (policy?.policy_id) {
        await api.put(`/api/time-off/policies/${policy.policy_id}`, form);
      } else {
        await api.post('/api/time-off/policies', form);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save policy:', error);
      alert('Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{policy ? 'Edit Policy' : 'Create Policy'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name</label>
            <input
              type="text"
              value={form.policy_name}
              onChange={(e) => setForm({...form, policy_name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vacation Days</label>
              <input
                type="number"
                value={form.vacation_days_per_year}
                onChange={(e) => setForm({...form, vacation_days_per_year: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sick Days</label>
              <input
                type="number"
                value={form.sick_days_per_year}
                onChange={(e) => setForm({...form, sick_days_per_year: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Days</label>
              <input
                type="number"
                value={form.personal_days_per_year}
                onChange={(e) => setForm({...form, personal_days_per_year: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Period</label>
            <select
              value={form.accrual_period}
              onChange={(e) => setForm({...form, accrual_period: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="annual">Annual (All at once)</option>
              <option value="monthly">Monthly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="per_hours">Per Hours Worked</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Carryover Days</label>
              <input
                type="number"
                value={form.max_carryover_days}
                onChange={(e) => setForm({...form, max_carryover_days: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Advance Notice (days)</label>
              <input
                type="number"
                value={form.min_advance_notice_days}
                onChange={(e) => setForm({...form, min_advance_notice_days: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.allow_carryover}
                onChange={(e) => setForm({...form, allow_carryover: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Allow Carryover</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({...form, is_default: e.target.checked})}
                className="rounded"
              />
              <span className="text-sm">Set as Default</span>
            </label>
          </div>
        </div>
        
        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeOffManagement;
