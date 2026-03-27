import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ModernSidebar from '../../components/layout/ModernSidebar';
import UserHeader from '../../components/common/UserHeader';
import api from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertCircle,
  Loader2,
  User,
  Phone,
  FileText,
  Truck
} from 'lucide-react';

const WorkOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    fsa: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadWorkOrders();
  }, [filters]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.fsa) params.append('fsa', filters.fsa);
      params.append('limit', '100');

      const res = await api.get(`/api/partner/employer/work-orders?${params.toString()}`, {
        headers: { 'X-Employer-ID': user.user_id }
      });
      
      if (res.data.success) {
        setWorkOrders(res.data.data.work_orders || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableWorkers = async (orderId) => {
    try {
      setLoadingWorkers(true);
      const res = await api.get(`/api/partner/employer/available-workers?order_id=${orderId}`, {
        headers: { 'X-Employer-ID': user.user_id }
      });
      if (res.data.success) {
        setAvailableWorkers(res.data.data.workers || []);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleAccept = async (orderId) => {
    try {
      setActionLoading(orderId);
      await api.post(`/api/partner/employer/work-orders/${orderId}/accept`, {}, {
        headers: { 'X-Employer-ID': user.user_id }
      });
      loadWorkOrders();
    } catch (error) {
      console.error('Failed to accept:', error);
      alert(error.response?.data?.detail || 'Failed to accept work order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (orderId, reason) => {
    try {
      setActionLoading(orderId);
      await api.post(`/api/partner/employer/work-orders/${orderId}/decline`, 
        { reason },
        { headers: { 'X-Employer-ID': user.user_id } }
      );
      loadWorkOrders();
    } catch (error) {
      console.error('Failed to decline:', error);
      alert(error.response?.data?.detail || 'Failed to decline work order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignWorkers = async () => {
    if (!selectedOrder || selectedWorkers.length === 0) return;
    
    try {
      setActionLoading(selectedOrder.hrbank_order_id);
      await api.post(
        `/api/partner/employer/work-orders/${selectedOrder.hrbank_order_id}/assign`,
        { worker_ids: selectedWorkers },
        { headers: { 'X-Employer-ID': user.user_id } }
      );
      setShowAssignModal(false);
      setSelectedOrder(null);
      setSelectedWorkers([]);
      loadWorkOrders();
    } catch (error) {
      console.error('Failed to assign:', error);
      alert(error.response?.data?.detail || 'Failed to assign workers');
    } finally {
      setActionLoading(null);
    }
  };

  const openAssignModal = async (order) => {
    setSelectedOrder(order);
    setSelectedWorkers([]);
    setShowAssignModal(true);
    await loadAvailableWorkers(order.hrbank_order_id);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      accepted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      assigned: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Users },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      declined: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      unassigned: { bg: 'bg-gray-100', text: 'text-gray-600', icon: AlertCircle }
    };
    return styles[status] || styles.pending;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      normal: 'bg-gray-200 text-gray-700'
    };
    return styles[priority] || styles.normal;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-CA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatServiceType = (type) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || type;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgColor }}>
      <UserHeader 
        onBackClick={() => navigate('/employer/dashboard')}
        showBack={true}
        title="Work Orders"
      />
      <ModernSidebar />
      
      <main className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 260px)' }}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.employer.workOrdersTitle')}</h1>
            <p className="text-gray-600 text-sm mt-1">
              Incoming work orders from CleanGrid - Accept and assign to your workers
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.pending || 0}</p>
                  <p className="text-xs text-gray-500">{t("pages.common.pending")}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.accepted || 0}</p>
                  <p className="text-xs text-gray-500">Accepted</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.assigned || 0}</p>
                  <p className="text-xs text-gray-500">Assigned</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary.completed || 0}</p>
                  <p className="text-xs text-gray-500">{t("pages.common.completed")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': theme.primaryColor }}
                data-testid="filter-status"
              >
                <option value="">All Statuses</option>
                <option value="pending">{t("pages.common.pending")}</option>
                <option value="accepted">Accepted</option>
                <option value="assigned">Assigned</option>
                <option value="completed">{t("pages.common.completed")}</option>
                <option value="declined">Declined</option>
              </select>
              <input
                type="text"
                placeholder="Filter by FSA (e.g., N9A)"
                value={filters.fsa}
                onChange={(e) => setFilters(prev => ({ ...prev, fsa: e.target.value.toUpperCase() }))}
                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 w-40"
                maxLength={3}
              />
              <button
                onClick={loadWorkOrders}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Work Orders List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : workOrders.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Work Orders</h3>
                <p className="text-gray-500">Work orders from CleanGrid will appear here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {workOrders.map(order => {
                  const statusStyle = getStatusBadge(order.status);
                  const StatusIcon = statusStyle.icon;
                  const isLoading = actionLoading === order.hrbank_order_id;
                  
                  return (
                    <div key={order.hrbank_order_id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Header Row */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                              <StatusIcon className="w-3 h-3" />
                              {order.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(order.priority)}`}>
                              {order.priority}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{order.fsa}</span>
                          </div>
                          
                          {/* Service Type & Customer */}
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {formatServiceType(order.service_type)}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">{order.customer_name}</p>
                          
                          {/* Details Grid */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {order.service_city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(order.scheduled_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {order.time_window_start} - {order.time_window_end}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${order.hourly_rate}/hr × {order.estimated_duration_hours}h
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {order.workers_needed} worker{order.workers_needed > 1 ? 's' : ''} needed
                            </span>
                          </div>
                          
                          {/* Service Address */}
                          <p className="text-xs text-gray-400 mt-2">
                            {order.service_address}, {order.service_postal_code}
                          </p>
                          
                          {/* Assigned Workers */}
                          {order.assigned_workers?.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Assigned:</span>
                              <span className="text-xs font-medium text-purple-600">
                                {order.assigned_workers.length} worker(s)
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAccept(order.hrbank_order_id)}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                style={{ backgroundColor: theme.primaryColor }}
                                data-testid={`accept-btn-${order.hrbank_order_id}`}
                              >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Accept
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Reason for declining?');
                                  if (reason !== null) handleDecline(order.hrbank_order_id, reason);
                                }}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                Decline
                              </button>
                            </>
                          )}
                          
                          {(order.status === 'pending' || order.status === 'accepted') && (
                            <button
                              onClick={() => openAssignModal(order)}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                              data-testid={`assign-btn-${order.hrbank_order_id}`}
                            >
                              <Users className="w-4 h-4" />
                              Assign Workers
                            </button>
                          )}
                          
                          {order.status === 'assigned' && (
                            <button
                              onClick={() => navigate(`/employer/shifts`)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                            >
                              <Truck className="w-4 h-4" />
                              View Shifts
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Assign Workers Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Assign Workers</h2>
              <p className="text-sm text-gray-500 mt-1">
                {formatServiceType(selectedOrder.service_type)} - {selectedOrder.customer_name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(selectedOrder.scheduled_date)} • {selectedOrder.time_window_start} - {selectedOrder.time_window_end}
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {loadingWorkers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : availableWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No workers found. Hire workers first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Select {selectedOrder.workers_needed} worker(s) for this job:
                  </p>
                  {availableWorkers.map(worker => (
                    <label
                      key={worker.worker_id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedWorkers.includes(worker.worker_id)
                          ? 'border-purple-500 bg-purple-50'
                          : worker.is_available
                          ? 'hover:bg-gray-50'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWorkers.includes(worker.worker_id)}
                        onChange={(e) => {
                          if (!worker.is_available) return;
                          if (e.target.checked) {
                            setSelectedWorkers(prev => [...prev, worker.worker_id]);
                          } else {
                            setSelectedWorkers(prev => prev.filter(id => id !== worker.worker_id));
                          }
                        }}
                        disabled={!worker.is_available}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{worker.name}</span>
                          {worker.rating > 0 && (
                            <span className="text-xs text-yellow-600">★ {worker.rating.toFixed(1)}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{worker.email}</p>
                        {!worker.is_available && (
                          <p className="text-xs text-red-500 mt-0.5">{worker.conflict_reason}</p>
                        )}
                      </div>
                      {worker.is_available ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Available</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Busy</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrder(null);
                  setSelectedWorkers([]);
                }}
                className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignWorkers}
                disabled={selectedWorkers.length === 0 || actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Assign {selectedWorkers.length} Worker(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
